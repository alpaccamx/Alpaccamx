// Apartados del Sephora Sale dentro de la caja de un envío de la dirección
// americana: admin-preventa "caja_envio" los mete/saca, y cuando el envío
// sale con guía (marcarOrdenesDeCaja) quedan enviados con esa misma guía.
// Sin red ni Netlify Blobs: todo se simula aquí.

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_KEY = "admin-clave-de-prueba-0123456789abcdef";

const blobStore = require("../netlify/functions/lib/blob-store.js");
const preventaStore = require("../netlify/functions/lib/preventa-store.js");
const swmStore = require("../netlify/functions/lib/swm-store.js");

let apartados = {};
let envios = {};
const orders = [];
blobStore.listOrders = async () => orders;
blobStore.updateOrderFields = async (id, patch) => Object.assign(orders.find((o) => o.id === id), patch);
preventaStore.listApartados = async () => Object.values(apartados);
preventaStore.getApartado = async (id) => apartados[id] || null;
preventaStore.mutateApartado = async (id, fn) => {
  const cur = apartados[id];
  if (!cur) return null;
  const out = fn(JSON.parse(JSON.stringify(cur)));
  if (!out) return cur;
  apartados[id] = out;
  return out;
};
swmStore.getRecord = async (kind, id) => (kind === "envio" ? envios[id] || null : null);

const preventa = require("../netlify/functions/admin-preventa.js").handler;
const { marcarOrdenesDeCaja } = require("../netlify/functions/lib/swm-core.js");

const post = (body) => preventa({ httpMethod: "POST", headers: { "x-admin-key": process.env.ADMIN_KEY }, body: JSON.stringify(body) });

beforeEach(() => {
  apartados = {
    a1: { id: "a1", folio: "PV-0006", status: "liquidado", entrega: "envio", envio: 180 },
    a2: { id: "a2", folio: "PV-0007", status: "llego", entrega: "envio" },
    a3: { id: "a3", folio: "PV-0008", status: "liquidado", entrega: "personal" },
  };
  envios = { e11: { id: "e11", folio: "E-0011", status: "solicitado" }, e9: { id: "e9", folio: "E-0009", status: "enviado" } };
});

test("caja_envio mete un apartado liquidado en la caja del envío", async () => {
  const res = await post({ accion: "caja_envio", ids: ["a1"], cajaEnvioId: "e11" });
  assert.equal(res.statusCode, 200);
  assert.equal(apartados.a1.cajaEnvioId, "e11");
});

test("caja_envio no acepta apartados sin liquidar ni de entrega en persona", async () => {
  assert.equal((await post({ accion: "caja_envio", ids: ["a2"], cajaEnvioId: "e11" })).statusCode, 409);
  assert.equal((await post({ accion: "caja_envio", ids: ["a3"], cajaEnvioId: "e11" })).statusCode, 409);
  assert.equal(apartados.a2.cajaEnvioId, undefined);
});

test("caja_envio no usa un envío que ya salió o no existe", async () => {
  assert.equal((await post({ accion: "caja_envio", ids: ["a1"], cajaEnvioId: "e9" })).statusCode, 409);
  assert.equal((await post({ accion: "caja_envio", ids: ["a1"], cajaEnvioId: "nada" })).statusCode, 409);
});

test("caja_envio con null lo saca de la caja", async () => {
  await post({ accion: "caja_envio", ids: ["a1"], cajaEnvioId: "e11" });
  const res = await post({ accion: "caja_envio", ids: ["a1"], cajaEnvioId: null });
  assert.equal(res.statusCode, 200);
  assert.equal(apartados.a1.cajaEnvioId, undefined);
});

test("cuando el envío sale con guía, el apartado de la caja queda enviado con esa guía", async () => {
  apartados.a1.cajaEnvioId = "e11";
  apartados.a4 = { id: "a4", folio: "PV-0009", status: "liquidado", entrega: "envio" }; // de otra caja: no se toca
  await marcarOrdenesDeCaja({ id: "e11", folio: "E-0011", guia: "EST123", paqueteria: "Estafeta" });
  assert.equal(apartados.a1.status, "enviado");
  assert.equal(apartados.a1.guia, "EST123");
  assert.equal(apartados.a1.paqueteria, "Estafeta");
  assert.equal(apartados.a4.status, "liquidado");
});

test("sin guía no marca nada", async () => {
  apartados.a1.cajaEnvioId = "e11";
  await marcarOrdenesDeCaja({ id: "e11", folio: "E-0011" });
  assert.equal(apartados.a1.status, "liquidado");
});
