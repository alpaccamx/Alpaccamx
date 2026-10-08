// Recalcula en el servidor precios, stock y envío de un pedido, a partir de
// las mismas hojas publicadas (CSV) que lee el sitio. Nunca se confía en
// los precios que manda el navegador: el pedido se registra y se cobra con
// lo que sale de aquí.
//
// IMPORTANTE: las funciones de parseo y de cálculo de envío son una copia
// fiel de las de app.js (parseCSV, csvToProducts, csvToStockData,
// csvToNacionalRates, csvToKoreaShippingTiers, shippingEstimate, etc.).
// Si cambias una de allá, cambia la de aquí. test/pricing-parity.test.js
// compara ambas implementaciones con las hojas reales para detectar un
// desfase.

const CSV_URLS = {
  catalog:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=114583060&single=true&output=csv",
  shippingConfig:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=442348645&single=true&output=csv",
  shippingKorea:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=680436823&single=true&output=csv",
  shippingNacional:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=291380963&single=true&output=csv",
  stock:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=2144351337&single=true&output=csv",
};

// Debe coincidir con CONFIG.MIN_ORDER_MXN en app.js.
const MIN_ORDER_MXN = 5700;

// Tolerancia de redondeo entre el cálculo del navegador y el del servidor.
// Más de esto se trata como precio alterado o desactualizado.
const TOLERANCE_MXN = 1;

const CACHE_TTL_MS = 60 * 1000;
let cache = null;

