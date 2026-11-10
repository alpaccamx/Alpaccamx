// Pruebas de los endpoints de solo lectura para operación (ops-pedido,
// ops-buscar-paquete, ops-pendientes): la clave OPS_READ_KEY, que solo
// acepten GET, y sobre todo que NUNCA regresen datos privados (montos,
// pagos, comprobantes, direcciones, correos, teléfonos, notas, artículos).
// No usan red ni Netlify Blobs: los datos se simulan aquí.

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const blobStore = require("../netlify/functions/lib/blob-store.js");
const swmStore = require("../netlify/functions/lib/swm-store.js");
const rateLimit = require("../netlify/functions/lib/rate-limit.js");

// Claves SOLO de prueba (no son las reales).
const OPS = "ops-clave-de-prueba-0123456789abcdef";
const ADMIN = "admin-clave-de-prueba-0123456789abcdef";

const DIA = 864e5;
const hace = (dias) => new Date(Date.now() - dias * DIA).toISOString();

// Datos privados que no deben salir en ninguna respuesta.
const PRIVADO = [
  "ana.lopez@example.com", "6561234567", "Av. Siempre Viva 742", "32000", "Col. Centro",
  "bety@example.com", "6567654321", "Calle Falsa 123",
  "1234.56", "999.99", "777.77", "comprobanteAt", "mp-pay-123", "nota privada secreta", "Tenis Nike",
  "Lopez", "Ruiz",
];

const ORDERS = [
  { id: "a1b2c3d4-0000-4000-8000-000000000001", status: "paid", stage: "enviado", trackingNumber: "7700 1234 5678", carrier: "Estafeta",
    hasPaymentProof: true, grandTotal: 1234.56, customer: { name: "Ana Lopez", phone: "6561234567", street: "Av. Siempre Viva 742", cp: "32000", colonia: "Col. Centro" },
    items: [{ sku: "X", nombre: "Tenis Nike", precio: 999.99, enStock: true }], createdAt: hace(5), customerEmail: "ana.lopez@example.com" },
  { id: "e1234567-0000-4000-8000-000000000002", status: "pending", hasPaymentProof: true, grandTotal: 777.77,
    customer: { name: "Bety Ruiz", phone: "6567654321", street: "Calle Falsa 123" }, items: [{ sku: "Y", enStock: true }], createdAt: hace(1) },
  { id: "f0000000-0000-4000-8000-000000000003", status: "paid", stage: "pagado", customer: { name: "Ana Lopez", phone: "6561234567" },
    items: [{ sku: "Z", enStock: true }], createdAt: hace(1) },
  { id: "f1111111-0000-4000-8000-000000000004", status: "paid", stage: "pagado", customer: { name: "Ana Lopez", entregaPersonal: true },
    items: [{ sku: "Z", enStock: true }], createdAt: hace(1) },
  { id: "f2222222-0000-4000-8000-000000000005", status: "paid", stage: "pagado", customer: { name: "Ana Lopez" },
    items: [{ sku: "K", enStock: false }], createdAt: hace(1) },
];

const PAQUETES = [
  { id: "p1", folio: "P-0012", status: "recibido", email: "ana.lopez@example.com", name: "Ana Lopez", phone: "6561234567",
    tienda: "Nike Factory Store", paqueteria: "FedEx", rastreo: "1234 5678 9012", guiasUSA: ["9400111111111111111111"], valorTotal: 1234.56,
    articulos: [{ desc: "Tenis Nike", costo: 999.99 }], notaPrivada: "nota privada secreta", receivedAt: hace(45), enMexicoAt: hace(40), createdAt: hace(50) },
  { id: "p2", folio: "P-0013", status: "registrado", email: "bety@example.com", name: "Bety Ruiz", phone: "6567654321", tienda: "Ulta",
    paqueteria: "UPS", rastreo: "1Z999AA10123456784", pago: { status: "revision", monto: 777.77, paymentId: "mp-pay-123", comprobanteAt: hace(0) }, createdAt: hace(2) },
  { id: "p3", folio: "P-0014", status: "en_envio", email: "ana.lopez@example.com", name: "Ana Lopez", tienda: "Target", rastreo: "TBA0000001", createdAt: hace(10) },
  { id: "p4", folio: "P-0015", status: "sin_dueña", tienda: "Amazon", rastreo: "TBA0000002", receivedAt: hace(3), createdAt: hace(3) },
];
const ENVIOS = [
  { id: "e1", folio: "E-0003", status: "enviado", email: "ana.lopez@example.com", name: "Ana Lopez", phone: "6561234567",
    paqueteria: "Estafeta", guia: "EST555000111", paqueteIds: ["p3"], direccion: { calle: "Av. Siempre Viva 742", cp: "32000" },
    cotizacion: { total: 1234.56 }, pago: { status: "pagado", monto: 1234.56, paymentId: "mp-pay-123" }, createdAt: hace(4) },
  { id: "e2", folio: "E-0004", status: "solicitado", email: "bety@example.com", name: "Bety Ruiz", paqueteIds: [], createdAt: hace(1) },
  { id: "e3", folio: "E-0005", status: "pagado", email: "bety@example.com", name: "Bety Ruiz", paqueteIds: [], pago: { status: "pagado", monto: 999.99 }, createdAt: hace(1) },
];
const COMPRAS = [
  { id: "c1", folio: "C-0005", status: "cotizado", email: "bety@example.com", name: "Bety Ruiz", tienda: "Sephora",
    pago: { status: "revision", monto: 777.77 }, items: [{ nombre: "Tenis Nike", precioUSD: 50 }], createdAt: hace(1) },
  { id: "c2", folio: "C-0006", status: "solicitud", email: "ana.lopez@example.com", name: "Ana Lopez", tienda: "Bath & Body Works", createdAt: hace(0) },
];
const CASILLEROS = { "ana.lopez@example.com": "ALP-ANA L", "bety@example.com": "ALP-BETY R" };

