// Webhook de Mercado Pago: se llama solo cuando un pago cambia de estado.
// Cuando el pago queda "approved", marca el pedido como pagado y descuenta
// las piezas vendidas del stock (una sola vez, aunque Mercado Pago
// reintente la misma notificación).
//
// URL a configurar del lado de Mercado Pago (se manda automáticamente al
// crear la preferencia en create-order.js, no requiere configuración
// manual):
//   https://TU-SITIO.netlify.app/.netlify/functions/mp-webhook
//
// Variable de entorno necesaria: MP_ACCESS_TOKEN

const { transitionOrder, applyStockDecrement } = require("./lib/blob-store.js");

const MP_API = "https://api.mercadopago.com";

exports.handler = async (event) => {
  try {
    const paymentId = extractPaymentId(event);
    if (!paymentId) {
      // No es una notificación de pago (ej. "merchant_order"): la confirmamos
      // sin hacer nada para que Mercado Pago no reintente.
      return { statusCode: 200, body: "ignored" };
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("Falta configurar MP_ACCESS_TOKEN en Netlify.");
      return { statusCode: 500, body: "missing MP_ACCESS_TOKEN" };
    }

    const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error("Error consultando el pago en Mercado Pago:", res.status);
      return { statusCode: 502, body: "mp payment lookup failed" };
    }
    const payment = await res.json();

    if (payment.status !== "approved") {
      // Pendiente, rechazado, etc. Nada que descontar todavía.
      return { statusCode: 200, body: "not approved yet" };
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      console.error("Pago aprobado sin external_reference:", payment.id);
      return { statusCode: 200, body: "no external_reference" };
    }

    const { order, transitioned } = await transitionOrder(orderId, "paid", {
      paidAt: new Date().toISOString(),
      paymentId: payment.id,
    });

    if (!order) {
      console.error("Webhook de Mercado Pago para un pedido inexistente:", orderId);
      return { statusCode: 200, body: "order not found" };
    }

    if (transitioned) {
      await applyStockDecrement(order.items);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    return { statusCode: 500, body: "internal error" };
  }
};

/* Mercado Pago manda la notificación de dos formas distintas según la
   integración: Webhooks v2 (POST con JSON { type, data: { id } }) o el
   formato IPN clásico (query params ?topic=payment&id=123 o
   ?type=payment&data.id=123). Soportamos ambos. */
function extractPaymentId(event) {
  const params = event.queryStringParameters || {};

  if (event.httpMethod === "POST" && event.body) {
    try {
      const body = JSON.parse(event.body);
      const type = body.type || body.topic;
      const id = body.data && body.data.id;
      if ((type === "payment" || !type) && id) return id;
    } catch (err) {
      // cuerpo no-JSON: seguimos con los query params
    }
  }

  const topic = params.topic || params.type;
  const id = params.id || params["data.id"];
  if ((topic === "payment" || !topic) && id) return id;

  return null;
}
