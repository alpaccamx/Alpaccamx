// Lógica compartida de Shop with Mae: cálculo del cobro de un envío,
// preferencia de Mercado Pago, aplicar un pago y correos a la clienta.
// La usan swm-client.js (clienta), admin-swm.js (Mae) y mp-webhook.js.

const { randomUUID } = require("crypto");
const { getRecord, mutateRecord, listRecords, nextFolio, saveRecord } = require("./swm-store.js");
const { crucePorPeso, crucePorComision, consolidacionPorPeso, LEALTAD_CADA, LEALTAD_PCT, REFERIDO_MXN } = require("./swm-pricing.js");
const { getCoupon, saveCoupon, listCoupons, normCode } = require("./coupons.js");
const { sendEmail, baseEmailHTML, formatPriceMXN } = require("./email.js");
const { loadPricingData } = require("./pricing.js");
const { notifyCustomerSwm } = require("./whatsapp.js");
const { getCustomerByEmail } = require("./customer-store.js");

const MP_API = "https://api.mercadopago.com";
const ALMACENAJE_DIAS = 30;
const TOLERANCIA_MXN = 1;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* Pesos por 1 unidad de cada moneda (de Config: "Tipo de cambio" para el
   dólar y "Pesos por 1 won/euro/yen/yuan" para las demás). */
async function tiposDeCambio() {
  try {
    const data = await loadPricingData();
    const st = (data && data.state && data.state.settings) || {};
    return { MXN: 1, USD: st.exchangeRate || 0, KRW: st.krwRate || 0, EUR: st.eurRate || 0, JPY: st.jpyRate || 0, CNY: st.cnyRate || 0 };
  } catch (err) {
    console.error("swm: no se pudo leer el tipo de cambio", err);
    return { MXN: 1 };
  }
}

async function tipoDeCambio() {
  return (await tiposDeCambio()).USD || 0;
}

/* Cruce de un paquete: por peso con la tabla, o 15% de su valor declarado
   (con tax) convertido a pesos con el tipo de cambio de su moneda. Los
   paquetes de antes solo traen valorUSD. Si el cruce ya se pagó con la
   compra (Mae compró, por comisión), es 0. */
function valorEnPesos(p, rates) {
  if (Number(p.valorTotal) > 0 && p.moneda) return Number(p.valorTotal) * (rates[p.moneda] || 0);
  return (Number(p.valorUSD) || 0) * (rates.USD || 0);
}

function crucePaquete(p, rates) {
  if (p.crucePagado) return 0;
  if (p.cobro === "comision") return crucePorComision(valorEnPesos(p, rates));
  if (p.cobro === "auto") {
    // "Lo que le salga más barato" (lo de ahora): por peso o el 15% de su valor.
    const opciones = [p.cobrable ? crucePorPeso(p.cobrable) : null, valorEnPesos(p, rates) > 0 ? crucePorComision(valorEnPesos(p, rates)) : null].filter((x) => x != null);
    return opciones.length ? Math.min(...opciones) : 0;
  }
  return crucePorPeso(p.cobrable || 0);
}

/* Cruce del 15% pagado por adelantado: si la clienta eligió "comision", el
   paquete trae su propio cobro (cotizacion + pago) desde que lo registra y,
   al final, en el envío solo se cobra la guía. Se recalcula si cambia el
   valor; si ya lo pagó o cambia a "por peso", no se toca / se quita. */
function ponerCruceAnticipado(p, rates) {
  if (p.crucePagado || (p.pago && ["pagado", "revision"].includes(p.pago.status))) return p;
  if (p.cobro !== "comision") {
    if (p.pago && p.pago.status === "pendiente") { delete p.cotizacion; delete p.pago; }
    return p;
  }
  const monto = Math.ceil(crucePorComision(valorEnPesos(p, rates || {})));
  if (!(monto > 0)) return p;
  p.cotizacion = { cruce: monto, total: monto, at: new Date().toISOString() };
  p.pago = { status: "pendiente", monto };
  return p;
}

