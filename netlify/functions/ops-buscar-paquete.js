// GET /.netlify/functions/ops-buscar-paquete?rastreo=<guía>   (header "x-ops-key")
// Solo lectura, para operación: de quién es un paquete y en qué va, a
// partir de su número de rastreo (guía de EE.UU. del casillero, o la guía
// nacional de un envío o pedido de la tienda). Ver lib/ops.js.
const ops = require("./lib/ops.js");

exports.handler = ops.opsHandler(async (q) => {
  const d = await ops.cargarTodo();
  const r = ops.buscarRastreo(q.rastreo, d);
  if (r.error) return ops.json(400, { error: r.error });
  if (!r.resultados.length) return ops.json(404, { error: "No encontré esa guía.", resultados: [] });
  return ops.json(200, { resultados: r.resultados });
});