blobStore.listOrders = async () => ORDERS;
swmStore.listRecords = async (kind) => ({ paquete: PAQUETES, envio: ENVIOS, compra: COMPRAS }[kind] || []);
swmStore.todosLosCasilleros = async () => CASILLEROS;
rateLimit.checkRateLimit = async () => ({ allowed: true });

const pedido = require("../netlify/functions/ops-pedido.js").handler;
const buscar = require("../netlify/functions/ops-buscar-paquete.js").handler;
const pend = require("../netlify/functions/ops-pendientes.js").handler;

beforeEach(() => {
  process.env.OPS_READ_KEY = OPS;
  process.env.ADMIN_KEY = ADMIN;
});

const get = (handler, query = {}, headers = { "x-ops-key": OPS }) => handler({ httpMethod: "GET", headers, queryStringParameters: query });
const body = (res) => JSON.parse(res.body);
function sinPrivado(res) {
  for (const p of PRIVADO) assert.ok(!res.body.includes(p), `la respuesta no debe incluir "${p}": ${res.body}`);
  for (const campo of ["email", "phone", "telefono", "direccion", "street", "monto", "total", "grandTotal", "pago", "cotizacion", "articulos", "items", "notaPrivada", "fotos", "valorTotal", "guiasUSA"]) {
    assert.ok(!new RegExp(`"${campo}"`).test(res.body), `no debe salir el campo "${campo}"`);
  }
}

/* ---------- Clave y método ---------- */

test("solo acepta GET", async () => {
  for (const h of [pedido, buscar, pend]) {
    const res = await h({ httpMethod: "POST", headers: { "x-ops-key": OPS }, body: "{}" });
    assert.equal(res.statusCode, 405);
  }
});

test("sin clave o con clave equivocada: 401", async () => {
  for (const h of [pedido, buscar, pend]) {
    assert.equal((await get(h, { folio: "E-0003", rastreo: "EST555000111" }, {})).statusCode, 401);
    assert.equal((await get(h, { folio: "E-0003", rastreo: "EST555000111" }, { "x-ops-key": "otra-clave-cualquiera-1234567890" })).statusCode, 401);
  }
});

test("la clave de admin NO sirve como clave de operación", async () => {
  for (const h of [pedido, buscar, pend]) {
    const res = await get(h, { folio: "E-0003", rastreo: "EST555000111" }, { "x-ops-key": ADMIN, "x-admin-key": ADMIN });
    assert.equal(res.statusCode, 401);
  }
});

test("la clave no se acepta por la URL", async () => {
  const res = await get(pend, { key: OPS, "x-ops-key": OPS }, {});
  assert.equal(res.statusCode, 401);
});

test("sin OPS_READ_KEY, muy corta o igual a ADMIN_KEY: no funciona (500)", async () => {
  delete process.env.OPS_READ_KEY;
  assert.equal((await get(pend)).statusCode, 500);
  process.env.OPS_READ_KEY = "corta";
  assert.equal((await get(pend, {}, { "x-ops-key": "corta" })).statusCode, 500);
  process.env.OPS_READ_KEY = ADMIN;
  assert.equal((await get(pend, {}, { "x-ops-key": ADMIN })).statusCode, 500);
});

test("límite de consultas: 429", async () => {
  const orig = rateLimit.checkRateLimit;
  rateLimit.checkRateLimit = async () => ({ allowed: false });
  try { assert.equal((await get(pend)).statusCode, 429); } finally { rateLimit.checkRateLimit = orig; }
});

test("no se guarda en caché", async () => {
  const res = await get(pend);
  assert.equal(res.headers["Cache-Control"], "no-store");
});

/* ---------- ops-pedido ---------- */

test("ops-pedido: pedido de la tienda por número (con o sin #)", async () => {
  for (const folio of ["A1B2C3D4", "#a1b2c3d4"]) {
    const res = await get(pedido, { folio });
    assert.equal(res.statusCode, 200);
    sinPrivado(res);
    const [r] = body(res).resultados;
    assert.deepEqual(
      { tipo: r.tipo, folio: r.folio, etapa: r.etapa, paqueteria: r.paqueteria, guia: r.guia, nombre: r.nombre },
      { tipo: "tienda", folio: "A1B2C3D4", etapa: "enviado", paqueteria: "Estafeta", guia: "7700 1234 5678", nombre: "Ana" },
    );
  }
});

