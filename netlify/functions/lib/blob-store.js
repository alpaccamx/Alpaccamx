const { randomUUID } = require("crypto");

// Almacenamiento compartido (Netlify Blobs) para:
//   - "orders": un registro por pedido (WhatsApp o Mercado Pago), usado
//     para saber qué descontar de stock cuando se confirma el pago.
//   - "stock-sold": un solo documento con el conteo de piezas ya vendidas
//     por SKU, que el sitio resta de las "Piezas Disponibles" de tu hoja
//     de Stock para no sobrevender.
//   - "payment-proofs": el archivo (imagen o PDF) que el cliente sube
//     desde el carrito como comprobante de una transferencia, uno por
//     pedido.
//   - "restock-requests": un registro por cada "Avísame cuando vuelva"
//     que deja una clienta en un producto agotado, para que Mae los vea
//     en /admin.html y le avise a mano por WhatsApp cuando vuelva a
//     haber piezas (no hay aviso automático -- nada detecta cuándo
//     cambia el stock en el Sheet).
//
// Netlify Blobs normalmente se configura solo, sin nada que hacer -- pero
// en este sitio en particular el entorno no le pasa esas credenciales a
// las funciones (error real visto en logs: MissingBlobsEnvironmentError),
// así que aquí se le dan a mano.
//
// Variable de entorno necesaria (Netlify → Site settings → Environment
// variables): NETLIFY_BLOBS_TOKEN -- un Personal Access Token que generas
// en https://app.netlify.com/user/applications ("New access token"), ver
// README sección 4.

const { getStore } = require("@netlify/blobs");

// Site ID del sitio "alpaccamx" en Netlify -- no es secreto (aparece en
// la URL del panel), solo sirve para identificar a qué sitio pertenecen
// los blobs. Se puede sobrescribir con NETLIFY_SITE_ID si el sitio
// cambiara de nombre/ID.
const FALLBACK_SITE_ID = "24b5e390-bcf9-4659-bbf6-1fe46f2b0a09";

function blobsClientOptions() {
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  if (!token) return {}; // sin token, se intenta el modo automático (probablemente falle)
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || FALLBACK_SITE_ID;
  return { siteID, token };
}

function getOrdersStore() {
  return getStore({ name: "orders", consistency: "strong", ...blobsClientOptions() });
}

function getStockSoldStore() {
  return getStore({ name: "stock-sold", consistency: "strong", ...blobsClientOptions() });
}

function getIdempotencyStore() {
  return getStore({ name: "order-idempotency", consistency: "strong", ...blobsClientOptions() });
}

function getPaymentProofsStore() {
  return getStore({ name: "payment-proofs", consistency: "strong", ...blobsClientOptions() });
}

function getRestockRequestsStore() {
  return getStore({ name: "restock-requests", consistency: "strong", ...blobsClientOptions() });
}

const SOLD_MAP_KEY = "sold-map";

async function getSoldMap() {
  const store = getStockSoldStore();
  const data = await store.get(SOLD_MAP_KEY, { type: "json" });
  return data || {};
}

/* Piezas vendidas que hay que restar al stock que muestra el sitio.
   Si la sincronización con el Google Sheet está activa (GOOGLE_SHEETS_STOCK_TAB),
   el Sheet ya tiene restadas las ventas (ver README sección 6), así que aquí
   se regresa vacío: restarlas otra vez dejaría el stock subestimado. */
async function getEffectiveSoldMap() {
  if (process.env.GOOGLE_SHEETS_STOCK_TAB) return {};
  return getSoldMap();
}

/* Suma qty a cada SKU en el mapa de vendidos. Usa "onlyIfMatch"/"onlyIfNew"
   para reintentar si otro pago se confirma al mismo tiempo, en vez de
   pisar su escritura. */
async function applyStockDecrement(items) {
  const stockItems = (items || []).filter((it) => it.enStock && it.sku && it.qty > 0);
  if (!stockItems.length) return;

  const store = getStockSoldStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(SOLD_MAP_KEY, { type: "json" });
    const map = (existing && existing.data) || {};
    for (const it of stockItems) {
      map[it.sku] = (map[it.sku] || 0) + it.qty;
    }
    const options = existing && existing.etag ? { onlyIfMatch: existing.etag } : { onlyIfNew: true };
    const result = await store.setJSON(SOLD_MAP_KEY, map, options);
    if (result.modified) return;
    // Alguien más escribió al mismo tiempo: reintenta con datos frescos.
  }
  throw new Error("No se pudo actualizar el stock vendido (conflicto de concurrencia).");
}

