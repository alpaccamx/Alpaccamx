// Lista TODOS los pedidos (pendientes, pagados, cancelados, fallidos)
// para el panel /admin.html -- ahí se dividen en "Pedidos pendientes"
// (los que necesitan que confirmes a mano) y "Historial de pedidos"
// (todo, de más reciente a más antiguo).
//
// Requiere el header "x-admin-key" con el valor de la variable de
// entorno ADMIN_KEY configurada en Netlify.

const { listOrders } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
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
    const orders = await listOrders({});
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
