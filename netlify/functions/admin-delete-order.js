// Borra permanentemente un pedido del historial de /admin.html, para que
// los pedidos cancelados o pagados que ya no sirven (ej. pruebas) no
// estorben en la lista.
//
// Por seguridad, solo borra pedidos que YA están en estado "cancelled" o
// "paid" -- no se puede borrar un pedido pendiente ni fallido desde aquí
// (primero hay que confirmarlo o cancelarlo con /admin-confirm-order).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { orderId }

const { deleteOrder } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const auth = checkAdminKey(event);
  if (!auth.configured) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  if (!auth.valid) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const { orderId } = body;
  if (!orderId) {
    return jsonResponse(400, { error: "Falta orderId." });
  }

  try {
    const result = await deleteOrder(orderId, { onlyIfStatus: ["cancelled", "paid"] });
    if (!result.deleted) {
      if (result.reason === "not_found") return jsonResponse(404, { error: "Pedido no encontrado." });
      return jsonResponse(400, { error: "Solo se pueden borrar pedidos cancelados o pagados." });
    }
    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error("Error borrando el pedido:", err);
    return jsonResponse(500, { error: "No se pudo borrar el pedido." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
