// Avisos a la clienta cuando Mae mueve algo de su pedido de la tienda en
// /admin.html (etapa, productos, entrega personal, cancelación...): correo
// (el de la cuenta con la que compró) y
// WhatsApp con la plantilla "aviso_pedido" (ver README).

const { sendEmail, baseEmailHTML } = require("./email.js");
const { getCustomerByPhone } = require("./customer-store.js");
const { notifyCustomerTemplate } = require("./whatsapp.js");

const SITE = "https://alpacca.mx";
const numeroPedido = (order) => String(order.id || "").slice(0, 8).toUpperCase();

/* Correo de la clienta de un pedido: el de la cuenta con la que compró
   (los pedidos lo guardan en customerEmail, porque comprar pide iniciar
   sesión). Los pedidos viejos sin ese dato se buscan por teléfono. */
async function cuentaDelPedido(order) {
  if (order && order.customerEmail) return { email: order.customerEmail };
  return getCustomerByPhone(order && order.customer && order.customer.phone).catch(() => null);
}

/* texto = aviso corto (WhatsApp y resumen del correo); html = detalle
   extra opcional para el correo. */
async function avisarPedido(order, { asunto, texto, html = "", soloWhatsApp = false }) {
  if (!order) return;
  const c = order.customer || {};
  await notifyCustomerTemplate("aviso_pedido", { phone: c.phone, name: c.name, texto }).catch((err) => console.error("aviso_pedido:", err));
  if (soloWhatsApp) return;
  const cuenta = await cuentaDelPedido(order);
  if (!cuenta || !cuenta.email) return;
  await sendEmail({
    to: cuenta.email,
    subject: asunto,
    html: baseEmailHTML(`
      <h2 style="margin:0 0 8px;font-size:20px;">${esc(asunto)}</h2>
      <p style="font-size:14px;">${esc(texto.charAt(0).toUpperCase() + texto.slice(1))}.</p>
      ${html}
      <p style="margin-top:18px;"><a href="${SITE}/?ver=mis-pedidos" style="background:#c4466e;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600;">Ver mis pedidos</a></p>`),
  }).catch((err) => console.error("correo de aviso de pedido:", err));
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

module.exports = { avisarPedido, numeroPedido, cuentaDelPedido, esc };
