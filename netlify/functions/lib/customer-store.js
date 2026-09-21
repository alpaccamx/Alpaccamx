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

/* Los pedidos no guardan a qué cuenta pertenecen (se conectan por
   teléfono, ver arriba), así que para mandar un correo de "tu pedido se
   envió/canceló" hay que buscar al revés: qué cuenta (si alguna) tiene
   ese mismo teléfono. Como la tienda está indexada por correo, no queda
   otra que recorrer todas las cuentas -- para el tamaño de este negocio
   (cientos, no millones, de cuentas) es rápido y no vale la pena
   mantener un índice aparte solo para esto. Si dos cuentas comparten
   teléfono (no debería pasar) regresa la primera que encuentre. */
async function getCustomerByPhone(phone) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const store = getCustomersStore();
  const { blobs } = await store.list();
  for (const b of blobs) {
    const customer = await store.get(b.key, { type: "json" });
    if (customer && String(customer.phone || "").replace(/[^0-9]/g, "") === digits) {
      return customer;
    }
  }
  return null;
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

module.exports = { normalizeEmail, createCustomer, getCustomerByEmail, getCustomerByPhone, updateCustomerFields };
