// Almacenamiento (Netlify Blobs) para las calificaciones/reseñas de
// producto -- solo pueden calificar clientas con cuenta que ya tienen un
// pedido PAGADO con ese SKU (ver customer-submit-review.js).
//
// Cada reseña se guarda con la llave "<sku>::<correo>" -- así una misma
// clienta solo puede tener una reseña por producto (si vuelve a
// calificarlo, se actualiza la que ya tenía en vez de crear otra), y se
// pueden listar todas las de un producto con list({ prefix: "<sku>::" })
// sin tener que revisar TODA la tienda.

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

function getReviewsStore() {
  return getStore({ name: "product-reviews", consistency: "strong", ...blobsClientOptions() });
}

function reviewKey(sku, email) {
  return `${sku}::${String(email || "").trim().toLowerCase()}`;
}

async function upsertReview({ sku, customerEmail, customerName, rating, comment }) {
  const store = getReviewsStore();
  const key = reviewKey(sku, customerEmail);
  const existing = await store.get(key, { type: "json" });
  const review = {
    id: key,
    sku,
    customerEmail: String(customerEmail || "").trim().toLowerCase(),
    customerName: customerName || "",
    rating,
    comment: comment || "",
    createdAt: (existing && existing.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await store.setJSON(key, review);
  return review;
}

async function listReviewsForSku(sku) {
  const store = getReviewsStore();
  const { blobs } = await store.list({ prefix: `${sku}::` });
  const reviews = [];
  for (const b of blobs) {
    const r = await store.get(b.key, { type: "json" });
    if (r) reviews.push(r);
  }
  reviews.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return reviews;
}

async function listAllReviews() {
  const store = getReviewsStore();
  const { blobs } = await store.list();
  const reviews = [];
  for (const b of blobs) {
    const r = await store.get(b.key, { type: "json" });
    if (r) reviews.push(r);
  }
  reviews.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return reviews;
}

async function deleteReview(id) {
  const store = getReviewsStore();
  await store.delete(id);
}

module.exports = { upsertReview, listReviewsForSku, listAllReviews, deleteReview };
