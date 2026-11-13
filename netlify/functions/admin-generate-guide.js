// Genera una guía de envío (con Envíos Perros o Skydropx, según lo que
// haya elegido el admin de la lista de cotizaciones) para un pedido, y
// guarda el número de guía y la paquetería usada en el pedido.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON):
//   {
//     orderId | envioId | apartadoId, weight, provider: "enviosperros" | "skydropx",
//     destination,                          -- datos del destinatario
//     // solo si provider === "enviosperros":
//     courier, service,
//     // solo si provider === "skydropx":
//     quotationId, rateId, carrierSlug, serviceCode
//   }
//
// "destination" lo arma /admin.html a partir de los datos del cliente,
// pero el admin puede corregirlo antes de mandarlo (ej. número exterior
// que no venía en el pedido).

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
const { propagarEnvioJunto } = require("./lib/envio-junto.js");
const enviosPerros = require("./lib/enviosperros.js");
const skydropx = require("./lib/skydropx.js");
const { notifyCustomerOrderShipped } = require("./lib/whatsapp.js");
const { getCustomerByPhone } = require("./lib/customer-store.js");
const { cuentaDelPedido } = require("./lib/order-notify.js");
const { sendEmail, orderShippedEmailHTML } = require("./lib/email.js");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { getRecord, mutateRecord } = require("./lib/swm-store.js");
const { avisar, cotizarEnvio, marcarOrdenesDeCaja } = require("./lib/swm-core.js");
const { envioEstimado, avisar: avisarApartado, esc: escHtml } = require("./lib/preventa-core.js");
const { getApartado, mutateApartado } = require("./lib/preventa-store.js");
// CP fuera de la tabla de Mae: se le cobra la paquetería + esto (sin desglose).
const FUERA_TABLA_EXTRA = 100;

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

  const { orderId, envioId, weight, provider, destination } = body;
  // Apartados de la Preventa (Sephora Sale) que salen en esta misma guía.
  const apartadoIds = [...new Set([...(Array.isArray(body.apartadoIds) ? body.apartadoIds : []), ...(body.apartadoId ? [body.apartadoId] : [])].map(String))];
  const weightNum = Number(weight);
  if ((!orderId && !envioId && !apartadoIds.length) || !weightNum || weightNum <= 0 || !provider || !destination) {
    return jsonResponse(400, { error: "Faltan datos para generar la guía." });
  }

  let envioPagado = false;
  if (envioId) {
    const envio = await getRecord("envio", String(envioId));
    if (!envio) return jsonResponse(404, { error: "Envío no encontrado." });
    if (!["solicitado", "cotizado", "pagado", "en_mexico", ...(body.cajaExtra ? ["enviado"] : [])].includes(envio.status)) return jsonResponse(409, { error: "Ese envío ya se mandó o está cancelado." });
    if (body.cajaExtra) {
      // Otra caja del mismo envío (no cupo todo en una): necesita la guía de la primera.
      if (!envio.guia) return jsonResponse(409, { error: "Primero haz la guía de la primera caja." });
      if (envio.pago && envio.pago.status === "revision") return jsonResponse(409, { error: "Ya subió su comprobante: apruébalo o recházalo antes de agregar otra caja." });
    } else if (envio.guia) return jsonResponse(409, { error: `Ese envío ya tiene guía (${envio.guia}). Si no cupo todo, usa "Guía de otra caja".` });
    if (body.cajaExtra && !["cotizado", "pagado", "en_mexico", "enviado"].includes(envio.status)) return jsonResponse(409, { error: "Ese envío ya se entregó o está cancelado." });
    envioPagado = ["pagado", "en_mexico", "enviado"].includes(envio.status);
  } else if (orderId) {
    const existing = await getOrder(orderId);
    if (!existing) return jsonResponse(404, { error: "Pedido no encontrado." });
  }
  for (const aid of apartadoIds) {
    const ap = await getApartado(aid);
    if (!ap) return jsonResponse(404, { error: "Apartado no encontrado." });
    if (!["liquidado", "enviado"].includes(ap.status)) return jsonResponse(409, { error: `El apartado ${ap.folio} todavía no está liquidado.` });
  }

  try {
    let trackingNumber;
    let carrierLabel;
    let labelUrl = "";

    if (provider === "enviosperros") {
      const { courier, service } = body;
      if (!courier || !service) return jsonResponse(400, { error: "Falta la paquetería elegida." });

      const label = await enviosPerros.createLabel({
        weight: weightNum,
        courier,
        service,
        destination: {
          company: destination.name || "Cliente",
          name: destination.name || "Cliente",
          phone: destination.phone,
          street: destination.street,
          exteriorNumber: destination.exteriorNumber || "S/N",
          interiorNumber: destination.interiorNumber || undefined,
          neighborhood: destination.neighborhood,
          zipCode: destination.zipCode,
          references: destination.references || "Sin referencias",
        },
      });
      trackingNumber = label.trackingNumber;
      carrierLabel = `${courier} ${service}`;
    } else if (provider === "skydropx") {
      const { quotationId, rateId, carrierSlug, serviceCode } = body;
      if (!quotationId || !rateId) return jsonResponse(400, { error: "Falta la paquetería elegida." });

      const shipment = await skydropx.createShipment({ rateId, destination, declaredValue: body.declaredValue });
      console.log("Skydropx guía:", JSON.stringify(shipment));
      if (shipment.failed) return jsonResponse(502, { error: `Skydropx no pudo generar la guía (estado: ${shipment.status}). Revisa tu panel de Skydropx.` });
      trackingNumber = shipment.trackingNumber || `Revisa el número de guía en tu panel de Skydropx (envío ${shipment.id || ""})`.trim();
      labelUrl = shipment.labelUrl || "";
      carrierLabel = `${carrierSlug || "Skydropx"} ${serviceCode || ""}`.trim();
    } else {
      return jsonResponse(400, { error: "Paquetería no reconocida." });
    }

    // Otra caja del mismo envío: se guarda su guía junto a la primera. Si
    // todavía no paga, su envío se suma al cobro (se vuelve a cotizar con los
    // mismos montos de cruce); si ya pagó y ya salió, se le avisa.
    if (envioId && body.cajaExtra) {
      const at = new Date().toISOString();
      const tabla = await envioEstimado(destination.zipCode, weightNum);
      const aMano = body.cobrarEnvio != null && body.cobrarEnvio !== "" && Number(body.cobrarEnvio) >= 0 ? Math.round(Number(body.cobrarEnvio) * 100) / 100 : null;
      const cobro = envioPagado ? 0 : (aMano != null ? aMano : tabla != null ? tabla : (Number(body.total) > 0 ? Math.ceil(Number(body.total)) + FUERA_TABLA_EXTRA : 0));
      const rec = await mutateRecord("envio", String(envioId), (e) => {
        e.guiasExtra = [...(e.guiasExtra || []), { guia: trackingNumber, paqueteria: carrierLabel, kg: weightNum, cobro, at }];
        e.history = [...(e.history || []), { at, status: e.status, guiaExtra: trackingNumber, guiaGenerada: provider }];
        return e;
      });
      if (!envioPagado && rec.status === "cotizado" && cobro > 0) {
        const q = rec.cotizacion || {};
        const r = await cotizarEnvio(String(envioId), {
          envio: Math.round(((Number(q.envio) || 0) + cobro) * 100) / 100,
          cruce: q.premioLealtad ? q.cruceSinDescuento : q.cruce, consolidacion: q.consolidacion, sinRegistro: q.sinRegistro, extras: q.extras,
          premioLealtad: !!rec.premioLealtad,
        });
        if (r.error) return jsonResponse(200, { cajaExtra: true, error: `La guía ${trackingNumber} quedó lista, pero no se pudo sumar al cobro: ${r.error}` });
        return jsonResponse(200, { envio: r.envio, cajaExtra: true, guia: trackingNumber, cobro });
      }
      if (rec.status === "enviado") {
        const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
        await avisar(rec, `tu envío ${rec.folio}: va en ${1 + rec.guiasExtra.length} cajas 📦`, `<h2 style="margin:0 0 8px;font-size:20px;">Tu envío va en ${1 + rec.guiasExtra.length} cajas</h2><p style="font-size:14px;">No cupo todo en una, así que te llega en varias:<br>Caja 1 · ${esc(rec.paqueteria)}: <b>${esc(rec.guia)}</b>${rec.guiasExtra.map((x, i) => `<br>Caja ${i + 2} · ${esc(x.paqueteria)}: <b>${esc(x.guia)}</b>`).join("")}</p>`);
      }
      return jsonResponse(200, { envio: rec, cajaExtra: true, guia: trackingNumber, cobro: 0 });
    }

    // Envío de Dirección americana todavía sin pagar: se guarda la guía y se
    // le cobra a la clienta (cruce + envío según la tabla de Mae; si su CP no
    // está en la tabla, el precio de la paquetería + $100, que ella ve como
    // un solo "envío") en un solo paso. En
    // cuanto paga, sale sola con esta guía (aplicarPago).
    if (envioId && !envioPagado) {
      const at = new Date().toISOString();
      await mutateRecord("envio", String(envioId), (e) => {
        e.paqueteria = carrierLabel; e.guia = trackingNumber; e.guiaAt = at;
        e.history = [...(e.history || []), { at, status: e.status, guiaGenerada: provider }];
        return e;
      });
      const tabla = await envioEstimado(destination.zipCode, weightNum);
      // cobrarEnvio: Mae puso a mano cuánto cobrarle de envío; si no, la tabla.
      const aMano = body.cobrarEnvio != null && body.cobrarEnvio !== "" && Number(body.cobrarEnvio) >= 0 ? Math.round(Number(body.cobrarEnvio) * 100) / 100 : null;
      const envio = aMano != null ? aMano : tabla != null ? tabla : (Number(body.total) > 0 ? Math.ceil(Number(body.total)) + FUERA_TABLA_EXTRA : 0);
      const r = await cotizarEnvio(String(envioId), { envio, premioLealtad: !!body.premioLealtad });
      if (r.error) return jsonResponse(200, { guiaAnticipada: true, error: `La guía ${trackingNumber} quedó lista, pero no se pudo cobrar: ${r.error}` });
      return jsonResponse(200, { envio: r.envio, guiaAnticipada: true });
    }

    // Envío de Dirección americana pagado: igual que "Marcar enviado" en admin-swm.
    if (envioId) {
      const at = new Date().toISOString();
      const rec = await mutateRecord("envio", String(envioId), (e) => {
        e.paqueteria = carrierLabel; e.guia = trackingNumber; e.status = "enviado"; e.enviadoAt = at;
        e.history = [...(e.history || []), { at, status: "enviado", guiaGenerada: provider }];
        return e;
      });
      await Promise.all((rec.paqueteIds || []).map((x) => mutateRecord("paquete", x, (p) => {
        p.status = "enviado"; p.history = [...(p.history || []), { at, status: "enviado" }]; return p;
      })));
      const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
      await marcarOrdenesDeCaja(rec);
      await avisar(rec, `tu envío ${rec.folio} va en camino 🚚`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu envío va en camino!</h2><p style="font-size:14px;">Paquetería: <b>${esc(rec.paqueteria)}</b><br>Guía: <b>${esc(rec.guia)}</b></p>`);
      return jsonResponse(200, { envio: rec });
    }

    // Solo apartados de la preventa: se marcan enviados con esta guía.
    if (!orderId) {
      const aps = await marcarApartadosEnviados(apartadoIds, carrierLabel, trackingNumber);
      return jsonResponse(200, { apartados: aps, trackingNumber, carrier: carrierLabel });
    }

    const order = await updateOrderFields(orderId, {
      trackingNumber,
      carrier: carrierLabel,
      shippedAt: new Date().toISOString(),
    });
    const ligados = await propagarEnvioJunto(order, "enviado");

    // Igual que en admin-add-tracking.js: solo se manda si la clienta
    // tiene cuenta con ese teléfono (se usa el correo de la cuenta con la que compró).
    const customer = await cuentaDelPedido(order);
    if (customer?.email) {
      await sendEmail({
        to: customer.email,
        subject: "Tu pedido de Alpacca ya va en camino 📦",
        html: orderShippedEmailHTML(order),
      });
    }
    const whatsappSent = await notifyCustomerOrderShipped(order);
    const aps = apartadoIds.length ? await marcarApartadosEnviados(apartadoIds, carrierLabel, trackingNumber) : [];

    return jsonResponse(200, { order, whatsappSent, ligados, apartados: aps });
  } catch (err) {
    console.error(`Error generando guía con ${provider}:`, err.status, JSON.stringify(err.body || err.message));
    // Se muestra lo que respondió la paquetería (antes solo salía "No se
    // pudo generar la guía" y no había forma de saber por qué).
    const b = err.body;
    const detail = b && (typeof b === "string" ? b : b.message || b.error || b.errors || b);
    const texto = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : err.message;
    // Envíos Perros contesta "No fue posible procesar la orden" sin decir qué
    // dato le molestó; casi siempre es la dirección.
    const pista = provider === "enviosperros" && /procesar la orden/i.test(String(texto || ""))
      ? " Casi siempre es la dirección: deja la calle corta (sin colonia ni fraccionamiento), pon el número en \"Núm. exterior\" y referencias cortas. Si sigue igual, elige una opción de Skydropx."
      : "";
    return jsonResponse(502, { error: `No se pudo generar la guía${err.status ? ` (HTTP ${err.status})` : ""}: ${String(texto || "").slice(0, 400)}${pista}` });
  }
};

/* Marca enviados (con la guía) los apartados de la preventa y le avisa a la clienta. */
async function marcarApartadosEnviados(ids, paqueteria, guia) {
  const out = [];
  for (const id of ids) {
    const rec = await mutateApartado(id, (a) => {
      if (!["liquidado", "enviado"].includes(a.status)) return null;
      Object.assign(a, { status: "enviado", paqueteria, guia, enviadoAt: new Date().toISOString() });
      a.history = [...(a.history || []), { at: new Date().toISOString(), status: "enviado", por: "mae" }];
      return a;
    });
    if (!rec) continue;
    out.push(rec);
    await avisarApartado(rec, `${rec.folio}: tu preventa va en camino 🚚`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu preventa va en camino!</h2>
      <p style="font-size:14px;">Paquetería: <b>${escHtml(paqueteria)}</b><br>Guía: <b>${escHtml(guia)}</b></p>`,
    `${rec.folio}: tu preventa va en camino. ${paqueteria}, guía ${guia}`).catch((err) => console.error("guía apartado aviso:", err));
  }
  return out;
}

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
