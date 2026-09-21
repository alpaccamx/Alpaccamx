// Regresa los pedidos de la clienta que inició sesión -- para la sección
// "Mis pedidos" del sitio.
//
// Requiere el header "Authorization: Bearer <token>" (el que regresa
// customer-login / customer-signup).
//
// Los pedidos no se guardan con un id de cuenta -- se conectan por
// teléfono: se busca la cuenta por el correo del token, y se regresan
// todos los pedidos cuyo customer.phone coincida con el de esa cuenta.

const { listOrders } = require("./lib/blob-store.js");
const { getCustomerByEmail } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const email = verifyCustomerToken(event);
  if (!email) return jsonResponse(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return jsonResponse(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  const phone = String(customer.phone || "").replace(/[^0-9]/g, "");

  try {
    const allOrders = await listOrders({});
    const orders = phone
      ? allOrders.filter((o) => String(o.customer?.phone || "").replace(/[^0-9]/g, "") === phone)
      : [];
    return jsonResponse(200, { orders, name: customer.name, phone: customer.phone, email: customer.email });
  } catch (err) {
    console.error("Error listando los pedidos de la clienta:", err);
    return jsonResponse(500, { error: "No se pudieron cargar tus pedidos." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(obj),
  };
}
