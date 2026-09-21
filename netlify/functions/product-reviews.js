// Endpoint público (sin llave) para leer calificaciones de producto.
//
// GET ?sku=XXX  -> { reviews: [...], avg, count } -- todas las reseñas de
//   ESE producto, para el modal de "ver reseñas".
// GET (sin sku) -> { summaries: { "<sku>": { avg, count }, ... } } -- un
//   resumen chiquito de TODOS los productos que ya tienen alguna reseña,
//   para pintar las estrellas en las tarjetas de producto sin tener que
//   pedir una por una.

const { listReviewsForSku, listAllReviews } = require("./lib/review-store.js");

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
      return jsonResponse(200, { reviews, avg: average(reviews), count: reviews.length });
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
    return jsonResponse(200, { summaries });
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
