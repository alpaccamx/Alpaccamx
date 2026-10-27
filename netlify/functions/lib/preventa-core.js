// Lógica compartida de la preventa: reglas de la campaña, cupos, pagos
// (Mercado Pago y transferencia) y avisos a la clienta. La usan
// preventa.js (clienta), admin-preventa.js (Mae) y mp-webhook.js.

const { getConfig, listProductos, listApartados, mutateApartado } = require("./preventa-store.js");
const { sendEmail, baseEmailHTML, formatPriceMXN } = require("./email.js");
const { notifyCustomerTemplate } = require("./whatsapp.js");
const { CSV_URLS, csvToNacionalRates, nacionalShippingMXN } = require("./pricing.js");

const MP_API = "https://api.mercadopago.com";
const TOLERANCIA_MXN = 1;
// Un apartado sin anticipo (ni comprobante) se libera solo pasado este
// tiempo, para que el cupo no se quede atorado.
const HORAS_PARA_PAGAR = 24;

const CONFIG_DEFAULT = {
  activa: false,
  titulo: "Preventa Sephora Sale",
  descripcion: "Aparta tus favoritos de Sephora con el 50% y paga el resto cuando lleguen.",
  cierre: "",
  llegada: "",
  anticipoPct: 50,
  envioDefault: 0, // envío que Mae suele cobrar (se propone al marcar "llegó")
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const now = () => new Date().toISOString();

async function configActual() {
  return { ...CONFIG_DEFAULT, ...(await getConfig()) };
}

function abierta(cfg) {
  return !!cfg.activa && (!cfg.cierre || Date.now() < Date.parse(cfg.cierre));
}

/* Apartado que ya no cuenta: cancelado, o sin pagar el anticipo a tiempo. */
function vencido(a) {
  return a.status === "nuevo" && a.anticipo && a.anticipo.status === "pendiente"
    && Date.now() - Date.parse(a.createdAt) > HORAS_PARA_PAGAR * 3600 * 1000;
}
const cuenta = (a) => a.status !== "cancelado" && !vencido(a);

/* Piezas apartadas por producto (solo apartados que siguen contando). */
function reservadas(apartados) {
  const out = {};
  for (const a of apartados) {
    if (!cuenta(a)) continue;
    for (const it of a.items || []) out[it.id] = (out[it.id] || 0) + (Number(it.qty) || 0);
  }
  return out;
}

const sinLimite = (p) => p.piezas == null || p.piezas === "";

/* Productos con su cupo. Si ninguno tiene límite de piezas no hace falta
   leer los apartados (así cada visita es una sola lectura). */
async function productosConCupo({ conApartadas = false } = {}) {
  const productos = await listProductos();
  const hayLimite = productos.some((p) => !sinLimite(p));
  const res = hayLimite || conApartadas ? reservadas(await listApartados()) : {};
  return productos.map((p) => ({
    ...p,
    apartadas: res[p.id] || 0,
    disponibles: sinLimite(p) ? null : Math.max(0, (Number(p.piezas) || 0) - (res[p.id] || 0)),
  }));
}

/* Peso de envío de una pieza (kg): el que Mae le ponga al producto, o el
   estimado de cada tono/tamaño. */
const pesoDe = (p, v) => (Number(p.peso) > 0 ? Number(p.peso) : Number(v && v.peso) || 0);

/* Envío nacional estimado (misma tabla de Estafeta que la tienda). Solo es
   una referencia: se cobra con el resto, y Mae lo puede cambiar. */
let tarifas = null;
async function envioEstimado(cp, pesoKg) {
  if (!/^\d{5}$/.test(String(cp || "")) || !(pesoKg > 0)) return null;
  try {
    if (!tarifas || Date.now() - tarifas.at > 3600 * 1000) {
      const res = await fetch(CSV_URLS.shippingNacional, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      tarifas = { at: Date.now(), nacional: csvToNacionalRates(await res.text()) };
    }
    return nacionalShippingMXN({ nacional: tarifas.nacional, settings: {} }, cp, pesoKg);
  } catch (err) {
    console.error("preventa: tarifas de envío", err);
    return null;
  }
}

const varPublica = (v, p = {}) => ({ id: v.id, nombre: v.nombre, desc: v.desc || "", tamano: v.tamano || "", precio: v.precio, precioAntes: v.precioAntes || 0, imagen: v.imagen || "", swatch: v.swatch || "", peso: pesoDe(p, v), agotado: !!v.agotado });

/* Lo que ve la clienta de un producto en la lista (sin los tonos, para que
   pese poco); "detalle" agrega todas sus variantes. */
function productoPublico(p, { detalle = false } = {}) {
  const vs = (p.variantes || []).filter((v) => !v.agotado);
  const precios = vs.map((v) => v.precio).filter((n) => n > 0);
  const out = {
    id: p.id, nombre: p.nombre, marca: p.marca, grupo: p.grupo || "", imagen: p.imagen, descripcion: p.descripcion,
    precio: precios.length ? Math.min(...precios) : p.precio,
    precioMax: precios.length ? Math.max(...precios) : p.precio,
    precioAntes: precios.length ? Math.min(...vs.map((v) => v.precioAntes || 0)) : p.precioAntes || 0,
    disponibles: p.disponibles, variacion: p.variacion || "", numVariantes: vs.length, peso: pesoDe(p),
    agotado: (p.variantes || []).length > 0 && !vs.length,
  };
  if (detalle) out.variantes = (p.variantes || []).map((v) => varPublica(v, p));
  return out;
}

/* Lo que ve la clienta de su apartado. */
function apartadoPublico(a) {
  const out = { ...a, vencido: vencido(a) };
  delete out.notaPrivada;
  delete out.history;
  for (const etapa of ["anticipo", "resto"]) if (out[etapa]) out[etapa] = { ...out[etapa], paymentId: undefined };
  return out;
}

/* Etapa de pago que le toca a la clienta ahorita, o null. */
function etapaPorPagar(a) {
  if (a.status === "nuevo" && !vencido(a) && a.anticipo && a.anticipo.status !== "pagado") return "anticipo";
  if (a.status === "llego" && a.resto && a.resto.status !== "pagado" && a.resto.monto > 0) return "resto";
  return null;
}

function siteUrlFrom(event) {
  const host = ((event && event.headers && (event.headers["x-forwarded-host"] || event.headers.host)) || "").trim();
  return (host ? `https://${host}` : process.env.URL || "https://alpacca.mx").replace(/\/$/, "");
}

/* Preferencia de Checkout Pro. external_reference = "pv|<id>|<etapa>"
   (así mp-webhook.js sabe que es de la preventa). */
async function crearPreferenciaMP(a, etapa, event) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago no está configurado todavía en el sitio.");
  const site = siteUrlFrom(event);
  const titulo = etapa === "anticipo" ? `Preventa ${a.folio}: anticipo para apartar` : `Preventa ${a.folio}: resto${a.envio ? " y envío" : ""}`;
  const body = {
    items: [{ title: titulo, quantity: 1, unit_price: round2(a[etapa].monto), currency_id: "MXN" }],
    external_reference: `pv|${a.id}|${etapa}`,
    payer: a.name ? { name: a.name, email: a.email } : { email: a.email },
    back_urls: {
      success: `${site}/?ver=preventa&pago=ok`,
      failure: `${site}/?ver=preventa&pago=error`,
      pending: `${site}/?ver=preventa&pago=pendiente`,
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
    console.error("preventa: Mercado Pago rechazó la preferencia", pref);
    throw new Error("Mercado Pago rechazó la solicitud de pago.");
  }
  return token.startsWith("TEST-") ? pref.sandbox_init_point : pref.init_point;
}

/* Correo (y WhatsApp si hay teléfono) a la clienta. */
async function avisar(a, subject, html, texto) {
  if (!a || !a.email) return;
  if (a.phone) {
    const t = texto || subject;
    await notifyCustomerTemplate("aviso_pedido", { phone: a.phone, name: a.name, texto: t.charAt(0).toUpperCase() + t.slice(1) }).catch((err) => console.error("preventa: whatsapp", err));
  }
  await sendEmail({
    to: a.email,
    subject: `Preventa · ${subject}`,
    html: baseEmailHTML(`${html}
      <p style="margin-top:18px;"><a href="https://alpacca.mx/?ver=preventa" style="background:#c4466e;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600;">Ver mis apartados</a></p>`),
  }).catch((err) => console.error("preventa: correo", err));
}

const listaHTML = (a) => `<ul style="font-size:14px;padding-left:18px;">${(a.items || []).map((it) => `<li>${it.qty} × ${esc(it.marca ? `${it.marca} ` : "")}${esc(it.nombre)}${it.variante ? ` · ${esc(it.variante)}` : ""}${it.tamano ? ` (${esc(it.tamano)})` : ""} — ${formatPriceMXN(it.precio)} c/u</li>`).join("")}</ul>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Marca pagada una etapa (webhook de Mercado Pago o Mae aprobando el
   comprobante). Idempotente. */
async function aplicarPago(id, etapa, { metodo, paymentId, monto } = {}) {
  if (!["anticipo", "resto"].includes(etapa)) return null;
  let changed = false;
  const rec = await mutateApartado(id, (a) => {
    const p = a[etapa];
    if (!p || p.status === "pagado") return null;
    if (monto != null && Math.abs(Number(monto) - Number(p.monto)) > TOLERANCIA_MXN) {
      a[etapa] = { ...p, status: "revision", motivo: `Mercado Pago cobró ${monto} y tocaba ${p.monto}`, paymentId };
      return a;
    }
    changed = true;
    a[etapa] = { ...p, status: "pagado", metodo: metodo || p.metodo, paymentId: paymentId || p.paymentId, paidAt: now(), rechazo: undefined };
    if (etapa === "anticipo" && a.status === "nuevo") a.status = "apartado";
    if (etapa === "resto" && a.status === "llego") a.status = "liquidado";
    a.history = [...(a.history || []), { at: now(), status: a.status, pago: etapa }];
    return a;
  });
  if (changed && rec) {
    if (etapa === "anticipo") {
      await avisar(rec, `${rec.folio}: ¡quedó apartado! 💗`, `
        <h2 style="margin:0 0 8px;font-size:20px;">¡Tu apartado está confirmado!</h2>
        <p style="font-size:14px;">Recibimos tu anticipo de ${formatPriceMXN(rec.anticipo.monto)}. Esto es lo que apartaste:</p>
        ${listaHTML(rec)}
        <p style="font-size:14px;">Cuando lleguen tus productos te aviso para que pagues el resto (${formatPriceMXN(rec.total - rec.anticipo.monto)}${rec.entrega === "envio" ? " más el envío" : ""}).</p>`,
      `${rec.folio}: recibimos tu anticipo, tus productos quedaron apartados`);
    } else {
      await avisar(rec, `${rec.folio}: pagaste el resto ✅`, `
        <h2 style="margin:0 0 8px;font-size:20px;">¡Liquidado!</h2>
        <p style="font-size:14px;">Recibimos tu pago de ${formatPriceMXN(rec.resto.monto)}. ${rec.entrega === "personal" ? "Te escribo para quedar en la entrega." : "Ya preparo tu envío; te mando la guía en cuanto salga."}</p>`,
      `${rec.folio}: recibimos tu pago, ${rec.entrega === "personal" ? "te escribo para la entrega" : "ya preparo tu envío"}`);
    }
  }
  return rec;
}

module.exports = {
  CONFIG_DEFAULT, HORAS_PARA_PAGAR, round2, configActual, abierta, vencido, cuenta, reservadas, productosConCupo, sinLimite, pesoDe, envioEstimado,
  productoPublico, apartadoPublico, etapaPorPagar, crearPreferenciaMP, aplicarPago, avisar, listaHTML, esc, formatPriceMXN,
};
