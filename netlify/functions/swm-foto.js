// Foto de un paquete de Shop with Mae (la que sube Mae al recibirlo).
// GET ?id=<uuid>. El id es aleatorio y solo aparece en el casillero de la
// dueña del paquete, así que se sirve sin sesión (para usarlo en <img>).

const { getFile } = require("./lib/swm-store.js");

exports.handler = async (event) => {
  const id = String((event.queryStringParameters || {}).id || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return { statusCode: 400, body: "id inválido" };
  const f = await getFile(`foto/${id}`).catch(() => null);
  if (!f) return { statusCode: 404, body: "no existe" };
  return {
    statusCode: 200,
    headers: { "Content-Type": f.contentType, "Cache-Control": "private, max-age=86400" },
    body: f.buffer.toString("base64"),
    isBase64Encoded: true,
  };
};
