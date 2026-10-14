// "Shop with Mae" (casillero en EE.UU. + personal shopper + cruce a
// México), al estilo de Delivered: todo se registra y se paga en la página.
//
// Hay tres tipos de registro, cada uno con su folio:
//   paquete (P-0001): una caja que llega al almacén de Mae en El Paso.
//     registrado → recibido (peso, medidas, fotos) → en_envio → enviado
//     → entregado (o cancelado).
//   compra (C-0001): "Mae compra por mí". solicitud → cotizado → pagado
//     → comprado (Mae registra los paquetes) (o cancelado).
//   envio (E-0001): la clienta junta paquetes recibidos y pide que se los
//     manden a México. solicitado → cotizado → pagado → enviado →
//     entregado (o cancelado).
//
// Compras y envíos llevan un "pago": { status: "pendiente" | "revision" |
// "pagado", metodo, monto, ... }. Mercado Pago lo marca solo (webhook);
// por transferencia la clienta sube su comprobante y Mae lo aprueba.

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

const PREFIX = { paquete: "pkg/", compra: "buy/", envio: "ship/" };
const FOLIO = { paquete: "P", compra: "C", envio: "E" };

function store() {
  return getStore({ name: "swm", consistency: "strong", ...blobsClientOptions() });
}
function filesStore() {
  return getStore({ name: "swm-files", consistency: "strong", ...blobsClientOptions() });
}

async function nextFolio(kind) {
  const s = store();
  const key = `counter/${kind}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await s.getWithMetadata(key, { type: "json" });
    const n = ((cur && cur.data && cur.data.n) || 0) + 1;
    const res = cur ? await s.setJSON(key, { n }, { onlyIfMatch: cur.etag }) : await s.setJSON(key, { n }, { onlyIfNew: true });
    if (res.modified) return `${FOLIO[kind]}-${String(n).padStart(4, "0")}`;
  }
  throw new Error("No se pudo asignar el folio.");
}

async function saveRecord(kind, rec) {
  await store().setJSON(PREFIX[kind] + rec.id, rec);
  return rec;
}

async function getRecord(kind, id) {
  return store().get(PREFIX[kind] + id, { type: "json" });
}

async function listRecords(kind, { email } = {}) {
  const s = store();
  const { blobs } = await s.list({ prefix: PREFIX[kind] });
  const out = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter((r) => r && (!email || r.email === email));
  out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return out;
}

async function mutateRecord(kind, id, mutate) {
  const s = store();
  const key = PREFIX[kind] + id;
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await s.getWithMetadata(key, { type: "json" });
    if (!existing) return null;
    const updated = mutate(existing.data);
    if (!updated) return existing.data;
    updated.updatedAt = new Date().toISOString();
    const result = await s.setJSON(key, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return updated;
  }
  throw new Error("No se pudo actualizar (conflicto de concurrencia).");
}

/* Archivos: fotos de paquetes ("foto/<uuid>") y comprobantes de pago
   ("comprobante/<kind>/<id>"). */
async function saveFile(key, buffer, contentType) {
  await filesStore().set(key, buffer, { metadata: { contentType } });
}
async function getFile(key) {
  const r = await filesStore().getWithMetadata(key, { type: "arrayBuffer" });
  if (!r) return null;
  return { buffer: Buffer.from(r.data), contentType: (r.metadata && r.metadata.contentType) || "application/octet-stream" };
}

module.exports = { nextFolio, saveRecord, getRecord, listRecords, mutateRecord, saveFile, getFile };
