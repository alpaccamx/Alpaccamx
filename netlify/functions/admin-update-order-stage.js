// Cambia la ETAPA de surtido de uno o varios pedidos ya pagados:
//   pagado -> pedido_abw -> llego -> enviado -> entregado
// No cambia el estado de pago ni el stock. Cada cambio de etapa (y marcar
// o quitar la entrega personal) le avisa a la clienta por correo y
// WhatsApp (ver lib/order-notify.js), salvo lo que ya se avisa por otro
// lado (la guía al enviar y la entrega detectada por la paquetería).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON):
//   { orderIds: ["..."], stage: "pedido_abw", supplierOrderNumber?: "10293-AB" }
// (también acepta { orderId } para uno solo).
//   { orderId, entregaPersonal: true|false } -> solo marca o quita la
//   entrega personal en Ciudad Juárez (sin envío nacional). Si viene supplierOrderNumber
// se guarda en todos esos pedidos -- así una sola compra en ABW queda
// anotada en todos los pedidos que surte.

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { avisarPedido, numeroPedido } = require("./lib/order-notify.js");

/* Aviso a la clienta por etapa (null = no se avisa). */
function avisoEtapa(order, stage) {
  const n = numeroPedido(order);
  const personal = order.customer && order.customer.entregaPersonal;
  if (stage === "pedido_abw") return { asunto: `Ya pedimos tus productos a Corea 🇰🇷 (pedido ${n})`, texto: `ya pedimos a Corea los productos de tu pedido ${n}. Te avisamos cuando lleguen a México` };
  if (stage === "llego") return { asunto: `Tus productos ya llegaron a México 🇲🇽 (pedido ${n})`, texto: `los productos de tu pedido ${n} ya llegaron a México y estamos preparando ${personal ? "tu entrega" : "tu envío"}` };
  if (stage === "enviado") {
    if (order.trackingNumber) return null; // ya se le avisó con la guía
    return personal
      ? { asunto: `Tu pedido ${n} está listo para entregártelo`, texto: `tu pedido ${n} está listo para entregártelo en persona en Ciudad Juárez; te contactamos para ponernos de acuerdo` }
      : { asunto: `Tu pedido ${n} va en camino 🚚`, texto: `tu pedido ${n} ya va en camino` };
  }
  if (stage === "entregado") {
    if (order.deliveredAt) return null; // ya se le avisó al detectar la entrega
    return { asunto: `Tu pedido ${n} fue entregado 🎁`, texto: `tu pedido ${n} fue entregado. ¡Gracias por tu compra!` };
  }
  return null;
}

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
  if (typeof body.entregaPersonal === "boolean" && !stage) {
    try {
      const existing = await getOrder(ids[0]);
      if (!existing) return jsonResponse(404, { error: "Ese pedido no existe." });
      const customer = { ...(existing.customer || {}), entregaPersonal: body.entregaPersonal };
      const saved = await updateOrderFields(ids[0], { customer });
      if (!!(existing.customer && existing.customer.entregaPersonal) !== body.entregaPersonal) {
        const n = numeroPedido(saved);
        await avisarPedido(saved, body.entregaPersonal
          ? { asunto: `Tu pedido ${n} se entrega en persona`, texto: `tu pedido ${n} se entregará en persona en Ciudad Juárez, sin envío por paquetería. Te contactamos para ponernos de acuerdo` }
          : { asunto: `Tu pedido ${n} se enviará por paquetería`, texto: `tu pedido ${n} ya no se entregará en persona: te lo enviaremos por paquetería` });
      }
      return jsonResponse(200, { orders: [saved] });
    } catch (err) {
      console.error("Error marcando entrega personal:", err);
      return jsonResponse(500, { error: "No se pudo guardar." });
    }
  }
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
      const aviso = existing.stage !== stage ? avisoEtapa(existing, stage) : null;
      // Así la revisión automática de entregas ya no lo vuelve a avisar.
      if (stage === "entregado" && !existing.deliveredAt) patch.deliveredAt = at;
      const saved = await updateOrderFields(id, patch);
      updated.push(saved);
      if (aviso) await avisarPedido(saved, aviso);
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
