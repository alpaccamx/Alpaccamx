// Almacenamiento compartido (Netlify Blobs) para:
//   - "orders": un registro por pedido (WhatsApp o Mercado Pago), usado
//     para saber qué descontar de stock cuando se confirma el pago.
//   - "stock-sold": un solo documento con el conteo de piezas ya vendidas
//     por SKU, que el sitio resta de las "Piezas Disponibles" de tu hoja
//     de Stock para no sobrevender.
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

const SOLD_MAP_KEY = "sold-map";

async function getSoldMap() {
  const store = getStockSoldStore();
  const data = await store.get(SOLD_MAP_KEY, { type: "json" });
  return data || {};
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
  if (onlyIfStatus && order.status !== onlyIfStatus) {
    return { deleted: false, reason: "wrong_status", order };
  }
  await store.delete(orderId);
  return { deleted: true, order };
}

module.exports = {
  getSoldMap,
  applyStockDecrement,
  saveNewOrder,
  getOrder,
  transitionOrder,
  listOrders,
  deleteOrder,
};