/* ¿Tiene algo por pagar? compra/envío: cotizado; paquete: su cruce anticipado. */
function porPagar(kind, r) {
  if (!r || !r.cotizacion || (r.pago && r.pago.status === "pagado")) return false;
  if (kind === "paquete") return !r.crucePagado && !!r.pago && r.status !== "cancelado";
  return r.status === "cotizado";
}

/* Cobro sugerido de un envío (Mae solo pone el envío nacional; puede
   cambiar cruce y consolidación si quiere). */
async function cotizacionSugerida(paquetes, consolidar) {
  const rates = await tiposDeCambio();
  const rate = rates.USD || 0;
  const cruce = paquetes.reduce((t, p) => t + crucePaquete(p, rates), 0);
  const kg = paquetes.reduce((t, p) => t + (p.cobrable || 0), 0);
  const consolidacion = consolidar && paquetes.length > 1 ? consolidacionPorPeso(kg) : 0;
  // Paquetes que llegaron sin que la clienta registrara su guía.
  const sinRegistro = paquetes.reduce((t, p) => t + (Number(p.cargoSinRegistro) || 0), 0);
  // Servicios extra pedidos (revisión con fotos, separar paquete).
  const extras = paquetes.reduce((t, p) => t + (p.cargos || []).reduce((s, c) => s + (Number(c.monto) || 0), 0), 0);
  return { cruce: Math.ceil(cruce), consolidacion, sinRegistro, extras, kg, rate };
}

const escHTML = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

/* Cotiza un envío y le avisa a la clienta. Lo vacío usa lo sugerido.
   opts: { envio (MXN), cruce?, consolidacion?, sinRegistro?, extras?, premioLealtad?, notaClienta? }
   Regresa { envio } o { error, status }. La usan "Mandar cotización" y
   "Generar guía" (que cotiza sola con el precio de la paquetería). */
async function cotizarEnvio(id, b = {}) {
  const envio0 = await getRecord("envio", id);
  if (!envio0) return { error: "No existe ese envío.", status: 404 };
  const paquetes = (await Promise.all((envio0.paqueteIds || []).map((x) => getRecord("paquete", x)))).filter(Boolean);
  const sug = await cotizacionSugerida(paquetes, envio0.consolidar);
  const num = (v) => (isFinite(Number(v)) ? Number(v) : 0);
  const val = (v, d) => (v === "" || v == null ? d : round2(num(v)));
  const envioMX = round2(num(b.envio));
  // Cruce con descuento por lealtad (si le toca y Mae lo marcó).
  let premioLealtad = !!envio0.premioLealtad;
  if (b.premioLealtad && !premioLealtad) {
    const suyos = (await listRecords("envio")).filter((e) => e.email === envio0.email);
    if (!lealtadDe(suyos).disponibles) return { error: "Esta clienta no tiene descuento de lealtad disponible.", status: 409 };
    premioLealtad = true;
  } else if (b.premioLealtad === false) premioLealtad = false;
  const cruceLleno = val(b.cruce, sug.cruce);
  const cruce = premioLealtad ? round2(cruceLleno * (100 - LEALTAD_PCT) / 100) : cruceLleno;
  const consolidacion = val(b.consolidacion, sug.consolidacion);
  const sinRegistro = val(b.sinRegistro, sug.sinRegistro || 0);
  const extras = val(b.extras, sug.extras || 0);
  const at = new Date().toISOString();
  const rec = await mutateRecord("envio", id, (e) => {
    e.sugerido = { cruce: sug.cruce, consolidacion: sug.consolidacion, sinRegistro: sug.sinRegistro || 0, extras: sug.extras || 0, kg: sug.kg };
    e.cotizacion = { cruce, consolidacion, sinRegistro, extras, envio: envioMX, total: round2(cruce + consolidacion + sinRegistro + extras + envioMX), at, ...(premioLealtad ? { premioLealtad: true, lealtadPct: LEALTAD_PCT, cruceSinDescuento: cruceLleno } : {}) };
    e.premioLealtad = premioLealtad;
    if (b.notaClienta != null) e.notaClienta = String(b.notaClienta).slice(0, 1000);
    if (e.cotizacion.total > 0) {
      e.pago = { status: "pendiente", monto: e.cotizacion.total };
      e.status = "cotizado";
    } else {
      // Nada que cobrar (ej. ya pagó su cruce y se lo entregan en Juárez).
      e.pago = { status: "pagado", monto: 0, metodo: "sin_costo", paidAt: at };
      e.status = "pagado";
    }
    e.history = [...(e.history || []), { at, status: e.status }];
    e.updatedAt = at;
    return e;
  });
  const c = rec.cotizacion;
  if (!(c.total > 0)) {
    await avisar(rec, `tu envío ${rec.folio} está listo`, `<h2 style="margin:0 0 8px;font-size:20px;">Tu envío está listo</h2><p style="font-size:14px;">No tienes nada que pagar: tu cruce ya estaba pagado.${rec.notaClienta ? ` ${escHTML(rec.notaClienta)}` : ""}</p>`);
    return { envio: rec };
  }
  await avisar(rec, `tu envío ${rec.folio} está listo para pagar`, `
    <h2 style="margin:0 0 8px;font-size:20px;">Tu envío a México está listo</h2>
    <p style="font-size:14px;">${c.cruce ? `Cruce a México: <b>${formatPriceMXN(c.cruce)}</b>${c.premioLealtad ? ` (${c.lealtadPct}% de descuento por tu lealtad 🎁)` : ""}<br>` : ""}${c.consolidacion ? `Consolidación: <b>${formatPriceMXN(c.consolidacion)}</b><br>` : ""}${c.sinRegistro ? `Paquete(s) sin registrar: <b>${formatPriceMXN(c.sinRegistro)}</b><br>` : ""}${c.extras ? `Servicios extra (revisión / separar): <b>${formatPriceMXN(c.extras)}</b><br>` : ""}${c.envio ? `Envío a tu casa${rec.paqueteria ? ` (${escHTML(rec.paqueteria)})` : ""}: <b>${formatPriceMXN(c.envio)}</b><br>` : ""}Total a pagar: <b>${formatPriceMXN(c.total)}</b></p>
    ${rec.notaClienta ? `<p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${escHTML(rec.notaClienta)}</p>` : ""}
    <p style="font-size:14px;">Págalo con tarjeta o transferencia desde tu casillero${rec.guia ? " y en cuanto se acredite te mando tu guía" : " y lo preparo"}.</p>`);
  return { envio: rec };
}

