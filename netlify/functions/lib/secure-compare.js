// Compara dos strings en tiempo constante (no revela por temporización
// cuántos caracteres coinciden al principio, a diferencia de === o !==).
// Se compara el hash SHA-256 de ambos valores -- así siempre tienen el
// mismo largo, que es un requisito de crypto.timingSafeEqual.

const crypto = require("crypto");

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

module.exports = { safeCompare };
