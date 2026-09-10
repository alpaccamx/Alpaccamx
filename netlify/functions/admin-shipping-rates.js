// Cotiza el envío de un pedido con Envíos Perros (para elegir paquetería
// antes de generar la guía desde /admin.html).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { orderId, weight }

const { getOrder } = require("./lib/blob-store.js");
const { quoteRates } = require("./lib/enviosperros.js");

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

  const { orderId, weight } = body;
  const weightNum = Number(weight);
  if (!orderId || !weightNum || weightNum <= 0) {
    return jsonResponse(400, { error: "Faltan el pedido o un peso válido." });
  }

  try {
    const order = await getOrder(orderId);
    if (!order) return jsonResponse(404, { error: "Pedido no encontrado." });

    const destinationZipCode = String(body.destinationZipCode || (order.customer && order.customer.cp) || "").trim();
    if (!destinationZipCode) {
      return jsonResponse(400, { error: "El pedido no tiene código postal del cliente." });
    }

    const rates = await quoteRates({ weight: weightNum, destinationZipCode });
    return jsonResponse(200, { rates });
  } catch (err) {
    console.error("Error cotizando envío con Envíos Perros:", err.status, err.body || err.message);
    return jsonResponse(502, { error: "No se pudo cotizar el envío con Envíos Perros." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
