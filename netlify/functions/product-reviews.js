// Endpoint público (sin llave) para leer calificaciones de producto.
//
// GET ?sku=XXX  -> { reviews: [...], avg, count } -- todas las reseñas de
//   ESE producto, para el modal de "ver reseñas".
// GET (sin sku) -> { summaries: { "<sku>": { avg, count }, ... }, recent } --
//   un resumen chiquito de TODOS los productos que ya tienen alguna
//   reseña, para pintar las estrellas en las tarjetas de producto sin
//   tener que pedir una por una, y las reseñas recientes para la portada.
// Nunca se regresa el correo de quien escribió la reseña.

const { listReviewsForSku, listAllReviews } = require("./lib/review-store.js");

/* Lo que se puede mostrar en público: nunca el correo (ni el id, que lo
   incluye) de quien escribió la reseña. */
function publicReview(r) {
  return { sku: r.sku, rating: r.rating, comment: r.comment || "", customerName: r.customerName || "", createdAt: r.createdAt };
}

/* Solo el nombre y la inicial del apellido, para la portada. */
function shortName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Clienta Alpacca";
  return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
}

function average(reviews) {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sku = event.queryStringParameters && event.queryStringParameters.sku;

  try {
    if (sku) {
      const reviews = await listReviewsForSku(sku);
      return jsonResponse(200, { reviews: reviews.map(publicReview), avg: average(reviews), count: reviews.length });
    }

    const all = await listAllReviews();
    const bySku = {};
    all.forEach((r) => {
      if (!bySku[r.sku]) bySku[r.sku] = [];
      bySku[r.sku].push(r);
    });
    const summaries = {};
    Object.keys(bySku).forEach((s) => {
      summaries[s] = { avg: average(bySku[s]), count: bySku[s].length };
    });
    // Reseñas recientes con comentario y 4 o 5 estrellas, para la portada.
    const recent = all
      .filter((r) => (r.rating || 0) >= 4 && String(r.comment || "").trim().length >= 12)
      .slice(0, 8)
      .map((r) => ({ ...publicReview(r), customerName: shortName(r.customerName) }));
    return jsonResponse(200, { summaries, recent });
  } catch (err) {
    console.error("Error leyendo reseñas:", err);
    return jsonResponse(500, { error: "No se pudieron cargar las reseñas." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(obj),
  };
}
