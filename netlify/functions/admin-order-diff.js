// Diferencia de un pedido editado (Mae le agregó cosas a un pedido ya
// pagado): la clienta sube el comprobante del pago extra desde Mis pedidos
// (upload-payment-proof.js) y aquí Mae lo aprueba o lo rechaza.
//
// Requiere el header "x-admin-key".
//   POST { orderId, pagado: true }           -> ya pagó la diferencia (con o sin
//        comprobante): montoPagado = grandTotal y se le avisa.
//   POST { orderId, rechazar: true, motivo } -> el comprobante no sirve; se le avisa.

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { avisarPedido, numeroPedido, fmtMXN } = require("./lib/order-notify.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }

  try {
    const order = await getOrder(String(b.orderId || ""));
    if (!order) return json(404, { error: "No encontré ese pedido." });
    if (order.status !== "paid") return json(409, { error: "Solo aplica a pedidos pagados." });
    const n = numeroPedido(order);
    const at = new Date().toISOString();
    const pagado = order.montoPagado != null ? Number(order.montoPagado) : Number(order.grandTotal) || 0;
    const debe = Math.round(((Number(order.grandTotal) || 0) - pagado) * 100) / 100;

    if (b.pagado) {
      if (!(debe > 0.5)) return json(409, { error: "Este pedido no tiene nada pendiente de pagar." });
      const saved = await updateOrderFields(order.id, {
        montoPagado: Number(order.grandTotal) || 0,
        proofsExtra: (order.proofsExtra || []).map((p) => (p.status === "revision" ? { ...p, status: "aprobado", revisadoAt: at } : p)),
        diferenciaPagadaAt: at,
      });
      await avisarPedido(saved, {
        asunto: `Recibimos tu pago de ${fmtMXN(debe)} (pedido ${n}) ✅`,
        texto: `recibimos tu pago de ${fmtMXN(debe)} de la diferencia de tu pedido ${n}. ¡Ya quedó todo pagado! Te seguimos avisando cómo va`,
      });
      return json(200, { orders: [saved] });
    }

    if (b.rechazar) {
      const motivo = String(b.motivo || "").trim().slice(0, 300) || "No pudimos validar tu comprobante.";
      const saved = await updateOrderFields(order.id, {
        proofsExtra: (order.proofsExtra || []).map((p) => (p.status === "revision" ? { ...p, status: "rechazado", motivo, revisadoAt: at } : p)),
      });
      await avisarPedido(saved, {
        asunto: `Revisa tu comprobante del pedido ${n}`,
        texto: `no pudimos validar el comprobante de la diferencia de tu pedido ${n}: ${motivo}. Puedes volver a subirlo en Mis pedidos`,
      });
      return json(200, { orders: [saved] });
    }
    return json(400, { error: "No entendí qué hacer." });
  } catch (err) {
    console.error("admin-order-diff:", err);
    return json(500, { error: "No se pudo guardar." });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
