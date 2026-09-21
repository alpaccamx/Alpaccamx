// Guarda (o actualiza) la calificación de una clienta para un producto --
// solo se permite si ya tiene un pedido PAGADO con ese SKU (reseña
// verificada, no cualquiera puede calificar cualquier cosa).
//
// Requiere el header "Authorization: Bearer <token>" (el que regresa
// customer-login / customer-signup).
//
// Body esperado (JSON): { sku, productName, rating, comment? }

const { listOrders } = require("./lib/blob-store.js");
const { getCustomerByEmail } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { upsertReview } = require("./lib/review-store.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const email = verifyCustomerToken(event);
  if (!email) return jsonResponse(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const sku = String(body.sku || "").trim();
  const rating = Number(body.rating);
  const comment = String(body.comment || "").trim().slice(0, 1000);

  if (!sku) return jsonResponse(400, { error: "Falta el producto." });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse(400, { error: "La calificación debe ser un número entero del 1 al 5." });
  }

  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return jsonResponse(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  const phone = String(customer.phone || "").replace(/[^0-9]/g, "");
  const allOrders = await listOrders({ status: "paid" });
  const boughtIt = allOrders.some(
    (o) =>
      String(o.customer?.phone || "").replace(/[^0-9]/g, "") === phone &&
      (o.items || []).some((it) => it.sku === sku)
  );
  if (!boughtIt) {
    return jsonResponse(403, { error: "Solo puedes calificar productos que ya compraste y pagaste." });
  }

  try {
    await upsertReview({ sku, customerEmail: email, customerName: customer.name, rating, comment });
  } catch (err) {
    console.error("Error guardando la reseña:", err);
    return jsonResponse(500, { error: "No se pudo guardar tu calificación. Intenta de nuevo." });
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
