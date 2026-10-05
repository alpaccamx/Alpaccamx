// Revisa diario (ver netlify.toml -- 9am hora CDMX) los pedidos que ya
// se enviaron pero todavía no se han marcado como entregados, usando la
// API de Shippo para consultar el estatus real de la guía (sin importar
// con qué paquetería/proveedor se haya generado -- Envíos Perros,
// Skydropx, o a mano). En cuanto Shippo dice que ya se entregó, le manda
// a la clienta un correo + WhatsApp preguntando si todo llegó bien, UNA
// sola vez por pedido (se guarda deliveryFollowupSentAt para no
// repetirlo al día siguiente).
//
// Esta función corre sola, programada -- no la llama nadie desde
// /admin.html. Netlify solo la ejecuta en el sitio ya publicado (no en
// deploy previews/branch deploys).
//
// Variable de entorno necesaria: SHIPPO_API_KEY (ver lib/shippo.js).

const { listOrders, updateOrderFields } = require("./lib/blob-store.js");
const { getTrackingStatus } = require("./lib/shippo.js");
const { getCustomerByPhone } = require("./lib/customer-store.js");
const { sendEmail, orderDeliveredEmailHTML } = require("./lib/email.js");
const { notifyCustomerOrderDelivered } = require("./lib/whatsapp.js");

exports.handler = async () => {
  const paidOrders = await listOrders({ status: "paid" });
  const pending = paidOrders.filter(
    (o) => o.trackingNumber && !o.deliveredAt && !o.deliveryFollowupSentAt
  );

  let checked = 0;
  let delivered = 0;

  for (const order of pending) {
    checked++;
    let status;
    try {
      status = await getTrackingStatus(order.carrier, order.trackingNumber);
    } catch (err) {
      console.error(`Error consultando Shippo para el pedido ${order.id}:`, err);
      continue;
    }
    if (status !== "DELIVERED") continue;

    delivered++;
    const updated = await updateOrderFields(order.id, {
      deliveredAt: new Date().toISOString(),
      deliveryFollowupSentAt: new Date().toISOString(),
    });

    const customer = await getCustomerByPhone(updated.customer?.phone).catch(() => null);
    if (customer?.email) {
      await sendEmail({
        to: customer.email,
        subject: "¿Todo bien con tu pedido de Alpacca? 💗",
        html: orderDeliveredEmailHTML(updated),
      });
    }
    await notifyCustomerOrderDelivered(updated);
  }

  console.log(`check-deliveries: ${checked} pedido(s) revisado(s), ${delivered} marcado(s) como entregado(s).`);
  return { statusCode: 200, body: "ok" };
};
