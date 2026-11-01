// Revisa en Mercado Pago qué pasó con un pedido de la tienda pagado con
// tarjeta que sigue "por confirmar" (la clienta no terminó de pagar, se
// le rechazó la tarjeta, eligió pagar en efectivo, o el aviso de Mercado
// Pago no llegó). Si ya hay un pago aprobado, lo aplica igual que
// mp-webhook (marca pagado, descuenta stock y avisa).
//
// Requiere el header "x-admin-key".  POST { orderId } ->
//   { pagos: [{ id, status, detalle, monto, metodo, fecha }], aplicado }

const { checkAdminKey } = require("./lib/admin-auth.js");
const { getOrder } = require("./lib/blob-store.js");
const { handler: mpWebhook } = require("./mp-webhook.js");

const MP_API = "https://api.mercadopago.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return json(500, { error: "Falta configurar MP_ACCESS_TOKEN en Netlify." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
  const orderId = String(body.orderId || "");
  const order = orderId ? await getOrder(orderId) : null;
  if (!order) return json(404, { error: "No encontré ese pedido." });

  const res = await fetch(`${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return json(502, { error: "Mercado Pago no respondió. Intenta en un momento." });
  const data = await res.json();
  const pagos = (data.results || []).map((p) => ({
    id: p.id, status: p.status, detalle: p.status_detail || "", monto: p.transaction_amount,
    metodo: p.payment_method_id || p.payment_type_id || "", fecha: p.date_created,
  }));

  let aplicado = false;
  const aprobado = pagos.find((p) => p.status === "approved");
  if (aprobado && order.status === "pending") {
    await mpWebhook({ httpMethod: "GET", queryStringParameters: { topic: "payment", id: String(aprobado.id) } });
    const despues = await getOrder(orderId);
    aplicado = !!despues && despues.status !== "pending";
  }
  return json(200, { pagos, aplicado });
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
