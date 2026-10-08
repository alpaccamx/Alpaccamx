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
const { detectFileType } = require("./lib/file-signature.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { checkRateLimit, getClientIp } = require("./lib/rate-limit.js");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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

  const { orderId, filename, contentType, dataBase64 } = body;
  if (!orderId || !dataBase64) {
    return jsonResponse(400, { error: "Faltan orderId o el archivo." });
  }

  let buffer;
  try {
    buffer = Buffer.from(dataBase64, "base64");
  } catch (err) {
    return jsonResponse(400, { error: "El archivo no se pudo leer." });
  }
  if (!buffer.length || buffer.length > MAX_BYTES) {
    return jsonResponse(400, { error: "El archivo debe pesar menos de 5MB." });
  }

  // No confiamos en el "contentType" que manda el navegador (es fácil de
  // falsificar) -- se verifica el contenido real del archivo por sus
  // primeros bytes. Ver lib/file-signature.js.
  const realType = detectFileType(buffer);
  if (!realType) {
    return jsonResponse(400, { error: "Solo se aceptan imágenes o archivos PDF." });
  }

  // El contentType que se guarda (para servirlo luego con el header
  // correcto en admin-payment-proof.js) también se sanea: si el archivo
  // sí es un PDF/imagen real, se usa el que mandó el navegador solo si
  // "hace juego" con lo que se detectó en los bytes; si no, un valor
  // genérico seguro para ese tipo.
  const safeContentType =
    realType === "pdf"
      ? "application/pdf"
      : typeof contentType === "string" && /^image\/[a-z0-9.+-]+$/i.test(contentType)
        ? contentType
        : "image/jpeg";

  try {
    const order = await getOrder(orderId);
    // Mismo mensaje para "no existe" y "no es tuyo", para no revelar qué
    // folios existen.
    if (!order || String(order.customerEmail || "") !== String(customerEmail).toLowerCase()) {
      return jsonResponse(404, { error: "Pedido no encontrado." });
    }
    if (order.status !== "pending") {
      return jsonResponse(409, { error: "Este pedido ya no acepta comprobantes." });
    }
    if (order.source !== "transferencia" && order.source !== "whatsapp") {
      return jsonResponse(409, { error: "Este pedido no se paga por transferencia." });
    }

    await savePaymentProof(orderId, buffer, { contentType: safeContentType, filename: String(filename || "comprobante") });
    await updateOrderFields(orderId, {
      hasPaymentProof: true,
      proofFilename: String(filename || "comprobante"),
      proofContentType: safeContentType,
      proofUploadedAt: new Date().toISOString(),
    });

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
