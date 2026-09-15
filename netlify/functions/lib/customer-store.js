// Almacenamiento (Netlify Blobs) para las cuentas de clientas (correo +
// contraseña) que pueden iniciar sesión en el sitio para ver sus pedidos.
//
// Cada cuenta se guarda con el correo (en minúsculas) como llave:
//   { email, passwordHash, name, phone, createdAt,
//     resetToken, resetTokenExpiresAt }
//
// El teléfono es lo que conecta la cuenta con sus pedidos -- los pedidos
// YA se guardan con el teléfono del cliente (ver create-order.js), así que
// no hace falta tocar nada de ahí: "Mis pedidos" solo busca los pedidos
// cuyo customer.phone coincida con el de la cuenta.

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getCustomersStore() {
  return getStore({ name: "customers", consistency: "strong", ...blobsClientOptions() });
}

async function createCustomer({ email, passwordHash, name, phone }) {
  const store = getCustomersStore();
  const key = normalizeEmail(email);
  const customer = {
    email: key,
    passwordHash,
    name: String(name || ""),
    phone: String(phone || ""),
    createdAt: new Date().toISOString(),
  };
  const result = await store.setJSON(key, customer, { onlyIfNew: true });
  if (!result.modified) throw new Error("Ya existe una cuenta con ese correo.");
  return customer;
}

async function getCustomerByEmail(email) {
  const store = getCustomersStore();
  return store.get(normalizeEmail(email), { type: "json" });
}

/* Reintenta ante conflictos de concurrencia, igual que updateOrderFields
   en blob-store.js -- se usa para guardar el token de recuperación de
   contraseña y, luego, la contraseña nueva. */
async function updateCustomerFields(email, patch) {
  const store = getCustomersStore();
  const key = normalizeEmail(email);
  for (let attempt = 0; attempt < 6; attempt++) {
    const existing = await store.getWithMetadata(key, { type: "json" });
    if (!existing) return null;
    const updated = { ...existing.data, ...patch };
    const result = await store.setJSON(key, updated, { onlyIfMatch: existing.etag });
    if (result.modified) return updated;
  }
  throw new Error("No se pudo actualizar la cuenta (conflicto de concurrencia).");
}

module.exports = { normalizeEmail, createCustomer, getCustomerByEmail, updateCustomerFields };
