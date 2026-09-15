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
function baseEmailHTML(bodyHTML) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2b2b;">
      <div style="text-align: center; padding: 24px 0 8px;">
        <span style="font-size: 22px; font-weight: 800; color: #e07a8f;">🌸 Alpacca</span>
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

function orderConfirmedEmailHTML(order) {
  const itemsHTML = (order.items || [])
    .map((it) => `<li>${it.nombre} x${it.qty}</li>`)
    .join("");
  return baseEmailHTML(`
    <p>¡Hola${order.customer?.name ? " " + order.customer.name : ""}! 💗</p>
    <p>Ya confirmé tu pedido y lo estoy preparando con mucho cariño. En cuanto lo envíe te aviso con tu número de guía.</p>
    <p style="font-weight: 700; margin-top: 16px;">Pedido #${order.id.slice(0, 8).toUpperCase()}</p>
    <ul style="padding-left: 18px; font-size: 14px;">${itemsHTML}</ul>
    <p style="font-weight: 800; color: #e07a8f; font-size: 18px;">Total: ${formatPriceMXN(order.grandTotal)}</p>
    <p>¡Gracias por confiar en mí!</p>
  `);
}

module.exports = { sendEmail, resetPasswordEmailHTML, orderConfirmedEmailHTML };
