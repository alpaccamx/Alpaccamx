/* ======================================================================
   Shop with Mae (alpacca.mx/?ver=shopwithmae): casillero en EE.UU.,
   personal shopper y cruce a México, al estilo de Delivered -- todo se
   registra y se paga aquí (tarjeta con Mercado Pago o transferencia
   subiendo el comprobante). Usa la sesión de la tienda y los helpers de
   app.js (escapeHtml, getCustomerToken, whatsappHref, shippingSettings,
   showHomeView, openAccountPanelDefault). Backend: swm-client.js; Mae lo
   maneja en /admin.html → Más → Shop with Mae.
   ====================================================================== */

/* Misma tarifa que netlify/functions/lib/swm-pricing.js y admin.js. */
const SWM_TARIFA = { 1: 250, 2: 350, 3: 450, 4: 450, 5: 550, 6: 900, 7: 900, 8: 1000, 9: 1000, 10: 1000, 11: 1000, 12: 1200, 13: 1200, 14: 1400, 15: 2000 };
const SWM_KILO_EXTRA = 120;
const SWM_COMISION_PCT = 15;

/* Dirección americana. En el "Last name" va el código de casillero de la
   clienta (ALP-ANA L): así Mae sabe de quién es cada paquete que
   llega, aunque no lo hayan registrado, y la dirección queda limpia para
   el repartidor. */
const SWM_ADDRESS = {
  address1: "648 White Cliffs Drive",
  address2: "Apt B",
  city: "El Paso",
  state: "Texas",
  zip: "79912-8225",
  phone: "+1 (915) 291-7727",
  firstName: "Maelyn Arias",
};

const SWM_PKG_STATUS = {
  sin_registro: ["⚠️ Llegó sin registrar", "bg-sale/10 text-sale"],
  registrado: ["⏳ En camino al almacén", "bg-[#fff6e5] text-[#8a5a00]"],
  recibido: ["📥 En el almacén", "bg-[#eef8f2] text-green-800"],
  en_envio: ["📦 En un envío", "bg-lilac/15 text-lilac-ink"],
  enviado: ["🚚 Enviado a México", "bg-lilac/15 text-lilac-ink"],
  entregado: ["🎁 Entregado", "bg-pill text-ink/70"],
  cancelado: ["Cancelado", "bg-pill text-ink/50"],
};
const SWM_COMPRA_STATUS = {
  solicitud: ["🕐 Cotizando", "bg-[#fff6e5] text-[#8a5a00]"],
  cotizado: ["💳 Lista para pagar", "bg-blush/40 text-rose-ink"],
  pagado: ["✅ Pagada · comprando", "bg-[#eef8f2] text-green-800"],
  comprado: ["🛍️ Comprada", "bg-lilac/15 text-lilac-ink"],
  cancelado: ["Cancelada", "bg-pill text-ink/50"],
};
const SWM_ENVIO_STATUS = {
  solicitado: ["🕐 Cotizando envío", "bg-[#fff6e5] text-[#8a5a00]"],
  cotizado: ["💳 Listo para pagar", "bg-blush/40 text-rose-ink"],
  pagado: ["✅ Pagado · preparando", "bg-[#eef8f2] text-green-800"],
  enviado: ["🚚 En camino", "bg-lilac/15 text-lilac-ink"],
  entregado: ["🎁 Entregado", "bg-pill text-ink/70"],
  cancelado: ["Cancelado", "bg-pill text-ink/50"],
};

let swm = { loaded: false, loading: false, error: "", name: "", phone: "", casillero: "", precios: { revision: 50, separar: 50 }, paquetes: [], compras: [], envios: [], tab: "paquetes", form: "", almacenajeDias: 30 };

const swmMXN = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
const swmDate = (iso, opts = { day: "numeric", month: "short" }) => (iso ? new Date(iso).toLocaleDateString("es-MX", opts) : "");
const swmPill = (map, st) => { const [t, c] = map[st] || [st, "bg-pill"]; return `<span class="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${c}">${t}</span>`; };

function swmPesoCobrable(kg, alto, ancho, largo) {
  const vol = alto > 0 && ancho > 0 && largo > 0 ? (alto * ancho * largo) / 5000 : 0;
  const p = Math.max(kg || 0, vol);
  return { vol, cobrable: p > 0 ? Math.ceil(p - 1e-9) : 0 };
}
function swmCrucePeso(kg) {
  if (!kg) return 0;
  return kg <= 15 ? SWM_TARIFA[kg] : SWM_TARIFA[15] + (kg - 15) * SWM_KILO_EXTRA;
}

/* Link que Mae manda por WhatsApp: ?ver=shopwithmae&compra=<id> abre esa
   cotización (después de iniciar sesión, si hace falta). */
let swmFocusCompra = new URLSearchParams(location.search).get("compra") || "";

