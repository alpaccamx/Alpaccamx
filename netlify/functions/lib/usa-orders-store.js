// Almacenamiento (Netlify Blobs) de los "encargos USA": productos que una
// clienta le pide a Mae comprarle en una tienda de Estados Unidos (Sephora,
// Ulta, Target, Amazon, etc.) como personal shopper -- no tiene nada que
// ver con el catálogo ni con los pedidos normales del sitio. Es un control
// privado, solo lo usa Mae desde /admin.html (ver admin-usa-orders.js).

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

function getUsaOrdersStore() {
  return getStore({ name: "usa-orders", consistency: "strong", ...blobsClientOptions() });
}

async function saveUsaOrder(order) {
  const store = getUsaOrdersStore();
  await store.setJSON(order.id, order);
  return order;
}

async function listUsaOrders() {
  const store = getUsaOrdersStore();
  const { blobs } = await store.list();
  const entries = [];
  for (const b of blobs) {
    const entry = await store.get(b.key, { type: "json" });
    if (entry) entries.push(entry);
  }
  entries.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return entries;
}

async function updateUsaOrder(id, patch) {
  const store = getUsaOrdersStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(id, { type: "json" });
    if (!existing) return null;
    const updated = { ...existing.data, ...patch, updatedAt: new Date().toISOString() };
    const result = await store.setJSON(id, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return updated;
  }
  throw new Error("No se pudo actualizar el encargo (conflicto de concurrencia).");
}

async function deleteUsaOrder(id) {
  const store = getUsaOrdersStore();
  await store.delete(id);
}

module.exports = {
  saveUsaOrder,
  listUsaOrders,
  updateUsaOrder,
  deleteUsaOrder,
};
