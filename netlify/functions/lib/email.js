// Envía correos (confirmación de pedido, recuperación de contraseña, etc.)
// usando la API de Resend.
//
// Variables de entorno necesarias (Netlify → Site settings → Environment
// variables):
//   RESEND_API_KEY   -> API key de tu cuenta de Resend
//   RESEND_FROM_EMAIL -> remitente, ej. "Alpacca <pedidos@alpacca.mx>"
//                        (tiene que ser de un dominio ya verificado en
//                        Resend -- ver README). Si no lo configuras, se usa
//                        "Alpacca <onboarding@resend.dev>" solo como
//                        respaldo de pruebas (Resend limita a quién le
//                        puedes mandar con ese remitente).
//
// Si falta RESEND_API_KEY, sendEmail() simplemente no manda nada (igual
// que las funciones de WhatsApp) -- no rompe el resto del flujo.

const RESEND_API = "https://api.resend.com/emails";

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return { sent: false };

  const from = process.env.RESEND_FROM_EMAIL || "Alpacca <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const resBody = await res.text();
    if (!res.ok) {
      console.error("Error mandando correo:", res.status, resBody);
      return { sent: false };
    }
    console.log("Correo aceptado por Resend:", resBody);
    return { sent: true };
  } catch (err) {
    console.error("Error de red mandando correo:", err);
    return { sent: false };
  }
}

function formatPriceMXN(n) {
  return (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

/* Plantilla base compartida por todos los correos -- header con el
   nombre de la tienda y un pie de página simple. */
// URL pública del logo (mascota + nombre) para el encabezado de los
// correos -- tiene que ser una URL absoluta (no una ruta relativa como
// "./assets/...") porque el correo se ve fuera del sitio, en el cliente
// de correo de quien lo recibe.
const LOGO_URL = "https://alpacca.mx/assets/logo-wordmark.png";

function baseEmailHTML(bodyHTML) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2b2b;">
      <div style="text-align: center; padding: 20px 0 4px;">
        <img src="${LOGO_URL}" alt="Alpacca" width="160" style="width: 160px; height: auto; display: inline-block;" />
      </div>
      <div style="background: #fff; border-radius: 14px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08);">
        ${bodyHTML}
      </div>
      <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">Alpacca · alpacca.mx</p>
    </div>`;
}

function resetPasswordEmailHTML(name, resetUrl) {
  return baseEmailHTML(`
    <p>¡Hola${name ? " " + name : ""}!</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Alpacca. Si fuiste tú, da clic en el botón de abajo (el link es válido por 1 hora):</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="background: #e07a8f; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: 700; display: inline-block;">Restablecer mi contraseña</a>
    </p>
    <p style="font-size: 13px; color: #777;">Si tú no pediste esto, puedes ignorar este correo -- tu contraseña sigue igual.</p>
  `);
}

/* Desglosa subtotal + envío (Corea/nacional por separado si aplica, o
   un solo renglón de envío si no) + comisión por tarjeta -- mismos
   campos y misma lógica que totalsBreakdownHTML() en admin.js, para que
   el desglose que ve la clienta en su correo cuadre con el que ve Mae en
   su panel. */
function orderBreakdownRowsHTML(order) {
  const subtotal = Number(order.subtotal) || 0;
  const shippingMXN = Number(order.shippingMXN) || 0;
  const shippingKoreaMXN = Number(order.shippingKoreaMXN) || 0;
  const shippingNacionalMXN = Number(order.shippingNacionalMXN) || 0;
  const cardFeeMXN = Number(order.cardFeeMXN) || 0;

  const row = (label, amount) =>
    `<div style="display:flex;justify-content:space-between;font-size:14px;padding:2px 0;"><span>${label}</span><span>${formatPriceMXN(amount)}</span></div>`;

  const rows = [row("Subtotal productos", subtotal)];
  if (shippingKoreaMXN > 0 || shippingNacionalMXN > 0) {
    if (shippingKoreaMXN > 0) rows.push(row("🌏 Envío Corea", shippingKoreaMXN));
    if (shippingNacionalMXN > 0) rows.push(row("🚚 Envío nacional", shippingNacionalMXN));
  } else if (shippingMXN > 0) {
    rows.push(row("Envío", shippingMXN));
  }
  if (cardFeeMXN > 0.5) {
    rows.push(row("💳 Comisión por pago con tarjeta", cardFeeMXN));
  }
  return rows.join("");
}

function paymentMethodLabel(order) {
  return order.source === "mercadopago" ? "💳 Pago con tarjeta" : "🏦 Pago por transferencia";
}

function orderConfirmedEmailHTML(order) {
  const itemsHTML = (order.items || [])
    .map((it) => `<li>${it.nombre} x${it.qty}</li>`)
    .join("");
  return baseEmailHTML(`
    <p>¡Hola${order.customer?.name ? " " + order.customer.name : ""}! 💗</p>
    <p>Ya confirmé tu pedido y lo estoy preparando con mucho cariño. En cuanto lo envíe te aviso con tu número de guía.</p>
    <p style="font-weight: 700; margin-top: 16px;">Pedido #${order.id.slice(0, 8).toUpperCase()}</p>
    <ul style="padding-left: 18px; font-size: 14px;">${itemsHTML}</ul>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #eee;">
      ${orderBreakdownRowsHTML(order)}
    </div>
    <p style="font-weight: 800; color: #e07a8f; font-size: 18px; margin-top: 8px;">Total: ${formatPriceMXN(order.grandTotal)}</p>
    <p style="font-size: 13px; color: #777;">${paymentMethodLabel(order)}</p>
    <p>¡Gracias por confiar en mí!</p>
  `);
}

function orderShippedEmailHTML(order) {
  const trackingLine = order.carrier
    ? `Guía: ${order.trackingNumber} · ${order.carrier}`
    : `Guía: ${order.trackingNumber}`;
  return baseEmailHTML(`
    <p>¡Hola${order.customer?.name ? " " + order.customer.name : ""}! 📦</p>
    <p>Tu pedido ya va en camino.</p>
    <p style="font-weight: 700; margin-top: 16px;">Pedido #${order.id.slice(0, 8).toUpperCase()}</p>
    <p style="font-size: 14px;">${trackingLine}</p>
    <p>Puedes ver el estatus y rastrear tu guía desde "Mi cuenta" en el sitio.</p>
    <p>¡Gracias por tu compra!</p>
  `);
}

function orderCancelledEmailHTML(order) {
  return baseEmailHTML(`
    <p>¡Hola${order.customer?.name ? " " + order.customer.name : ""}!</p>
    <p>Tu pedido se canceló y no se realizó ningún cobro.</p>
    <p style="font-weight: 700; margin-top: 16px;">Pedido #${order.id.slice(0, 8).toUpperCase()}</p>
    <p>Si crees que esto es un error o tienes dudas, contáctanos y con gusto te ayudamos.</p>
  `);
}

module.exports = {
  sendEmail,
  resetPasswordEmailHTML,
  orderConfirmedEmailHTML,
  orderShippedEmailHTML,
  orderCancelledEmailHTML,
};
