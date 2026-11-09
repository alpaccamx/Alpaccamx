// Qué "reabastecimientos" de /stock-lotes/*.json ya se aplicaron. Sumar
// piezas a un producto que ya existe solo debe pasar UNA vez (si no, cada
// vez que el producto vuelve a bajar de esa cantidad la tarjeta lo pediría
// otra vez), así que se anota aquí, en el servidor, para que no importe
// desde qué celular o computadora lo aplique Mae.
//
// GET  → { aplicados: ["id", ...] }
// POST { id } → lo marca como aplicado.
// Requiere el header "x-admin-key".

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

const store = () => getStore({ name: "stock-lotes", consistency: "strong", ...blobsClientOptions() });
const KEY = "aplicados";

exports.handler = async (event) => {
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });
  try {
    if (event.httpMethod === "GET") {
      const data = await store().get(KEY, { type: "json" });
      return json(200, { aplicados: Object.keys(data || {}) });
    }
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    let b;
    try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
    const id = String(b.id || "").trim().slice(0, 120);
    if (!id) return json(400, { error: "Falta el id." });
    const s = store();
    for (let i = 0; i < 6; i++) {
      const cur = await s.getWithMetadata(KEY, { type: "json" });
      const map = (cur && cur.data) || {};
      if (map[id]) return json(200, { ok: true, ya: true });
      map[id] = new Date().toISOString();
      const res = await s.setJSON(KEY, map, cur && cur.etag ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
      if (res.modified) return json(200, { ok: true });
    }
    return json(409, { error: "Intenta de nuevo." });
  } catch (err) {
    console.error("admin-stock-lotes:", err);
    return json(500, { error: "No se pudo guardar." });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
