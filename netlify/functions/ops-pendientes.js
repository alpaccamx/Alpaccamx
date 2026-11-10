// GET /.netlify/functions/ops-pendientes   (header "x-ops-key")
// Solo lectura, para operación: lo pendiente del día -- comprobantes por
// revisar, envíos/compras por cotizar, guías por hacer, paquetes con el
// almacenaje gratis por vencer o vencido, y paquetes sin dueña.
// Ver lib/ops.js.
const ops = require("./lib/ops.js");

exports.handler = ops.opsHandler(async () => {
  const d = await ops.cargarTodo();
  return ops.json(200, ops.pendientes(d));
});
