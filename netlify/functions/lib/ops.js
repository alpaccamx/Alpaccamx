// Consultas de SOLO LECTURA para operación (Muse u otra ayudante), con su
// propia clave OPS_READ_KEY -- distinta de ADMIN_KEY, que puede cambiar y
// borrar cosas. Usado por ops-pedido, ops-buscar-paquete y ops-pendientes.
//
// Regla: solo sale lo necesario para operar -- folio, etapa, paquetería,
// guía, primer nombre y código de casillero (ALP-…). Nunca montos, pagos,
// comprobantes, direcciones, correos, teléfonos, notas, artículos ni fotos.
// Por eso cada vista se ARMA campo por campo (lista blanca), en vez de
// copiar el registro y borrar lo delicado.
//
// Los datos se leen de los mismos lugares que admin-orders.js
// (lib/blob-store.js) y admin-swm.js (lib/swm-store.js / lib/swm-core.js),
// pero sin escribir nada: ni reconcileReservations ni casilleroDe (que
// crean o cambian registros).

const blobStore = require("./blob-store.js");
const swmStore = require("./swm-store.js");
const { diasAlmacenaje } = require("./swm-core.js");
const { safeCompare } = require("./secure-compare.js");
const rateLimit = require("./rate-limit.js");

const MIN_KEY_LEN = 24;
const DIA = 24 * 60 * 60 * 1000;

/* ---------- Clave ---------- */

// { configured, valid }. "configured" es false si OPS_READ_KEY no está, es
// muy corta, o es IGUAL a ADMIN_KEY (debe ser otra). Solo por el header
// "x-ops-key" (nunca por la URL, donde quedaría en historiales y logs).
function checkOpsKey(event) {
  const key = process.env.OPS_READ_KEY || "";
  const admin = process.env.ADMIN_KEY || "";
  if (key.length < MIN_KEY_LEN || (admin && safeCompare(key, admin))) return { configured: false, valid: false };
  const h = event.headers || {};
  const provided = h["x-ops-key"] || h["X-Ops-Key"] || h["X-OPS-KEY"] || "";
  return { configured: true, valid: safeCompare(String(provided), key) };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    body: JSON.stringify(body),
  };
}

