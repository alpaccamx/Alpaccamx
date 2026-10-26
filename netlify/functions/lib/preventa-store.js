// Preventa (ej. Sephora Sale): Mae sube productos con cupo y sus clientas
// los apartan pagando un anticipo; el resto (más el envío) lo pagan cuando
// llega la mercancía.
//
// Registros en el store "preventa":
//   config            la campaña: título, si está activa, fecha de cierre,
//                     cuándo llega, % de anticipo.
//   prod/<id>         un producto: nombre, marca, foto, precio por pieza,
//                     piezas (cupo para apartar), activo.
//   ap/<id>           un apartado (folio PV-0001) de una clienta:
//                     nuevo → apartado (anticipo pagado) → llego (Mae avisa
//                     y cobra el resto) → liquidado → enviado → entregado
//                     (o cancelado). Cada etapa de pago ("anticipo" y
//                     "resto") lleva { monto, status: "espera" | "pendiente"
//                     | "revision" | "pagado", metodo, ... }.
// Comprobantes de transferencia en el store "preventa-files":
//   comprobante/<id del apartado>/<anticipo|resto>.

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

function store() {
  return getStore({ name: "preventa", consistency: "strong", ...blobsClientOptions() });
}
function filesStore() {
  return getStore({ name: "preventa-files", consistency: "strong", ...blobsClientOptions() });
}

async function getConfig() {
  return (await store().get("config", { type: "json" })) || {};
}
async function saveConfig(cfg) {
  await store().setJSON("config", cfg);
  return cfg;
}

async function listar(prefix) {
  const s = store();
  const { blobs } = await s.list({ prefix });
  return (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean);
}

async function listProductos() {
  const out = await listar("prod/");
  out.sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  return out;
}
async function getProducto(id) {
  return store().get(`prod/${id}`, { type: "json" });
}
async function saveProducto(p) {
  await store().setJSON(`prod/${p.id}`, p);
  return p;
}
async function deleteProducto(id) {
  await store().delete(`prod/${id}`);
}

async function listApartados({ email } = {}) {
  const out = (await listar("ap/")).filter((a) => !email || a.email === email);
  out.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return out;
}
async function getApartado(id) {
  return store().get(`ap/${id}`, { type: "json" });
}
async function saveApartado(a) {
  await store().setJSON(`ap/${a.id}`, a);
  return a;
}
async function mutateApartado(id, mutate) {
  const s = store();
  const key = `ap/${id}`;
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

async function nextFolio() {
  const s = store();
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await s.getWithMetadata("counter/ap", { type: "json" });
    const n = ((cur && cur.data && cur.data.n) || 0) + 1;
    const res = cur ? await s.setJSON("counter/ap", { n }, { onlyIfMatch: cur.etag }) : await s.setJSON("counter/ap", { n }, { onlyIfNew: true });
    if (res.modified) return `PV-${String(n).padStart(4, "0")}`;
  }
  throw new Error("No se pudo asignar el folio.");
}

async function saveFile(key, buffer, contentType) {
  await filesStore().set(key, buffer, { metadata: { contentType } });
}
async function getFile(key) {
  const r = await filesStore().getWithMetadata(key, { type: "arrayBuffer" });
  if (!r) return null;
  return { buffer: Buffer.from(r.data), contentType: (r.metadata && r.metadata.contentType) || "application/octet-stream" };
}

module.exports = {
  getConfig, saveConfig, listProductos, getProducto, saveProducto, deleteProducto,
  listApartados, getApartado, saveApartado, mutateApartado, nextFolio, saveFile, getFile,
};
