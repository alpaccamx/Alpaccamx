// Pruebas del endpoint de pedidos (create-order): las validaciones que
// corren ANTES de consultar el catálogo, y el rechazo de totales alterados.
// No escriben nada: el handler se llama con la sesión de prueba y, cuando
// hace falta, con el catálogo real. Requiere red.

const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET || "test-secret-only-for-tests";

// Sin Netlify Blobs (solo en producción) el stock vendido y el límite de
// pedidos no están disponibles: se simulan ANTES de cargar create-order, que
// toma estas funciones al cargar el módulo.
const blobStore = require("../netlify/functions/lib/blob-store.js");
blobStore.getEffectiveSoldMap = async () => ({});
// Las pruebas de idempotencia cambian claimImpl; el resto usa la reserva libre.
let claimImpl = async () => ({ claimed: true, existing: null });
blobStore.claimIdempotencyKey = (...args) => claimImpl(...args);
blobStore.completeIdempotencyKey = async () => {};
blobStore.releaseIdempotencyKey = async () => {};
require("../netlify/functions/lib/rate-limit.js").checkRateLimit = async () => ({ allowed: true });

const { handler } = require("../netlify/functions/create-order.js");
const { signCustomerToken } = require("../netlify/functions/lib/customer-auth.js");
const pricing = require("../netlify/functions/lib/pricing.js");

function event(body, { token } = {}) {
  return {
    httpMethod: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  };
}

const validCustomer = { name: "Prueba", phone: "5512345678", cp: "06000", street: "Calle 1", colonia: "Centro", municipio: "Cuauhtémoc", estado: "CDMX" };

test("sin sesión: 401", async () => {
  const res = await handler(event({ source: "transferencia", customer: validCustomer, items: [{ sku: "X", qty: 1 }] }));
  assert.equal(res.statusCode, 401);
});

test("teléfono inválido: 400 antes de consultar precios", async () => {
  const token = signCustomerToken("prueba@example.com");
  const res = await handler(event({
    source: "transferencia",
    customer: { ...validCustomer, phone: "123" },
    items: [{ sku: "X", qty: 1 }],
    subtotal: 0, shippingMXN: 0, grandTotal: 0,
  }, { token }));
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).error, /10 dígitos/);
});

test("código postal inválido: 400", async () => {
  const token = signCustomerToken("prueba@example.com");
  const res = await handler(event({
    source: "transferencia",
    customer: { ...validCustomer, cp: "060" },
    items: [{ sku: "X", qty: 1 }],
    subtotal: 0, shippingMXN: 0, grandTotal: 0,
  }, { token }));
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).error, /5 dígitos/);
});

test("cantidad inválida: 400", async () => {
  const token = signCustomerToken("prueba@example.com");
  const res = await handler(event({
    source: "transferencia",
    customer: validCustomer,
    items: [{ sku: "X", qty: -3 }],
    subtotal: 0, shippingMXN: 0, grandTotal: 0,
  }, { token }));
  assert.equal(res.statusCode, 400);
});

test("precio alterado en el navegador: 409 y no se registra el pedido", async () => {
  const catalog = pricing.csvToProducts(await (await fetch(pricing.CSV_URLS.catalog)).text());
  const p = catalog.find((x) => x.disponible && x.precio > 0 && !x.id.startsWith("row"));
  // Cantidad suficiente para superar el mínimo de pedido, así el rechazo que
  // se prueba es el del precio alterado y no el del mínimo.
  const qty = Math.min(999, Math.ceil(6000 / p.precio));
  assert.ok(qty * p.precio >= pricing.MIN_ORDER_MXN, "el producto de prueba no alcanza el mínimo con 999 piezas");
  const token = signCustomerToken("prueba@example.com");
  const res = await handler(event({
    source: "transferencia",
    customer: validCustomer,
    // El navegador manda 1 peso por pieza y envío gratis.
    items: [{ sku: p.id, nombre: p.nombre, marca: p.marca, qty, precio: 1, enStock: false }],
    subtotal: qty, shippingMXN: 0, subtotalBase: qty, shippingMXNBase: 0, grandTotal: qty,
  }, { token }));
  assert.equal(res.statusCode, 409, res.body);
  assert.match(JSON.parse(res.body).error, /cambiaron/);
});

// Idempotencia: se simula el almacén de claves para probar las dos respuestas
// que importan: reenvío de un pedido ya registrado, y reenvío mientras el
// primero aún se está registrando.
async function validCartPayload() {
  const catalog = pricing.csvToProducts(await (await fetch(pricing.CSV_URLS.catalog)).text());
  const p = catalog.find((x) => x.disponible && x.precio > 0 && !x.id.startsWith("row"));
  const qty = Math.min(999, Math.ceil(6000 / p.precio));
  const items = [{ sku: p.id, nombre: p.nombre, marca: p.marca, qty, precio: p.precio, enStock: false }];
  const priced = await pricing.priceOrder({ source: "transferencia", items: items.map((i) => ({ sku: i.sku, qty: i.qty, enStock: false })), customer: validCustomer, soldMap: new Map() });
  assert.equal(priced.ok, true, priced.error);
  return {
    source: "transferencia",
    customer: validCustomer,
    items,
    subtotal: priced.subtotal, shippingMXN: priced.shippingMXN, subtotalBase: priced.subtotalBase,
    shippingMXNBase: priced.shippingMXNBase, grandTotal: priced.grandTotal, weightKg: priced.weightKg,
  };
}

test("idempotencia: una clave ya registrada devuelve el mismo pedido", async () => {
  claimImpl = async () => ({ claimed: false, existing: { status: "done", orderId: "pedido-existente" } });
  try {
    const token = signCustomerToken("prueba@example.com");
    const body = { ...(await validCartPayload()), idempotencyKey: "clave-de-prueba-0001" };
    const res = await handler(event(body, { token }));
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(JSON.parse(res.body).orderId, "pedido-existente");
  } finally {
    claimImpl = async () => ({ claimed: true, existing: null });
  }
});

test("idempotencia: un reenvío mientras el primero se registra responde 409", async () => {
  claimImpl = async () => ({ claimed: false, existing: { status: "in_progress" } });
  try {
    const token = signCustomerToken("prueba@example.com");
    const body = { ...(await validCartPayload()), idempotencyKey: "clave-de-prueba-0002" };
    const res = await handler(event(body, { token }));
    assert.equal(res.statusCode, 409);
  } finally {
    claimImpl = async () => ({ claimed: true, existing: null });
  }
});
