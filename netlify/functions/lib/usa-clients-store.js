// Almacenamiento (Netlify Blobs) de los perfiles de clientas de "Encargos
// USA": cada clienta es un perfil (nombre, teléfono, notas) con la lista
// de pedidos que le ha ido haciendo a Mae como personal shopper en tiendas
// de Estados Unidos (Sephora, Ulta, Target, Amazon, etc.) -- no tiene
// nada que ver con el catálogo ni con los pedidos normales del sitio. Es
// un control privado, solo lo usa Mae desde /admin.html (ver
// admin-usa-clients.js y admin-usa-pedidos.js).

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

function getUsaClientsStore() {
  return getStore({ name: "usa-clients", consistency: "strong", ...blobsClientOptions() });
}

async function saveUsaClient(client) {
  const store = getUsaClientsStore();
  await store.setJSON(client.id, client);
  return client;
}

async function listUsaClients() {
  const store = getUsaClientsStore();
  const { blobs } = await store.list();
  const clients = [];
  for (const b of blobs) {
    const c = await store.get(b.key, { type: "json" });
    if (c) clients.push(c);
  }
  clients.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return clients;
}

/* Reintenta con optimistic concurrency (igual que el resto del sitio) --
   "mutate" recibe el cliente actual (con su lista de pedidos) y regresa
   el cliente ya modificado. Se usa tanto para editar los datos del perfil
   como para agregar/editar/borrar un pedido dentro de su lista, así
   siempre se lee-modifica-escribe la clienta completa de una sola vez. */
async function mutateUsaClient(id, mutate) {
  const store = getUsaClientsStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(id, { type: "json" });
    if (!existing) return null;
    const updated = mutate(existing.data);
    updated.updatedAt = new Date().toISOString();
    const result = await store.setJSON(id, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return updated;
  }
  throw new Error("No se pudo actualizar a la clienta (conflicto de concurrencia).");
}

async function deleteUsaClient(id) {
  const store = getUsaClientsStore();
  await store.delete(id);
}

module.exports = {
  saveUsaClient,
  listUsaClients,
  mutateUsaClient,
  deleteUsaClient,
};
