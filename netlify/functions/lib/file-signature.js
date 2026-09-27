// Detecta el tipo real de un archivo mirando sus primeros bytes (firma /
// "magic bytes"), en vez de confiar en el Content-Type que manda el
// navegador -- ese header lo pone el cliente y se puede falsificar
// fácilmente para subir cualquier archivo disfrazado de imagen.
//
// Regresa "image", "pdf" o null (tipo no reconocido/no permitido).

function detectFileType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image";
  }

  // GIF: "GIF8"
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "GIF8") {
    return "image";
  }

  // WEBP: "RIFF"....'WEBP"
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image";
  }

  // BMP: "BM"
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "image";
  }

  // PDF: "%PDF-"
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "pdf";
  }

  return null;
}

module.exports = { detectFileType };
