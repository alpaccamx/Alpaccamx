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

const { getOrder, transitionOrder, transitionOrderFrom, applyStockDecrement, adjustStockSold, updateOrderFields } = require("./lib/blob-store.js");
const { notifySellerOrderPaid, notifyCustomerOrderConfirmed, notifySellerPaymentNeedsReview } = require("./lib/whatsapp.js");
const { applySheetStockDelta, deltaFromItems } = require("./lib/google-sheets.js");
const { TOLERANCE_MXN } = require("./lib/pricing.js");
const { getCustomerByPhone } = require("./lib/customer-store.js");
const { sendEmail, orderConfirmedEmailHTML } = require("./lib/email.js");

const MP_API = "https://api.mercadopago.com";

// Cada efecto (descuento de stock en el blob, descuento en el Sheet, avisos)
// se marca en el pedido al terminar. Así, si una parte falla y Mercado Pago
// reintenta, solo se completa lo que falta y nunca se descuenta dos veces.
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

    const orderId = payment.external_reference;

    if (payment.status === "refunded" || payment.status === "charged_back") {
      if (!orderId) return { statusCode: 200, body: "no external_reference" };
      await handleRefund(orderId, payment);
      return { statusCode: 200, body: "refund processed" };
    }

    if (payment.status !== "approved") {
      // Pendiente, rechazado, etc. Nada que descontar todavía.
      return { statusCode: 200, body: "not approved yet" };
    }

    if (!orderId) {
      console.error("Pago aprobado sin external_reference:", payment.id);
      return { statusCode: 200, body: "no external_reference" };
    }

    // El monto se revisa ANTES de marcar el pedido como pagado: si no
    // coincide con el total guardado, el pedido pasa a revisión y no se surte.
    const existing = await getOrder(orderId);
    if (!existing) {
      console.error("Webhook de Mercado Pago para un pedido inexistente:", orderId);
      return { statusCode: 200, body: "order not found" };
    }
    if (existing.status === "pending") {
      const amount = Number(payment.transaction_amount);
      if (!(Math.abs(amount - Number(existing.grandTotal)) <= TOLERANCE_MXN)) {
        console.error("Monto de Mercado Pago distinto al pedido:", { orderId, amount, expected: existing.grandTotal });
        await updateOrderFields(orderId, { status: "review", reviewReason: "amount_mismatch", paymentId: payment.id });
        await notifySellerPaymentNeedsReview(existing, `el monto cobrado es ${amount} y el pedido dice ${existing.grandTotal}`).catch((err) =>
          console.error("No se pudo avisar del monto distinto:", err)
        );
        return { statusCode: 200, body: "amount mismatch" };
      }
    }

    const { order: current } = await transitionOrder(orderId, "paid", {
      paidAt: new Date().toISOString(),
      paymentId: payment.id,
    });

    // El pedido no estaba pendiente (cancelado, fallido, en revisión). Se
    // deja constancia y se avisa; no se descuenta stock ni se marca pagado.
    if (current.status !== "paid") {
      await updateOrderFields(orderId, { paymentReceivedAfterStatus: current.status, paymentId: payment.id });
      await notifySellerPaymentNeedsReview(current, `el pedido estaba ${current.status}`).catch((err) =>
        console.error("No se pudo avisar del pago a revisar:", err)
      );
      return { statusCode: 200, body: "needs review" };
    }

    const order = current;
    if (!order.stockBlobAppliedAt) {
      await applyStockDecrement(order.items);
      await updateOrderFields(orderId, { stockBlobAppliedAt: new Date().toISOString() });
    }
    if (!order.sheetAppliedAt) {
      await applySheetStockDelta(deltaFromItems(order.items));
      await updateOrderFields(orderId, { sheetAppliedAt: new Date().toISOString() });
    }
    if (!order.notifiedAt) {
      await notifySellerOrderPaid(order);
      await notifyCustomerOrderConfirmed(order);

      // Igual que en admin-confirm-order.js: solo se manda si la clienta
      // tiene cuenta con ese teléfono (los pedidos no guardan correo).
      const customer = await getCustomerByPhone(order.customer?.phone).catch(() => null);
      if (customer?.email) {
        await sendEmail({
          to: customer.email,
          subject: "Tu pedido de Alpacca fue confirmado 🎉",
          html: orderConfirmedEmailHTML(order),
        }).catch((err) => console.error("No se pudo mandar el correo de confirmación:", err));
      }

      await updateOrderFields(orderId, { notifiedAt: new Date().toISOString() });
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    return { statusCode: 500, body: "internal error" };
  }
};

/* Reembolso o contracargo de un pago que ya se había contado: se repone el
   stock que ese pedido descontó, una sola vez. */
async function handleRefund(orderId, payment) {
  const { order } = await transitionOrderFrom(orderId, "paid", "refunded", {
    refundedAt: new Date().toISOString(),
    refundStatus: payment.status,
  });
  if (!order || order.status !== "refunded") return;
  if (order.stockBlobAppliedAt) {
    const negative = {};
    for (const [sku, qty] of Object.entries(deltaFromItems(order.items))) negative[sku] = -qty;
    await adjustStockSold(negative);
  }
  if (order.sheetAppliedAt) {
    const negative = {};
    for (const [sku, qty] of Object.entries(deltaFromItems(order.items))) negative[sku] = -qty;
    await applySheetStockDelta(negative);
  }
}

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
