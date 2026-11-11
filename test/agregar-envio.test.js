// "agregar_a_envio" (admin-swm): meter más paquetes de la clienta en una
// caja que todavía no está cobrada ni tiene guía. Sin red ni Netlify Blobs.

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_KEY = "admin-clave-de-prueba-0123456789abcdef";

const swmStore = require("../netlify/functions/lib/swm-store.js");
let db = {};
swmStore.getRecord = async (kind, id) => (db[kind] && db[kind][id] ? JSON.parse(JSON.stringify(db[kind][id])) : null);
swmStore.mutateRecord = async (kind, id, fn) => {
  const cur = db[kind] && db[kind][id];
  if (!cur) return null;
  const out = fn(JSON.parse(JSON.stringify(cur)));
  if (!out) return cur;
  db[kind][id] = out;
  return out;
};
const swmCore = require("../netlify/functions/lib/swm-core.js");
swmCore.cotizacionSugerida = async (ps, consolidar) => ({ cruce: 0, consolidacion: consolidar ? 100 : 0, sinRegistro: 0, extras: 0, kg: ps.length * 2 });
const handler = require("../netlify/functions/admin-swm.js").handler;
const post = (body) => handler({ httpMethod: "POST", headers: { "x-admin-key": process.env.ADMIN_KEY }, body: JSON.stringify(body) });

beforeEach(() => {
  db = {
    envio: {
      e11: { id: "e11", folio: "E-0011", status: "solicitado", email: "v@x.com", paqueteIds: ["p1"] },
      e12: { id: "e12", folio: "E-0012", status: "cotizado", email: "v@x.com", paqueteIds: ["p1"], cotizacion: { total: 480 }, pago: { status: "pendiente", monto: 480 } },
      e13: { id: "e13", folio: "E-0013", status: "pagado", email: "v@x.com", paqueteIds: ["p1"], pago: { status: "pagado" } },
    },
    paquete: {
      p1: { id: "p1", folio: "P-0016", status: "en_envio", email: "v@x.com", envioId: "e11" },
      p2: { id: "p2", folio: "P-0020", status: "recibido", email: "v@x.com" },
      p3: { id: "p3", folio: "P-0021", status: "recibido", email: "otra@x.com" },
      p4: { id: "p4", folio: "P-0022", status: "recibido", email: "v@x.com", datosPendientes: true },
    },
  };
});

test("mete el paquete en la caja y lo marca en envío", async () => {
  const res = await post({ accion: "agregar_a_envio", id: "e11", paqueteIds: ["p2"] });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(db.envio.e11.paqueteIds, ["p1", "p2"]);
  assert.equal(db.envio.e11.consolidar, true);
  assert.equal(db.paquete.p2.status, "en_envio");
  assert.equal(db.paquete.p2.envioId, "e11");
});

test("si ya estaba cotizada, se vuelve a cotizar (sin cobro viejo)", async () => {
  const res = await post({ accion: "agregar_a_envio", id: "e12", paqueteIds: ["p2"] });
  assert.equal(res.statusCode, 200);
  assert.equal(db.envio.e12.status, "solicitado");
  assert.equal(db.envio.e12.cotizacion, null);
  assert.equal(db.envio.e12.pago, null);
});

test("no se puede en una caja ya pagada", async () => {
  assert.equal((await post({ accion: "agregar_a_envio", id: "e13", paqueteIds: ["p2"] })).statusCode, 409);
  assert.equal(db.paquete.p2.status, "recibido");
});

test("no acepta paquetes de otra clienta ni con datos pendientes", async () => {
  assert.equal((await post({ accion: "agregar_a_envio", id: "e11", paqueteIds: ["p3"] })).statusCode, 409);
  assert.equal((await post({ accion: "agregar_a_envio", id: "e11", paqueteIds: ["p4"] })).statusCode, 409);
  assert.deepEqual(db.envio.e11.paqueteIds, ["p1"]);
});
