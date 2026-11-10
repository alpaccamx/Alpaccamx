// GET /.netlify/functions/ops-pedido?folio=<folio>   (header "x-ops-key")
// Solo lectura, para operación: estado de un pedido de la tienda (número
// de 8 caracteres), de un envío (E-0001), compra (C-0001) o paquete
// (P-0001). Ver lib/ops.js para qué datos salen (y cuáles nunca).
const ops = require("./lib/ops.js");

exports.handler = ops.opsHandler(async (q) => {
  const d = await ops.cargarTodo();
  const r = ops.buscarFolio(q.folio, d);
  if (r.error) return ops.json(400, { error: r.error });
  if (!r.resultados.length) return ops.json(404, { error: "No encontré ese folio.", resultados: [] });
  return ops.json(200, { resultados: r.resultados });
});
