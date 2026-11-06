// Ligar pedidos de la misma clienta para mandarlos en un solo envío (por
// ejemplo, uno de stock y otro de Corea). Cada pedido ligado guarda
// "envioJunto": un id de grupo compartido. Solo lo ve Mae en /admin.html.
//
// Requiere el header "x-admin-key".
//   POST { orderIds: ["id" o "número corto #94FB5B85", ...] } -> los liga
//        (si alguno ya tenía grupo, se juntan todos en uno)
//   POST { orderId, quitar: true }     -> lo saca de su grupo
//   POST { orderId, copiarGuia: true } -> pone la guía de ese pedido a los
//        demás del grupo que todavía no tienen (sin volver a avisar: van en
//        la misma caja)
//   POST { orderId, espera: true, nota? } -> "en espera de envío": la clienta
//        pidió que no se lo mande todavía (para juntarlo con algo que pida
//        después y pagar un solo envío). No sale en "Por enviar".
//   POST { orderId, espera: false }       -> ya se puede enviar
//   POST { orderIds, cajaEnvioId }        -> estos pedidos van en la caja de ese envío
//        de Dirección americana (se marcan enviados cuando el envío sale con guía);
//        cajaEnvioId: null los saca de la caja
//   POST { orderId, enviadoJunto: true }  -> lo marca enviado porque se fue
//        en la caja de otro pedido del grupo (copia su guía si tiene; sin
//        volver a avisar a la clienta)

const { getOrder, listOrders, updateOrderFields } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }

  try {
    const todos = await listOrders();
    const buscar = (ref) => {
      const r = String(ref || "").trim().replace(/^#/, "").toLowerCase();
      if (!r) return null;
      return todos.find((o) => o.id === r) || (r.length >= 6 ? todos.find((o) => o.id.toLowerCase().startsWith(r)) : null);
    };

    if (b.quitar) {
      const o = buscar(b.orderId);
      if (!o) return json(404, { error: "No encontré ese pedido." });
      const grupo = o.envioJunto;
      const orders = [await updateOrderFields(o.id, { envioJunto: null })];
      // Si en el grupo queda uno solo, ya no está ligado con nadie.
      const resto = todos.filter((x) => grupo && x.envioJunto === grupo && x.id !== o.id);
      if (resto.length === 1) orders.push(await updateOrderFields(resto[0].id, { envioJunto: null }));
      return json(200, { orders });
    }

    if (b.cajaEnvioId !== undefined && Array.isArray(b.orderIds)) {
      const orders = [];
      for (const ref of b.orderIds.slice(0, 30)) {
        const o = buscar(ref);
        if (!o) return json(404, { error: `No encontré el pedido ${String(ref).trim()}.` });
        if (b.cajaEnvioId && (o.status !== "paid" || o.trackingNumber)) return json(409, { error: `El pedido #${o.id.slice(0, 8).toUpperCase()} ya salió o no está pagado.` });
        orders.push(await updateOrderFields(o.id, { cajaEnvioId: b.cajaEnvioId ? String(b.cajaEnvioId) : null }));
      }
      return json(200, { orders });
    }

    if (typeof b.espera === "boolean") {
      const o = buscar(b.orderId);
      if (!o) return json(404, { error: "No encontré ese pedido." });
      const enEspera = b.espera
        ? { desde: (o.enEspera && o.enEspera.desde) || new Date().toISOString(), nota: String(b.nota || "").trim().slice(0, 300) }
        : null;
      return json(200, { orders: [await updateOrderFields(o.id, { enEspera })] });
    }

    if (b.enviadoJunto) {
      const o = buscar(b.orderId);
      if (!o || o.status !== "paid") return json(400, { error: "Ese pedido no está pagado." });
      const RANK = ["pagado", "pedido_abw", "llego", "enviado", "entregado"];
      const salio = (x) => x.trackingNumber || RANK.indexOf(x.stage) >= 3;
      const madre = todos.find((x) => o.envioJunto && x.envioJunto === o.envioJunto && x.id !== o.id && x.status === "paid" && salio(x));
      if (!madre) return json(400, { error: "Ningún pedido de este envío junto se ha mandado todavía." });
      const at = new Date().toISOString();
      const stage = madre.stage === "entregado" ? "entregado" : "enviado";
      const patch = { stage, stageUpdatedAt: at, enEspera: null, stageHistory: [...(Array.isArray(o.stageHistory) ? o.stageHistory.slice(-30) : []), { stage, at, junto: madre.id }] };
      if (madre.trackingNumber) Object.assign(patch, { trackingNumber: madre.trackingNumber, carrier: madre.carrier || "", shippedAt: madre.shippedAt || at });
      if (stage === "entregado") patch.deliveredAt = madre.deliveredAt || at;
      return json(200, { orders: [await updateOrderFields(o.id, patch)] });
    }

    if (b.copiarGuia) {
      const o = buscar(b.orderId);
      if (!o || !o.trackingNumber) return json(400, { error: "Ese pedido todavía no tiene guía." });
      const otros = todos.filter((x) => o.envioJunto && x.envioJunto === o.envioJunto && x.id !== o.id && x.status === "paid" && !x.trackingNumber);
      const orders = [];
      for (const x of otros) {
        orders.push(await updateOrderFields(x.id, { trackingNumber: o.trackingNumber, carrier: o.carrier || "", shippedAt: o.shippedAt || new Date().toISOString() }));
      }
      return json(200, { orders });
    }

    const refs = (Array.isArray(b.orderIds) ? b.orderIds : []).slice(0, 20);
    const encontrados = [];
    for (const ref of refs) {
      const o = buscar(ref);
      if (!o) return json(404, { error: `No encontré el pedido ${String(ref).trim()}. Revisa el número.` });
      if (o.status === "cancelled") return json(409, { error: `El pedido #${o.id.slice(0, 8).toUpperCase()} está cancelado.` });
      if (!encontrados.some((x) => x.id === o.id)) encontrados.push(o);
    }
    if (encontrados.length < 2) return json(400, { error: "Pon al menos dos pedidos distintos para ligar." });
    const grupo = (encontrados.find((o) => o.envioJunto) || {}).envioJunto || `g-${encontrados[0].id.slice(0, 8)}`;
    const viejos = new Set(encontrados.map((o) => o.envioJunto).filter(Boolean));
    const ids = new Set(encontrados.map((o) => o.id));
    todos.forEach((o) => { if (o.envioJunto && viejos.has(o.envioJunto)) ids.add(o.id); });
    const orders = [];
    for (const id of ids) orders.push(await updateOrderFields(id, { envioJunto: grupo }));
    return json(200, { orders, grupo });
  } catch (err) {
    console.error("admin-link-orders:", err);
    return json(500, { error: "No se pudieron ligar los pedidos." });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