/* Igual que applyStockDecrement, pero suma un delta con signo por SKU en
   vez de sumar siempre -- lo usa admin-update-order-items.js cuando se
   edita un pedido YA PAGADO (se agregó/quitó/cambió cantidad de un
   producto "en stock"): delta positivo = se vendieron más piezas de las
   que ya se habían descontado, delta negativo = se regresan piezas al
   stock disponible. Nunca deja el conteo en negativo. */
async function adjustStockSold(deltaBySku) {
  const entries = Object.entries(deltaBySku || {}).filter(([, delta]) => delta);
  if (!entries.length) return;

  const store = getStockSoldStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(SOLD_MAP_KEY, { type: "json" });
    const map = (existing && existing.data) || {};
    for (const [sku, delta] of entries) {
      map[sku] = Math.max(0, (map[sku] || 0) + delta);
    }
    const options = existing && existing.etag ? { onlyIfMatch: existing.etag } : { onlyIfNew: true };
    const result = await store.setJSON(SOLD_MAP_KEY, map, options);
    if (result.modified) return;
  }
  throw new Error("No se pudo ajustar el stock vendido (conflicto de concurrencia).");
}

/* Clave de idempotencia de un intento de pedido. Evita que una recarga o un
   reintento de red registre el mismo pedido dos veces: la primera petición
   reserva la clave; las siguientes reciben el resultado ya guardado (o un
   aviso de "en curso"). Una reserva que quedó colgada más de 2 minutos se
   libera para poder reintentar. */
const IDEM_STALE_MS = 2 * 60 * 1000;

async function claimIdempotencyKey(key) {
  const store = getIdempotencyStore();
  const res = await store.setJSON(key, { status: "in_progress", at: Date.now() }, { onlyIfNew: true });
  if (res.modified) return { claimed: true, existing: null };
  const existing = await store.get(key, { type: "json" });
  if (existing && existing.status === "in_progress" && Date.now() - existing.at > IDEM_STALE_MS) {
    await store.delete(key);
    return { claimed: false, existing: { status: "stale" } };
  }
  return { claimed: false, existing: existing || { status: "in_progress" } };
}

async function completeIdempotencyKey(key, value) {
  await getIdempotencyStore().setJSON(key, { status: "done", ...value });
}

async function releaseIdempotencyKey(key) {
  await getIdempotencyStore().delete(key).catch(() => {});
}

/* Bloqueo sencillo con vencimiento, para que una sola función a la vez haga
   una lectura-modificación-escritura de un recurso compartido (p. ej. la
   pestaña de Stock del Sheet). Si el dueño del bloqueo muere sin soltarlo,
   el bloqueo vence solo a los ttlMs. */
async function withLock(name, fn, { ttlMs = 30 * 1000, waitMs = 20 * 1000 } = {}) {
  const store = getStore({ name: "locks", consistency: "strong", ...blobsClientOptions() });
  const token = randomUUID();
  const started = Date.now();
  for (;;) {
    const now = Date.now();
    const mine = { token, expiresAt: now + ttlMs };
    const created = await store.setJSON(name, mine, { onlyIfNew: true });
    if (created.modified) break;
    const current = await store.getWithMetadata(name, { type: "json" });
    if (current && current.data && current.data.expiresAt < now) {
      const taken = await store.setJSON(name, mine, { onlyIfMatch: current.etag });
      if (taken.modified) break;
    }
    if (now - started > waitMs) throw new Error(`No se pudo obtener el bloqueo "${name}".`);
    await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
  }
  try {
    return await fn();
  } finally {
    const current = await store.get(name, { type: "json" }).catch(() => null);
    if (current && current.token === token) await store.delete(name).catch(() => {});
  }
}

async function saveNewOrder(order) {
  const store = getOrdersStore();
  const result = await store.setJSON(order.id, order, { onlyIfNew: true });
  if (!result.modified) throw new Error("Ya existe un pedido con ese id.");
}

async function getOrder(id) {
  const store = getOrdersStore();
  return store.get(id, { type: "json" });
}

/* Cambia el estado de un pedido de "pending" a toStatus, de forma segura
   ante llamadas repetidas (ej. Mercado Pago reintentando el mismo webhook,
   o el admin dando doble clic). Devuelve transitioned:true solo la vez que
   realmente aplicó el cambio, para que quien llama decida si debe
   descontar stock o no (una sola vez). */
