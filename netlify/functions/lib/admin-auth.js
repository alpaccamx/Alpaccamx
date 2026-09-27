// Verifica la clave de administrador ("x-admin-key" o "?key=") contra
// ADMIN_KEY usando una comparación en tiempo constante (ver
// ./secure-compare.js) -- una comparación normal (!==) devuelve más
// rápido entre más caracteres difieran al principio, lo que en teoría
// deja adivinar la clave carácter por carácter midiendo tiempos de
// respuesta.

const { safeCompare } = require("./secure-compare.js");

// Regresa { configured, valid }. "configured" es false si ADMIN_KEY no
// está puesta en Netlify (error de configuración, no de autenticación).
//
// Solo se acepta la clave por el header "x-admin-key" -- nunca por
// query string (?key=...): ahí quedaría guardada en el historial del
// navegador, en los logs del servidor y en el header Referer de
// cualquier otra petición que salga desde esa página.
function checkAdminKey(event) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return { configured: false, valid: false };

  const providedKey = (event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"])) || "";

  return { configured: true, valid: safeCompare(providedKey, adminKey) };
}

module.exports = { safeCompare, checkAdminKey };
