// Lógica compartida de Shop with Mae: cálculo del cobro de un envío,
// preferencia de Mercado Pago, aplicar un pago y correos a la clienta.
// La usan swm-client.js (clienta), admin-swm.js (Mae) y mp-webhook.js.

const { getRecord, mutateRecord, listRecords } = require("./swm-store.js");
const { crucePorPeso, crucePorComision, consolidacionPorPeso } = require("./swm-pricing.js");
const { sendEmail, baseEmailHTML, formatPriceMXN } = require("./email.js");
const { loadPricingData } = require("./pricing.js");
const { notifyCustomerSwm } = require("./whatsapp.js");

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
  return crucePorPeso(p.cobrable || 0);
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
  const titulo = kind === "compra" ? `Shop with Mae ${rec.folio}: compra de productos` : `Shop with Mae ${rec.folio}: cruce y envío`;
  const body = {
    items: [{ title: titulo, quantity: 1, unit_price: round2(rec.cotizacion.total), currency_id: "MXN" }],
    external_reference: `swm|${kind}|${rec.id}`,
    payer: rec.name ? { name: rec.name, email: rec.email } : { email: rec.email },
    back_urls: {
      success: `${site}/?ver=shopwithmae&pago=ok`,
      failure: `${site}/?ver=shopwithmae&pago=error`,
      pending: `${site}/?ver=shopwithmae&pago=pendiente`,
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
    r.status = "pagado";
    r.history = [...(r.history || []), { at: r.pago.paidAt, status: "pagado" }];
    return r;
  });
  if (changed && rec) {
    await avisar(rec, `${rec.folio}: recibimos tu pago 💗`, `
      <h2 style="margin:0 0 8px;font-size:20px;">¡Pago recibido!</h2>
      <p style="font-size:14px;">Recibimos tu pago de ${formatPriceMXN(rec.pago.monto || (rec.cotizacion && rec.cotizacion.total))} de ${rec.folio}.
      ${kind === "compra" ? "Ya voy a hacer tu compra; te aviso cuando la registre." : "Ya preparo tu envío; te mando la guía en cuanto salga."}</p>`);
  }
  return rec;
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
    subject: `Shop with Mae · ${subject}`,
    html: baseEmailHTML(`${html}
      <p style="margin-top:18px;"><a href="https://alpacca.mx/?ver=shopwithmae" style="background:#c4466e;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600;">Ver mi casillero</a></p>`),
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
  ALMACENAJE_DIAS, round2, tipoDeCambio, tiposDeCambio, valorEnPesos, crucePaquete, cotizacionSugerida, crearPreferenciaMP, aplicarPago, avisar, publico, todoDe, getRecord,
  formatPriceMXN,
};
