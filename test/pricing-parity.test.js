// Prueba de paridad: el cálculo de precios y envío del servidor
// (netlify/functions/lib/pricing.js) tiene que dar exactamente lo mismo que
// el del navegador (funciones de app.js), usando las hojas publicadas reales.
//
// Requiere red (descarga las hojas). Ejecutar con:
//   node --test test/
//
// Si app.js cambia una función de parseo o de envío y esta prueba falla,
// hay que copiar el cambio a netlify/functions/lib/pricing.js.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pricing = require("../netlify/functions/lib/pricing.js");

// Los objetos creados dentro de vm tienen otro prototipo; se normalizan a
// JSON para comparar solo los valores.
const plain = (v) => JSON.parse(JSON.stringify(v));

const APP_JS = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

// Extrae una declaración "function NOMBRE(...) { ... }" de app.js por conteo
// de llaves. Las funciones que usamos son simples (sin llaves dentro de
// cadenas o regex), así que el conteo basta.
function extractFunction(name) {
  const start = APP_JS.indexOf(`\nfunction ${name}(`);
  if (start < 0) throw new Error(`No encontré function ${name} en app.js`);
  let i = APP_JS.indexOf("{", start);
  let depth = 0;
  for (; i < APP_JS.length; i++) {
    if (APP_JS[i] === "{") depth++;
    else if (APP_JS[i] === "}") {
      depth--;
      if (depth === 0) return APP_JS.slice(start + 1, i + 1);
    }
  }
  throw new Error(`Llaves sin cerrar en ${name}`);
}

function extractConst(name) {
  const start = APP_JS.indexOf(`\nconst ${name} = {`);
  if (start < 0) throw new Error(`No encontré const ${name} en app.js`);
  const end = APP_JS.indexOf("\n};", start);
  return APP_JS.slice(start + 1, end + 3);
}

// Carga las funciones de app.js en un contexto aislado. El estado que app.js
// guarda en globales (shippingSettings, etc.) se inyecta en el contexto.
function loadAppFunctions() {
  const source = [
    extractConst("SHIPPING_SETTING_ALIASES"),
    extractConst("CATEGORY_ALIASES"),
    ...[
      "normalizeForSearch", "normalizeCategoria", "parseCSV", "findCol", "normalizeKey", "normalizeMoneyCell", "csvToProducts", "csvToStockData",
      "csvToShippingSettings", "csvToNacionalRates", "csvToKoreaShippingTiers",
      "ceilTo", "nacionalShippingMXN", "koreaShippingUSD", "koreaParcelWeights", "koreaParcelsUSD", "shippingEstimate",
    ].map((n) => extractFunction(n)),
  ].join("\n");
  const ctx = { shippingSettings: {}, shippingNacionalRates: [], shippingKoreaRates: { tiers: [], extraPerKgUSD: 0, extraPerKgTarjetaUSD: null } };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return ctx;
}

async function fetchCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo descargar la hoja: HTTP " + res.status);
  return res.text();
}

test("parseo de envío y tarifas coincide con app.js", async (t) => {
  const [settingsText, nacionalText, koreaText] = await Promise.all([
    fetchCsv(pricing.CSV_URLS.shippingConfig),
    fetchCsv(pricing.CSV_URLS.shippingNacional),
    fetchCsv(pricing.CSV_URLS.shippingKorea),
  ]);
  const app = loadAppFunctions();
  const appSettings = app.csvToShippingSettings(settingsText);
  const serverSettings = pricing.csvToShippingSettings(settingsText);
  assert.deepEqual(serverSettings, plain(appSettings));

  const appNacional = app.csvToNacionalRates(nacionalText);
  const serverNacional = pricing.csvToNacionalRates(nacionalText);
  assert.deepEqual(serverNacional, plain(appNacional));

  const appKorea = app.csvToKoreaShippingTiers(koreaText);
  const serverKorea = pricing.csvToKoreaShippingTiers(koreaText);
  assert.deepEqual(serverKorea, plain(appKorea));
});

test("catálogo: precios y pesos coinciden con app.js", async () => {
  const text = await fetchCsv(pricing.CSV_URLS.catalog);
  const app = loadAppFunctions();
  const appProducts = app.csvToProducts(text);
  const serverProducts = pricing.csvToProducts(text);
  assert.equal(serverProducts.length, appProducts.length);
  const byId = new Map(serverProducts.map((p) => [p.id, p]));
  for (const ap of appProducts) {
    const sp = byId.get(ap.id);
    assert.ok(sp, `falta en servidor: ${ap.id}`);
    assert.equal(sp.precio, ap.precio, `precio ${ap.id}`);
    assert.equal(sp.precioTarjeta, ap.precioTarjeta, `precioTarjeta ${ap.id}`);
    assert.equal(sp.peso, ap.peso, `peso ${ap.id}`);
    assert.equal(sp.disponible, ap.disponible, `disponible ${ap.id}`);
    assert.equal(sp.presentacion, ap.presentacion, `presentacion ${ap.id}`);
  }
});

