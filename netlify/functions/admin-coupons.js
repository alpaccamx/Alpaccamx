// Cupones de descuento desde /admin.html (ver lib/coupons.js).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
//   GET                                   -> { cupones: [...] }
//   POST { accion: "guardar", cupon: {...} } -> crea o edita (por código)
//   POST { accion: "borrar", code }          -> lo borra

const { checkAdminKey } = require("./lib/admin-auth.js");
const { listCoupons, saveCoupon, deleteCoupon } = require("./lib/coupons.js");

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });
  try {
    if (event.httpMethod === "GET") return json(200, { cupones: await listCoupons() });
    let b;
    try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
    if (b.accion === "guardar") return json(200, { cupon: await saveCoupon(b.cupon || {}) });
    if (b.accion === "borrar") { await deleteCoupon(b.code); return json(200, { ok: true }); }
    return json(400, { error: "Acción inválida." });
  } catch (err) {
    console.error("admin-coupons:", err);
    return json(400, { error: err.message || "No se pudo guardar." });
  }
};
