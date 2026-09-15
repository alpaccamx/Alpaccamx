// Firma y valida el token de sesión de las clientas que inician sesión
// en el sitio (no confundir con ADMIN_KEY, que es para /admin.html).
//
// Variable de entorno necesaria (Netlify → Site settings → Environment
// variables): CUSTOMER_JWT_SECRET -- cualquier texto largo y aleatorio
// (ej. genera uno en https://1password.com/password-generator/, 40+
// caracteres). Si la cambias, todas las sesiones activas se cierran.

const jwt = require("jsonwebtoken");

const TOKEN_TTL = "30d";

function signCustomerToken(email) {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret) throw new Error("Falta configurar CUSTOMER_JWT_SECRET en Netlify.");
  return jwt.sign({ email }, secret, { expiresIn: TOKEN_TTL });
}

/* Regresa el email de la clienta si el token es válido, o null si no hay
   token, está vencido, o fue firmado con otro secreto. */
function verifyCustomerToken(event) {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret) return null;

  const header = event.headers && (event.headers.authorization || event.headers.Authorization);
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret);
    return payload.email || null;
  } catch (err) {
    return null;
  }
}

module.exports = { signCustomerToken, verifyCustomerToken };