/* Envío automático: en cuanto un paquete está listo en México, se arma (o se
   le suma) su envío a casa con la dirección principal de su cuenta, sin que
   la clienta tenga que pedirlo. Mae solo hace la guía y le cobra.
   Regresa el envío o null (si falta su dirección o el paquete tiene algo
   pendiente: datos, corrección o separación). */
async function envioAutomatico(paqueteId) {
  const p = await getRecord("paquete", paqueteId);
  if (!p || !p.email || p.status !== "recibido" || !p.enMexicoAt || p.datosPendientes) return null;
  if ((p.correccion && p.correccion.estado === "pedida") || (p.separar && p.separar.estado === "pedida")) return null;
  const cuenta = await getCustomerByEmail(p.email);
  const dirs = (cuenta && Array.isArray(cuenta.direcciones)) ? cuenta.direcciones : [];
  const d = dirs.find((x) => x.principal) || dirs[0];
  if (!d || !d.calle || !/^\d{5}$/.test(String(d.cp || ""))) return null;
  const at = new Date().toISOString();
  // Si ya tiene un envío abierto (todavía sin cobrar), el paquete se le suma.
  const abierto = (await listRecords("envio", { email: p.email })).find((e) => e.status === "solicitado" && !e.guia);
  let envio;
  if (abierto) {
    const ids = [...new Set([...(abierto.paqueteIds || []), p.id])];
    const paquetes = (await Promise.all(ids.map((x) => getRecord("paquete", x)))).filter(Boolean);
    const sug = await cotizacionSugerida(paquetes, ids.length > 1);
    envio = await mutateRecord("envio", abierto.id, (e) => {
      e.paqueteIds = ids; e.consolidar = ids.length > 1;
      e.sugerido = { cruce: sug.cruce, consolidacion: sug.consolidacion, sinRegistro: sug.sinRegistro, extras: sug.extras, kg: sug.kg };
      e.history = [...(e.history || []), { at, status: "paquete_agregado", paquete: p.folio }];
      return e;
    });
  } else {
    const sug = await cotizacionSugerida([p], false);
    const direccion = Object.fromEntries(["nombre", "telefono", "calle", "colonia", "ciudad", "estado", "cp", "referencias"].map((k) => [k, String(d[k] || "")]));
    envio = {
      id: randomUUID(), folio: await nextFolio("envio"), email: p.email, name: p.name || (cuenta && cuenta.name) || "", phone: p.phone || (cuenta && cuenta.phone) || "",
      paqueteIds: [p.id], consolidar: false, direccion, automatico: true,
      status: "solicitado", sugerido: { cruce: sug.cruce, consolidacion: sug.consolidacion, sinRegistro: sug.sinRegistro, extras: sug.extras, kg: sug.kg },
      cotizacion: null, pago: null, paqueteria: "", guia: "", notaClienta: "", notaPrivada: "",
      history: [{ at, status: "solicitado", automatico: true }], createdAt: at, updatedAt: at,
    };
    await saveRecord("envio", envio);
  }
  await mutateRecord("paquete", p.id, (x) => {
    if (x.status !== "recibido") return null;
    x.status = "en_envio"; x.envioId = envio.id; return x;
  });
  return envio;
}

