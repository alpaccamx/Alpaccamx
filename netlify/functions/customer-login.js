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
const { checkRateLimit, getClientIp } = require("./lib/rate-limit.js");

const GENERIC_ERROR = "Correo o contraseña incorrectos.";

// Hash de relleno (de una contraseña cualquiera, nadie la usa) para que
// bcrypt.compare() siempre tarde lo mismo exista o no la cuenta -- si no,
// cuando el correo no existe la respuesta llega más rápido (se salta el
// bcrypt real), y ese tiempo de más/menos deja adivinar por fuera qué
// correos ya tienen cuenta, aunque el mensaje de error sea idéntico.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q4x5cKI72s3Iujb9K8B6qgHKtE.8O";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Máximo 10 intentos cada 10 minutos por IP -- deja de sobra para que
  // alguien se equivoque de contraseña varias veces, pero frena un
  // intento de adivinar contraseñas a fuerza bruta.
  const rateLimit = await checkRateLimit(`login:${getClientIp(event)}`, { max: 10, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return jsonResponse(429, { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, rateLimit.retryAfterSeconds);
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
  const matches = await bcrypt.compare(password, customer ? customer.passwordHash : DUMMY_HASH);
  if (!customer || !matches) return jsonResponse(401, { error: GENERIC_ERROR });

  let token;
  try {
    token = signCustomerToken(email);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: "Falta configurar el sitio para iniciar sesión (CUSTOMER_JWT_SECRET)." });
  }

  return jsonResponse(200, { token, name: customer.name });
};

function jsonResponse(statusCode, obj, retryAfterSeconds) {
  const headers = { "Content-Type": "application/json" };
  if (retryAfterSeconds) headers["Retry-After"] = String(retryAfterSeconds);
  return { statusCode, headers, body: JSON.stringify(obj) };
}
