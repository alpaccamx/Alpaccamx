// Pide un link de recuperación de contraseña por correo.
//
// Body esperado (JSON): { email }
//
// A propósito SIEMPRE regresa éxito, exista o no una cuenta con ese
// correo -- así nadie puede usar este endpoint para averiguar qué
// correos ya tienen cuenta. Si sí existe, se manda el correo de verdad;
// si no, simplemente no pasa nada más.

const { randomBytes } = require("crypto");
const { getCustomerByEmail, updateCustomerFields, normalizeEmail } = require("./lib/customer-store.js");
const { sendEmail, resetPasswordEmailHTML } = require("./lib/email.js");
const { checkRateLimit, getClientIp } = require("./lib/rate-limit.js");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Máximo 5 solicitudes por hora por IP -- sin esto, alguien podría
  // automatizar este endpoint para saturar de correos "restablece tu
  // contraseña" a quien quiera (usa tu cuota de correo y molesta a la
  // víctima), aunque no exista una cuenta con ese correo.
  const ipLimit = await checkRateLimit(`forgot-password-ip:${getClientIp(event)}`, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed) {
    return jsonResponse(429, { error: "Demasiadas solicitudes. Espera un poco e intenta de nuevo." }, ipLimit.retryAfterSeconds);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const email = normalizeEmail(body.email);
  if (!email) return jsonResponse(400, { error: "Falta el correo." });

  // Además del límite por IP, uno por correo -- así, aunque alguien use
  // muchas IPs distintas, no puede bombardear repetidamente la bandeja
  // de UNA sola persona. Se revisa ANTES de saber si la cuenta existe,
  // para no delatar por status/tiempo de respuesta si el correo tiene
  // cuenta o no (ver nota arriba del archivo).
  const emailLimit = await checkRateLimit(`forgot-password-email:${email}`, { max: 3, windowMs: 60 * 60 * 1000 });
  if (!emailLimit.allowed) {
    return jsonResponse(200, { ok: true });
  }

  const customer = await getCustomerByEmail(email).catch(() => null);
  if (customer) {
    const resetToken = randomBytes(24).toString("hex");
    const resetTokenExpiresAt = Date.now() + RESET_TOKEN_TTL_MS;
    try {
      await updateCustomerFields(email, { resetToken, resetTokenExpiresAt });
      const siteUrl = (process.env.URL || "https://alpacca.mx").replace(/\/$/, "");
      const resetUrl = `${siteUrl}/?reset=${resetToken}&email=${encodeURIComponent(email)}`;
      await sendEmail({
        to: email,
        subject: "Restablece tu contraseña de Alpacca",
        html: resetPasswordEmailHTML(customer.name, resetUrl),
      });
    } catch (err) {
      console.error("Error preparando la recuperación de contraseña:", err);
      // No se le informa al front-end -- ver nota arriba.
    }
  }

  return jsonResponse(200, { ok: true });
};

function jsonResponse(statusCode, obj, retryAfterSeconds) {
  const headers = { "Content-Type": "application/json" };
  if (retryAfterSeconds) headers["Retry-After"] = String(retryAfterSeconds);
  return { statusCode, headers, body: JSON.stringify(obj) };
}
