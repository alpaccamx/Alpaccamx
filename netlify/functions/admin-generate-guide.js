// Genera una guía de envío con Envíos Perros para un pedido y guarda el
// número de guía y la paquetería usada en el pedido.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON):
//   { orderId, weight, courier, service, destination }
// "destination" lo arma /admin.html a partir de los datos del cliente,
// pero el admin puede corregirlo antes de mandarlo (ej. número exterior
// que no venía en el pedido).

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
const { createLabel } = require("./lib/enviosperros.js");

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

  const { orderId, weight, courier, service, destination } = body;
  const weightNum = Number(weight);
  if (!orderId || !weightNum || weightNum <= 0 || !courier || !service || !destination) {
    return jsonResponse(400, { error: "Faltan datos para generar la guía." });
  }

  try {
    const existing = await getOrder(orderId);
    if (!existing) return jsonResponse(404, { error: "Pedido no encontrado." });

    const label = await createLabel({ weight: weightNum, courier, service, destination });

    const order = await updateOrderFields(orderId, {
      trackingNumber: label.trackingNumber,
      carrier: `${courier} ${service}`,
      shippedAt: new Date().toISOString(),
    });

    return jsonResponse(200, { order, label });
  } catch (err) {
    console.error("Error generando guía con Envíos Perros:", err.status, err.body || err.message);
    const detail = err.body && err.body.message ? err.body.message : null;
    return jsonResponse(502, { error: detail || "No se pudo generar la guía con Envíos Perros." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
