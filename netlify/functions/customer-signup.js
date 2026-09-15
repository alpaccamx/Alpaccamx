// Crea una cuenta nueva de clienta (correo + contraseña) para que pueda
// iniciar sesión y ver sus pedidos en el sitio.
//
// Body esperado (JSON): { name, email, phone, password }
//
// El teléfono es el mismo que usa para sus pedidos (10 dígitos, México) --
// es lo que conecta la cuenta con su historial de compras.

const bcrypt = require("bcryptjs");
const { createCustomer, getCustomerByEmail, normalizeEmail } = require("./lib/customer-store.js");
const { signCustomerToken } = require("./lib/customer-auth.js");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || "").replace(/[^0-9]/g, "");
  const password = String(body.password || "");

  if (!name) return jsonResponse(400, { error: "Falta tu nombre." });
  if (!EMAIL_RE.test(email)) return jsonResponse(400, { error: "Correo inválido." });
  if (phone.length !== 10) return jsonResponse(400, { error: "El teléfono debe tener 10 dígitos." });
  if (password.length < 8) return jsonResponse(400, { error: "La contraseña debe tener al menos 8 caracteres." });

  const existing = await getCustomerByEmail(email).catch(() => null);
  if (existing) return jsonResponse(409, { error: "Ya existe una cuenta con ese correo." });

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await createCustomer({ email, passwordHash, name, phone });
  } catch (err) {
    console.error("Error creando la cuenta:", err);
    return jsonResponse(409, { error: "Ya existe una cuenta con ese correo." });
  }

  let token;
  try {
    token = signCustomerToken(email);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: "Falta configurar el sitio para iniciar sesión (CUSTOMER_JWT_SECRET)." });
  }

  return jsonResponse(200, { token, name });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
