// Guarda una solicitud de "Avísame cuando vuelva" que deja una clienta
// en un producto agotado -- no manda ningún aviso automático (no hay
// forma de detectar cuándo cambia el stock en el Sheet), pero aparece en
// /admin.html para que Mae le avise a mano por WhatsApp.
//
// Body esperado (JSON): { sku, productName, marca, phone, name? }

const { randomUUID } = require("crypto");
const { saveRestockRequest } = require("./lib/blob-store.js");
const { checkRateLimit, getClientIp } = require("./lib/rate-limit.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Sin límite, un script podría llenar la lista de "Avísame" del admin.
  const rateLimit = await checkRateLimit(`restock:${getClientIp(event)}`, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return jsonResponse(429, { error: "Demasiadas solicitudes. Espera un poco e intenta de nuevo." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const sku = String(body.sku || "").trim();
  const productName = String(body.productName || "").trim();
  const marca = String(body.marca || "").trim();
  const phone = String(body.phone || "").replace(/[^0-9]/g, "");
  const name = String(body.name || "").trim();

  if (!productName) return jsonResponse(400, { error: "Falta el producto." });
  if (phone.length !== 10) return jsonResponse(400, { error: "El teléfono debe tener 10 dígitos." });

  const request = {
    id: randomUUID(),
    sku,
    productName,
    marca,
    phone,
    name,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveRestockRequest(request);
  } catch (err) {
    console.error("Error guardando la solicitud de restock:", err);
    return jsonResponse(500, { error: "No se pudo guardar tu solicitud. Intenta de nuevo." });
  }

  return jsonResponse(200, { ok: true });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
