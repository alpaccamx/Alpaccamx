// Lee y valida los comprobantes de pago que manda una clienta (hasta 3 a la vez).
// Cada archivo: imagen o PDF de verdad (se revisa por sus primeros bytes).
const { detectFileType } = require("./file-signature.js");

const MAX_COMPROBANTES = 3;
const MAX_CADA = 5 * 1024 * 1024;
// Todo viaja en una sola petición (límite ~6 MB en base64): ~4.4 MB de archivos.
const MAX_TOTAL = 4.4 * 1024 * 1024;

/* raw: arreglo de { filename, contentType, dataBase64 } (o un solo objeto).
   Regresa { files: [{ buffer, filename, contentType }] } o { error }. */
function leerComprobantes(raw) {
  const lista = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((x) => x && x.dataBase64);
  if (!lista.length) return { error: "Sube tu comprobante de transferencia." };
  if (lista.length > MAX_COMPROBANTES) return { error: `Puedes subir hasta ${MAX_COMPROBANTES} comprobantes.` };
  const files = [];
  let total = 0;
  for (const p of lista) {
    let buffer;
    try { buffer = Buffer.from(String(p.dataBase64), "base64"); } catch (err) { return { error: "Un comprobante no se pudo leer." }; }
    if (!buffer.length || buffer.length > MAX_CADA) return { error: "Cada comprobante debe pesar menos de 5 MB." };
    const real = detectFileType(buffer);
    if (!real) return { error: "Los comprobantes deben ser imágenes o PDF." };
    total += buffer.length;
    files.push({
      buffer,
      filename: String(p.filename || "comprobante").slice(0, 120),
      contentType: real === "pdf" ? "application/pdf" : typeof p.contentType === "string" && /^image\/[a-z0-9.+-]+$/i.test(p.contentType) ? p.contentType : "image/jpeg",
    });
  }
  if (total > MAX_TOTAL) return { error: "Los comprobantes pesan demasiado juntos. Súbelos como capturas de pantalla o fotos." };
  return { files };
}

module.exports = { leerComprobantes, MAX_COMPROBANTES };