async function transitionOrder(orderId, toStatus, extra = {}) {
  const store = getOrdersStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(orderId, { type: "json" });
    if (!existing) return { order: null, transitioned: false };
    const order = existing.data;
    if (order.status !== "pending") return { order, transitioned: false };
    const updated = { ...order, ...extra, status: toStatus };
    const result = await store.setJSON(orderId, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return { order: updated, transitioned: true };
  }
  throw new Error(`No se pudo actualizar el pedido a "${toStatus}" (conflicto de concurrencia).`);
}

/* Igual que transitionOrder, pero desde cualquier estado de origen (ej. de
   "paid" a "refunded"). Solo cambia el pedido si está en fromStatus. */
async function transitionOrderFrom(orderId, fromStatus, toStatus, extra = {}) {
  const store = getOrdersStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(orderId, { type: "json" });
    if (!existing) return { order: null, transitioned: false };
    const order = existing.data;
    if (order.status !== fromStatus) return { order, transitioned: false };
    const updated = { ...order, ...extra, status: toStatus };
    const result = await store.setJSON(orderId, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return { order: updated, transitioned: true };
  }
  throw new Error(`No se pudo actualizar el pedido a "${toStatus}" (conflicto de concurrencia).`);
}

async function listOrders({ status } = {}) {
  const store = getOrdersStore();
  const { blobs } = await store.list();
  const orders = [];
  for (const b of blobs) {
    const order = await store.get(b.key, { type: "json" });
    if (order && (!status || order.status === status)) orders.push(order);
  }
  orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return orders;
}

/* Borra un pedido permanentemente (usado en /admin.html para limpiar
   pedidos cancelados que ya no sirven). Con onlyIfStatus, por seguridad,
   solo borra si el pedido sigue en ese estado -- así no se puede borrar
   por error un pedido pendiente o pagado. */
async function deleteOrder(orderId, { onlyIfStatus } = {}) {
  const store = getOrdersStore();
  const order = await store.get(orderId, { type: "json" });
  if (!order) return { deleted: false, reason: "not_found" };
  const allowedStatuses = Array.isArray(onlyIfStatus) ? onlyIfStatus : onlyIfStatus ? [onlyIfStatus] : null;
  if (allowedStatuses && !allowedStatuses.includes(order.status)) {
    return { deleted: false, reason: "wrong_status", order };
  }
  await store.delete(orderId);
  return { deleted: true, order };
}

/* Igual que transitionOrder pero sin tocar el estado -- para anexarle
   datos sueltos a un pedido (ej. el comprobante de pago) sin interferir
   con el flujo de confirmación manual/automática. */
async function updateOrderFields(orderId, patch) {
  const store = getOrdersStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(orderId, { type: "json" });
    if (!existing) return null;
    const updated = { ...existing.data, ...patch };
    const result = await store.setJSON(orderId, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return updated;
  }
  throw new Error("No se pudo actualizar el pedido (conflicto de concurrencia).");
}

/* Guarda el comprobante de pago (imagen o PDF) que sube el cliente. Un
   solo comprobante por pedido -- si vuelve a subir uno, reemplaza al
   anterior. */
async function savePaymentProof(orderId, buffer, { contentType, filename }) {
  const store = getPaymentProofsStore();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await store.set(orderId, arrayBuffer, { metadata: { contentType, filename } });
}

async function getPaymentProof(orderId) {
  const store = getPaymentProofsStore();
  return store.getWithMetadata(orderId, { type: "arrayBuffer" });
}

async function saveRestockRequest(request) {
  const store = getRestockRequestsStore();
  await store.setJSON(request.id, request);
}

async function listRestockRequests() {
  const store = getRestockRequestsStore();
  const { blobs } = await store.list();
  const requests = [];
  for (const b of blobs) {
    const r = await store.get(b.key, { type: "json" });
    if (r) requests.push(r);
  }
  requests.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return requests;
}

async function deleteRestockRequest(id) {
  const store = getRestockRequestsStore();
  await store.delete(id);
}

module.exports = {
  blobsClientOptions,
  getSoldMap,
  getEffectiveSoldMap,
  applyStockDecrement,
  adjustStockSold,
  saveNewOrder,
  withLock,
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
  getOrder,
  transitionOrder,
  transitionOrderFrom,
  listOrders,
  deleteOrder,
  updateOrderFields,
  savePaymentProof,
  getPaymentProof,
  saveRestockRequest,
  listRestockRequests,
  deleteRestockRequest,
};
