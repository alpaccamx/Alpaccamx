// "Guía de otra caja" (admin-generate-guide con cajaExtra): un envío que no
// cupo en una sola caja. Sin red ni Netlify Blobs: todo se simula aquí.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_KEY = "admin-clave-de-prueba-0123456789abcdef";

const swmStore = require("../netlify/functions/lib/swm-store.js");
const swmCore = require("../netlify/functions/lib/swm-core.js");
const preventaCore = require("../netlify/functions/lib/preventa-core.js");
const enviosPerros = require("../netlify/functions/lib/enviosperros.js");

let db = {}; let cotizaciones = []; let avisos = [];
swmStore.getRecord = async (k, id) => (db[k] && db[k][id] ? JSON.parse(JSON.stringify(db[k][id])) : null);
swmStore.mutateRecord = async (k, id, fn) => { const out = fn(JSON.parse(JSON.stringify(db[k][id]))); if (out) db[k][id] = out; return db[k][id]; };
swmCore.cotizarEnvio = async (id, b) => { cotizaciones.push(b); const e = db.envio[id]; e.cotizacion = { ...e.cotizacion, envio: b.envio, total: (b.cruce || 0) + (b.consolidacion || 0) + b.envio }; return { envio: e }; };
swmCore.avisar = async (...a) => { avisos.push(a); };
preventaCore.envioEstimado = async () => 250;
let guias = 0;
enviosPerros.createLabel = async () => ({ trackingNumber: `EST-${++guias}` });

const handler = require("../netlify/functions/admin-generate-guide.js").handler;
const post = (body) => handler({ httpMethod: "POST", headers: { "x-admin-key": process.env.ADMIN_KEY }, body: JSON.stringify(body) });
const base = { weight: 5, provider: "enviosperros", courier: "Estafeta", service: "Económica", destination: { name: "Ana", phone: "6561234567", street: "Calle", exteriorNumber: "1", neighborhood: "Centro", zipCode: "32000", references: "x" } };

beforeEach(() => {
  cotizaciones = []; avisos = [];
  db = { envio: {
    e1: { id: "e1", folio: "E-0011", status: "cotizado", guia: "EST-A", paqueteria: "Estafeta", paqueteIds: [], cotizacion: { cruce: 100, consolidacion: 100, envio: 250, total: 450 }, pago: { status: "pendiente" } },
    e2: { id: "e2", folio: "E-0012", status: "solicitado", paqueteIds: [] },
    e3: { id: "e3", folio: "E-0013", status: "enviado", guia: "EST-B", paqueteria: "Estafeta", paqueteIds: [], cotizacion: { total: 500 }, pago: { status: "pagado" } },
    e4: { id: "e4", folio: "E-0014", status: "cotizado", guia: "EST-C", paqueteIds: [], cotizacion: { total: 300 }, pago: { status: "revision" } },
  } };
});

test("sin pagar: guarda la 2a guía y suma su envío al cobro", async () => {
  const res = await post({ ...base, envioId: "e1", cajaExtra: true });
  assert.equal(res.statusCode, 200);
  assert.equal(db.envio.e1.guia, "EST-A");
  assert.deepEqual(db.envio.e1.guiasExtra.map((x) => x.guia), ["EST-1"]);
  assert.equal(cotizaciones[0].envio, 500); // 250 + 250 de la tabla
  assert.equal(cotizaciones[0].cruce, 100);
});

test("lo que Mae pone a mano en 'Cóbrale de envío' manda sobre la tabla", async () => {
  await post({ ...base, envioId: "e1", cajaExtra: true, cobrarEnvio: 120 });
  assert.equal(cotizaciones[0].envio, 370);
});

test("ya enviado: no cobra más y le avisa con todas las guías", async () => {
  const res = await post({ ...base, envioId: "e3", cajaExtra: true, cobrarEnvio: 120 });
  assert.equal(res.statusCode, 200);
  assert.equal(cotizaciones.length, 0);
  assert.equal(db.envio.e3.guiasExtra[0].cobro, 0);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0][2], /EST-B/);
});

test("sin guía de la primera caja o con comprobante en revisión: no deja", async () => {
  const antes = guias;
  assert.equal((await post({ ...base, envioId: "e2", cajaExtra: true })).statusCode, 409);
  assert.equal((await post({ ...base, envioId: "e4", cajaExtra: true })).statusCode, 409);
  assert.equal(guias, antes); // no se pagó ninguna etiqueta
});

test("sin cajaExtra sigue sin dejar una 2a guía", async () => {
  const res = await post({ ...base, envioId: "e1" });
  assert.equal(res.statusCode, 409);
  assert.match(JSON.parse(res.body).error, /otra caja/);
});
