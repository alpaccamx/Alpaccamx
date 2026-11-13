// La clienta no debe ver la guía de su envío hasta que pague (guía anticipada).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { publico } = require("../netlify/functions/lib/swm-core.js");

test("envío cotizado con guía: se oculta la guía y se avisa que ya está lista", () => {
  for (const status of ["solicitado", "cotizado"]) {
    const r = publico({ paqueteIds: ["p1"], status, guia: "6105895301604722162726", paqueteria: "Estafeta Económica", guiaAt: "x", pago: { status: "revision" } });
    assert.equal(r.guia, undefined);
    assert.equal(r.paqueteria, undefined);
    assert.equal(r.guiaLista, true);
  }
});

test("ya pagado o enviado: la guía sí se ve", () => {
  for (const status of ["pagado", "enviado", "entregado"]) {
    const r = publico({ paqueteIds: ["p1"], status, guia: "123", paqueteria: "Estafeta" });
    assert.equal(r.guia, "123");
    assert.equal(r.guiaLista, undefined);
  }
});

test("sin guía no cambia nada", () => {
  const r = publico({ paqueteIds: ["p1"], status: "cotizado", guia: "" });
  assert.equal(r.guiaLista, undefined);
});
