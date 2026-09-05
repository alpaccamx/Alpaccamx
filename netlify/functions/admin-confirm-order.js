// Confirma o cancela manualmente un pedido pendiente (usado para las
// ventas por transferencia que llegan por WhatsApp, que Mercado Pago no
// puede confirmar solo). Al confirmar, descuenta las piezas vendidas del
// stock igual que lo hace el webhook de Mercado Pago.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY (Netlify →
// Site settings → Environment variables).
//
// Body esperado (JSON): { orderId, action: "confirm" | "cancel" }

const { transitionOrder, applyStockDecrement } = require("./lib/blob-store.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }

  const providedKey = event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"]);
  if (providedKey !== adminKey) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const { orderId, action } = body;
  if (!orderId || (action !== "confirm" && action !== "cancel")) {
    return jsonResponse(400, { error: "Faltan orderId o action ('confirm'/'cancel')." });
  }

  try {
    if (action === "confirm") {
      const { order, transitioned } = await transitionOrder(orderId, "paid", {
        paidAt: new Date().toISOString(),
        confirmedBy: "admin",
      });
      if (!order) return jsonResponse(404, { error: "Pedido no encontrado." });
      if (transitioned) await applyStockDecrement(order.items);
      return jsonResponse(200, { order });
    }

    const { order } = await transitionOrder(orderId, "cancelled", {
      cancelledAt: new Date().toISOString(),
    });
    if (!order) return jsonResponse(404, { error: "Pedido no encontrado." });
    return jsonResponse(200, { order });
  } catch (err) {
    console.error("Error actualizando el pedido:", err);
    return jsonResponse(500, { error: "No se pudo actualizar el pedido." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
