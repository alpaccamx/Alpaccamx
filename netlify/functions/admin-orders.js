// Lista los pedidos pendientes de confirmar (WhatsApp/transferencia, y
// también intentos de Mercado Pago que se quedaron a medias), para el
// panel /admin.html.
//
// Requiere el header "x-admin-key" (o ?key= en la URL) con el valor de la
// variable de entorno ADMIN_KEY configurada en Netlify.

const { listOrders } = require("./lib/blob-store.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }

  const params = event.queryStringParameters || {};
  const providedKey = (event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"])) || params.key;
  if (providedKey !== adminKey) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  try {
    const orders = await listOrders({ status: "pending" });
    return jsonResponse(200, { orders });
  } catch (err) {
    console.error("Error listando pedidos:", err);
    return jsonResponse(500, { error: "No se pudieron cargar los pedidos." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(obj),
  };
}
