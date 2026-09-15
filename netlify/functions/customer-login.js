// Inicia sesión con correo + contraseña.
//
// Body esperado (JSON): { email, password }
//
// A propósito regresa el mismo mensaje de error tanto si el correo no
// existe como si la contraseña está mal -- así nadie puede usar este
// endpoint para averiguar qué correos ya tienen cuenta.

const bcrypt = require("bcryptjs");
const { getCustomerByEmail, normalizeEmail } = require("./lib/customer-store.js");
const { signCustomerToken } = require("./lib/customer-auth.js");

const GENERIC_ERROR = "Correo o contraseña incorrectos.";

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
  const password = String(body.password || "");
  if (!email || !password) return jsonResponse(400, { error: GENERIC_ERROR });

  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return jsonResponse(401, { error: GENERIC_ERROR });

  const matches = await bcrypt.compare(password, customer.passwordHash);
  if (!matches) return jsonResponse(401, { error: GENERIC_ERROR });

  let token;
  try {
    token = signCustomerToken(email);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: "Falta configurar el sitio para iniciar sesión (CUSTOMER_JWT_SECRET)." });
  }

  return jsonResponse(200, { token, name: customer.name });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
