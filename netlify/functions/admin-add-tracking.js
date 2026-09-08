// Guarda el número de guía (y paquetería, opcional) de un pedido ya
// pagado, para que /admin.html pueda armar el mensaje de WhatsApp con el
// que avisas al cliente que su pedido ya va en camino.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { orderId, trackingNumber, carrier }

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");

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

  const { orderId, trackingNumber, carrier } = body;
  if (!orderId || !trackingNumber || !String(trackingNumber).trim()) {
    return jsonResponse(400, { error: "Faltan orderId o el número de guía." });
  }

  try {
    const existing = await getOrder(orderId);
    if (!existing) return jsonResponse(404, { error: "Pedido no encontrado." });

    const order = await updateOrderFields(orderId, {
      trackingNumber: String(trackingNumber).trim(),
      carrier: String(carrier || "").trim(),
      shippedAt: new Date().toISOString(),
    });

    return jsonResponse(200, { order });
  } catch (err) {
    console.error("Error guardando la guía del pedido:", err);
    return jsonResponse(500, { error: "No se pudo guardar la guía." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
