// "📦 Armar pedido" en /admin.html: Mae va palomeando lo que ya echó a la
// caja. Lo que no encontró (se vendió de más, no se descontó del stock...)
// se quita del pedido y se le avisa a la clienta que se le reembolsa.
//
// Requiere el header "x-admin-key".
//   POST { orderId, progreso: { "<i>": piezasEnCaja } }
//        -> guarda el avance (para seguir en otro momento o en otro aparato)
//   POST { orderId, faltantes: [{ i, qty }], restarStock?: true }
//        -> quita esas piezas del pedido, apunta el reembolso pendiente y le
//           avisa a la clienta por correo y WhatsApp. NO regresa las piezas
//           al stock (no existen); con restarStock, además resta esas
//           piezas de "Piezas Disponibles" (el stock decía que había más de
//           las que de verdad hay).
//   POST { orderId, reembolsado: true } -> ya se hizo el reembolso

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { avisarPedido, numeroPedido, fmtMXN, esc, conDetalle, WHATSAPP_MAE } = require("./lib/order-notify.js");
const { applySheetStockDelta } = require("./lib/google-sheets.js");

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }

  try {
    const order = await getOrder(String(b.orderId || ""));
    if (!order) return json(404, { error: "No encontré ese pedido." });
    const items = order.items || [];

    if (b.progreso && typeof b.progreso === "object") {
      const progreso = {};
      items.forEach((it, i) => {
        const n = Math.max(0, Math.min(Number(it.qty) || 0, Math.floor(Number(b.progreso[i]) || 0)));
        if (n) progreso[i] = n;
      });
      const saved = await updateOrderFields(order.id, { armado: { progreso, at: new Date().toISOString() } });
      return json(200, { orders: [saved] });
    }

    if (Array.isArray(b.faltantes)) {
      if (order.status !== "paid") return json(400, { error: "Solo se puede en pedidos pagados." });
      const quitar = new Map();
      for (const f of b.faltantes) {
        const i = Number(f.i);
        const it = items[i];
        const q = Math.min(Number(it && it.qty) || 0, Math.floor(Number(f.qty) || 0));
        if (it && q > 0) quitar.set(i, q);
      }
      if (!quitar.size) return json(400, { error: "No marcaste nada que falte." });

      const at = new Date().toISOString();
      const faltan = [];
      let reembolso = 0;
      let menosBase = 0;
      const nuevos = [];
      items.forEach((it, i) => {
        const q = quitar.get(i) || 0;
        if (q) {
          faltan.push({ ...it, qty: q });
          reembolso += (Number(it.precio) || 0) * q;
          menosBase += (Number(it.precioBase != null ? it.precioBase : it.precio) || 0) * q;
        }
        if ((Number(it.qty) || 0) - q > 0) nuevos.push({ ...it, qty: it.qty - q });
      });
      reembolso = r2(reembolso);

      // El avance de armado se recorre: los índices cambian al quitar renglones.
      const prog = (order.armado && order.armado.progreso) || {};
      const progreso = {};
      let j = 0;
      items.forEach((it, i) => {
        if ((Number(it.qty) || 0) - (quitar.get(i) || 0) > 0) {
          const n = Math.min(Number(prog[i]) || 0, it.qty - (quitar.get(i) || 0));
          if (n) progreso[j] = n;
          j++;
        }
      });

      const pagado = order.montoPagado != null ? Number(order.montoPagado) : Number(order.grandTotal) || 0;
      const previo = (order.reembolso && Number(order.reembolso.monto)) || 0;
      const saved = await updateOrderFields(order.id, {
        items: nuevos,
        subtotal: r2((Number(order.subtotal) || 0) - reembolso),
        ...(order.subtotalBase != null ? { subtotalBase: r2(Number(order.subtotalBase) - menosBase) } : {}),
        grandTotal: r2((Number(order.grandTotal) || 0) - reembolso),
        montoPagado: pagado,
        faltantes: [...(order.faltantes || []), ...faltan.map((it) => ({ sku: it.sku || "", nombre: it.nombre, marca: it.marca || "", qty: it.qty, precio: it.precio, at }))],
        reembolso: { monto: r2(previo + reembolso), status: "pendiente", at },
        armado: { progreso, at },
        editedAt: at,
      });

      // Restar del stock de la tienda lo que en realidad no hay (solo
      // productos de stock).
      let stockAjustado = false;
      if (b.restarStock) {
        const delta = {};
        faltan.filter((it) => it.enStock && it.sku).forEach((it) => { delta[it.sku] = (delta[it.sku] || 0) + it.qty; });
        if (Object.keys(delta).length) {
          stockAjustado = await applySheetStockDelta(delta).then(() => true).catch((err) => { console.error("admin-pack-order stock:", err); return false; });
        }
      }

      // Aviso a la clienta.
      const n = numeroPedido(order);
      const conNombre = await conDetalle(faltan).catch(() => faltan);
      const lista = conNombre.map((it) => `${it.detalle || `${it.marca ? `${it.marca} ` : ""}${it.nombre}`}${it.qty > 1 ? ` ×${it.qty}` : ""}`);
      const tarjeta = order.source === "mercadopago";
      const comoReembolso = tarjeta ? "Te lo regresamos a tu tarjeta por Mercado Pago" : "Escríbenos por WhatsApp para hacerte tu reembolso";
      const seguir = nuevos.length ? "El resto de tu pedido sigue su camino normal" : "";
      await avisarPedido(saved, {
        asunto: `Tu pedido ${n}: se nos agotó un producto y te lo reembolsamos`,
        titulo: "Se nos agotó un producto de tu pedido 🙏",
        texto: [`al armar tu pedido ${n} nos dimos cuenta de que ya no teníamos: ${lista.join(", ")}. Perdón por el inconveniente`, `Te reembolsamos ${fmtMXN(reembolso)}`, comoReembolso, seguir].filter(Boolean).join(" · "),
        intro: `<p style="font-size:15px;margin:0 0 12px;">Al armar tu pedido nos dimos cuenta de que ya no teníamos:</p>
          <ul style="font-size:15px;margin:0 0 12px;padding-left:20px;">${lista.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
          <p style="font-size:15px;margin:0 0 12px;">Perdón por el inconveniente. <b>Te reembolsamos ${esc(fmtMXN(reembolso))}</b>.${seguir ? ` ${esc(seguir)}.` : ""}</p>`,
        html: tarjeta
          ? `<p style="font-size:14px;margin:0;">${esc(comoReembolso)}; puede tardar unos días en verse en tu estado de cuenta.</p>`
          : `<p style="margin:0;"><a href="https://wa.me/${WHATSAPP_MAE}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px;">💬 ${esc(comoReembolso)}</a></p>`,
      });

      return json(200, { orders: [saved], reembolso, lista, stockAjustado });
    }

    if (b.reembolsado) {
      if (!order.reembolso) return json(400, { error: "Este pedido no tiene reembolso pendiente." });
      const saved = await updateOrderFields(order.id, { reembolso: { ...order.reembolso, status: "hecho", hechoAt: new Date().toISOString() } });
      return json(200, { orders: [saved] });
    }

    return json(400, { error: "No entendí qué hacer." });
  } catch (err) {
    console.error("admin-pack-order:", err);
    return json(500, { error: "No se pudo guardar." });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
