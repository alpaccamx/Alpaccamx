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
const FOLIO = { paquete: "P", compra: "C", envio: "E", casillero: "ALP" };

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

/* Código de casillero de cada clienta: "ALP-" + su nombre (ALP-ANA LOPEZ).
   Va en el "Last name" de la dirección americana, así Mae sabe de quién
   es un paquete aunque no lo hayan registrado y el repartidor no ve nada
   raro en la dirección. Máximo 15 caracteres. Nunca se repite y no lleva
   números: si ya existe, se usa su otro apellido (ALP-ANA GARCIA) y si aun
   así existe, se agrega una letra (ALP-ANA LOPE B, C...). Se asigna la primera vez que
   abre su casillero y ya no cambia; "casillero-code/<código>" sirve para
   buscarla por código. */
const casKey = (email) => `casillero/${encodeURIComponent(String(email).toLowerCase())}`;
const codeKey = (code) => `casillero-code/${encodeURIComponent(String(code).toUpperCase())}`;

const cleanName = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z ]+/g, " ").replace(/\s+/g, " ").trim();

/* Máximo 15 caracteres en total ("ALP-" + 11): cabe en el apellido de
   cualquier tienda de EE.UU. y en la guía de la paquetería. */
const CODE_MAX = 15;
const cut = (t, n) => t.slice(0, n).trim();

function codeCandidates(name, email) {
  let words = cleanName(name).split(" ").filter(Boolean);
  if (!words.length) words = cleanName(String(email).split("@")[0]).split(" ").filter(Boolean);
  if (!words.length) words = ["CLIENTA"];
  const room = CODE_MAX - 4;
  const first = words[0];
  const surnames = words.length > 2 ? [words[words.length > 3 ? 2 : 1], words[words.length - 1]] : words.slice(1);
  const bases = [...new Set([
    cut([first, surnames[0]].filter(Boolean).join(" "), room),
    ...(surnames[1] ? [cut(`${first} ${surnames[1]}`, room), cut(`${first} ${surnames[0][0]}${surnames[1][0]}`, room)] : []),
  ])];
  const out = bases.map((b) => `ALP-${b}`);
  const letters = "BCDEFGHJKLMNPQRSTUVWXYZ";
  for (const l of letters) out.push(`ALP-${cut(bases[0], room - 2)} ${l}`);
  for (const l1 of letters) for (const l2 of letters) out.push(`ALP-${cut(bases[0], room - 3)} ${l1}${l2}`);
  return out;
}

async function casilleroDe(email, name) {
  const s = store();
  const cur = await s.get(casKey(email), { type: "json" });
  // Los primeros códigos llevaban número o eran más largos: se cambian.
  if (cur && cur.code && !/\d/.test(cur.code) && cur.code.length <= CODE_MAX) return cur.code;
  let code = "";
  for (const c of codeCandidates(name, email)) {
    const res = await s.setJSON(codeKey(c), { email }, { onlyIfNew: true });
    if (res.modified) { code = c; break; }
    const owner = await s.get(codeKey(c), { type: "json" });
    if (owner && owner.email === email) { code = c; break; }
  }
  if (!code) throw new Error("No se pudo asignar el código de casillero.");
  await s.setJSON(casKey(email), { code, email, createdAt: (cur && cur.createdAt) || new Date().toISOString() });
  if (cur && cur.code && cur.code !== code) await s.delete(codeKey(cur.code)).catch(() => {});
  return code;
}
async function emailDeCasillero(code) {
  const r = await store().get(codeKey(code), { type: "json" });
  return r ? r.email : null;
}
/* { email: código } de todas las clientas que ya tienen código. */
async function todosLosCasilleros() {
  const s = store();
  const { blobs } = await s.list({ prefix: "casillero/" });
  const out = {};
  (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).forEach((r) => { if (r && r.email) out[r.email] = r.code; });
  return out;
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

module.exports = { nextFolio, saveRecord, getRecord, listRecords, mutateRecord, saveFile, getFile, casilleroDe, emailDeCasillero, todosLosCasilleros };