/* ======================================================================
   Parser de CSV (copia de app.js)
   ====================================================================== */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c === "\r") {
      // ignorar
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function findCol(headers, aliases) {
  const exact = headers.findIndex((h) => aliases.includes(h));
  if (exact >= 0) return exact;
  const stripParens = (h) => h.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return headers.findIndex((h) => aliases.includes(stripParens(h)));
}

function normalizeKey(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const SHIPPING_SETTING_ALIASES = {
  exchangeRate: ["tipodecambio", "tipocambio", "exchangerate", "dolar", "usdmxn"],
  transferDiscountPct: ["descuentoportransferencia", "descuentotransferencia", "descuentoportransferenciaporciento"],
};

/* ======================================================================
   Parsers de hojas (copias de app.js)
   ====================================================================== */
/* Convierte la celda de precio a texto numérico. El último separador (punto
   o coma) es el decimal; los demás son de miles. Así "1,234.50" -> 1234.50 y
   "1.234,50" -> 1234.50, y "56,32" -> 56.32 como antes. */
function normalizeMoneyCell(raw) {
  const cleaned = String(raw || "").replace(/[^0-9.,]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastDot === -1 && lastComma === -1) return cleaned;
  if (lastComma > lastDot) return cleaned.replace(/\./g, "").replace(",", ".");
  return cleaned.replace(/,/g, "");
}

function csvToProducts(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const iNombre = findCol(headers, ["nombre", "producto", "name"]);
  const iMarca = findCol(headers, ["marca", "brand"]);
  const iPrecio = findCol(headers, ["precio", "price"]);
  const iPrecioTarjeta = findCol(headers, ["precio tarjeta", "preciotarjeta", "precio con tarjeta", "card price"]);
  const iDisponible = findCol(headers, ["disponible", "stock", "available"]);
  const iSku = findCol(headers, ["sku", "codigo", "código"]);
  const iPeso = findCol(headers, ["peso", "peso (kg)", "peso kg", "weight", "pesokg"]);

  return rows
    .slice(1)
    .map((r, n) => {
      const get = (i) => (i >= 0 && r[i] != null ? r[i].trim() : "");
      const disponibleRaw = get(iDisponible).toLowerCase();
      const disponible =
        disponibleRaw === ""
          ? true
          : ["si", "sí", "yes", "true", "1", "disponible"].includes(disponibleRaw);
      const precioRaw = normalizeMoneyCell(get(iPrecio));
      const precioTarjetaRaw = normalizeMoneyCell(get(iPrecioTarjeta));
      const pesoRaw = get(iPeso).replace(/[^0-9.,]/g, "").replace(",", ".");
      const precio = parseFloat(precioRaw) || 0;
      const precioTarjeta = parseFloat(precioTarjetaRaw) || precio;
      return {
        id: get(iSku) || `row${n}`,
        nombre: get(iNombre) || "Producto sin nombre",
        marca: get(iMarca),
        precio,
        precioTarjeta,
        peso: parseFloat(pesoRaw) || 0,
        disponible,
      };
    })
    .filter((p) => p.nombre && p.nombre !== "Producto sin nombre");
}

function csvToStockData(text) {
  const rows = parseCSV(text);
  const map = new Map();
  if (!rows.length) return map;
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const iSku = findCol(headers, ["sku", "codigo", "código"]);
  const iPiezas = findCol(headers, ["piezas disponibles", "piezas", "cantidad", "stock"]);
  const iPrecio = findCol(headers, ["precio mxn", "precio", "price"]);
  const iPrecioTarjeta = findCol(headers, ["precio tarjeta mxn", "precio tarjeta", "preciotarjeta"]);
  const iNombre = findCol(headers, ["nombre", "producto", "name"]);
  const iMarca = findCol(headers, ["marca", "brand"]);
  const iPeso = findCol(headers, ["peso", "peso (kg)", "peso kg", "weight", "pesokg"]);
  if (iSku < 0) return map;

  rows.slice(1).forEach((r) => {
    const sku = (r[iSku] || "").trim();
    if (!sku) return;
    const get = (i) => (i >= 0 && r[i] != null ? r[i].trim() : "");
    const piezas = parseInt(get(iPiezas).replace(/[^0-9]/g, ""), 10) || 0;
    const precioMXN = parseFloat(normalizeMoneyCell(get(iPrecio))) || 0;
    const precioTarjetaMXN = parseFloat(normalizeMoneyCell(get(iPrecioTarjeta))) || precioMXN;
    const pesoKg = parseFloat(get(iPeso).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    if (piezas > 0) {
      map.set(sku, {
        piezas,
        precioMXN,
        precioTarjetaMXN,
        nombre: get(iNombre),
        marca: get(iMarca),
        pesoKg,
      });
    }
  });
  return map;
}

function csvToShippingSettings(text) {
  const rows = parseCSV(text);
  const settings = { exchangeRate: 0, transferDiscountPct: 0 };
  rows.forEach((r) => {
    const key = normalizeKey(r[0]);
    const rawValue = (r[1] || "").trim();
    const numValue = parseFloat(rawValue.replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
    for (const field in SHIPPING_SETTING_ALIASES) {
      if (SHIPPING_SETTING_ALIASES[field].includes(key)) settings[field] = numValue;
    }
  });
  return settings;
}

function csvToNacionalRates(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const iEstado = findCol(headers, ["estado"]);
  const iCp = findCol(headers, ["cp destino", "codigo postal", "cp"]);
  const iPeso = findCol(headers, ["peso (kg)", "peso"]);
  const iCosto = findCol(headers, ["costo estafeta terrestre (mxn)", "costo estafeta terrestre", "costo estafeta", "costo"]);
  const iCostoTarjeta = findCol(headers, [
    "costo estafeta terrestre tarjeta (mxn)",
    "costo estafeta terrestre tarjeta",
    "costo tarjeta (mxn)",
    "costo tarjeta",
  ]);

  const rates = [];
  rows.slice(1).forEach((r) => {
    const estado = (r[iEstado] || "").trim();
    const cpRange = (r[iCp] || "").trim();
    const peso = parseFloat((r[iPeso] || "").replace(",", "."));
    const costo = parseFloat((r[iCosto] || "").replace(/[^0-9.,]/g, "").replace(",", "."));
    const costoTarjetaRaw = iCostoTarjeta >= 0 ? (r[iCostoTarjeta] || "").replace(/[^0-9.,]/g, "").replace(",", ".") : "";
    const costoTarjetaParsed = parseFloat(costoTarjetaRaw);
    const m = cpRange.match(/(\d{4,5})\s*-\s*(\d{4,5})/);
    if (!estado || !m || isNaN(peso) || isNaN(costo)) return;
    rates.push({
      estado,
      cpMin: parseInt(m[1], 10),
      cpMax: parseInt(m[2], 10),
      pesoKg: peso,
      costoMXN: costo,
      costoTarjetaMXN: isNaN(costoTarjetaParsed) ? null : costoTarjetaParsed,
    });
  });
  return rates;
}

function csvToKoreaShippingTiers(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { tiers: [], extraPerKgUSD: 0, extraPerKgTarjetaUSD: null };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const iPeso = findCol(headers, ["peso total de la unidad", "peso hasta", "peso hasta (kg)", "peso (kg)", "peso"]);
  const iCosto = findCol(headers, ["costo (usd)", "costo usd", "costo"]);
  const iCostoTarjeta = findCol(headers, ["costo tarjeta (usd)", "costo tarjeta usd", "costo tarjeta"]);

  const tiers = [];
  let extraPerKgUSD = 0;
  let extraPerKgTarjetaUSD = null;

  rows.slice(1).forEach((r) => {
    const pesoRaw = (r[iPeso] || "").trim().toLowerCase();
    const costo = parseFloat((r[iCosto] || "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const costoTarjetaRaw = iCostoTarjeta >= 0 ? (r[iCostoTarjeta] || "").replace(/[^0-9.,]/g, "").replace(",", ".") : "";
    const costoTarjetaParsed = parseFloat(costoTarjetaRaw);
    const costoTarjetaUSD = isNaN(costoTarjetaParsed) ? null : costoTarjetaParsed;

    if (pesoRaw.includes("adicional") || pesoRaw.includes("extra")) {
      extraPerKgUSD = costo;
      extraPerKgTarjetaUSD = costoTarjetaUSD;
      return;
    }
    const maxKg = parseFloat(pesoRaw.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!isNaN(maxKg)) tiers.push({ maxKg, costoUSD: costo, costoTarjetaUSD });
  });

  tiers.sort((a, b) => a.maxKg - b.maxKg);
  return { tiers, extraPerKgUSD, extraPerKgTarjetaUSD };
}

/* ======================================================================
   Cálculo de envío (copia de app.js). "state" reemplaza a los globales
   shippingSettings, shippingNacionalRates y shippingKoreaRates.
   ====================================================================== */
function ceilTo(value, step) {
  return Math.ceil(value / step) * step;
}

function nacionalShippingMXN(state, cp, pesoKg, useTarjeta = false) {
  const cpNum = parseInt((cp || "").trim(), 10);
  if (isNaN(cpNum) || pesoKg <= 0 || !state.nacional.length) return null;

  const zonesInRange = state.nacional.filter((r) => cpNum >= r.cpMin && cpNum <= r.cpMax);
  if (!zonesInRange.length) return null;

  const narrowestSpan = Math.min(...zonesInRange.map((r) => r.cpMax - r.cpMin));
  const zoneRows = zonesInRange.filter((r) => r.cpMax - r.cpMin === narrowestSpan);

  const sorted = zoneRows.slice().sort((a, b) => a.pesoKg - b.pesoKg);
  const tier = sorted.find((r) => pesoKg <= r.pesoKg);
  if (!tier) return null;
  if (!useTarjeta) return tier.costoMXN;
  if (tier.costoTarjetaMXN != null) return tier.costoTarjetaMXN;
  const pct = state.settings.transferDiscountPct || 0;
  return ceilTo(tier.costoMXN * (1 + pct / 100), 1);
}

function koreaShippingUSD(state, pesoKg, useTarjeta = false) {
  const { tiers, extraPerKgUSD, extraPerKgTarjetaUSD } = state.korea;
  if (!tiers.length || pesoKg <= 0) return 0;
  const pct = state.settings.transferDiscountPct || 0;

  const inRange = tiers.find((t) => pesoKg <= t.maxKg);
  if (inRange) {
    if (!useTarjeta) return inRange.costoUSD;
    return inRange.costoTarjetaUSD != null ? inRange.costoTarjetaUSD : ceilTo(inRange.costoUSD * (1 + pct / 100), 1);
  }

  const last = tiers[tiers.length - 1];
  const extraKg = Math.ceil(pesoKg - last.maxKg);
  if (!useTarjeta) return last.costoUSD + extraKg * extraPerKgUSD;

  const baseTarjeta = last.costoTarjetaUSD != null ? last.costoTarjetaUSD : ceilTo(last.costoUSD * (1 + pct / 100), 1);
  const extraTarjeta = extraPerKgTarjetaUSD != null ? extraPerKgTarjetaUSD : ceilTo(extraPerKgUSD * (1 + pct / 100), 1);
  return baseTarjeta + extraKg * extraTarjeta;
}

function shippingEstimate(state, pesoKg, cp, koreaPesoKg = pesoKg) {
  if (pesoKg <= 0) return null;
  const hasKorea = koreaPesoKg > 0 && state.korea.tiers.length > 0 && state.settings.exchangeRate > 0;
  const nacionalMXN = nacionalShippingMXN(state, cp, pesoKg);
  const hasNacional = nacionalMXN !== null;
  if (!hasKorea && !hasNacional) return null;

  const coreaUSD = hasKorea ? koreaShippingUSD(state, koreaPesoKg) : 0;
  const coreaMXN = coreaUSD * (state.settings.exchangeRate || 0);
  const totalMXN = coreaMXN + (nacionalMXN || 0);

  const nacionalMXNTarjeta = hasNacional ? nacionalShippingMXN(state, cp, pesoKg, true) || 0 : 0;
  const coreaUSDTarjeta = hasKorea ? koreaShippingUSD(state, koreaPesoKg, true) : 0;
  const coreaMXNTarjeta = coreaUSDTarjeta * (state.settings.exchangeRate || 0);
  const totalMXNTarjeta = coreaMXNTarjeta + nacionalMXNTarjeta;

  return {
    hasKorea, hasNacional, coreaUSD,
    coreaMXN, nacionalMXN: nacionalMXN || 0, totalMXN,
    coreaMXNTarjeta, nacionalMXNTarjeta, totalMXNTarjeta,
  };
}

/* ======================================================================
   Carga de hojas (con caché corta y reintento: Google a veces responde
   400 si varias pestañas del mismo archivo se piden al mismo tiempo, así
   que se piden de una en una)
   ====================================================================== */
async function fetchText(url, { retries = 2, delayMs = 700 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function loadPricingData() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const catalogText = await fetchText(CSV_URLS.catalog);
  const stockText = await fetchText(CSV_URLS.stock);
  const settingsText = await fetchText(CSV_URLS.shippingConfig);
  const nacionalText = await fetchText(CSV_URLS.shippingNacional);
  const koreaText = await fetchText(CSV_URLS.shippingKorea);

  const data = {
    catalog: new Map(csvToProducts(catalogText).map((p) => [p.id, p])),
    stock: csvToStockData(stockText),
    state: {
      settings: csvToShippingSettings(settingsText),
      nacional: csvToNacionalRates(nacionalText),
      korea: csvToKoreaShippingTiers(koreaText),
    },
  };
  cache = { at: Date.now(), data };
  return data;
}

/* ======================================================================
   Precio del pedido
   ====================================================================== */
const round2 = (n) => Math.round(n * 100) / 100;

/* Regresa { ok: true, ...totales } o { ok: false, status, error }.
   items: [{ sku, qty, enStock }] tal como los manda el navegador (solo se
   usan sku, qty y enStock; el precio y el peso se buscan aquí).
   soldMap: Map(sku -> piezas vendidas) para descontar del stock. */
async function priceOrder({ source, items, customer, soldMap }) {
  const { catalog, stock, state } = await loadPricingData();
  const useTarjeta = source === "mercadopago";

  const lines = [];
  for (const it of items) {
    const sku = String(it.sku || "");
    const qty = Number(it.qty);
    if (!sku || !Number.isInteger(qty) || qty < 1 || qty > 999) {
      return { ok: false, status: 400, error: "Hay una cantidad inválida en tu carrito." };
    }

    const main = catalog.get(sku);
    if (it.enStock) {
      const entry = stock.get(sku);
      if (!entry) {
        return { ok: false, status: 409, error: "Uno de los productos en stock ya no está disponible. Recarga la página." };
      }
      const disponibles = Math.max(0, entry.piezas - ((soldMap && soldMap.get(sku)) || 0));
      if (qty > disponibles) {
        return { ok: false, status: 409, error: `Ya no hay ${qty} pieza(s) de ${entry.nombre || (main && main.nombre) || sku} en stock. Recarga la página.` };
      }
      // Misma regla que applyStockData() en app.js: el precio de stock
      // sustituye al del catálogo, y el peso también si la hoja lo trae.
      const base = entry.precioMXN || (main && main.precio) || 0;
      const tarjeta = entry.precioTarjetaMXN || base;
      const peso = entry.pesoKg || (main && main.peso) || 0;
      lines.push({
        sku,
        qty,
        enStock: true,
        nombre: entry.nombre || (main && main.nombre) || sku,
        marca: entry.marca || (main && main.marca) || "",
        precioBase: base,
        precio: useTarjeta ? tarjeta : base,
        peso,
      });
      continue;
    }

    if (!main || !main.disponible) {
      return { ok: false, status: 409, error: "Uno de los productos de tu carrito ya no está disponible. Recarga la página." };
    }
    const base = main.precio;
    const tarjeta = main.precioTarjeta ?? main.precio;
    lines.push({
      sku,
      qty,
      enStock: false,
      nombre: main.nombre,
      marca: main.marca || "",
      precioBase: base,
      precio: useTarjeta ? tarjeta : base,
      peso: main.peso || 0,
    });
  }

  if (!lines.length) {
    return { ok: false, status: 400, error: "El pedido no tiene productos válidos." };
  }
  if (lines.some((l) => !(l.precio > 0))) {
    return { ok: false, status: 409, error: "Hay un producto sin precio en el catálogo. Avísanos por WhatsApp." };
  }

  const hasNonStock = lines.some((l) => !l.enStock);
  const nonStockBaseTotal = lines.reduce((s, l) => s + (l.enStock ? 0 : l.precioBase * l.qty), 0);
  if (hasNonStock && nonStockBaseTotal < MIN_ORDER_MXN) {
    return { ok: false, status: 400, error: `Tu pedido todavía no llega al mínimo de $${MIN_ORDER_MXN.toLocaleString("es-MX")} en productos de Corea.` };
  }

  const subtotal = lines.reduce((s, l) => s + l.precio * l.qty, 0);
  const subtotalBase = lines.reduce((s, l) => s + l.precioBase * l.qty, 0);
  const weight = lines.reduce((s, l) => s + l.peso * l.qty, 0);
  const weightNonStock = lines.reduce((s, l) => s + (l.enStock ? 0 : l.peso * l.qty), 0);

  const cp = String((customer && customer.cp) || "");
  let shipping = null;
  if (weight > 0) {
    shipping = shippingEstimate(state, weight, cp, weightNonStock);
    if (!shipping) {
      return { ok: false, status: 400, error: "No pudimos calcular el envío para tu código postal. Revisa que esté bien escrito." };
    }
  }
  const shippingMXN = shipping ? (useTarjeta ? shipping.totalMXNTarjeta : shipping.totalMXN) : 0;
  const shippingMXNBase = shipping ? shipping.totalMXN : 0;

  return {
    ok: true,
    items: lines,
    subtotal: round2(subtotal),
    subtotalBase: round2(subtotalBase),
    shippingMXN: round2(shippingMXN),
    shippingMXNBase: round2(shippingMXNBase),
    grandTotal: round2(subtotal + shippingMXN),
    shippingKoreaMXN: shipping ? shipping.coreaMXN : 0,
    shippingNacionalMXN: shipping ? shipping.nacionalMXN : 0,
    // Mismo desglose pero a precio de tarjeta -- lo usa el correo de
    // confirmación (lib/email.js) para que sus renglones cuadren con lo
    // que de verdad se cobró cuando source="mercadopago".
    shippingKoreaMXNTarjeta: shipping ? shipping.coreaMXNTarjeta : 0,
    shippingNacionalMXNTarjeta: shipping ? shipping.nacionalMXNTarjeta : 0,
    weightKg: round2(weight),
    cardFeeMXN: round2(Math.max(0, (subtotal - subtotalBase) + (shippingMXN - shippingMXNBase))),
  };
}

/* Compara lo que mandó el navegador con lo calculado aquí. Si algo difiere
   más de la tolerancia, el pedido no se registra. */
function matchesClientTotals(priced, client) {
  const diffs = [
    Math.abs(priced.subtotal - Number(client.subtotal || 0)),
    Math.abs(priced.shippingMXN - Number(client.shippingMXN || 0)),
    Math.abs(priced.grandTotal - Number(client.grandTotal || 0)),
  ];
  return diffs.every((d) => d <= TOLERANCE_MXN);
}

module.exports = {
  priceOrder,
  matchesClientTotals,
  loadPricingData,
  // Expuestos para la prueba de paridad con app.js.
  parseCSV,
  csvToProducts,
  csvToStockData,
  csvToShippingSettings,
  csvToNacionalRates,
  csvToKoreaShippingTiers,
  shippingEstimate,
  CSV_URLS,
  TOLERANCE_MXN,
  MIN_ORDER_MXN,
};