/* Envío pagado que ya tiene guía: sale solo y se le manda la guía. */
async function despacharConGuia(rec) {
  if (!rec || !rec.guia || rec.status !== "pagado") return rec;
  const at = new Date().toISOString();
  const out = await mutateRecord("envio", rec.id, (e) => {
    if (e.status !== "pagado") return null;
    e.status = "enviado"; e.enviadoAt = at;
    e.history = [...(e.history || []), { at, status: "enviado" }];
    return e;
  });
  if (!out) return rec;
  await Promise.all((out.paqueteIds || []).map((x) => mutateRecord("paquete", x, (p) => {
    p.status = "enviado"; p.history = [...(p.history || []), { at, status: "enviado" }]; return p;
  })));
  await avisar(out, `tu envío ${out.folio} va en camino 🚚`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu envío va en camino!</h2><p style="font-size:14px;">Paquetería: <b>${escHTML(out.paqueteria)}</b><br>Guía: <b>${escHTML(out.guia)}</b></p>`);
  return out;
}

function siteUrlFrom(event) {
  const host = ((event && event.headers && (event.headers["x-forwarded-host"] || event.headers.host)) || "").trim();
  return (host ? `https://${host}` : process.env.URL || "https://alpacca.mx").replace(/\/$/, "");
}

/* Crea la preferencia de Checkout Pro para pagar una compra o un envío.
   external_reference = "swm|<kind>|<id>" (así mp-webhook.js sabe que no
   es un pedido de la tienda). */
async function crearPreferenciaMP(kind, rec, event) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago no está configurado todavía en el sitio.");
  const site = siteUrlFrom(event);
  const titulo = kind === "compra" ? `Dirección americana ${rec.folio}: compra de productos` : kind === "paquete" ? `Dirección americana ${rec.folio}: cruce (15%)` : `Dirección americana ${rec.folio}: cruce y envío`;
  const body = {
    items: [{ title: titulo, quantity: 1, unit_price: round2(rec.cotizacion.total), currency_id: "MXN" }],
    external_reference: `swm|${kind}|${rec.id}`,
    payer: rec.name ? { name: rec.name, email: rec.email } : { email: rec.email },
    back_urls: {
      success: `${site}/?ver=direccion-americana&pago=ok`,
      failure: `${site}/?ver=direccion-americana&pago=error`,
      pending: `${site}/?ver=direccion-americana&pago=pendiente`,
    },
    auto_return: "approved",
    notification_url: `${site}/.netlify/functions/mp-webhook`,
  };
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const pref = await res.json();
  if (!res.ok) {
    console.error("swm: Mercado Pago rechazó la preferencia", pref);
    throw new Error("Mercado Pago rechazó la solicitud de pago.");
  }
  return token.startsWith("TEST-") ? pref.sandbox_init_point : pref.init_point;
}

