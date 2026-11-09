// Recibe el comprobante de pago (captura o PDF) que el cliente sube
// directamente desde el carrito para un pedido por transferencia
// (WhatsApp) -- así no tiene que mandarlo por WhatsApp aparte.
//
// Body esperado (JSON):
//   { orderId, filename, contentType, dataBase64 }
// dataBase64 es el contenido del archivo codificado en base64 (sin el
// prefijo "data:...;base64,").
//
// Público (no requiere clave de administrador) -- lo llama el sitio
// directo desde el navegador del cliente, justo después de crear el
// pedido.

const { getOrder, updateOrderFields, savePaymentProof } = require("./lib/blob-store.js");
const { leerComprobantes } = require("./lib/comprobantes.js");
const { avisarMae, numeroPedido } = require("./lib/order-notify.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { checkRateLimit, getClientIp } = require("./lib/rate-limit.js");


exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const customerEmail = verifyCustomerToken(event);
  if (!customerEmail) {
    return jsonResponse(401, { error: "Inicia sesión para subir tu comprobante." });
  }

  const rateLimit = await checkRateLimit(`proof:${getClientIp(event)}`, { max: 30, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return jsonResponse(429, { error: "Demasiados intentos. Espera un poco e intenta de nuevo." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const { orderId } = body;
  if (!orderId) {
    return jsonResponse(400, { error: "Falta orderId o el archivo." });
  }
  // Hasta 3 comprobantes a la vez ("proofs"); un solo archivo (formato anterior) también vale.
  const leidos = leerComprobantes(Array.isArray(body.proofs) ? body.proofs : { filename: body.filename, contentType: body.contentType, dataBase64: body.dataBase64 });
  if (leidos.error) return jsonResponse(400, { error: leidos.error });
  const archivos = leidos.files;

  try {
    const order = await getOrder(orderId);
    // Mismo mensaje para "no existe" y "no es tuyo", para no revelar qué
    // folios existen.
    if (!order || String(order.customerEmail || "") !== String(customerEmail).toLowerCase()) {
      return jsonResponse(404, { error: "Pedido no encontrado." });
    }
    // Pedido ya pagado al que Mae le agregó cosas: la clienta debe una
    // diferencia y sube el comprobante de ese pago extra (se guarda aparte
    // del comprobante original y Mae lo aprueba en el admin).
    const pagado = order.montoPagado != null ? Number(order.montoPagado) : Number(order.grandTotal) || 0;
    const debe = Math.round(((Number(order.grandTotal) || 0) - pagado) * 100) / 100;
    if (order.status === "paid") {
      if (!(debe > 0.5)) return jsonResponse(409, { error: "Este pedido no tiene nada pendiente de pagar." });
      let extras = [...(order.proofsExtra || [])];
      for (const f of archivos) {
        const n = extras.length;
        await savePaymentProof(`${orderId}/extra/${n}`, f.buffer, { contentType: f.contentType, filename: f.filename });
        extras.push({ n, filename: f.filename, contentType: f.contentType, at: new Date().toISOString(), monto: debe, status: "revision" });
      }
      await updateOrderFields(orderId, { proofsExtra: extras });
      await avisarMae(`🔎 ${(order.customer && order.customer.name) || "Una clienta"} subió el comprobante de lo que faltaba del pedido ${numeroPedido(order)} (${debe.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}). Revísalo en Pedidos del admin: alpacca.mx/admin`);
      return jsonResponse(200, { ok: true, extra: extras.length - 1 });
    }
    if (order.status !== "pending") {
      return jsonResponse(409, { error: "Este pedido ya no acepta comprobantes." });
    }
    if (order.source !== "transferencia" && order.source !== "whatsapp") {
      return jsonResponse(409, { error: "Este pedido no se paga por transferencia." });
    }

    const [primero, ...mas] = archivos;
    await savePaymentProof(orderId, primero.buffer, { contentType: primero.contentType, filename: primero.filename });
    for (let i = 0; i < mas.length; i++) await savePaymentProof(`${orderId}/p/${i + 1}`, mas[i].buffer, { contentType: mas[i].contentType, filename: mas[i].filename });
    await updateOrderFields(orderId, {
      hasPaymentProof: true,
      proofFilename: primero.filename,
      proofContentType: primero.contentType,
      proofUploadedAt: new Date().toISOString(),
      proofsMore: mas.map((f, i) => ({ n: i + 1, filename: f.filename, contentType: f.contentType })),
    });
    await avisarMae(`🔎 ${(order.customer && order.customer.name) || "Una clienta"} subió su comprobante del pedido ${numeroPedido(order)} por ${Number(order.grandTotal || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}. Revísalo en Pedidos del admin: alpacca.mx/admin`);

    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error("Error guardando el comprobante de pago:", err);
    return jsonResponse(500, { error: "No se pudo guardar el comprobante." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
