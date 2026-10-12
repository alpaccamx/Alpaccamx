// Cambia la ETAPA de surtido de uno o varios pedidos ya pagados:
//   pagado -> pedido_abw -> llego -> enviado -> entregado
// Es solo para la organización de Mae en /admin.html (no cambia el estado
// de pago ni el stock, ni le avisa nada a la clienta).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON):
//   { orderIds: ["..."], stage: "pedido_abw", supplierOrderNumber?: "10293-AB" }
// (también acepta { orderId } para uno solo). Si viene supplierOrderNumber
// se guarda en todos esos pedidos -- así una sola compra en ABW queda
// anotada en todos los pedidos que surte.

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

const STAGES = ["pagado", "pedido_abw", "llego", "enviado", "entregado"];
const MAX_ORDERS = 100;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const auth = checkAdminKey(event);
  if (!auth.configured) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  if (!auth.valid) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const ids = [...new Set((Array.isArray(body.orderIds) ? body.orderIds : [body.orderId]).filter(Boolean).map(String))];
  const stage = String(body.stage || "");
  if (!ids.length) return jsonResponse(400, { error: "Falta orderId." });
  if (ids.length > MAX_ORDERS) return jsonResponse(400, { error: `Máximo ${MAX_ORDERS} pedidos a la vez.` });
  if (!STAGES.includes(stage)) return jsonResponse(400, { error: "Etapa no válida." });
  const supplierOrderNumber =
    body.supplierOrderNumber != null ? String(body.supplierOrderNumber).trim().slice(0, 100) : null;

  const updated = [];
  const skipped = [];
  try {
    for (const id of ids) {
      const existing = await getOrder(id);
      if (!existing) {
        skipped.push({ id, reason: "no existe" });
        continue;
      }
      if (existing.status !== "paid") {
        skipped.push({ id, reason: "no está pagado" });
        continue;
      }
      const at = new Date().toISOString();
      const history = Array.isArray(existing.stageHistory) ? existing.stageHistory.slice(-30) : [];
      history.push({ stage, at });
      const patch = { stage, stageUpdatedAt: at, stageHistory: history };
      if (supplierOrderNumber) patch.supplierOrderNumber = supplierOrderNumber;
      updated.push(await updateOrderFields(id, patch));
    }
    return jsonResponse(200, { orders: updated, skipped });
  } catch (err) {
    console.error("Error cambiando la etapa del pedido:", err);
    return jsonResponse(500, { error: "No se pudo guardar la etapa.", orders: updated });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
