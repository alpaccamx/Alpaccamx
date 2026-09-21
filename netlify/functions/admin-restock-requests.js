// Lista o borra las solicitudes de "Avísame cuando vuelva" que dejan las
// clientas en productos agotados -- para /admin.html.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// GET: regresa { requests: [...] }
// DELETE: body { id } -- se borra cuando Mae ya le avisó a la clienta a
//   mano por WhatsApp.

const { listRestockRequests, deleteRestockRequest } = require("./lib/blob-store.js");

exports.handler = async (event) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  const providedKey = event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"]);
  if (providedKey !== adminKey) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  if (event.httpMethod === "GET") {
    try {
      const requests = await listRestockRequests();
      return jsonResponse(200, { requests });
    } catch (err) {
      console.error("Error listando las solicitudes de restock:", err);
      return jsonResponse(500, { error: "No se pudieron cargar las solicitudes." });
    }
  }

  if (event.httpMethod === "DELETE") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return jsonResponse(400, { error: "JSON inválido." });
    }
    const id = String(body.id || "").trim();
    if (!id) return jsonResponse(400, { error: "Falta el id." });
    try {
      await deleteRestockRequest(id);
      return jsonResponse(200, { ok: true });
    } catch (err) {
      console.error("Error borrando la solicitud de restock:", err);
      return jsonResponse(500, { error: "No se pudo borrar la solicitud." });
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