test("ops-pedido: número de la tienda que empieza con E no se confunde con un envío", async () => {
  const res = await get(pedido, { folio: "E1234567" });
  assert.equal(res.statusCode, 200);
  sinPrivado(res);
  const [r] = body(res).resultados;
  assert.equal(r.tipo, "tienda");
  assert.equal(r.etapa, "comprobante_por_revisar");
  assert.equal(r.guia, "");
});

test("ops-pedido: envío, compra y paquete del casillero", async () => {
  const e = await get(pedido, { folio: "e-3" });
  assert.equal(e.statusCode, 200); sinPrivado(e);
  assert.deepEqual(body(e).resultados[0], { tipo: "envio", folio: "E-0003", etapa: "enviado", etapaTexto: "Enviado", paqueteria: "Estafeta", guia: "EST555000111", nombre: "Ana", casillero: "ALP-ANA L", paquetes: ["P-0014"], creado: hace(4).slice(0, 10) });

  const c = await get(pedido, { folio: "C-0005" });
  assert.equal(c.statusCode, 200); sinPrivado(c);
  assert.equal(body(c).resultados[0].casillero, "ALP-BETY R");

  const p = await get(pedido, { folio: "P-0012" });
  assert.equal(p.statusCode, 200); sinPrivado(p);
  const r = body(p).resultados[0];
  assert.equal(r.etapa, "en_mexico");
  assert.equal(r.nombre, "Ana");
  assert.ok(r.almacenajeGratisHasta);
});

test("ops-pedido: folio inexistente 404, inválido o vacío 400", async () => {
  assert.equal((await get(pedido, { folio: "E-0999" })).statusCode, 404);
  assert.equal((await get(pedido, { folio: "hola" })).statusCode, 400);
  assert.equal((await get(pedido, {})).statusCode, 400);
});

/* ---------- ops-buscar-paquete ---------- */

test("ops-buscar-paquete: por rastreo de EE.UU. (con espacios o guiones)", async () => {
  const res = await get(buscar, { rastreo: "1234-5678-9012" });
  assert.equal(res.statusCode, 200);
  sinPrivado(res);
  const [r] = body(res).resultados;
  assert.equal(r.folio, "P-0012");
  assert.equal(r.casillero, "ALP-ANA L");
  assert.equal(r.nombre, "Ana");
});

test("ops-buscar-paquete: encuentra por la guía de Mae (sin regresarla) y por código de barras largo", async () => {
  const res = await get(buscar, { rastreo: "420799019400111111111111111111" });
  assert.equal(res.statusCode, 200);
  sinPrivado(res);
  assert.equal(body(res).resultados[0].folio, "P-0012");
});

test("ops-buscar-paquete: guía nacional de un envío y de un pedido de la tienda", async () => {
  const e = await get(buscar, { rastreo: "est555000111" });
  assert.equal(body(e).resultados[0].folio, "E-0003"); sinPrivado(e);
  const t = await get(buscar, { rastreo: "770012345678" });
  assert.equal(body(t).resultados[0].folio, "A1B2C3D4"); sinPrivado(t);
});

test("ops-buscar-paquete: un paquete dentro de un envío trae la guía del envío", async () => {
  const res = await get(buscar, { rastreo: "TBA0000001" });
  const [r] = body(res).resultados;
  assert.equal(r.folio, "P-0014");
  assert.deepEqual(r.envio, { folio: "E-0003", etapa: "enviado", etapaTexto: "Enviado", paqueteria: "Estafeta", guia: "EST555000111" });
});

test("ops-buscar-paquete: muy corto 400, sin resultados 404", async () => {
  assert.equal((await get(buscar, { rastreo: "12" })).statusCode, 400);
  assert.equal((await get(buscar, { rastreo: "NOEXISTE99999" })).statusCode, 404);
});

/* ---------- ops-pendientes ---------- */

test("ops-pendientes: arma la lista del día sin datos privados", async () => {
  const res = await get(pend);
  assert.equal(res.statusCode, 200);
  sinPrivado(res);
  const d = body(res);
  assert.deepEqual(d.comprobantesPorRevisar.map((x) => x.folio).sort(), ["C-0005", "E1234567", "P-0013"]);
  assert.deepEqual(d.porCotizar.map((x) => x.folio).sort(), ["C-0006", "E-0004"]);
  // Pagado de stock con mensajería sí; entrega en persona y el que espera Corea no.
  assert.deepEqual(d.guiasPorHacer.map((x) => x.folio).sort(), ["E-0005", "F0000000"]);
  assert.equal(d.almacenajePorVencer.length, 1);
  assert.equal(d.almacenajePorVencer[0].folio, "P-0012");
  assert.equal(d.almacenajePorVencer[0].vencido, true);
  assert.deepEqual(d.sinDuena.map((x) => x.folio), ["P-0015"]);
  assert.deepEqual(d.resumen, { comprobantes: 3, porCotizar: 2, guiasPorHacer: 2, almacenaje: 1, sinDuena: 1 });
});
