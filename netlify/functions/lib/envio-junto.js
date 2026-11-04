// Pedidos ligados (campo envioJunto, ver admin-link-orders.js): cuando uno
// sale (guía o etapa "enviado"/"entregado"), los demás del grupo que ya
// estaban listos van en la misma caja, así que se marcan igual. No se le
// vuelve a avisar a la clienta: ya le llegó el aviso del pedido principal.
//
// Listo = pagado, sin guía, sin "No mandar todavía" y que ya esté para
// enviar (llegó a México, o es solo de stock y no se ha pedido a ABW).

const { listOrders, updateOrderFields } = require("./blob-store.js");

const RANK = ["pagado", "pedido_abw", "llego", "enviado", "entregado"];

function etapa(o) {
  let r = RANK.indexOf(o.stage);
  if (r < 0) r = 0;
  if (o.supplierOrderNumber) r = Math.max(r, 1);
  if (o.trackingNumber) r = Math.max(r, 3);
  return RANK[r];
}

function listoParaEnviar(o) {
  if (o.status !== "paid" || o.trackingNumber || o.enEspera) return false;
  const st = etapa(o);
  if (st === "llego") return true;
  return st === "pagado" && (o.items || []).every((it) => it.enStock);
}

async function propagarEnvioJunto(order, stage) {
  if (!order || !order.envioJunto) return [];
  try {
    const otros = (await listOrders()).filter((x) => x.id !== order.id && x.envioJunto === order.envioJunto && listoParaEnviar(x));
    const at = new Date().toISOString();
    const out = [];
    for (const x of otros) {
      const patch = { stage, stageUpdatedAt: at, stageHistory: [...(Array.isArray(x.stageHistory) ? x.stageHistory.slice(-30) : []), { stage, at, junto: order.id }] };
      if (order.trackingNumber) Object.assign(patch, { trackingNumber: order.trackingNumber, carrier: order.carrier || "", shippedAt: order.shippedAt || at });
      if (stage === "entregado") patch.deliveredAt = at;
      out.push(await updateOrderFields(x.id, patch));
    }
    return out.filter(Boolean);
  } catch (err) {
    console.error("envio-junto:", err);
    return [];
  }
}

module.exports = { propagarEnvioJunto, listoParaEnviar };
