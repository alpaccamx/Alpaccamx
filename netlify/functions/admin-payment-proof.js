// Sirve el comprobante de pago (imagen o PDF) que el cliente subió para
// un pedido, para que puedas verlo desde /admin.html antes de confirmar
// el pago.
//
// Requiere el header "x-admin-key" o "?key=" en la URL con el valor de
// ADMIN_KEY (se usa como <img src>/<a href>, por eso también acepta el
// query param, igual que admin-orders.js).
//
// GET /.netlify/functions/admin-payment-proof?orderId=...&key=...

const { getPaymentProof } = require("./lib/blob-store.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return { statusCode: 500, body: "Falta configurar ADMIN_KEY en Netlify." };
  }

  const params = event.queryStringParameters || {};
  const providedKey = (event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"])) || params.key;
  if (providedKey !== adminKey) {
    return { statusCode: 401, body: "Clave de administrador incorrecta." };
  }

  const orderId = params.orderId;
  if (!orderId) {
    return { statusCode: 400, body: "Falta orderId." };
  }

  try {
    const result = await getPaymentProof(orderId);
    if (!result || !result.data) {
      return { statusCode: 404, body: "No hay comprobante para este pedido." };
    }
    const contentType = (result.metadata && result.metadata.contentType) || "application/octet-stream";
    const buffer = Buffer.from(result.data);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("Error sirviendo el comprobante de pago:", err);
    return { statusCode: 500, body: "No se pudo cargar el comprobante." };
  }
};
