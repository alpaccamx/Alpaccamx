// Lista o borra reseñas de producto -- para /admin.html. No hay cola de
// moderación previa (las reseñas se publican de inmediato al mandarlas),
// así que esto es para que Mae pueda quitar una si es inapropiada o falsa.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// GET: regresa { reviews: [...] }
// DELETE: body { id } -- borra esa reseña.

const { listAllReviews, deleteReview } = require("./lib/review-store.js");

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
      const reviews = await listAllReviews();
      return jsonResponse(200, { reviews });
    } catch (err) {
      console.error("Error listando reseñas:", err);
      return jsonResponse(500, { error: "No se pudieron cargar las reseñas." });
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
      await deleteReview(id);
      return jsonResponse(200, { ok: true });
    } catch (err) {
      console.error("Error borrando la reseña:", err);
      return jsonResponse(500, { error: "No se pudo borrar la reseña." });
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