/* Marca pagada una compra o un envío (desde el webhook o cuando Mae
   aprueba el comprobante). Idempotente. */
async function aplicarPago(kind, id, { metodo, paymentId, monto } = {}) {
  let changed = false;
  const rec = await mutateRecord(kind, id, (r) => {
    if (!r.pago || r.pago.status === "pagado") return null;
    if (monto != null && Math.abs(Number(monto) - Number(r.cotizacion && r.cotizacion.total)) > TOLERANCIA_MXN) {
      r.pago = { ...r.pago, status: "revision", motivo: `Mercado Pago cobró ${monto} y la cotización es ${r.cotizacion.total}`, paymentId };
      return r;
    }
    changed = true;
    r.pago = { ...r.pago, status: "pagado", metodo: metodo || r.pago.metodo, paymentId: paymentId || r.pago.paymentId, paidAt: new Date().toISOString() };
    // Un paquete no cambia de estado: solo queda su cruce pagado.
    if (kind === "paquete") r.crucePagado = true;
    else r.status = "pagado";
    r.history = [...(r.history || []), { at: r.pago.paidAt, status: kind === "paquete" ? "cruce_pagado" : "pagado" }];
    return r;
  });
  if (changed && rec) {
    await avisar(rec, `${rec.folio}: recibimos tu pago 💗`, `
      <h2 style="margin:0 0 8px;font-size:20px;">¡Pago recibido!</h2>
      <p style="font-size:14px;">Recibimos tu pago de ${formatPriceMXN(rec.pago.monto || (rec.cotizacion && rec.cotizacion.total))} de ${rec.folio}.
      ${kind === "compra" ? "Ya voy a hacer tu compra; te aviso cuando la registre." : kind === "paquete" ? "Tu cruce ya quedó pagado; cuando pidas tu envío, solo pagas la guía." : rec.guia ? "Tu envío sale con esta guía; ahorita te la mando." : "Ya preparo tu envío; te mando la guía en cuanto salga."}</p>`);
    if (kind !== "paquete") await premiarReferido(kind, rec).catch((err) => console.error("swm premio referido:", err));
    if (kind === "envio" && rec.guia) return despacharConGuia(rec);
  }
  return rec;
}

/* Lealtad: cada LEALTAD_CADA envíos entregados, un cruce con LEALTAD_PCT % de descuento. */
function lealtadDe(envios) {
  const entregados = envios.filter((e) => e.status === "entregado").length;
  const usados = envios.filter((e) => e.premioLealtad && e.status !== "cancelado").length;
  return { cada: LEALTAD_CADA, pct: LEALTAD_PCT, entregados, avance: entregados % LEALTAD_CADA, disponibles: Math.max(0, Math.floor(entregados / LEALTAD_CADA) - usados) };
}

/* Código "invita a una amiga" de la clienta (se crea la primera vez). */
async function codigoReferido(email, casillero) {
  const me = String(email || "").toLowerCase();
  const raiz = normCode(String(casillero || me.split("@")[0]).replace(/^ALP-/i, "")).replace(/[-_]/g, "").slice(0, 18) || "MAE";
  for (let i = 0; i < 5; i++) {
    const code = `AMIGA-${raiz}${i ? i + 1 : ""}`;
    const c = await getCoupon(code);
    if (c && c.duena === me) return code;
    if (c) continue;
    await saveCoupon({ code, tipo: "monto", valor: REFERIDO_MXN, aplica: "swm", unaVez: true, soloNuevas: true, duena: me, nota: `Invita a una amiga · código de ${me}` });
    return code;
  }
  return "";
}

/* Cupones de premio que tiene disponibles la clienta. */
async function premiosDe(email) {
  const me = String(email || "").toLowerCase();
  return (await listCoupons()).filter((c) => c.soloPara === me && c.activo && !(c.usosMax && (c.usos || 0) >= c.usosMax)).map((c) => ({ code: c.code, valor: c.valor, nota: c.nota }));
}

/* Cuando una amiga paga con el código de alguien, a esa clienta le toca su
   premio (una sola vez por cotización). */
