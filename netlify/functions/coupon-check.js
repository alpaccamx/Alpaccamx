// Revisa un cupón antes de usarlo (carrito de la tienda o pago de una
// cotización de Shop with Mae). Solo informa; el descuento de verdad se
// calcula y se cuenta en create-order.js / swm-client.js.
//
// Requiere "Authorization: Bearer <token>" (sesión de la clienta).
//   POST { code, ambito: "tienda" | "swm", base } -> { ok, terms } o { ok: false, error }

const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { checkRateLimit, getClientIp } = require("./lib/rate-limit.js");
const { getCoupon, checkCoupon, publicTerms } = require("./lib/coupons.js");

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const email = verifyCustomerToken(event);
  if (!email) return json(401, { ok: false, error: "Inicia sesión para usar un cupón." });
  // Para que no se puedan adivinar códigos a fuerza de intentos.
  const limit = await checkRateLimit(`coupon:${getClientIp(event)}`, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return json(429, { ok: false, error: "Demasiados intentos. Espera un poco." });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { ok: false, error: "JSON inválido." }); }
  try {
    const c = await getCoupon(b.code);
    const r = checkCoupon(c, { email, ambito: b.ambito === "swm" ? "swm" : "tienda", base: Number(b.base) || 0 });
    return json(200, r.ok ? { ok: true, terms: publicTerms(r.coupon) } : { ok: false, error: r.error });
  } catch (err) {
    console.error("coupon-check:", err);
    return json(500, { ok: false, error: "No se pudo revisar el cupón." });
  }
};