/* Envoltura común de los 3 endpoints: solo GET, límite por IP y clave. */
function opsHandler(fn) {
  return async (event) => {
    if (event.httpMethod !== "GET") return json(405, { error: "Solo GET (es de solo lectura)." });
    const ip = rateLimit.getClientIp(event);
    const rl = await rateLimit.checkRateLimit(`ops:${ip}`, { max: 120, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return json(429, { error: "Demasiadas consultas. Espera unos minutos." });
    const auth = checkOpsKey(event);
    if (!auth.configured) return json(500, { error: "Falta configurar OPS_READ_KEY en Netlify (distinta de ADMIN_KEY)." });
    if (!auth.valid) return json(401, { error: "Clave de solo lectura incorrecta." });
    try {
      return await fn(event.queryStringParameters || {});
    } catch (err) {
      console.error("ops:", err);
      return json(500, { error: "No se pudo consultar." });
    }
  };
}

/* ---------- Datos (solo lectura) ---------- */

async function cargarTodo({ tienda = true, swm = true } = {}) {
  const [orders, paquetes, compras, envios, casilleros] = await Promise.all([
    tienda ? blobStore.listOrders() : [],
    swm ? swmStore.listRecords("paquete") : [],
    swm ? swmStore.listRecords("compra") : [],
    swm ? swmStore.listRecords("envio") : [],
    swm ? swmStore.todosLosCasilleros().catch(() => ({})) : {},
  ]);
  return { orders: orders || [], paquetes: paquetes || [], compras: compras || [], envios: envios || [], casilleros: casilleros || {} };
}

/* ---------- Ayudas ---------- */

function primerNombre(nombre) {
  return String(nombre || "").trim().split(/\s+/)[0].slice(0, 30);
}
const fecha = (iso) => (iso ? String(iso).slice(0, 10) : "");
const numeroPedido = (o) => String((o && o.id) || "").slice(0, 8).toUpperCase();
const normGuia = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const STAGE_ORDER = ["pagado", "pedido_abw", "llego", "enviado", "entregado"];
function etapaTienda(o) {
  if (o.status === "paid") {
    let r = STAGE_ORDER.indexOf(o.stage);
    if (r < 0) r = 0;
    if (o.supplierOrderNumber) r = Math.max(r, 1);
    if (o.trackingNumber) r = Math.max(r, 3);
    return STAGE_ORDER[r];
  }
  if (o.status === "pending") return o.hasPaymentProof ? "comprobante_por_revisar" : "esperando_pago";
  if (String(o.status || "").startsWith("cancelled")) return "cancelado";
  return "sin_pago"; // failed / errores de Mercado Pago
}

const TEXTO = {
  // Tienda
  esperando_pago: "Esperando pago", comprobante_por_revisar: "Comprobante por revisar", sin_pago: "Pago no completado",
  pagado: "Pagado", pedido_abw: "Pedido a Corea", llego: "Llegó a México, por enviar", enviado: "Enviado", entregado: "Entregado", cancelado: "Cancelado",
  // Paquetes
  registrado: "Viene en camino a la dirección americana", recibido: "Recibido", sin_dueña: "Llegó sin dueña",
  en_envio: "En un envío", en_mexico: "En México",
  // Compras y envíos
  solicitud: "Por cotizar", solicitado: "Por cotizar", cotizado: "Cotizado, esperando pago", comprado: "Comprado",
};
const texto = (e) => TEXTO[e] || e;

/* ---------- Vistas (lista blanca de campos) ---------- */

function vistaPedido(o) {
  const etapa = etapaTienda(o);
  return {
    tipo: "tienda",
    folio: numeroPedido(o),
    etapa,
    etapaTexto: texto(etapa),
    paqueteria: o.trackingNumber ? String(o.carrier || "") : "",
    guia: String(o.trackingNumber || ""),
    entregaPersonal: !!(o.customer && o.customer.entregaPersonal),
    nombre: primerNombre(o.customer && o.customer.name),
    creado: fecha(o.createdAt),
    actualizado: fecha(o.stageUpdatedAt || o.shippedAt || o.paidAt || o.createdAt),
  };
}

function etapaPaquete(p) {
  if (p.status === "recibido") return p.enMexicoAt ? "en_mexico" : "recibido_usa";
  return p.status;
}
TEXTO.recibido_usa = "En la dirección americana (falta cruzar)";

function vistaPaquete(p, casilleros, envios = []) {
  const etapa = etapaPaquete(p);
  const env = envios.find((e) => (e.paqueteIds || []).includes(p.id) && e.status !== "cancelado");
  const out = {
    tipo: "paquete",
    folio: String(p.folio || ""),
    etapa,
    etapaTexto: texto(etapa),
    tienda: String(p.tienda || "").slice(0, 60),
    paqueteria: String(p.paqueteria || ""),
    rastreo: p.origen === "compra" ? "" : String(p.rastreo || ""),
    nombre: primerNombre(p.name),
    casillero: (p.email && casilleros[p.email]) || "",
    recibido: fecha(p.receivedAt),
    enMexico: fecha(p.enMexicoAt),
  };
  if (p.enMexicoAt && p.status === "recibido") {
    out.almacenajeGratisHasta = fecha(new Date(new Date(p.enMexicoAt).getTime() + diasAlmacenaje(p.enMexicoAt) * DIA).toISOString());
  }
  if (env) out.envio = { folio: String(env.folio || ""), etapa: env.status, etapaTexto: texto(env.status), paqueteria: env.guia ? String(env.paqueteria || "") : "", guia: String(env.guia || "") };
  return out;
}

function vistaEnvio(e, casilleros, paquetes = []) {
  return {
    tipo: "envio",
    folio: String(e.folio || ""),
    etapa: e.status,
    etapaTexto: texto(e.status),
    paqueteria: e.guia ? String(e.paqueteria || "") : "",
    guia: String(e.guia || ""),
    nombre: primerNombre(e.name),
    casillero: (e.email && casilleros[e.email]) || "",
    paquetes: (e.paqueteIds || []).map((id) => (paquetes.find((p) => p.id === id) || {}).folio).filter(Boolean),
    creado: fecha(e.createdAt),
  };
}

function vistaCompra(c, casilleros) {
  return {
    tipo: "compra",
    folio: String(c.folio || ""),
    etapa: c.status,
    etapaTexto: texto(c.status),
    tienda: String(c.tienda || "").slice(0, 60),
    nombre: primerNombre(c.name),
    casillero: (c.email && casilleros[c.email]) || "",
    creado: fecha(c.createdAt),
  };
}

/* ---------- Búsquedas ---------- */

// Folio: "A1B2C3D4" / "#A1B2C3D4" (tienda), "P-0012", "E-0003", "C-0005".
function buscarFolio(q, d) {
  const f = String(q || "").trim().toUpperCase().replace(/^#/, "");
  if (!f) return { error: "Falta ?folio=" };
  // Sin guion y de 6-8 caracteres hex = número de pedido de la tienda
  // (puede empezar con C o E, ej. "E1234567"); si no aparece, se intenta
  // como folio del casillero.
  if (!f.includes("-") && /^[0-9A-F]{6,8}$/.test(f)) {
    const tienda = d.orders.filter((o) => numeroPedido(o).startsWith(f)).slice(0, 5).map(vistaPedido);
    if (tienda.length) return { resultados: tienda };
  }
  const m = f.match(/^([PCE])-?0*(\d{1,6})$/);
  if (m) {
    const folio = `${m[1]}-${m[2].padStart(4, "0")}`;
    if (m[1] === "P") return { resultados: d.paquetes.filter((p) => p.folio === folio).map((p) => vistaPaquete(p, d.casilleros, d.envios)) };
    if (m[1] === "E") return { resultados: d.envios.filter((e) => e.folio === folio).map((e) => vistaEnvio(e, d.casilleros, d.paquetes)) };
    return { resultados: d.compras.filter((c) => c.folio === folio).map((c) => vistaCompra(c, d.casilleros)) };
  }
  if (/^[0-9A-F]{6,8}$/.test(f)) return { resultados: [] };
  return { error: "Folio no válido. Usa el número de pedido (8 caracteres) o P-0001 / E-0001 / C-0001." };
}

// Una guía coincide si es igual (sin espacios ni guiones) o, con 10+
// caracteres, si una termina en la otra (los códigos de barras de USPS y
// FedEx a veces traen dígitos de más al principio).
function mismaGuia(a, b) {
  const x = normGuia(a); const y = normGuia(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return Math.min(x.length, y.length) >= 10 && (x.endsWith(y) || y.endsWith(x));
}

function buscarRastreo(q, d) {
  const r = normGuia(q);
  if (r.length < 6) return { error: "Falta ?rastreo= (mínimo 6 caracteres)." };
  const paquetes = d.paquetes.filter((p) => [p.rastreo, ...(p.guiasUSA || [])].some((g) => mismaGuia(g, r)));
  const envios = d.envios.filter((e) => mismaGuia(e.guia, r));
  const tienda = d.orders.filter((o) => mismaGuia(o.trackingNumber, r));
  return {
    resultados: [
      ...paquetes.map((p) => vistaPaquete(p, d.casilleros, d.envios)),
      ...envios.map((e) => vistaEnvio(e, d.casilleros, d.paquetes)),
      ...tienda.map(vistaPedido),
    ],
  };
}

/* ---------- Pendientes del día ---------- */

function pendientes(d, now = Date.now()) {
  const enRev = (r) => r.pago && r.pago.status === "revision";
  const comprobantes = [
    ...d.orders.filter((o) => (o.status === "pending" && o.hasPaymentProof) || (o.proofsExtra || []).some((x) => x.status === "revision"))
      .map((o) => ({ tipo: "tienda", folio: numeroPedido(o), nombre: primerNombre(o.customer && o.customer.name) })),
    ...d.compras.filter(enRev).map((c) => ({ tipo: "compra", folio: c.folio, nombre: primerNombre(c.name), casillero: d.casilleros[c.email] || "" })),
    ...d.envios.filter(enRev).map((e) => ({ tipo: "envio", folio: e.folio, nombre: primerNombre(e.name), casillero: d.casilleros[e.email] || "" })),
    ...d.paquetes.filter(enRev).map((p) => ({ tipo: "paquete", folio: p.folio, nombre: primerNombre(p.name), casillero: d.casilleros[p.email] || "" })),
  ];
  const porCotizar = [
    ...d.envios.filter((e) => e.status === "solicitado").map((e) => vistaEnvio(e, d.casilleros, d.paquetes)),
    ...d.compras.filter((c) => c.status === "solicitud").map((c) => vistaCompra(c, d.casilleros)),
  ];
  const guiasPorHacer = [
    // Tienda: pagado, sin guía, con mensajería (no entrega en persona) y ya
    // en México (todo de stock, o ya llegó de Corea). Los "guardados" para
    // juntar envío no cuentan todavía.
    ...d.orders.filter((o) => {
      if (o.status !== "paid" || o.trackingNumber || (o.customer && o.customer.entregaPersonal) || o.enEspera) return false;
      const st = etapaTienda(o);
      return st === "llego" || (st === "pagado" && (o.items || []).every((it) => it.enStock));
    }).map(vistaPedido),
    ...d.envios.filter((e) => ["pagado", "en_mexico"].includes(e.status) && !e.guia).map((e) => vistaEnvio(e, d.casilleros, d.paquetes)),
  ];
  const almacenaje = d.paquetes.filter((p) => p.status === "recibido" && p.enMexicoAt).map((p) => {
    const vence = new Date(p.enMexicoAt).getTime() + diasAlmacenaje(p.enMexicoAt) * DIA;
    return { p, diasRestantes: Math.ceil((vence - now) / DIA) };
  }).filter((x) => x.diasRestantes <= 3).sort((a, b) => a.diasRestantes - b.diasRestantes)
    .map(({ p, diasRestantes }) => ({ ...vistaPaquete(p, d.casilleros, d.envios), diasRestantes, vencido: diasRestantes < 0 }));
  const sinDuena = d.paquetes.filter((p) => p.status === "sin_dueña").map((p) => ({ folio: p.folio, recibido: fecha(p.receivedAt || p.createdAt), tienda: String(p.tienda || "").slice(0, 60) }));
  return {
    generado: new Date(now).toISOString(),
    resumen: { comprobantes: comprobantes.length, porCotizar: porCotizar.length, guiasPorHacer: guiasPorHacer.length, almacenaje: almacenaje.length, sinDuena: sinDuena.length },
    comprobantesPorRevisar: comprobantes,
    porCotizar,
    guiasPorHacer,
    almacenajePorVencer: almacenaje,
    sinDuena,
  };
}

module.exports = { checkOpsKey, opsHandler, json, cargarTodo, primerNombre, etapaTienda, vistaPedido, vistaPaquete, vistaEnvio, vistaCompra, buscarFolio, buscarRastreo, mismaGuia, pendientes };