test("envío: mismo resultado que app.js para varios códigos postales y pesos", async () => {
  const [settingsText, nacionalText, koreaText] = await Promise.all([
    fetchCsv(pricing.CSV_URLS.shippingConfig),
    fetchCsv(pricing.CSV_URLS.shippingNacional),
    fetchCsv(pricing.CSV_URLS.shippingKorea),
  ]);
  const app = loadAppFunctions();
  app.shippingSettings = app.csvToShippingSettings(settingsText);
  app.shippingNacionalRates = app.csvToNacionalRates(nacionalText);
  app.shippingKoreaRates = app.csvToKoreaShippingTiers(koreaText);

  const state = {
    settings: pricing.csvToShippingSettings(settingsText),
    nacional: pricing.csvToNacionalRates(nacionalText),
    korea: pricing.csvToKoreaShippingTiers(koreaText),
  };

  const cps = ["06000", "01000", "64000", "22000", "83000", "97000", "99999", ""];
  const pesos = [0.2, 0.9, 1.5, 3, 7.5, 12];
  let compared = 0;
  for (const cp of cps) {
    for (const peso of pesos) {
      // Un número = un solo envío; una lista = varios envíos desde Corea
      // (cada caja aparte de las piezas individuales).
      for (const korea of [peso, peso / 2, 0, [peso / 2, peso / 4, peso / 4], [0.5, 4.2, 4.2]]) {
        const a = app.shippingEstimate(peso, cp, korea);
        const s = pricing.shippingEstimate(state, peso, cp, korea);
        assert.deepEqual(s, plain(a), `envío diferente cp=${cp} peso=${peso} korea=${korea}`);
        compared++;
      }
    }
  }
  assert.ok(compared > 0);
});

test("pedido completo: total del servidor igual al del navegador (transferencia y tarjeta)", async () => {
  const [catalogText, settingsText, nacionalText, koreaText] = await Promise.all([
    fetchCsv(pricing.CSV_URLS.catalog),
    fetchCsv(pricing.CSV_URLS.shippingConfig),
    fetchCsv(pricing.CSV_URLS.shippingNacional),
    fetchCsv(pricing.CSV_URLS.shippingKorea),
  ]);
  const app = loadAppFunctions();
  app.shippingSettings = app.csvToShippingSettings(settingsText);
  app.shippingNacionalRates = app.csvToNacionalRates(nacionalText);
  app.shippingKoreaRates = app.csvToKoreaShippingTiers(koreaText);

  // Un carrito real: productos disponibles del catálogo, con cantidades que
  // superan el mínimo de pedido (cuando aplica).
  const products = pricing.csvToProducts(catalogText).filter((p) => p.disponible && p.precio > 0 && !p.id.startsWith("row"));
  assert.ok(products.length >= 3, "el catálogo debe tener al menos 3 productos disponibles");
  // Piezas individuales y al menos una caja (cada caja es su propio envío
  // desde Corea), para probar la cotización por paquetes.
  const pieces = products.filter((p) => !/^caja/i.test(p.presentacion || "")).slice(0, 2);
  const box = products.find((p) => /^caja/i.test(p.presentacion || ""));
  const pick = box ? [...pieces, box] : products.slice(0, 3);
  const items = pick.map((p) => ({ sku: p.id, qty: 2, enStock: false }));
  const cp = "06000";

  for (const source of ["transferencia", "mercadopago"]) {
    const useTarjeta = source === "mercadopago";
    const cart = pick.map((p, i) => ({ p, qty: items[i].qty }));
    const clientSubtotal = cart.reduce((s, { p, qty }) => s + (useTarjeta ? p.precioTarjeta : p.precio) * qty, 0);
    const clientWeight = cart.reduce((s, { p, qty }) => s + (p.peso || 0) * qty, 0);
    const parcels = app.koreaParcelWeights(cart.map(({ p, qty }) => ({ peso: p.peso, qty, presentacion: p.presentacion })));
    if (box) assert.equal(parcels.length, 3, "2 cajas + piezas individuales = 3 envíos desde Corea");
    const shipping = app.shippingEstimate(clientWeight, cp, parcels);
    const clientShipping = shipping ? (useTarjeta ? shipping.totalMXNTarjeta : shipping.totalMXN) : 0;
    const client = { subtotal: clientSubtotal, shippingMXN: clientShipping, grandTotal: clientSubtotal + clientShipping };

    // priceOrder descarga las hojas por sí solo; el mínimo puede rechazar el
    // carrito de prueba, así que si lo hace se verifica ese mensaje.
    const priced = await pricing.priceOrder({ source, items, customer: { cp }, soldMap: new Map() });
    if (!priced.ok && /mínimo/.test(priced.error)) continue;
    assert.equal(priced.ok, true, priced.error);
    assert.ok(Math.abs(priced.subtotal - client.subtotal) < 0.01, `subtotal ${source}`);
    assert.ok(Math.abs(priced.shippingMXN - client.shippingMXN) < 0.01, `envío ${source}`);
    assert.ok(Math.abs(priced.grandTotal - client.grandTotal) < 0.01, `total ${source}`);
    if (box) assert.equal(priced.shippingKoreaEnvios, 3, `envíos desde Corea ${source}`);
    assert.equal(pricing.matchesClientTotals(priced, client), true);
  }
});

test("pedido alterado: el servidor rechaza precio o envío manipulados", async () => {
  const catalogText = await fetchCsv(pricing.CSV_URLS.catalog);
  const products = pricing.csvToProducts(catalogText).filter((p) => p.disponible && p.precio > 0 && !p.id.startsWith("row"));
  const p = products[0];
  const items = [{ sku: p.id, qty: 1, enStock: false }];
  const priced = await pricing.priceOrder({ source: "transferencia", items, customer: { cp: "06000" }, soldMap: new Map() });
  if (!priced.ok) return; // carrito bajo el mínimo: no aplica
  // Precio de 1 peso por pieza, envío gratis: el servidor tiene que notarlo.
  const forged = { subtotal: 1, shippingMXN: 0, grandTotal: 1 };
  assert.equal(pricing.matchesClientTotals(priced, forged), false);
  // Totales honestos: sí pasa.
  const honest = { subtotal: priced.subtotal, shippingMXN: priced.shippingMXN, grandTotal: priced.grandTotal };
  assert.equal(pricing.matchesClientTotals(priced, honest), true);
});
