// Manda un aviso de WhatsApp al dueño del negocio (1) en cuanto un
// cliente hace un pedido nuevo -- aunque todavía no haya pagado -- y (2)
// cuando ese pago se confirma (Mercado Pago aprobado, o transferencia
// confirmada a mano en /admin.html), usando la API de WhatsApp Business
// Cloud de Meta. También manda, en ese mismo momento (2), un mensaje de
// plantilla al CLIENTE confirmándole su pedido.
//
// Variables de entorno necesarias (Netlify → Site settings →
// Environment variables), ver README sección 4:
//   WHATSAPP_ACCESS_TOKEN   -> token permanente de tu app de WhatsApp Business
//   WHATSAPP_PHONE_NUMBER_ID -> Phone Number ID (número de prueba) para tus
//                              propios avisos como dueña del negocio
//   NOTIFY_WHATSAPP_NUMBER  -> A qué número avisarte a ti, con código de
//                              país, solo dígitos, sin "+" (ej. 5216571920559)
//   WHATSAPP_CUSTOMER_PHONE_NUMBER_ID -> Phone Number ID del número de
//                              producción, para mandarle la confirmación
//                              de pedido al cliente con la plantilla
//                              "confirmacion_pedido" (ver README)
//
// Si falta alguna variable, simplemente no manda ese aviso en particular
// -- no rompe el resto del flujo de pago.

const GRAPH_API_VERSION = "v21.0";

function formatPriceMXN(n) {
  return (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

/* Detalle del pedido (productos, total, datos del cliente) que comparten
   el aviso de "pedido nuevo" y el de "pedido pagado" -- solo cambia el
   título de arriba. */
function orderDetailLines(order) {
  const lines = [
    ...(order.items || []).map((it) => `• ${it.nombre} x${it.qty}${it.enStock ? " (en stock)" : ""}`),
    "",
    `Total: ${formatPriceMXN(order.grandTotal)}`,
    `Cliente: ${order.customer?.name || "(sin nombre)"}`,
  ];
  if (order.customer?.phone) lines.push(`Teléfono: ${order.customer.phone}`);
  const direccion = [order.customer?.street, order.customer?.colonia].filter(Boolean).join(", ");
  const direccion2 = [order.customer?.municipio, order.customer?.estado].filter(Boolean).join(", ");
  if (direccion || direccion2 || order.customer?.cp) {
    const cpTxt = order.customer?.cp ? `CP ${order.customer.cp}` : "";
    lines.push(`Dirección: ${[direccion, direccion2, cpTxt].filter(Boolean).join(", ")}`);
  }
  if (order.customer?.referencias) lines.push(`Referencias: ${order.customer.referencias}`);
  if (order.customer?.notes) lines.push(`Notas: ${order.customer.notes}`);
  return lines;
}

function sourceLabel(order) {
  return order.source === "mercadopago" ? "Mercado Pago" : "transferencia";
}

/* Aviso al crear el pedido -- se manda de inmediato, ANTES de que se
   confirme el pago (con Mercado Pago puede que el cliente ni siquiera
   termine de pagar). Sirve para que sepas que alguien está comprando. */
function orderCreatedMessage(order) {
  const lines = [
    `🆕 *Pedido nuevo (${sourceLabel(order)}) -- aún sin confirmar*`,
    "",
    ...orderDetailLines(order),
  ];
  return lines.join("\n");
}

function orderPaidMessage(order) {
  const lines = [
    `🛒 *Nuevo pedido pagado (${sourceLabel(order)})*`,
    "",
    ...orderDetailLines(order),
  ];
  return lines.join("\n");
}

async function notifySellerWhatsApp(text) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = process.env.NOTIFY_WHATSAPP_NUMBER;
  if (!accessToken || !phoneNumberId || !to) return;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
    const resBody = await res.text();
    if (!res.ok) {
      console.error("Error enviando aviso de WhatsApp:", res.status, resBody);
    } else {
      console.log("Aviso de WhatsApp aceptado por Meta:", resBody);
    }
  } catch (err) {
    console.error("Error de red enviando aviso de WhatsApp:", err);
  }
}

/* Confirmación de pedido para el CLIENTE (no para ti) -- se manda con la
   plantilla de WhatsApp "confirmacion_pedido" (tiene que estar ya
   aprobada por Meta, ver README) porque es un mensaje que inicia el
   negocio, no una respuesta dentro de una conversación abierta. Usa el
   número de PRODUCCIÓN (WHATSAPP_CUSTOMER_PHONE_NUMBER_ID), no el de
   prueba que se usa para tus propios avisos. */
async function notifyCustomerOrderConfirmed(order) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CUSTOMER_PHONE_NUMBER_ID;
  const phoneDigits = String(order.customer?.phone || "").replace(/[^0-9]/g, "");
  if (!accessToken || !phoneNumberId || phoneDigits.length !== 10) return;

  const to = `52${phoneDigits}`;
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const total = formatPriceMXN(order.grandTotal);
  const name = order.customer?.name || "cliente";

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "confirmacion_pedido",
          language: { code: "es_MX" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: name },
                { type: "text", text: orderNumber },
                { type: "text", text: total },
              ],
            },
          ],
        },
      }),
    });
    const resBody = await res.text();
    if (!res.ok) {
      console.error("Error mandando confirmación de pedido al cliente:", res.status, resBody);
    } else {
      console.log("Confirmación de pedido al cliente aceptada por Meta:", resBody);
    }
  } catch (err) {
    console.error("Error de red mandando confirmación de pedido al cliente:", err);
  }
}

module.exports = { notifySellerWhatsApp, notifyCustomerOrderConfirmed, orderPaidMessage, orderCreatedMessage };