function swmMostrarCompra() {
  if (!swmFocusCompra || !swm.loaded) return;
  const id = swmFocusCompra;
  swmFocusCompra = "";
  if (!swm.compras.some((c) => c.id === id)) return;
  swm.tab = "compras";
  renderSwmCasillero();
  const el = document.getElementById(`swm-compra-${id}`);
  if (el) {
    el.classList.add("ring-2", "ring-rose-deep");
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
}

function openSwmSection({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  showHomeView("swm", { ver: "shopwithmae" });
  renderSwm();
  if (!restore) document.getElementById("swm-section").scrollIntoView({ behavior: "auto", block: "start" });
}

/* Se llama desde app.js cuando la clienta inicia o cierra sesión. */
function swmOnAuthChange() {
  swm = { ...swm, loaded: false, loading: false, error: "", casillero: "", paquetes: [], compras: [], envios: [], form: "" };
  if (!document.getElementById("swm-section").classList.contains("hidden")) renderSwm();
}

function renderSwm() {
  // Con sesión, la página abre directo en su dirección y su casillero: la
  // explicación del servicio queda plegada abajo. Sin sesión, al revés.
  const logged = Boolean(getCustomerToken());
  document.querySelectorAll("#swm-section .swm-guest").forEach((el) => el.classList.toggle("hidden", logged));
  ["swm-how", "swm-prices"].forEach((id) => { document.getElementById(id).open = !logged; });
  renderSwmPagoBanner();
  renderSwmWelcome();
  renderSwmGuias();
  renderSwmAddress();
  renderSwmCasillero();
  if (getCustomerToken() && !swm.loaded && !swm.loading) loadSwm();
  if (!logged && swmFocusCompra) setTimeout(() => document.getElementById("swm-casillero").scrollIntoView({ behavior: "smooth", block: "center" }), 100);
}

/* Al regresar de Mercado Pago (?pago=ok|pendiente|error). */
function renderSwmPagoBanner() {
  const el = document.getElementById("swm-pago-banner");
  const st = new URLSearchParams(location.search).get("pago");
  const msg = {
    ok: ["bg-[#eef8f2] text-green-800", "¡Gracias! Recibimos tu pago con tarjeta. En unos segundos se marca como pagado en tu casillero (y te llega un correo)."],
    pendiente: ["bg-[#fff6e5] text-[#8a5a00]", "Tu pago quedó pendiente en Mercado Pago. En cuanto se acredite se marca solo en tu casillero."],
    error: ["bg-sale/10 text-sale", "El pago con tarjeta no se completó. Puedes intentarlo otra vez o pagar por transferencia."],
  }[st];
  el.classList.toggle("hidden", !msg);
  if (msg) el.innerHTML = `<p class="rounded-2xl px-4 py-3 text-sm font-semibold ${msg[0]}">${msg[1]}</p>`;
}

function swmLoginPrompt(text) {
  return `<div class="rounded-2xl bg-blush/25 p-5 text-center">
    <p class="text-sm text-ink/85">${text}</p>
    <button type="button" data-swm-login class="mt-3 inline-flex items-center rounded-full bg-rose-deep px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rose-ink transition">Iniciar sesión o crear cuenta</button>
  </div>`;
}

function swmAddressFields() {
  const nombre = swm.name || (typeof myAccountCache !== "undefined" && myAccountCache.name) || "Tu nombre";
  return [
    ["First name (Nombre)", SWM_ADDRESS.firstName],
    ["Last name (Apellido)", swm.casillero || nombre],
    ["Address (Dirección)", SWM_ADDRESS.address1],
    ["Address 2 (Apt, suite)", SWM_ADDRESS.address2],
    ["City (Ciudad)", SWM_ADDRESS.city],
    ["State (Estado)", SWM_ADDRESS.state],
    ["ZIP code", SWM_ADDRESS.zip],
    ["Phone (Teléfono)", SWM_ADDRESS.phone],
  ];
}

function renderSwmAddress() {
  const el = document.getElementById("swm-address");
  const h = `<h3 class="font-display text-xl sm:text-2xl text-ink mb-3">🏠 Tu dirección americana</h3>`;
  if (!getCustomerToken()) {
    el.innerHTML = h + swmLoginPrompt("Crea tu cuenta gratis (o inicia sesión) para ver tu dirección en EE.UU. y tu código de casillero.");
    return;
  }
  const fields = swmAddressFields();
  const all = fields.map(([l, v]) => `${l.replace(/ \(.*\)$/, "")}: ${v}`).join("\n");
  const row = ([label, value]) => `<div class="flex items-center justify-between gap-3 py-2 border-b border-white/30 last:border-0">
      <div class="min-w-0"><span class="block text-[11px] uppercase tracking-wide text-cream/80">${label}</span><b class="block text-base text-cream break-words">${escapeHtml(value)}</b></div>
      <button type="button" data-swm-copy="${escapeHtml(value)}" class="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-cream hover:bg-white/30">Copiar</button>
    </div>`;
  el.innerHTML = `${h}
    <div class="grid gap-4 md:grid-cols-[1fr_0.8fr]">
      <div class="rounded-3xl bg-rose-deep p-5">
        ${swm.casillero ? `<p class="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-cream">Tu código de casillero: ${escapeHtml(swm.casillero)}</p>` : ""}
        ${fields.map(row).join("")}
        <button type="button" data-swm-copy="${escapeHtml(all)}" class="mt-3 w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-rose-deep hover:bg-white/90">📋 Copiar toda la dirección</button>
      </div>
      <div class="rounded-3xl bg-pill p-5 text-sm text-ink/85 space-y-3">
        <p class="font-semibold text-ink">¿Cómo la lleno en la tienda?</p>
        <ol class="space-y-2 list-decimal pl-5">
          <li>En <b>First name</b> pon <b>${escapeHtml(SWM_ADDRESS.firstName)}</b> y en <b>Last name</b> tu código <b>${escapeHtml(fields[1][1])}</b>${swm.casillero ? ": es lo que nos dice que el paquete es tuyo" : ""}.</li>
          <li>En <b>Address 2</b> (o "Apt, suite, unit") pon <b>${escapeHtml(SWM_ADDRESS.address2)}</b>.</li>
          <li>Lo demás, tal cual. Si la tienda lo permite, pide que la entrega <b>no requiera firma</b>.</li>
          <li>Cuando te den tu número de rastreo, <b>regístralo en "Mi casillero"</b>.</li>
        </ol>
      </div>
    </div>`;
}

/* Guías por tienda: cómo se llena la dirección en cada checkout (con su
   código ya puesto si tiene sesión). Algunas tiendas tienen un solo campo
   de nombre ("Full name"): ahí va todo junto. */
const SWM_TIENDAS = [
  { n: "Amazon", full: true, tips: ["En \u201cAdd a new address\u201d elige país United States.", "Si te pide \u201cdelivery instructions\u201d, pon que lo dejen en la puerta."] },
  { n: "Sephora", tips: ["En el checkout, \u201cAdd new address\u201d; Address 2 es \u201cApt/Suite\u201d."] },
  { n: "Ulta Beauty", tips: ["\u201cApt, suite, etc.\u201d es el Address 2."] },
  { n: "Target", tips: ["\u201cApt, suite, unit\u201d es el Address 2.", "Elige envío a domicilio (Shipping), no recoger en tienda."] },
  { n: "Walmart", tips: ["\u201cApt, suite, etc. (optional)\u201d es el Address 2.", "Elige \u201cShipping\u201d, no \u201cPickup\u201d."] },
  { n: "Shein", tips: ["Cambia el país de envío a United States antes de pagar."] },
  { n: "Bath & Body Works", tips: ["\u201cAddress line 2\u201d es el Apt B."] },
];

function renderSwmGuias() {
  const el = document.getElementById("swm-guias");
  if (!el) return;
  const code = swm.casillero || "ALP-TU CÓDIGO";
  const A = SWM_ADDRESS;
  const fila = (k, v) => `<tr><td class="py-1 pr-3 text-ink/70 whitespace-nowrap">${k}</td><td class="py-1 font-semibold break-words">${escapeHtml(v)}</td></tr>`;
  el.innerHTML = `${swm.casillero ? "" : `<p class="text-xs text-ink/70 mb-3">Inicia sesión para ver tu código de casillero ya puesto en cada guía.</p>`}
    <div class="grid gap-3 md:grid-cols-2">${SWM_TIENDAS.map((t) => `<div class="rounded-xl border border-ink/10 p-3">
      <p class="font-semibold text-ink">${t.n}</p>
      <table class="mt-1 text-sm w-full"><tbody>
        ${t.full ? fila("Full name", `${A.firstName} ${code}`) : fila("First name", A.firstName) + fila("Last name", code)}
        ${fila("Address", A.address1)}${fila("Address 2", A.address2)}${fila("City / State / ZIP", `${A.city}, ${A.state} ${A.zip}`)}${fila("Phone", A.phone)}
      </tbody></table>
      <ul class="mt-2 list-disc pl-5 text-xs text-ink/75 space-y-0.5">${t.tips.map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>`).join("")}</div>
    <p class="mt-3 text-xs text-ink/70">En todas: el código <b>${escapeHtml(code)}</b> es lo que nos dice que el paquete es tuyo. Cuando te llegue el número de rastreo, regístralo en "Mi casillero".</p>`;
}

/* Primera vez (casillero vacío): 3 pasos para empezar. */
function renderSwmWelcome() {
  const el = document.getElementById("swm-welcome");
  const show = Boolean(getCustomerToken()) && swm.loaded && !swm.error && !swm.paquetes.length && !swm.compras.length && !swm.envios.length;
  el.classList.toggle("hidden", !show);
  if (!show) return;
  const step = (n, t, d) => `<li class="flex gap-3"><span class="shrink-0 w-7 h-7 rounded-full bg-rose-deep text-cream text-sm font-bold flex items-center justify-center">${n}</span><span><b class="block text-sm text-ink">${t}</b><span class="text-xs text-ink/75">${d}</span></span></li>`;
  el.innerHTML = `<div class="rounded-3xl border-2 border-rose/40 bg-white p-5">
    <p class="font-display text-lg text-ink">👋 ¡Bienvenida! Así empiezas:</p>
    <ol class="mt-3 space-y-3">
      ${step(1, "Copia tu dirección americana", "Está aquí abajo, con tu código de casillero en el apellido.")}
      ${step(2, "Compra en tu tienda favorita", "Sephora, Ulta, Amazon... y manda tu pedido a esa dirección.")}
      ${step(3, "Registra tu número de rastreo", "En \u201cMi casillero\u201d → Registrar un paquete. Te avisamos cuando llegue.")}
    </ol>
    <p class="mt-3 text-xs text-ink/70">¿No tienes tarjeta americana? Usa <b>\u201cQue Mae compre por mí\u201d</b> y yo hago la compra.</p>
  </div>`;
}

/* ---------------------------- Casillero ---------------------------- */
function renderSwmCasillero() {
  const el = document.getElementById("swm-casillero");
  const h = `<h3 class="font-display text-xl sm:text-2xl text-ink mb-3">🗄️ Mi casillero</h3>`;
  if (!getCustomerToken()) {
    el.innerHTML = swmFocusCompra ? h + swmLoginPrompt("💕 Tu cotización ya está lista. Inicia sesión (o crea tu cuenta con el correo que le diste a Mae) para verla y pagarla.") : "";
    return;
  }
  if (swm.loading && !swm.loaded) { el.innerHTML = h + `<p class="text-sm text-ink/70">Cargando tu casillero...</p>`; return; }
  if (swm.error) { el.innerHTML = h + `<p class="text-sm text-sale">${escapeHtml(swm.error)}</p>`; return; }

  const P = swm.paquetes.filter((p) => p.status !== "cancelado");
  const kpi = (n, l) => `<div class="rounded-2xl bg-white/85 px-2 py-3 text-center shadow-sm"><b class="block text-xl font-bold tabular-nums">${n}</b><span class="text-[11px] text-ink/70">${l}</span></div>`;
  const porPagar = [...swm.compras, ...swm.envios].filter((x) => x.status === "cotizado").length;
  const tabs = [["paquetes", `Mis paquetes (${P.length})`], ["compras", `Compras por mí (${swm.compras.filter((c) => c.status !== "cancelado").length})`], ["envios", `Envíos (${swm.envios.filter((e) => e.status !== "cancelado").length})`]];
  el.innerHTML = `${h}
    <div class="rounded-3xl bg-gradient-to-br from-blush/60 via-blush/25 to-lilac/25 p-4">
      <div class="grid grid-cols-3 gap-2">
        ${kpi(P.filter((p) => p.status === "registrado").length, "por llegar")}
        ${kpi(P.filter((p) => p.status === "recibido").length, "en el almacén")}
        ${kpi(P.filter((p) => ["enviado", "entregado"].includes(p.status)).length, "enviados")}
      </div>
      ${porPagar ? `<p class="mt-3 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-rose-ink">💳 Tienes ${porPagar} cotización${porPagar > 1 ? "es" : ""} lista${porPagar > 1 ? "s" : ""} para pagar.</p>` : ""}
      <div class="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" data-swm-form="paquete" class="rounded-2xl bg-white px-3 py-3 text-left text-sm font-semibold hover:bg-white/80">📦 Registrar un paquete<span class="block text-[11px] font-normal text-ink/65">Ya compraste y lo mandaste a la dirección</span></button>
        <button type="button" data-swm-form="compra" class="rounded-2xl bg-white px-3 py-3 text-left text-sm font-semibold hover:bg-white/80">🛍️ Que Mae compre por mí<span class="block text-[11px] font-normal text-ink/65">Mándame tu carrito por WhatsApp</span></button>
        <button type="button" data-swm-form="envio" class="rounded-2xl bg-white px-3 py-3 text-left text-sm font-semibold hover:bg-white/80">🚚 Pedir mi envío a México<span class="block text-[11px] font-normal text-ink/65">Elige paquetes del almacén</span></button>
      </div>
    </div>
    <div id="swm-form-box" class="mt-4">${swmFormHTML()}</div>
    <div class="mt-6 flex gap-1.5 overflow-x-auto" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${swm.tab === k}" data-swm-tab="${k}" class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${swm.tab === k ? "bg-ink text-cream" : "bg-pill text-ink/75"}">${l}</button>`).join("")}</div>
    <div class="mt-4 space-y-3">${swmTabHTML()}</div>`;
}

/* Línea de avance ("Registrado → En almacén → ..."), como en Delivered. */
const SWM_STEPS = {
  paquete: [{ registrado: 0, recibido: 1, en_envio: 1, enviado: 2, entregado: 3 }, ["Registrado", "En almacén", "Enviado", "Entregado"]],
  compra: [{ solicitud: 0, cotizado: 1, pagado: 2, comprado: 3 }, ["Cotizando", "Por pagar", "Pagada", "Comprada"]],
  envio: [{ solicitado: 0, cotizado: 1, pagado: 2, enviado: 3, entregado: 4 }, ["Cotizando", "Por pagar", "Pagado", "En camino", "Entregado"]],
};
function swmStepsHTML(kind, status) {
  const [idxMap, labels] = SWM_STEPS[kind];
  const idx = idxMap[status];
  if (idx == null) return "";
  return `<ol class="mt-3 flex items-start" aria-label="Avance">${labels.map((l, i) => `<li class="flex-1 flex flex-col items-center text-center ${i ? "relative before:absolute before:top-[7px] before:right-1/2 before:w-full before:h-0.5 " + (i <= idx ? "before:bg-rose-deep" : "before:bg-ink/15") : ""}">
      <span class="relative z-10 w-4 h-4 rounded-full border-2 ${i <= idx ? "bg-rose-deep border-rose-deep" : "bg-white border-ink/25"}"${i === idx ? ' aria-current="step"' : ""}></span>
      <span class="mt-1 text-[10px] leading-tight ${i === idx ? "font-bold text-ink" : "text-ink/60"}">${l}</span></li>`).join("")}</ol>`;
}

function swmTabHTML() {
  const empty = (t) => `<p class="rounded-2xl bg-pill px-4 py-6 text-center text-sm text-ink/70">${t}</p>`;
  if (swm.tab === "compras") {
    return swm.compras.length ? swm.compras.map(swmCompraCardHTML).join("") : empty("¿No sabes cómo comprar o no tienes tarjeta americana? Pídeme que compre por ti y te mando la cotización aquí.");
  }
  if (swm.tab === "envios") {
    return swm.envios.length ? swm.envios.map(swmEnvioCardHTML).join("") : empty("Cuando tengas paquetes en el almacén, pide aquí tu envío a México.");
  }
  return swm.paquetes.length ? swm.paquetes.map(swmPaqueteCardHTML).join("") : empty("Todavía no tienes paquetes. Compra en tu tienda favorita, mándalo a tu dirección americana y regístralo aquí.");
}

function swmPaqueteCardHTML(p) {
  const desc = [p.tienda, p.rastreo && `rastreo ${p.rastreo}`].filter(Boolean).join(" · ");
  let extra = "";
  if (p.status === "recibido" && p.receivedAt) {
    const hasta = new Date(new Date(p.receivedAt).getTime() + swm.almacenajeDias * 864e5);
    const dias = Math.ceil((hasta - Date.now()) / 864e5);
    extra = `<p class="text-xs ${dias <= 5 ? "text-sale font-semibold" : "text-ink/65"} mt-1">Almacenaje gratis hasta el ${swmDate(hasta.toISOString(), { day: "numeric", month: "long" })}${dias > 0 ? ` (${dias} día${dias === 1 ? "" : "s"})` : " · ya venció"}</p>`;
  }
  const fotos = (p.fotos || []).map((f) => `<a href="/.netlify/functions/swm-foto?id=${escapeHtml(f)}" target="_blank" rel="noopener"><img src="/.netlify/functions/swm-foto?id=${escapeHtml(f)}" alt="Foto de tu paquete" loading="lazy" class="w-20 h-20 rounded-xl object-cover bg-pill"></a>`).join("");
  return `<article class="rounded-2xl border border-ink/10 p-4">
    <div class="flex flex-wrap items-center justify-between gap-2"><b>${escapeHtml(p.folio)}</b>${swmPill(SWM_PKG_STATUS, p.datosPendientes ? "sin_registro" : p.status)}</div>
    ${p.status === "cancelado" ? "" : swmStepsHTML("paquete", p.status)}
    <p class="text-sm mt-2">${escapeHtml(desc || "Paquete")}${p.origen === "compra" ? ' <span class="text-xs text-lilac-ink">(compra de Mae)</span>' : ""}</p>
    ${p.contenido ? `<p class="text-xs text-ink/65">${escapeHtml(p.contenido)}</p>` : ""}
    <p class="text-xs text-ink/65 mt-1">Cruce: ${p.crucePagado ? "ya pagado con tu compra" : p.cobro === "comision" ? "15% del valor" : "por peso"}${p.cobrable ? ` · ${p.cobrable} kg${p.cobro === "peso" && !p.crucePagado ? ` → ${swmMXN(swmCrucePeso(p.cobrable))}` : ""}` : ""}</p>
    ${extra}
    ${fotos ? `<div class="mt-2 flex flex-wrap gap-2">${fotos}</div>` : ""}
    ${p.notaClienta ? `<p class="mt-2 rounded-xl bg-blush/25 px-3 py-2 text-sm">💬 ${escapeHtml(p.notaClienta)}</p>` : ""}
    ${swmExtrasHTML(p)}
    ${p.status === "registrado" && p.origen !== "compra" ? `<button type="button" data-swm-cancel="paquete:${escapeHtml(p.id)}" class="mt-2 text-xs text-ink/60 underline">Cancelar registro</button>` : ""}
    ${p.datosPendientes ? `<form data-swm-completar="${escapeHtml(p.id)}" class="mt-3 rounded-xl bg-sale/[0.06] border border-sale/30 p-3 space-y-2" novalidate>
      <p class="text-sm"><b>⚠️ Este paquete llegó sin registrar.</b> Dime qué trae y cuánto costó para poder enviártelo. Se suma un cargo de <b>${swmMXN(p.cargoSinRegistro || 80)}</b> a tu envío.</p>
      <label class="flex flex-col gap-1 text-xs font-semibold">¿Qué trae?<input data-c="contenido" maxlength="300" class="rounded-lg border border-ink/15 px-3 py-2 text-sm font-normal" /></label>
      <label class="flex flex-col gap-1 text-xs font-semibold">Valor de los productos con tax (USD)<input data-c="valorUSD" type="number" min="0" step="0.01" inputmode="decimal" class="rounded-lg border border-ink/15 px-3 py-2 text-sm font-normal" /></label>
      <label class="flex items-center gap-2 text-xs"><input type="checkbox" data-c="comision" class="accent-[#c4466e]" /> Prefiero pagar el cruce con el 15% del valor (en vez de por peso)</label>
      <p data-c-err class="hidden text-xs text-sale"></p>
      <button type="submit" class="rounded-full bg-rose-deep px-4 py-2 text-xs font-semibold text-cream">Guardar datos</button>
    </form>` : ""}
  </article>`;
}

/* Servicios extra de un paquete: revisión del contenido con fotos y
   separar artículos para mandar solo una parte (se cobran con el envío). */
function swmExtrasHTML(p) {
  const out = [];
  const rv = p.revision;
  if (rv && rv.estado === "hecha") {
    const fotos = (rv.fotos || []).map((f) => `<a href="/.netlify/functions/swm-foto?id=${escapeHtml(f)}" target="_blank" rel="noopener"><img src="/.netlify/functions/swm-foto?id=${escapeHtml(f)}" alt="Foto del contenido" loading="lazy" class="w-20 h-20 rounded-xl object-cover bg-pill"></a>`).join("");
    out.push(`<div class="mt-3 rounded-xl bg-[#eef8f2] p-3 text-sm"><b>📸 Revisamos el contenido</b>${rv.nota ? `<p class="mt-1">${escapeHtml(rv.nota)}</p>` : ""}${fotos ? `<div class="mt-2 flex flex-wrap gap-2">${fotos}</div>` : ""}</div>`);
  } else if (rv) {
    out.push(`<p class="mt-2 rounded-xl bg-[#fff6e5] px-3 py-2 text-xs">📸 Pediste revisión con fotos (${swmMXN(swm.precios.revision)}). ${p.status === "registrado" ? "La hacemos cuando llegue." : "Te avisamos cuando esté."}</p>`);
  }
  const sp = p.separar;
  if (sp && sp.estado === "pedida") out.push(`<p class="mt-2 rounded-xl bg-[#fff6e5] px-3 py-2 text-xs">✂️ Pediste separar: "${escapeHtml(sp.nota)}". Te avisamos cuando quede listo.</p>`);
  if (sp && sp.estado === "hecha") out.push(`<p class="mt-2 text-xs text-ink/70">✂️ Lo que pediste quedó en ${escapeHtml(sp.nuevoFolio || "otro paquete")}.</p>`);
  const canRev = ["registrado", "recibido"].includes(p.status) && !rv && !p.datosPendientes;
  const canSep = p.status === "recibido" && !p.datosPendientes && !(sp && sp.estado === "pedida");
  if (canRev || canSep) {
    out.push(`<details class="mt-3 rounded-xl border border-ink/10 px-3 py-2 text-sm"><summary class="cursor-pointer font-semibold text-ink/80">➕ Servicios extra</summary><div class="mt-2 space-y-3">
      ${canRev ? `<div><p><b>📸 Revisión con fotos · ${swmMXN(swm.precios.revision)}</b></p><p class="text-xs text-ink/70">Abrimos tu paquete, revisamos que venga completo y sin daños y te mandamos fotos de cada producto.</p>
        <button type="button" data-swm-revision="${escapeHtml(p.id)}" class="mt-1 rounded-full bg-rose-deep px-4 py-1.5 text-xs font-semibold text-cream">Pedir revisión</button></div>` : ""}
      ${canSep ? `<form data-swm-separar="${escapeHtml(p.id)}" class="space-y-1" novalidate><p><b>✂️ Mandar solo algunos artículos · ${swmMXN(swm.precios.separar)}</b></p><p class="text-xs text-ink/70">Separamos lo que quieres recibir ahora en otro paquete; lo demás se queda guardado.</p>
        <textarea data-sep-nota rows="2" maxlength="500" placeholder="Ej. Mándame solo la crema y el sérum" class="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"></textarea>
        <p data-sep-err class="hidden text-xs text-sale"></p>
        <button type="submit" class="rounded-full bg-rose-deep px-4 py-1.5 text-xs font-semibold text-cream">Pedir separar</button></form>` : ""}
      <p class="text-[11px] text-ink/60">Se cobra junto con tu envío.</p></div></details>`);
  }
  return out.join("");
}

function swmPagoHTML(kind, r) {
  if (r.status !== "cotizado" || !r.cotizacion) return "";
  const total = r.cotizacion.total;
  if (r.pago && r.pago.status === "revision") {
    return `<div class="mt-3 rounded-xl bg-[#fff6e5] p-3 text-sm"><b>🔎 Estamos revisando tu comprobante</b><p class="text-xs mt-1">Te avisamos por correo en cuanto se confirme.</p></div>`;
  }
  const s = typeof shippingSettings !== "undefined" ? shippingSettings : {};
  const bank = [s.bankName && `<div>Banco: <b>${escapeHtml(s.bankName)}</b></div>`, s.bankHolder && `<div>Titular: <b>${escapeHtml(s.bankHolder)}</b></div>`,
    s.bankClabe && `<div>CLABE: <b>${escapeHtml(s.bankClabe)}</b> <button type="button" data-swm-copy="${escapeHtml(s.bankClabe)}" class="ml-1 text-xs underline">Copiar</button></div>`,
    s.bankAccount && `<div>Cuenta: <b>${escapeHtml(s.bankAccount)}</b> <button type="button" data-swm-copy="${escapeHtml(s.bankAccount)}" class="ml-1 text-xs underline">Copiar</button></div>`].filter(Boolean).join("");
  const key = `${kind}:${r.id}`;
  const k = escapeHtml(key);
  const opt = (v, t, d) => `<label class="flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 cursor-pointer has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20">
      <input type="radio" name="swm-pm-${k}" value="${v}" data-swm-pm="${k}" class="accent-[#c4466e] w-5 h-5 shrink-0"><span><b class="block text-sm">${t}</b><span class="block text-xs text-ink/70">${d}</span></span></label>`;
  return `<div class="mt-3 rounded-xl bg-pill p-3 space-y-2">
    <b class="block text-sm">Total a pagar: ${swmMXN(total)}</b>
    ${r.cotizacion.cupon ? `<p class="text-xs text-rose-ink font-semibold">🎟️ Cupón ${escapeHtml(r.cotizacion.cupon)}: −${swmMXN(r.cotizacion.descuento)} (antes ${swmMXN(r.cotizacion.totalSinDescuento)})</p>`
      : (!r.pago || r.pago.status === "pendiente") ? `<form data-swm-cupon="${escapeHtml(key)}" class="flex gap-2" novalidate><input data-cupon-code type="text" placeholder="¿Tienes un cupón?" class="flex-1 min-w-0 rounded-lg border border-ink/15 px-3 py-1.5 text-sm uppercase placeholder:normal-case" /><button type="submit" class="shrink-0 rounded-full border border-ink px-3 text-xs font-semibold">Aplicar</button></form><p data-cupon-msg class="hidden text-xs text-sale"></p>` : ""}
    ${r.pago && r.pago.rechazo ? `<p class="text-xs text-sale">${escapeHtml(r.pago.rechazo)}</p>` : ""}
    <p class="text-xs font-semibold text-ink/80">¿Cómo quieres pagar? (solo una vez)</p>
    ${opt("tr", "🏦 Transferencia o depósito", "Subes la captura de tu transferencia")}
    ${opt("mp", "💳 Tarjeta (Mercado Pago)", "Pagas en línea, sin subir comprobante")}
    <div data-swm-pm-box="mp:${k}" class="hidden rounded-xl bg-white p-3 space-y-2">
      <button type="button" data-swm-pay-mp="${k}" class="w-full rounded-full bg-[#0074C2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#00609F]">💳 Pagar ${swmMXN(total)} en Mercado Pago</button>
      <p class="text-xs text-ink/70">Al terminar regresas aquí y se marca pagado solito. No necesitas subir comprobante.</p>
    </div>
    <div data-swm-pm-box="tr:${k}" class="hidden rounded-xl bg-white p-3 text-sm space-y-2">
      <p><b>1.</b> Transfiere exactamente <b>${swmMXN(total)}</b> <button type="button" data-swm-copy="${Number(total).toFixed(2)}" class="ml-1 text-xs font-semibold text-rose-ink underline">Copiar</button></p>
      <div class="rounded-lg bg-pill/60 px-3 py-2 space-y-0.5">${bank || '<p class="text-xs text-ink/70">Cargando datos bancarios...</p>'}<div>Concepto: <b>${escapeHtml(r.folio)}</b></div></div>
      <label class="flex flex-col gap-1"><span><b>2.</b> Sube la captura de tu transferencia (foto o PDF)</span>
        <input type="file" accept="image/*,application/pdf" data-swm-proof="${k}" class="text-xs font-normal" /></label>
      <p data-swm-proof-msg="${k}" class="text-xs"></p>
      <p class="text-xs text-ink/70">Al subirla queda enviada; te avisamos por correo cuando confirmemos tu pago.</p>
    </div>
  </div>`;
}

function swmCompraCardHTML(c) {
  const q = c.cotizacion;
  const lines = q ? `<div class="mt-2 text-sm space-y-0.5">
      <div class="flex justify-between"><span>Productos</span><span class="tabular-nums">${swmMXN(q.productos)}</span></div>
      ${q.cruce ? `<div class="flex justify-between"><span>Cruce a México (15%)</span><span class="tabular-nums">${swmMXN(q.cruce)}</span></div>` : ""}
      ${q.descuento ? `<div class="flex justify-between text-rose-ink"><span>Cupón ${escapeHtml(q.cupon)}</span><span class="tabular-nums">−${swmMXN(q.descuento)}</span></div>` : ""}
      <div class="flex justify-between font-semibold border-t border-ink/10 pt-1"><span>Total</span><span class="tabular-nums">${swmMXN(q.total)}</span></div></div>` : "";
  return `<article id="swm-compra-${escapeHtml(c.id)}" class="rounded-2xl border border-ink/10 p-4 scroll-mt-28">
    <div class="flex flex-wrap items-center justify-between gap-2"><b>${escapeHtml(c.folio)}</b>${swmPill(SWM_COMPRA_STATUS, c.status)}</div>
    ${swmStepsHTML("compra", c.status)}
    <p class="text-xs text-ink/65 mt-2">${swmDate(c.createdAt)} · Cruce ${c.cobro === "comision" ? "15% (se paga con la compra)" : "por peso (se paga al enviar)"}</p>
    ${c.tienda ? `<p class="mt-1 text-sm font-semibold">${escapeHtml(c.tienda)}</p>` : ""}
    ${c.links ? `<p class="mt-2 text-xs whitespace-pre-wrap break-all rounded-xl bg-pill/70 px-3 py-2">${escapeHtml(c.links)}</p>` : ""}
    ${q && q.items ? `<ul class="mt-2 text-sm divide-y divide-ink/5 rounded-xl bg-pill/60 px-3 py-1">${q.items.map((x) => `<li class="flex justify-between gap-3 py-1"><span>${x.cantidad} × ${escapeHtml(x.nombre)}${x.tono ? ` <span class="text-ink/65">· ${escapeHtml(x.tono)}</span>` : ""}</span><span class="tabular-nums shrink-0">${swmMXN(x.precio * x.cantidad)}</span></li>`).join("")}</ul>` : ""}
    ${c.notaClienta ? `<p class="mt-2 rounded-xl bg-blush/25 px-3 py-2 text-sm">💬 ${escapeHtml(c.notaClienta)}</p>` : ""}
    ${lines}${swmPagoHTML("compra", c)}
    ${c.status === "pagado" ? `<p class="mt-2 text-xs text-ink/70">Pagado el ${swmDate(c.pago && c.pago.paidAt)}. Te aviso cuando haga tu compra.</p>` : ""}
    ${c.status === "comprado" ? `<p class="mt-2 text-xs text-ink/70">Tus productos ya van al almacén; los ves en "Mis paquetes".</p>` : ""}
    ${["solicitud", "cotizado"].includes(c.status) && (!c.pago || c.pago.status === "pendiente") ? `<button type="button" data-swm-cancel="compra:${escapeHtml(c.id)}" class="mt-2 text-xs text-ink/60 underline">Cancelar</button>` : ""}
  </article>`;
}

function swmEnvioCardHTML(e) {
  const pk = (e.paqueteIds || []).map((id) => swm.paquetes.find((p) => p.id === id)).filter(Boolean);
  const q = e.cotizacion;
  const line = (l, v) => (v ? `<div class="flex justify-between"><span>${l}</span><span class="tabular-nums">${swmMXN(v)}</span></div>` : "");
  const d = e.direccion || {};
  return `<article class="rounded-2xl border border-ink/10 p-4">
    <div class="flex flex-wrap items-center justify-between gap-2"><b>${escapeHtml(e.folio)}</b>${swmPill(SWM_ENVIO_STATUS, e.status)}</div>
    ${swmStepsHTML("envio", e.status)}
    <p class="text-xs text-ink/65 mt-2">${swmDate(e.createdAt)} · ${pk.length} paquete${pk.length === 1 ? "" : "s"}: ${escapeHtml(pk.map((p) => p.folio).join(", "))}${e.consolidar ? " · consolidado" : ""}</p>
    <p class="text-xs text-ink/65">A: ${escapeHtml([d.nombre, d.ciudad, d.cp].filter(Boolean).join(" · "))}</p>
    ${e.notaClienta ? `<p class="mt-2 rounded-xl bg-blush/25 px-3 py-2 text-sm">💬 ${escapeHtml(e.notaClienta)}</p>` : ""}
    ${q ? `<div class="mt-2 text-sm space-y-0.5">${line("Cruce a México", q.cruce)}${line("Consolidación", q.consolidacion)}${line("Paquete(s) sin registrar", q.sinRegistro)}${line("Servicios extra", q.extras)}${q.descuento ? `<div class="flex justify-between text-rose-ink"><span>Cupón ${escapeHtml(q.cupon)}</span><span class="tabular-nums">−${swmMXN(q.descuento)}</span></div>` : ""}${line("Envío nacional", q.envio)}
      <div class="flex justify-between font-semibold border-t border-ink/10 pt-1"><span>Total</span><span class="tabular-nums">${swmMXN(q.total)}</span></div></div>` : `<p class="mt-2 text-xs text-ink/70">Te mando la cotización del envío por correo y aquí mismo.</p>`}
    ${swmPagoHTML("envio", e)}
    ${e.guia ? `<p class="mt-2 text-sm">🚚 ${escapeHtml(e.paqueteria || "Paquetería")}: <b>${escapeHtml(e.guia)}</b></p>` : ""}
    ${["solicitado", "cotizado"].includes(e.status) && (!e.pago || e.pago.status === "pendiente") ? `<button type="button" data-swm-cancel="envio:${escapeHtml(e.id)}" class="mt-2 text-xs text-ink/60 underline">Cancelar envío</button>` : ""}
  </article>`;
}

/* ----------------------------- Formularios ----------------------------- */
const swmInput = (id, label, attrs = "") => `<label class="flex flex-col gap-1 text-xs font-semibold">${label}<input id="${id}" ${attrs} class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" /></label>`;
const swmCobroRadios = () => `<fieldset class="grid gap-2 sm:grid-cols-2"><legend class="text-xs font-semibold mb-1">¿Cómo quieres pagar el cruce?</legend>
    <label class="flex gap-2 rounded-xl border border-ink/15 p-3 text-sm has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20"><input type="radio" name="swm-cobro" value="peso" checked class="accent-[#c4466e]"><span><b>Por peso o medidas</b><span class="block text-xs text-ink/65">Según mi tabla; se paga al enviar.</span></span></label>
    <label class="flex gap-2 rounded-xl border border-ink/15 p-3 text-sm has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20"><input type="radio" name="swm-cobro" value="comision" class="accent-[#c4466e]"><span><b>15% del valor</b><span class="block text-xs text-ink/65">Del valor de los productos con tax.</span></span></label>
  </fieldset>`;
const swmAcepta = () => `<label class="flex gap-2 text-sm"><input id="swm-acepta" type="checkbox" class="mt-0.5 accent-[#c4466e]" /><span>Confirmo que no trae <b>nada ilegal</b> ni artículos de cristal (velas, jarrones, etc.), muebles ni pallets.</span></label>`;
const swmFormShell = (title, inner, submit) => `<form data-swm-submit class="rounded-3xl border border-ink/10 p-5 space-y-4" novalidate>
    <div class="flex items-center justify-between"><b class="text-base">${title}</b><button type="button" data-swm-form="" aria-label="Cerrar" class="text-2xl leading-none text-ink/60">&times;</button></div>
    ${inner}
    <p data-swm-err class="hidden rounded-xl bg-sale/10 px-3 py-2 text-sm text-sale" role="alert"></p>
    <button type="submit" class="inline-flex items-center rounded-full bg-rose-deep px-6 py-3 text-sm font-semibold text-cream hover:bg-rose-ink disabled:opacity-60">${submit}</button>
  </form>`;

function swmCompraWaLink(tienda) {
  const code = swm.casillero ? ` Mi casillero es ${swm.casillero}.` : "";
  const txt = `Hola Mae 💕 Quiero cotizar mi carrito${tienda ? ` de ${tienda}` : ""}.${code} Te mando las capturas:`;
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(txt)}`;
}

function swmFormHTML() {
  if (swm.form === "paquete") {
    return swmFormShell("📦 Registrar un paquete", `
      <div class="grid gap-3 sm:grid-cols-2">${swmInput("swm-f-tienda", "Tienda", 'maxlength="80" placeholder="Sephora, Ulta, Amazon..."')}${swmInput("swm-f-rastreo", "Número de rastreo (guía) *", 'maxlength="80" required')}</div>
      ${swmInput("swm-f-contenido", "¿Qué trae?", 'maxlength="300" placeholder="Ej. 2 cremas, 1 perfume"')}
      ${swmInput("swm-f-valor", "Valor de los productos con tax (USD)", 'type="number" min="0" step="0.01" inputmode="decimal"')}
      <p class="text-xs text-ink/65">Regístralo en cuanto tengas la guía, antes de que llegue a la bodega.</p>
      ${swmCobroRadios()}${swmAcepta()}`, "Registrar paquete");
  }
  if (swm.form === "compra") {
    return `<div class="rounded-3xl border border-ink/10 p-5 space-y-4">
      <div class="flex items-center justify-between"><b class="text-base">🛍️ Que Mae compre por mí</b><button type="button" data-swm-form="" aria-label="Cerrar" class="text-2xl leading-none text-ink/60">&times;</button></div>
      <ol class="space-y-2 text-sm">
        <li><b>1.</b> Arma tu carrito en la tienda (Sephora, Ulta, Amazon…) con los tonos y cantidades que quieres.</li>
        <li><b>2.</b> Tómale captura de pantalla al carrito.</li>
        <li><b>3.</b> Mándamela por WhatsApp con el botón de abajo.</li>
        <li><b>4.</b> Te mando un link con tu cotización y ahí la pagas (tarjeta o transferencia). Yo hago tu compra sin costo extra por el servicio.</li>
      </ol>
      ${swmInput("swm-f-tienda-wa", "¿De qué tienda? (opcional)", 'maxlength="80" placeholder="Sephora, Ulta, Amazon..."')}
      <p class="text-xs text-ink/65">No compro nada ilegal ni artículos de cristal (velas, jarrones, etc.), muebles ni pallets.</p>
      <a data-swm-wa-compra href="${escapeHtml(swmCompraWaLink(""))}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">💬 Mandar mi carrito por WhatsApp</a>
    </div>`;
  }
  if (swm.form === "envio") {
    const disp = swm.paquetes.filter((p) => p.status === "recibido" && !p.datosPendientes);
    const faltan = swm.paquetes.filter((p) => p.status === "recibido" && p.datosPendientes);
    if (faltan.length && !disp.length) return `<div class="rounded-2xl bg-sale/[0.06] p-4 text-sm">Primero completa los datos de ${escapeHtml(faltan.map((p) => p.folio).join(", "))} en "Mis paquetes" (llegaron sin registrar). <button type="button" data-swm-form="" class="underline">Cerrar</button></div>`;
    if (!disp.length) return `<div class="rounded-2xl bg-pill p-4 text-sm">Todavía no tienes paquetes en el almacén. Cuando lleguen te aviso por correo y aquí podrás pedir tu envío. <button type="button" data-swm-form="" class="underline">Cerrar</button></div>`;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("alpacca_swm_dir") || "{}"); } catch (err) { saved = {}; }
    const dv = (k, d = "") => escapeHtml(saved[k] || d);
    const checks = disp.map((p) => `<label class="flex items-center gap-2 rounded-xl border border-ink/15 p-3 text-sm"><input type="checkbox" data-swm-pick="${escapeHtml(p.id)}" checked class="accent-[#c4466e]"><span><b>${escapeHtml(p.folio)}</b> · ${escapeHtml([p.tienda, p.cobrable && `${p.cobrable} kg`].filter(Boolean).join(" · "))}</span></label>`).join("");
    return swmFormShell("🚚 Pedir mi envío a México", `
      <div class="space-y-2"><p class="text-xs font-semibold">¿Qué paquetes te mando?</p>${checks}</div>
      ${disp.length > 1 ? `<label class="flex gap-2 text-sm"><input id="swm-f-consolidar" type="checkbox" class="mt-0.5 accent-[#c4466e]"><span><b>Consolidar en un solo envío nacional</b> (+$100 MXN por cada grupo de hasta 12 kg).</span></label>` : ""}
      <p class="text-xs font-semibold">¿A dónde te lo mandamos?</p>
      <div class="grid gap-3 sm:grid-cols-2">
        ${swmInput("swm-d-nombre", "Nombre de quien recibe", `maxlength="100" value="${dv("nombre", swm.name)}"`)}
        ${swmInput("swm-d-telefono", "Teléfono", `maxlength="30" inputmode="tel" value="${dv("telefono", swm.phone)}"`)}
        ${swmInput("swm-d-calle", "Calle y número", `maxlength="150" value="${dv("calle")}"`)}
        ${swmInput("swm-d-colonia", "Colonia", `maxlength="100" value="${dv("colonia")}"`)}
        ${swmInput("swm-d-ciudad", "Ciudad", `maxlength="80" value="${dv("ciudad")}"`)}
        ${swmInput("swm-d-estado", "Estado", `maxlength="60" value="${dv("estado")}"`)}
        ${swmInput("swm-d-cp", "Código postal", `maxlength="5" inputmode="numeric" value="${dv("cp")}"`)}
        ${swmInput("swm-d-referencias", "Referencias (opcional)", `maxlength="200" value="${dv("referencias")}"`)}
      </div>
      <p class="text-xs text-ink/65">Te cotizo el cruce${disp.length > 1 ? ", la consolidación" : ""} y el envío nacional (Estafeta desde $250) y lo pagas aquí.</p>`, "Pedir cotización de envío");
  }
  return "";
}

async function swmPost(body) {
  const res = await fetch("/.netlify/functions/swm-client", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCustomerToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Algo falló. Intenta de nuevo.");
  return data;
}

async function loadSwm() {
  swm.loading = true;
  renderSwmCasillero();
  try {
    const res = await fetch("/.netlify/functions/swm-client", { headers: { Authorization: `Bearer ${getCustomerToken()}` }, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) swm.error = "Tu sesión venció. Vuelve a iniciar sesión.";
    else if (!res.ok) swm.error = data.error || "No se pudo cargar tu casillero.";
    else Object.assign(swm, { paquetes: data.paquetes || [], compras: data.compras || [], envios: data.envios || [], name: data.name || "", phone: data.phone || "", casillero: data.casillero || "", precios: data.precios || swm.precios, almacenajeDias: data.almacenajeDias || 30, error: "" });
  } catch (err) {
    swm.error = "No se pudo cargar tu casillero. Revisa tu conexión.";
  }
  swm.loading = false;
  swm.loaded = true;
  if ([...swm.compras, ...swm.envios].some((x) => x.status === "cotizado")) swm.tab = swm.envios.some((x) => x.status === "cotizado") ? "envios" : "compras";
  renderSwmWelcome();
  renderSwmAddress();
  renderSwmCasillero();
  renderSwmGuias();
  swmMostrarCompra();
}

async function submitSwmForm(form) {
  const err = form.querySelector("[data-swm-err]");
  const btn = form.querySelector('button[type="submit"]');
  const val = (id) => (document.getElementById(id) ? document.getElementById(id).value : "");
  const fail = (m) => { err.textContent = m; err.classList.remove("hidden"); };
  err.classList.add("hidden");
  const cobro = (form.querySelector('input[name="swm-cobro"]:checked') || {}).value;
  let body;
  if (swm.form === "paquete") {
    body = { accion: "registrar_paquete", tienda: val("swm-f-tienda"), rastreo: val("swm-f-rastreo"), contenido: val("swm-f-contenido"), valorUSD: val("swm-f-valor"), cobro, aceptaRestricciones: document.getElementById("swm-acepta").checked };
    if (!body.rastreo.trim()) return fail("Pon el número de rastreo (guía) de tu paquete: sin él no podemos identificarlo cuando llegue.");
    if (cobro === "comision" && !(parseFloat(body.valorUSD) > 0)) return fail("Para cobrar el 15% necesito el valor de tus productos.");
    if (!body.aceptaRestricciones) return fail("Confirma que tu paquete no trae nada ilegal ni artículos de cristal, muebles ni pallets.");
  } else if (swm.form === "envio") {
    const ids = [...form.querySelectorAll("[data-swm-pick]:checked")].map((c) => c.dataset.swmPick);
    const direccion = Object.fromEntries(["nombre", "telefono", "calle", "colonia", "ciudad", "estado", "cp", "referencias"].map((k) => [k, val(`swm-d-${k}`).trim()]));
    if (!ids.length) return fail("Elige al menos un paquete.");
    if (!direccion.nombre || !direccion.telefono || !direccion.calle || !direccion.ciudad || !/^\d{5}$/.test(direccion.cp)) return fail("Completa tu dirección: nombre, teléfono, calle y número, ciudad y código postal de 5 dígitos.");
    try { localStorage.setItem("alpacca_swm_dir", JSON.stringify(direccion)); } catch (e) { /* nada */ }
    body = { accion: "solicitar_envio", paqueteIds: ids, consolidar: !!(document.getElementById("swm-f-consolidar") || {}).checked, direccion };
  } else return;
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "Mandando...";
  try {
    await swmPost(body);
    const tab = swm.form === "compra" ? "compras" : swm.form === "envio" ? "envios" : "paquetes";
    swm.form = "";
    await loadSwm();
    swm.tab = tab;
    renderSwmCasillero();
    document.getElementById("swm-form-box").innerHTML = `<p class="rounded-2xl bg-[#eef8f2] px-4 py-3 text-sm text-green-800">¡Listo! ${tab === "paquetes" ? "Registré tu paquete. Te aviso por correo cuando llegue al almacén." : "Recibí tu solicitud. Te mando la cotización por correo y aquí mismo."} 💗</p>`;
  } catch (ex) {
    fail(ex.message);
    btn.disabled = false;
    btn.textContent = label;
  }
}

async function swmPayMP(key, btn) {
  const [kind, id] = key.split(":");
  btn.disabled = true;
  btn.textContent = "Abriendo Mercado Pago...";
  try {
    const data = await swmPost({ accion: "pagar", kind, id, metodo: "mercadopago" });
    if (data.redirectUrl) location.href = data.redirectUrl;
  } catch (ex) {
    btn.disabled = false;
    btn.textContent = "💳 Pagar en Mercado Pago";
    alert(ex.message);
  }
}

function swmFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function swmUploadProof(key, input) {
  const [kind, id] = key.split(":");
  const msg = document.querySelector(`[data-swm-proof-msg="${CSS.escape(key)}"]`);
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { msg.textContent = "El archivo debe pesar menos de 5 MB."; msg.className = "text-xs text-sale"; return; }
  msg.textContent = "Subiendo...";
  msg.className = "text-xs text-ink/70";
  try {
    await swmPost({ accion: "pagar", kind, id, metodo: "transferencia" });
    await swmPost({ accion: "comprobante", kind, id, filename: file.name, contentType: file.type, dataBase64: await swmFileToBase64(file) });
    await loadSwm();
  } catch (ex) {
    msg.textContent = ex.message;
    msg.className = "text-xs text-sale";
  }
}

function updateSwmCalc() {
  const v = (id) => parseFloat(document.getElementById(id).value) || 0;
  const { vol, cobrable } = swmPesoCobrable(v("swm-c-kg"), v("swm-c-alto"), v("swm-c-ancho"), v("swm-c-largo"));
  const cPeso = swmCrucePeso(cobrable);
  document.getElementById("swm-c-peso-out").innerHTML = cobrable
    ? `${vol ? `Peso volumétrico: ${vol.toFixed(2)} kg. ` : ""}Se cobran <b>${cobrable} kg</b>: <b class="text-ink">${swmMXN(cPeso)}</b>`
    : "";
  const usd = v("swm-c-usd");
  const rate = (typeof shippingSettings !== "undefined" && shippingSettings.exchangeRate) || 0;
  const cCom = usd && rate ? Math.ceil(usd * rate * SWM_COMISION_PCT / 100) : 0;
  document.getElementById("swm-c-com-out").innerHTML = usd
    ? (rate ? `15% de ~${swmMXN(usd * rate)}: <b class="text-ink">${swmMXN(cCom)}</b>` : `15% de US$${usd.toFixed(2)}: <b class="text-ink">US$${(usd * 0.15).toFixed(2)}</b>`)
    : "";
  const best = document.getElementById("swm-c-best");
  best.textContent = cPeso && cCom ? (cPeso <= cCom ? `Te conviene pagar por peso (ahorras ${swmMXN(cCom - cPeso)}).` : `Te conviene pagar por el 15% (ahorras ${swmMXN(cPeso - cCom)}).`) : "";
}

function initSwm() {
  const sec = document.getElementById("swm-section");
  if (!sec) return;
  document.getElementById("swm-tarifa").innerHTML = Object.entries(SWM_TARIFA)
    .map(([kg, mxn]) => `<tr class="odd:bg-pill/60"><td class="px-3 py-1.5">${kg} kg</td><td class="px-3 py-1.5 text-right">${swmMXN(mxn).replace(/\.00$/, "")}</td></tr>`)
    .join("");
  ["swm-c-kg", "swm-c-alto", "swm-c-ancho", "swm-c-largo", "swm-c-usd"].forEach((id) => document.getElementById(id).addEventListener("input", updateSwmCalc));
  document.getElementById("swm-close").addEventListener("click", () => showHomeView("home"));
  const wa = document.getElementById("swm-wa");
  const waHref = whatsappHref("Hola Mae! Tengo una duda sobre Shop with Mae (compras en EE.UU.).");
  if (waHref) { wa.href = waHref; wa.target = "_blank"; wa.rel = "noopener"; }

  sec.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-swm-login]")) { openAccountPanelDefault(); return; }
    const copy = t.closest("[data-swm-copy]");
    if (copy) {
      const done = () => { const old = copy.textContent; copy.textContent = "¡Copiado!"; setTimeout(() => { copy.textContent = old; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(copy.dataset.swmCopy).then(done, () => {});
      return;
    }
    const f = t.closest("[data-swm-form]");
    if (f) {
      swm.form = swm.form === f.dataset.swmForm ? "" : f.dataset.swmForm;
      document.getElementById("swm-form-box").innerHTML = swmFormHTML();
      if (swm.form) document.getElementById("swm-form-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const tab = t.closest("[data-swm-tab]");
    if (tab) { swm.tab = tab.dataset.swmTab; renderSwmCasillero(); return; }
    const mp = t.closest("[data-swm-pay-mp]");
    if (mp) { swmPayMP(mp.dataset.swmPayMp, mp); return; }
    const tr = t.closest("[data-swm-pay-tr]");
    if (tr) { document.querySelector(`[data-swm-tr-box="${CSS.escape(tr.dataset.swmPayTr)}"]`).classList.toggle("hidden"); return; }
    const rev = t.closest("[data-swm-revision]");
    if (rev) {
      if (!confirm(`¿Pedir revisión con fotos por ${swmMXN(swm.precios.revision)}? Se cobra junto con tu envío.`)) return;
      rev.disabled = true;
      swmPost({ accion: "pedir_revision", id: rev.dataset.swmRevision }).then(loadSwm, (ex) => { alert(ex.message); rev.disabled = false; });
      return;
    }
    const cancel = t.closest("[data-swm-cancel]");
    if (cancel) {
      const [kind, id] = cancel.dataset.swmCancel.split(":");
      if (!confirm("¿Seguro que quieres cancelarlo?")) return;
      swmPost({ accion: "cancelar", kind, id }).then(loadSwm, (ex) => alert(ex.message));
      return;
    }
    const a = t.closest('a[href^="#swm-"]');
    if (a) {
      e.preventDefault();
      const target = document.getElementById(a.getAttribute("href").slice(1));
      if (target.tagName === "DETAILS") target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  sec.addEventListener("input", (e) => {
    if (e.target.id === "swm-f-tienda-wa") sec.querySelector("[data-swm-wa-compra]").href = swmCompraWaLink(e.target.value.trim());
  });
  sec.addEventListener("change", (e) => {
    const pm = e.target.closest("[data-swm-pm]");
    if (pm) {
      const key = pm.dataset.swmPm;
      ["mp", "tr"].forEach((v) => {
        const box = sec.querySelector(`[data-swm-pm-box="${v}:${CSS.escape(key)}"]`);
        if (box) box.classList.toggle("hidden", pm.value !== v);
      });
      return;
    }
    const proof = e.target.closest("[data-swm-proof]");
    if (proof) swmUploadProof(proof.dataset.swmProof, proof);
  });
  sec.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-swm-submit]");
    if (form) { e.preventDefault(); submitSwmForm(form); return; }
    const cup = e.target.closest("[data-swm-cupon]");
    if (cup) {
      e.preventDefault();
      const [kind, id] = cup.dataset.swmCupon.split(":");
      const code = cup.querySelector("[data-cupon-code]").value.trim();
      const msg = cup.nextElementSibling;
      if (!code) return;
      const btn = cup.querySelector('button[type="submit"]');
      btn.disabled = true;
      swmPost({ accion: "aplicar_cupon", kind, id, code }).then(loadSwm, (ex) => { msg.textContent = ex.message; msg.classList.remove("hidden"); btn.disabled = false; });
      return;
    }
    const sep = e.target.closest("[data-swm-separar]");
    if (sep) {
      e.preventDefault();
      const err = sep.querySelector("[data-sep-err]");
      const nota = sep.querySelector("[data-sep-nota]").value.trim();
      if (!nota) { err.textContent = "Dime qué artículos quieres que te mandemos ahora."; err.classList.remove("hidden"); return; }
      const btn = sep.querySelector('button[type="submit"]');
      btn.disabled = true;
      swmPost({ accion: "pedir_separar", id: sep.dataset.swmSeparar, nota }).then(loadSwm, (ex) => { err.textContent = ex.message; err.classList.remove("hidden"); btn.disabled = false; });
      return;
    }
    const comp = e.target.closest("[data-swm-completar]");
    if (comp) {
      e.preventDefault();
      const err = comp.querySelector("[data-c-err]");
      const contenido = comp.querySelector('[data-c="contenido"]').value.trim();
      const valorUSD = comp.querySelector('[data-c="valorUSD"]').value;
      if (!contenido || !(parseFloat(valorUSD) > 0)) { err.textContent = "Dime qué trae y cuánto costó."; err.classList.remove("hidden"); return; }
      const btn = comp.querySelector('button[type="submit"]');
      btn.disabled = true;
      swmPost({ accion: "completar_paquete", id: comp.dataset.swmCompletar, contenido, valorUSD, cobro: comp.querySelector('[data-c="comision"]').checked ? "comision" : "peso" })
        .then(loadSwm, (ex) => { err.textContent = ex.message; err.classList.remove("hidden"); btn.disabled = false; });
    }
  });
}

initSwm();
