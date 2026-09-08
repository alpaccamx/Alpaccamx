// Manda un aviso de WhatsApp al dueño del negocio cuando se confirma un
// pago (Mercado Pago aprobado, o transferencia confirmada a mano en
// /admin.html), usando la API de WhatsApp Business Cloud de Meta.
//
// Variables de entorno necesarias (Netlify → Site settings →
// Environment variables), ver README sección 4:
//   WHATSAPP_ACCESS_TOKEN   -> token permanente de tu app de WhatsApp Business
//   WHATSAPP_PHONE_NUMBER_ID -> Phone Number ID que te da Meta (no es el número)
//   NOTIFY_WHATSAPP_NUMBER  -> A qué número avisar (el tuyo), con código de
//                              país, solo dígitos, sin "+" (ej. 5216571920559)
//
// Si falta cualquiera de las tres, simplemente no manda nada -- no rompe
// el resto del flujo de pago.

const GRAPH_API_VERSION = "v21.0";

function formatPriceMXN(n) {
  return (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function orderPaidMessage(order) {
  const sourceLabel = order.source === "mercadopago" ? "Mercado Pago" : "transferencia";
  const lines = [
    `🛒 *Nuevo pedido pagado (${sourceLabel})*`,
    "",
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
    if (!res.ok) {
      const errText = await res.text();
      console.error("Error enviando aviso de WhatsApp:", res.status, errText);
    }
  } catch (err) {
    console.error("Error de red enviando aviso de WhatsApp:", err);
  }
}

module.exports = { notifySellerWhatsApp, orderPaidMessage };
