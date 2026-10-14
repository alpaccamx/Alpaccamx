// "Shop with Mae" (personal shopper / cruce de paquetes de EE.UU. a
// México): solicitudes que las clientas mandan desde alpacca.mx con su
// cuenta, y que Mae cotiza y va moviendo de etapa desde /admin.html
// (sección Encargos USA). Cada solicitud es un blob con id propio; el
// folio consecutivo (SWM-0001, SWM-0002...) se guarda aparte.
//
// No tiene nada que ver con "Encargos USA" de lib/usa-clients-store.js
// (ese es el control manual de Mae); aquí solo están las que llegan por
// el sitio.

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

const STAGES = ["solicitud", "cotizado", "esperando_paquete", "recibido", "en_camino_mx", "enviado", "entregado", "cancelado"];

function getSwmStore() {
  return getStore({ name: "swm-requests", consistency: "strong", ...blobsClientOptions() });
}

async function nextFolio() {
  const store = getSwmStore();
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await store.getWithMetadata("_counter", { type: "json" });
    const n = ((cur && cur.data && cur.data.n) || 0) + 1;
    const res = cur
      ? await store.setJSON("_counter", { n }, { onlyIfMatch: cur.etag })
      : await store.setJSON("_counter", { n }, { onlyIfNew: true });
    if (res.modified) return `SWM-${String(n).padStart(4, "0")}`;
  }
  throw new Error("No se pudo asignar el folio.");
}

async function saveSwmRequest(req) {
  await getSwmStore().setJSON(req.id, req);
  return req;
}

async function getSwmRequest(id) {
  return getSwmStore().get(id, { type: "json" });
}

async function listSwmRequests({ email } = {}) {
  const store = getSwmStore();
  const { blobs } = await store.list();
  const out = [];
  for (const b of blobs) {
    if (b.key.startsWith("_")) continue;
    const r = await store.get(b.key, { type: "json" });
    if (r && (!email || r.email === email)) out.push(r);
  }
  out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return out;
}

async function mutateSwmRequest(id, mutate) {
  const store = getSwmStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(id, { type: "json" });
    if (!existing) return null;
    const updated = mutate(existing.data);
    updated.updatedAt = new Date().toISOString();
    const result = await store.setJSON(id, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return updated;
  }
  throw new Error("No se pudo actualizar la solicitud (conflicto de concurrencia).");
}

module.exports = { STAGES, nextFolio, saveSwmRequest, getSwmRequest, listSwmRequests, mutateSwmRequest };
