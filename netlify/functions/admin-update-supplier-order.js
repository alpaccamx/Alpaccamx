// Guarda una nota interna en el pedido: el número de pedido que dio
// Asian Beauty Wholesale al comprarle los productos para surtirlo. Es
// solo para la organización de Mae -- nunca se le muestra al cliente en
// ninguna parte del sitio, solo aparece en /admin.html.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { orderId, supplierOrderNumber }

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
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
  const supplierOrderNumber = String(body.supplierOrderNumber || "").trim().slice(0, 100);
  if (!orderId) {
    return jsonResponse(400, { error: "Falta orderId." });
  }

  try {
    const existing = await getOrder(orderId);
    if (!existing) return jsonResponse(404, { error: "Pedido no encontrado." });

    const order = await updateOrderFields(orderId, { supplierOrderNumber });
    return jsonResponse(200, { order });
  } catch (err) {
    console.error("Error guardando el número de pedido del proveedor:", err);
    return jsonResponse(500, { error: "No se pudo guardar la nota." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