async function premiarReferido(kind, rec) {
  const code = rec && rec.cotizacion && rec.cotizacion.cupon;
  if (!code || rec.premioReferido) return;
  const c = await getCoupon(code);
  if (!c || !c.duena || c.duena === rec.email) return;
  const premio = `GRACIAS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await saveCoupon({ code: premio, tipo: "monto", valor: REFERIDO_MXN, aplica: "swm", usosMax: 1, soloPara: c.duena, nota: `Premio por invitar a ${rec.name || rec.email}` });
  await mutateRecord(kind, rec.id, (r) => { r.premioReferido = premio; return r; });
  // Con su teléfono (de su cuenta o de sus paquetes) para que también le llegue por WhatsApp.
  const cuenta = await getCustomerByEmail(c.duena).catch(() => null);
  let phone = cuenta && cuenta.phone;
  if (!phone) {
    const suyos = (await Promise.all(["paquete", "envio", "compra"].map((k) => listRecords(k, { email: c.duena }).catch(() => [])))).flat();
    phone = (suyos.find((r) => r.phone) || {}).phone || "";
  }
  const duena = { email: c.duena, name: (cuenta && cuenta.name) || "", phone };
  await avisar(duena, `¡Ganaste ${formatPriceMXN(REFERIDO_MXN)} por invitar a una amiga! 💗`, `
    <h2 style="margin:0 0 8px;font-size:20px;">¡Gracias por invitar a una amiga!</h2>
    <p style="font-size:14px;">Tu amiga ya hizo su primer pago con tu código. Te regalamos <b>${formatPriceMXN(REFERIDO_MXN)}</b> para tu próximo envío o compra.</p>
    <p style="font-size:14px;">Tu cupón: <b>${premio}</b>. Ponlo en "¿Tienes un cupón?" cuando pagues tu siguiente cotización (también está en tu casillero).</p>`,
    null, `¡Gracias por invitar a una amiga! 💗 Ya hizo su primer pago con tu código y ganaste ${formatPriceMXN(REFERIDO_MXN)} para tu próximo envío o compra. Tu cupón es ${premio}: ponlo en "¿Tienes un cupón?" cuando pagues tu siguiente cotización. También lo ves en tu casillero.`);
}

/* Avisa a la clienta por correo y por WhatsApp. "to" es el registro
   (paquete, compra o envío, con email/phone/name) o solo un correo.
   "texto" es el aviso corto de WhatsApp; si no se da, se usa el asunto. */
async function avisar(to, subject, html, attachments, texto) {
  const email = typeof to === "string" ? to : to && to.email;
  if (!email) return;
  if (to && typeof to === "object" && to.phone) {
    const t = texto || subject;
    await notifyCustomerSwm({ phone: to.phone, name: to.name, texto: t.charAt(0).toUpperCase() + t.slice(1) });
  }
  await sendEmail({
    to: email,
    attachments,
    subject: `Dirección americana · ${subject}`,
    html: baseEmailHTML(`${html}
      <p style="margin-top:18px;"><a href="https://alpacca.mx/?ver=direccion-americana" style="background:#c4466e;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600;">Ver mi casillero</a></p>`),
  }).catch((err) => console.error("swm: correo", err));
}

/* Quita lo que es solo para Mae. */
function publico(r) {
  if (!r) return r;
  const out = { ...r };
  delete out.notaPrivada;
  delete out.history;
  delete out.capturas;
  if (out.pago) out.pago = { ...out.pago, paymentId: undefined };
  return out;
}

async function todoDe(email) {
  const [paquetes, compras, envios] = await Promise.all([
    listRecords("paquete", { email }), listRecords("compra", { email }), listRecords("envio", { email }),
  ]);
  return { paquetes, compras, envios };
}

module.exports = {
  lealtadDe, codigoReferido, premiosDe,
  ALMACENAJE_DIAS, round2, tipoDeCambio, tiposDeCambio, valorEnPesos, crucePaquete, cotizacionSugerida, cotizarEnvio, despacharConGuia, ponerCruceAnticipado, porPagar, envioAutomatico, crearPreferenciaMP, aplicarPago, avisar, publico, todoDe, getRecord,
  formatPriceMXN,
};
