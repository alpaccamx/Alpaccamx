// Cambia la contraseña usando el link que se mandó por correo (ver
// customer-forgot-password.js).
//
// Body esperado (JSON): { email, token, newPassword }

const bcrypt = require("bcryptjs");
const { getCustomerByEmail, updateCustomerFields, normalizeEmail } = require("./lib/customer-store.js");

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
  const token = String(body.token || "");
  const newPassword = String(body.newPassword || "");

  if (!email || !token) return jsonResponse(400, { error: "Link de recuperación inválido." });
  if (newPassword.length < 8) return jsonResponse(400, { error: "La contraseña debe tener al menos 8 caracteres." });

  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer || !customer.resetToken || customer.resetToken !== token) {
    return jsonResponse(400, { error: "Link de recuperación inválido o ya usado." });
  }
  if (!customer.resetTokenExpiresAt || Date.now() > customer.resetTokenExpiresAt) {
    return jsonResponse(400, { error: "Este link ya venció. Pide uno nuevo." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  try {
    await updateCustomerFields(email, {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
    });
  } catch (err) {
    console.error("Error guardando la contraseña nueva:", err);
    return jsonResponse(500, { error: "No se pudo cambiar la contraseña. Intenta de nuevo." });
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
