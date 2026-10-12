// Papelera de pedidos de /admin.html. Los pedidos que se borran desde el
// admin (admin-delete-order) se quedan aquí 30 días antes de borrarse
// para siempre.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
//   GET                                   -> { orders: [...] }
//   POST { action: "restore", orderId }   -> regresa el pedido a la lista
//   POST { action: "purge", orderId }     -> lo borra para siempre

const { listTrashedOrders, restoreOrder, purgeTrashedOrder } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const auth = checkAdminKey(event);
  if (!auth.configured) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  if (!auth.valid) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  try {
    if (event.httpMethod === "GET") {
      return jsonResponse(200, { orders: await listTrashedOrders() });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return jsonResponse(400, { error: "JSON inválido." });
    }
    const orderId = String(body.orderId || "");
    if (!orderId) return jsonResponse(400, { error: "Falta orderId." });

    if (body.action === "restore") {
      const result = await restoreOrder(orderId);
      if (!result.restored) {
        if (result.reason === "exists") return jsonResponse(409, { error: "Ese pedido ya está en tu lista." });
        return jsonResponse(404, { error: "Ese pedido ya no está en la papelera." });
      }
      return jsonResponse(200, { ok: true, order: result.order });
    }
    if (body.action === "purge") {
      const result = await purgeTrashedOrder(orderId);
      if (!result.purged) return jsonResponse(404, { error: "Ese pedido ya no está en la papelera." });
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(400, { error: "Acción no válida." });
  } catch (err) {
    console.error("Error en la papelera:", err);
    return jsonResponse(500, { error: "No se pudo completar la acción." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
