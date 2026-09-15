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

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const email = normalizeEmail(body.email);
  if (!email) return jsonResponse(400, { error: "Falta el correo." });

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

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
