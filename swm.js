/* ======================================================================
   Dirección americana (alpacca.mx/?ver=direccion-americana): casillero en EE.UU.,
   personal shopper y cruce a México, al estilo de Delivered -- todo se
   registra y se paga aquí (tarjeta con Mercado Pago o transferencia
   subiendo el comprobante). Usa la sesión de la tienda y los helpers de
   app.js (escapeHtml, getCustomerToken, whatsappHref, shippingSettings,
   showHomeView, openAccountPanelDefault). Backend: swm-client.js; Mae lo
   maneja en /admin.html → Más → Dirección americana.
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
  en_mexico: ["🇲🇽 En México", "bg-[#eef8f2] text-green-800"],
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
  en_mexico: ["🇲🇽 Ya está en México", "bg-[#eef8f2] text-green-800"],
  enviado: ["🚚 En camino", "bg-lilac/15 text-lilac-ink"],
  entregado: ["🎁 Entregado", "bg-pill text-ink/70"],
  cancelado: ["Cancelado", "bg-pill text-ink/50"],
};

let swm = { loaded: false, loading: false, error: "", name: "", phone: "", casillero: "", precios: { revision: 50, separar: 50 }, paquetes: [], compras: [], envios: [], tab: "paquetes", form: "", almacenajeDias: 30, tiposCambio: {}, comisionPct: 15, editando: "", abiertas: {} };

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

/* Link que Mae manda por WhatsApp: ?ver=direccion-americana&compra=<id> (o el viejo ?ver=shopwithmae) abre esa
   cotización (después de iniciar sesión, si hace falta). */
let swmFocusCompra = new URLSearchParams(location.search).get("compra") || "";

function swmMostrarCompra() {
  if (!swmFocusCompra || !swm.loaded) return;
  const id = swmFocusCompra;
  swmFocusCompra = "";
  if (!swm.compras.some((c) => c.id === id)) return;
  swm.tab = "compras";
  swm.abiertas[`compra:${id}`] = true;
  renderSwmCasillero();
  const el = document.getElementById(`swm-compra-${id}`);
  if (el) {
    el.classList.add("ring-2", "ring-rose-deep");
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
}

function openSwmSection({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  showHomeView("swm", { ver: "direccion-americana" });
  renderSwm();
  if (!restore) document.getElementById("swm-section").scrollIntoView({ behavior: "auto", block: "start" });
}

/* Se llama desde app.js cuando la clienta inicia o cierra sesión. */
function swmOnAuthChange() {
  swm = { ...swm, loaded: false, loading: false, error: "", casillero: "", paquetes: [], compras: [], envios: [], form: "" };
  if (!document.getElementById("swm-section").classList.contains("hidden")) renderSwm();
}

// Ya usa el casillero (tiene algo registrado): la página se enfoca en su
// casillero y pliega la dirección y las reglas.
const swmActiva = () => swm.loaded && (swm.paquetes.length + swm.compras.length + swm.envios.length) > 0;

function renderSwm() {
  // Con sesión, la página abre directo en su dirección y su casillero: la
  // explicación del servicio queda plegada abajo. Sin sesión, al revés.
  const logged = Boolean(getCustomerToken());
  document.querySelectorAll("#swm-section .swm-guest").forEach((el) => el.classList.toggle("hidden", logged));
  ["swm-how", "swm-prices"].forEach((id) => { document.getElementById(id).open = !logged; });
  document.getElementById("swm-rules").open = !logged || !swmActiva();
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
  // Sin sesión no se repite el "crear cuenta": ya está el botón de la portada.
  if (!getCustomerToken()) { el.innerHTML = ""; return; }
  const fields = swmAddressFields();
  const all = fields.map(([l, v]) => `${l.replace(/ \(.*\)$/, "")}: ${v}`).join("\n");
  const row = ([label, value]) => `<div class="flex items-center justify-between gap-3 py-2 border-b border-white/30 last:border-0">
      <div class="min-w-0"><span class="block text-[11px] uppercase tracking-wide text-cream/80">${label}</span><b class="block text-base text-cream break-words">${escapeHtml(value)}</b></div>
      <button type="button" data-swm-copy="${escapeHtml(value)}" class="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-cream hover:bg-white/30">Copiar</button>
    </div>`;
  // Plegada para quien ya usa el casillero (se abre sola la primera vez).
  if (swm.addrOpen == null && swm.loaded) swm.addrOpen = !swmActiva();
  el.innerHTML = `<details id="swm-addr" class="group rounded-3xl border border-ink/10 bg-white"${swm.addrOpen === false ? "" : " open"}>
    <summary class="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4">
      <span><span class="block font-display text-lg sm:text-xl text-ink">📋 Mi dirección americana</span><span class="block text-xs text-ink/70">${swm.casillero ? `Tu código: <b>${escapeHtml(swm.casillero)}</b> · ` : ""}toca para ver y copiar</span></span>
      <span class="text-ink/50 group-open:rotate-180 transition" aria-hidden="true">⌄</span>
    </summary>
    <div class="px-3 pb-3 sm:px-5 sm:pb-5 grid gap-4 md:grid-cols-[1fr_0.8fr]">
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
    </div></details>`;
  // Solo cuando ella lo abre o cierra (el evento "toggle" también salta al pintarlo abierto).
  const det = el.querySelector("#swm-addr");
  det.querySelector("summary").addEventListener("click", () => setTimeout(() => { swm.addrOpen = det.open; }, 0));
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

/* Guía de bienvenida: 3 pasos que se van palomeando hasta que hace su
   primer envío. "Copió la dirección" se recuerda en este navegador. */
const swmCopio = () => { try { return localStorage.getItem("alpacca_swm_copio") === "1"; } catch (err) { return false; } };
function renderSwmWelcome() {
  const el = document.getElementById("swm-welcome");
  const tieneDirMx = typeof direccionPrincipal === "function" && Boolean(direccionPrincipal());
  // Clienta de Personal shopper (Mae compra por ella, nunca ha mandado su
  // propio paquete): sus pasos son otros; no tiene que copiar la dirección
  // americana ni registrar guías.
  const soloCompras = swm.compras.length > 0 && !swm.paquetes.some((p) => p.origen !== "compra");
  const compraPagada = swm.compras.some((c) => ["pagado", "comprado"].includes(c.status) || (c.pago && c.pago.status === "pagado"));
  const pasos = soloCompras ? [
    [tieneDirMx, "Pon tu dirección de envío en México", "A donde te mando tus productos cuando crucen. Solo se pone una vez.", `<button type="button" data-swm-dirmx-toggle class="mt-1 block text-xs font-semibold text-rose-ink underline">Poner mi dirección</button>${swm.dirMxOpen ? swmDirMxFormHTML() : ""}`],
    [compraPagada, "Paga tu cotización", "Abajo, en “Compras”, la ves y la pagas con tarjeta o transferencia. No tienes que registrar ningún paquete ni guía: yo hago la compra por ti.", '<button type="button" data-swm-tab="compras" class="mt-1 block text-xs font-semibold text-rose-ink underline">Ver mi cotización</button>'],
    [swm.compras.some((c) => c.status === "comprado"), "Hago tu compra", "Compro tus productos y llegan solos a la bodega. Te aviso por correo.", ""],
    [swm.envios.length > 0, "Paga tu envío a casa", "Cuando lleguen, armo tu envío solita y aquí te sale lo que pagas.", ""],
  ] : [
    [tieneDirMx, "Pon tu dirección de envío en México", "A donde te mandamos tus paquetes cuando crucen. Solo se pone una vez.", `<button type="button" data-swm-dirmx-toggle class="mt-1 block text-xs font-semibold text-rose-ink underline">Poner mi dirección</button>${swm.dirMxOpen ? swmDirMxFormHTML() : ""}`],
    [swmCopio() || swm.paquetes.length > 0, "Copia tu dirección americana", "Úsala en tu tienda favorita, con tu código de casillero en el apellido.", '<button type="button" data-swm-abrir-dir class="mt-1 block text-xs font-semibold text-rose-ink underline">Ver mi dirección</button>'],
    [swm.paquetes.length > 0 || swm.compras.length > 0, "Registra tu primer paquete", "Cuando te den el número de rastreo. ¿Sin tarjeta americana? Usa Personal shopper \u2192 Compras en línea.", '<button type="button" data-swm-form="paquete" class="mt-1 block text-xs font-semibold text-rose-ink underline">Registrar paquete</button>'],
    [swm.envios.length > 0, "Paga tu envío a casa", "Cuando tu paquete llegue, armo tu envío solita y aquí te sale lo que pagas.", ""],
  ];
  const hechos = pasos.filter((p) => p[0]).length;
  const show = Boolean(getCustomerToken()) && swm.loaded && !swm.error && hechos < pasos.length;
  el.classList.toggle("hidden", !show);
  if (!show) return;
  const paso = ([ok, t, d, extra], n) => `<li class="flex gap-3">
      <span class="shrink-0 w-7 h-7 rounded-full ${ok ? "bg-[#2f8f5b]" : "bg-rose-deep"} text-cream text-sm font-bold flex items-center justify-center">${ok ? "✓" : n + 1}</span>
      <span><b class="block text-sm ${ok ? "text-ink/55 line-through" : "text-ink"}">${t}</b>${ok ? "" : `<span class="text-xs text-ink/75">${d}</span>${extra}`}</span></li>`;
  el.innerHTML = `<div class="rounded-3xl border-2 border-rose/40 bg-white p-5">
    <div class="flex items-center justify-between gap-3"><p class="font-display text-lg text-ink">👋 ¡Bienvenida! Así empiezas</p><span class="text-xs font-bold text-rose-ink">${hechos} de ${pasos.length}</span></div>
    <div class="mt-2 h-2 rounded-full bg-pill overflow-hidden"><div class="h-full bg-rose-deep rounded-full" style="width:${Math.round((hechos / pasos.length) * 100)}%"></div></div>
    <ol class="mt-4 space-y-3">${pasos.map(paso).join("")}</ol>
    <button type="button" data-howto-video="direccion" class="mt-4 text-sm font-semibold text-rose-ink underline">▶️ Mira el video de cómo funciona (1 min)</button>
  </div>`;
}

/* Dirección de envío en México (se guarda en "Mis direcciones" de su cuenta
   y luego se usa sola al pedir el envío). */
function swmDirMxFormHTML() {
  const d = swmUltimaDireccion();
  const f = (k, label, attrs = "") => swmInput(`swm-mx-${k}`, label, `value="${escapeHtml(d[k] || "")}" ${attrs}`);
  return `<form data-swm-dirmx class="mt-3 space-y-3 rounded-2xl bg-pill/60 p-3" novalidate>
    <div class="grid gap-3 sm:grid-cols-2">
      ${f("nombre", "Nombre de quien recibe *", 'maxlength="100" autocomplete="name"')}
      ${f("telefono", "Teléfono (10 dígitos) *", 'maxlength="20" inputmode="tel" autocomplete="tel"')}
      ${f("calle", "Calle y número *", 'maxlength="150" autocomplete="street-address"')}
      ${f("colonia", "Colonia", 'maxlength="100"')}
      ${f("ciudad", "Ciudad o municipio *", 'maxlength="80" autocomplete="address-level2"')}
      ${f("estado", "Estado", 'maxlength="60" autocomplete="address-level1"')}
      ${f("cp", "Código postal *", 'maxlength="5" inputmode="numeric" autocomplete="postal-code"')}
      ${f("referencias", "Referencias", 'maxlength="200" placeholder="Casa azul, entre calles…"')}
    </div>
    <p data-swm-dirmx-err class="hidden text-sm text-sale"></p>
    <button type="submit" class="inline-flex items-center rounded-full bg-rose-deep px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rose-ink">Guardar mi dirección ✓</button>
  </form>`;
}

async function swmGuardarDirMx(form) {
  const err = form.querySelector("[data-swm-dirmx-err]");
  const val = (k) => (document.getElementById(`swm-mx-${k}`).value || "").trim();
  const d = Object.fromEntries(["nombre", "telefono", "calle", "colonia", "ciudad", "estado", "cp", "referencias"].map((k) => [k, val(k)]));
  err.classList.add("hidden");
  if (!d.nombre || d.telefono.replace(/[^0-9]/g, "").length < 10 || !d.calle || !d.ciudad || !/^\d{5}$/.test(d.cp)) {
    err.textContent = "Completa nombre, teléfono de 10 dígitos, calle y número, ciudad y código postal de 5 dígitos.";
    err.classList.remove("hidden");
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await direccionesPost({ accion: "guardar", direccion: d });
    try { localStorage.setItem("alpacca_swm_dir", JSON.stringify(d)); } catch (e) { /* nada */ }
    swm.dirMxOpen = false;
    renderSwmWelcome();
    renderSwmCasillero();
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove("hidden");
    btn.disabled = false;
  }
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
  const tabs = [["paquetes", `Paquetes (${P.length})`], ["compras", `Compras (${swm.compras.filter((c) => c.status !== "cancelado").length})`], ["envios", `Envíos (${swm.envios.filter((e) => e.status !== "cancelado").length})`]];
  el.innerHTML = `${h}
    <div class="rounded-3xl bg-gradient-to-br from-blush/60 via-blush/25 to-lilac/25 p-4">
      ${swmPendientesHTML()}
      <p class="mt-3 px-1 text-xs text-ink/70">📦 ${P.filter((p) => p.status === "registrado").length} por llegar · ${P.filter((p) => p.status === "recibido" && !p.enMexicoAt).length} en almacén · ${P.filter((p) => ["recibido", "en_envio"].includes(p.status) && p.enMexicoAt).length} en México · ${P.filter((p) => ["enviado", "entregado"].includes(p.status)).length} enviados</p>
      <div class="mt-3 grid gap-2 sm:grid-cols-2">
        ${[["paquete", "📦", "Registrar un paquete", "Ya compraste y lo mandaste a la dirección", "bg-[#fff4e0]"], ["compra", "🛍️", "Que Mae compre por mí", "Personal shopper: compras en línea", "bg-[#fde8f0]"]]
          // Sin pendientes, el botón grande de arriba ya es "Registrar paquete".
          .filter(([f]) => f !== "paquete" || swmPendientes().length)
          .map(([f, ico, t, d, bg]) => `<button type="button" ${f === "compra" ? 'data-ps-open="linea"' : `data-swm-form="${f}"`} class="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-left text-sm font-semibold hover:bg-white/80"><span class="shrink-0 w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-2xl" aria-hidden="true">${ico}</span><span>${t}<span class="block text-xs font-normal text-ink/65">${d}</span></span></button>`).join("")}
      </div>
    </div>
    <p class="mt-2 px-1 text-xs text-ink/60">🚚 Tu envío a casa se arma solo cuando llega tu paquete. ¿Quieres juntar paquetes o mandarlo a otra dirección? <button type="button" data-swm-form="envio" class="font-semibold text-rose-ink underline">Pedir envío a mano</button></p>
    <div id="swm-form-box" class="mt-4">${swmFormHTML()}</div>
    ${swmBeneficiosHTML()}
    <div class="mt-6 grid grid-cols-3 gap-1.5" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${swm.tab === k}" data-swm-tab="${k}" class="rounded-full px-2 py-2 text-[13px] font-semibold ${swm.tab === k ? "bg-ink text-cream" : "bg-pill text-ink/75"}">${l}</button>`).join("")}</div>
    <div class="mt-4 space-y-3">${swmTabHTML()}</div>`;
  el.querySelectorAll("[data-swm-editar]").forEach(swmActualizarEstimado);
  const benef = el.querySelector("[data-swm-benef]");
  if (benef) benef.addEventListener("toggle", () => { swm.benefOpen = benef.open; });
}

/* "Lo que necesitas hacer": todo lo que espera algo de la clienta, en una
   lista corta arriba del casillero; cada punto la lleva a su tarjeta. */
function swmPendientes() {
  const out = [];
  const ir = (kind, r) => `data-swm-ir="${kind}:${escapeHtml(r.id)}"`;
  const porPagar = (r) => r.status === "cotizado" && r.cotizacion && !(r.pago && r.pago.status === "revision");
  swm.envios.filter(porPagar).forEach((e) => out.push(["💳", `Paga tu envío ${e.folio} · ${swmMXN(e.cotizacion.total)}`, ir("envio", e)]));
  swm.compras.filter(porPagar).forEach((c) => out.push(["💳", `Paga tu compra ${c.folio} · ${swmMXN(c.cotizacion.total)}`, ir("compra", c)]));
  if (typeof direccionPrincipal === "function" && misDirecciones && !direccionPrincipal()) out.push(["📍", "Pon tu dirección de envío en México", "data-swm-dirmx-toggle"]);
  swm.paquetes.filter((p) => swmPorPagar("paquete", p) && !(p.pago && p.pago.status === "revision")).forEach((p) => out.push(["💳", `Paga el cruce de ${p.folio} · ${swmMXN(p.pago.monto || 0)}`, ir("paquete", p)]));
  swm.paquetes.filter((p) => p.datosPendientes && p.status !== "cancelado").forEach((p) => out.push(["⚠️", `Dime qué trae ${p.folio} (llegó sin registrar)`, ir("paquete", p)]));
  swm.paquetes.filter((p) => p.correccion && p.correccion.estado === "pedida").forEach((p) => out.push(["✏️", `Corrige los datos de ${p.folio}`, ir("paquete", p)]));
  const listos = swm.paquetes.filter((p) => p.status === "recibido" && !p.datosPendientes);
  const mx = listos.filter((p) => p.enMexicoAt);
  const vence = mx.filter((p) => (new Date(p.enMexicoAt).getTime() + swm.almacenajeDias * 864e5 - Date.now()) / 864e5 <= 5);
  if (vence.length) out.push(["⏰", `Se acaba el almacenaje gratis de ${vence.map((p) => p.folio).join(", ")}: pide tu envío`, 'data-swm-form="envio"']);
  else if (mx.length) out.push(["🚚", `${mx.length === 1 ? "Tu paquete ya está" : `Tus ${mx.length} paquetes ya están`} en México: pide tu envío`, 'data-swm-form="envio" data-swm-solo-mx']);
  return out;
}

/* Arriba del casillero, UN siguiente paso grande; lo demás que tenga
   pendiente, en chiquito debajo. Sin pendientes: registrar un paquete. */
function swmPendientesHTML() {
  const items = swmPendientes();
  const [ico, txt, attr] = items[0] || ["📦", swmActiva() ? "Registra otro paquete" : "Registra tu primer paquete", 'data-swm-form="paquete"'];
  const resto = items.slice(1);
  return `<div>
      <p class="px-1 text-xs font-bold uppercase tracking-wide text-rose-ink">${items.length ? "Tu siguiente paso" : swmActiva() ? "✨ Todo en orden" : "Empieza aquí"}</p>
      <button type="button" ${attr} class="mt-2 flex w-full items-center gap-3 rounded-2xl bg-rose-deep px-4 py-4 text-left text-base font-semibold text-cream shadow-sm hover:bg-rose-ink"><span class="text-2xl" aria-hidden="true">${ico}</span><span class="flex-1">${escapeHtml(txt)}</span><span aria-hidden="true">→</span></button>
      ${resto.length ? `<ul class="mt-2 space-y-1.5">${resto.map(([i, t, a]) => `<li><button type="button" ${a} class="flex w-full items-center gap-3 rounded-xl bg-white/85 px-3 py-2.5 text-left text-sm font-semibold hover:bg-white"><span aria-hidden="true">${i}</span><span class="flex-1">${escapeHtml(t)}</span><span aria-hidden="true" class="text-rose-ink">→</span></button></li>`).join("")}</ul>` : ""}
    </div>`;
}

/* Lo que la hace volver: paquetes traídos, cruce gratis por lealtad e
   invita a una amiga (con sus cupones de premio). */
function swmBeneficiosHTML() {
  const L = swm.lealtad;
  const R = swm.referido;
  const traidos = swm.paquetes.filter((p) => ["enviado", "entregado"].includes(p.status)).length;
  if (!L && !R) return "";
  const puntos = L ? Array.from({ length: L.cada }, (_, i) => `<span class="w-5 h-5 rounded-full border-2 ${i < L.avance ? "bg-rose-deep border-rose-deep" : "bg-white border-ink/20"}"></span>`).join("") : "";
  const faltan = L ? L.cada - L.avance : 0;
  const waTxt = R ? `Te recomiendo la dirección americana de Alpacca para traer tus compras de EE.UU. 💗 Usa mi código ${R.code} y tienes $${R.monto} de descuento en tu primer envío: https://alpacca.mx/?ver=direccion-americana` : "";
  return `<details class="mt-4 group rounded-3xl border border-ink/10 bg-white"${swm.benefOpen ? " open" : ""} data-swm-benef>
    <summary class="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-3">
      <span class="text-sm"><b>💗 Tus beneficios</b>${L && L.disponibles ? ` · <span class="text-[#2f8f5b] font-semibold">🎁 cruce al ${L.pct || 50}%</span>` : ""}${(swm.premios || []).length ? ` · <span class="text-rose-ink font-semibold">${swm.premios.length} cupón${swm.premios.length > 1 ? "es" : ""}</span>` : ""}</span>
      <span class="text-ink/50 group-open:rotate-180 transition" aria-hidden="true">⌄</span>
    </summary>
    <div class="px-4 pb-4 space-y-4 text-sm">
      ${traidos ? `<p>🎉 Con Mae ya trajiste <b>${traidos} paquete${traidos === 1 ? "" : "s"}</b> a México. ¡Gracias por tu confianza!</p>` : ""}
      ${L ? `<div>
        <p class="font-semibold">🎁 Cada ${L.cada} envíos, el cruce del siguiente va al ${L.pct || 50}%</p>
        <div class="mt-2 flex gap-1.5" aria-label="${L.avance} de ${L.cada}">${puntos}</div>
        <p class="mt-1 text-xs text-ink/70">${L.disponibles ? `<b class="text-[#2f8f5b]">Ya ganaste tu cruce al ${L.pct || 50}%</b>${L.disponibles > 1 ? ` (${L.disponibles})` : ""}: se aplica en tu próximo envío. ` : ""}Te falta${faltan === 1 ? "" : "n"} ${faltan} envío${faltan === 1 ? "" : "s"} entregado${faltan === 1 ? "" : "s"} para el siguiente.</p>
      </div>` : ""}
      ${R ? `<div>
        <p class="font-semibold">👭 Invita a una amiga</p>
        <p class="text-xs text-ink/75 mt-0.5">Ella tiene <b>$${R.monto} de descuento</b> en su primer envío o compra y tú ganas <b>$${R.monto}</b> cuando lo pague.</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <span class="rounded-xl border-2 border-dashed border-rose/60 px-3 py-1.5 font-bold tracking-wide">${escapeHtml(R.code)}</span>
          <button type="button" data-swm-copy="${escapeHtml(R.code)}" class="rounded-full bg-pill px-3 py-1.5 text-xs font-semibold">Copiar</button>
          <a href="https://wa.me/?text=${encodeURIComponent(waTxt)}" target="_blank" rel="noopener" class="rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white">Compartir por WhatsApp</a>
        </div>
      </div>` : ""}
      ${(swm.premios || []).length ? `<div>
        <p class="font-semibold">🎟️ Tus cupones</p>
        <ul class="mt-1 space-y-1">${swm.premios.map((c) => `<li class="flex items-center gap-2"><b class="tracking-wide">${escapeHtml(c.code)}</b> · ${swmMXN(c.valor)} <button type="button" data-swm-copy="${escapeHtml(c.code)}" class="rounded-full bg-pill px-2.5 py-1 text-xs font-semibold">Copiar</button></li>`).join("")}</ul>
        <p class="mt-1 text-xs text-ink/70">Ponlo en "¿Tienes un cupón?" cuando pagues tu siguiente cotización.</p>
      </div>` : ""}
    </div>
  </details>`;
}

/* Línea de avance ("Registrado → En almacén → ..."), como en Delivered. */
const SWM_STEPS = {
  paquete: [{ registrado: 0, recibido: 1, en_envio: 1, en_mexico: 2, enviado: 3, entregado: 4 }, ["Registrado", "En almacén", "En México", "Enviado", "Entregado"]],
  compra: [{ solicitud: 0, cotizado: 1, pagado: 2, comprado: 3 }, ["Cotizando", "Por pagar", "Pagada", "Comprada"]],
  envio: [{ solicitado: 0, cotizado: 1, pagado: 2, en_mexico: 3, enviado: 4, entregado: 5 }, ["Cotizando", "Por pagar", "Pagado", "En México", "En camino", "Entregado"]],
};
function swmStepsHTML(kind, status) {
  const [idxMap, labels] = SWM_STEPS[kind];
  const idx = idxMap[status];
  if (idx == null) return "";
  return `<ol class="mt-3 flex items-start" aria-label="Avance">${labels.map((l, i) => `<li class="flex-1 flex flex-col items-center text-center ${i ? "relative before:absolute before:top-[7px] before:right-1/2 before:w-full before:h-0.5 " + (i <= idx ? "before:bg-rose-deep" : "before:bg-ink/15") : ""}">
      <span class="relative z-10 w-4 h-4 rounded-full border-2 ${i <= idx ? "bg-rose-deep border-rose-deep" : "bg-white border-ink/25"}"${i === idx ? ' aria-current="step"' : ""}></span>
      <span class="mt-1 text-[11px] leading-tight ${i === idx ? "font-bold text-ink" : "text-ink/65"}">${l}</span></li>`).join("")}</ol>`;
}

function swmTabHTML() {
  const empty = (t) => `<p class="rounded-2xl bg-pill px-4 py-6 text-center text-sm text-ink/70">${t}</p>`;
  if (swm.tab === "compras") {
    return swm.compras.length ? swm.compras.map(swmCompraCardHTML).join("") : empty("¿No sabes cómo comprar o no tienes tarjeta americana? Pídeme que compre por ti y te mando la cotización aquí.");
  }
  if (swm.tab === "envios") {
    return swm.envios.length ? swm.envios.map(swmEnvioCardHTML).join("") : empty("Cuando tus paquetes estén en México, pide aquí tu envío a casa.");
  }
  return swm.paquetes.length ? swm.paquetes.map(swmPaqueteCardHTML).join("") : empty("Todavía no tienes paquetes. Compra en tu tienda favorita, mándalo a tu dirección americana y regístralo aquí.");
}

// Ya cruzó a México: el status sigue en almacén/en un envío (para poder
// pedir su envío), pero a la clienta se le muestra "En México".
const swmPkgEstado = (p) => (p.enMexicoAt && ["recibido", "en_envio"].includes(p.status) ? "en_mexico" : p.status);

/* Tarjeta compacta: folio, etapa y qué sigue; el detalle se abre al tocarla.
   Las que esperan algo de la clienta (pagar, completar, corregir) abren solas. */
function swmCardHTML({ key, id, folio, pill, sub, siguiente, accion, body }) {
  const open = swm.abiertas[key] ?? accion;
  return `<details id="${escapeHtml(id)}" data-swm-card="${escapeHtml(key)}" class="group rounded-2xl border ${accion ? "border-rose-deep/40 bg-blush/10" : "border-ink/10 bg-white"} scroll-mt-28"${open ? " open" : ""}>
    <summary class="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
      <span class="min-w-0"><b class="block">${escapeHtml(folio)}</b>${sub ? `<span class="block truncate text-xs text-ink/65">${escapeHtml(sub)}</span>` : ""}<span class="mt-1 block text-[13px] font-semibold ${accion ? "text-rose-ink" : "text-ink/75"}">${siguiente}</span></span>
      <span class="flex shrink-0 flex-col items-end gap-1.5">${pill}<span class="text-[11px] font-semibold text-ink/50"><span class="group-open:hidden">Ver detalle ▾</span><span class="hidden group-open:inline">Ocultar ▴</span></span></span>
    </summary>
    <div class="px-4 pb-4 -mt-2">${body}</div>
  </details>`;
}

// Qué sigue con cada cosa, en palabras simples: [texto, ¿le toca a ella?]
function swmPkgSiguiente(p) {
  if (p.status === "cancelado") return ["Registro cancelado", false];
  if (p.datosPendientes) return ["⚠️ Dime qué trae para poder mandártelo", true];
  if (p.correccion && p.correccion.estado === "pedida") return ["✏️ Mae te pidió corregir tus datos", true];
  if (p.status === "en_envio") return [p.enMexicoAt ? "Ya cruzó · va en tu envío a casa" : "Va en tu envío a México", false];
  if (p.status === "recibido") return [p.enMexicoAt ? "Ya cruzó a México · pide tu envío a casa" : "Ya llegó a la bodega · te avisamos cuando cruce a México", false];
  return [{ registrado: "Te aviso cuando llegue a la bodega", enviado: "Va en camino a tu casa", entregado: "¡Entregado! 💗" }[p.status] || "", false];
}
function swmCotSiguiente(r, cotizando, pagado) {
  if (r.status === "cotizado" && r.cotizacion) {
    return r.pago && r.pago.status === "revision" ? ["🔎 Estamos revisando tu pago", false] : [`💳 Paga ${swmMXN(r.cotizacion.total)} para continuar`, true];
  }
  return r.status === "solicitud" || r.status === "solicitado" ? [cotizando, false] : [pagado[r.status] || "", false];
}

function swmPaqueteCardHTML(p) {
  const desc = [p.tienda, p.paqueteria, p.rastreo && `rastreo ${p.rastreo}`].filter(Boolean).join(" · ");
  let extra = "";
  // El almacenaje gratis corre desde que el paquete llega a México.
  if (p.status === "recibido" && p.enMexicoAt) {
    const hasta = new Date(new Date(p.enMexicoAt).getTime() + swm.almacenajeDias * 864e5);
    const dias = Math.ceil((hasta - Date.now()) / 864e5);
    extra = `<p class="text-xs ${dias <= 5 ? "text-sale font-semibold" : "text-ink/65"} mt-1">Almacenaje gratis hasta el ${swmDate(hasta.toISOString(), { day: "numeric", month: "long" })}${dias > 0 ? ` (${dias} día${dias === 1 ? "" : "s"})` : " · ya venció"}</p>`;
  }
  const fotos = (p.fotos || []).map((f) => `<button type="button" data-swm-ver-foto="/.netlify/functions/swm-foto?id=${escapeHtml(f)}"><img src="/.netlify/functions/swm-foto?id=${escapeHtml(f)}" alt="Foto de tu paquete" loading="lazy" class="w-28 h-28 rounded-xl object-cover bg-pill"></button>`).join("");
  const [siguiente, accion] = swmPkgSiguiente(p);
  return swmCardHTML({ key: `paquete:${p.id}`, id: `swm-paquete-${p.id}`, folio: p.folio, pill: swmPill(SWM_PKG_STATUS, p.datosPendientes ? "sin_registro" : swmPkgEstado(p)),
    sub: [p.tienda, p.paqueteria].filter(Boolean).join(" · "), siguiente: escapeHtml(siguiente), accion, body: `
    ${p.status === "cancelado" ? "" : swmStepsHTML("paquete", swmPkgEstado(p))}
    <p class="text-sm mt-2">${escapeHtml(desc || "Paquete")}${p.origen === "compra" ? ' <span class="text-xs text-lilac-ink">(compra de Mae)</span>' : ""}</p>
    ${p.contenido ? `<p class="text-xs text-ink/65">${escapeHtml(p.contenido)}</p>` : ""}
    ${p.valorTotal ? `<p class="text-xs text-ink/65">Valor declarado: ${escapeHtml(Number(p.valorTotal).toLocaleString("es-MX", { maximumFractionDigits: 2 }))} ${escapeHtml(p.moneda || "")}${swmNumArchivos(p) ? ` · 📄 ${swmNumArchivos(p)} archivo${swmNumArchivos(p) === 1 ? "" : "s"} recibido${swmNumArchivos(p) === 1 ? "" : "s"}` : ""}</p>` : ""}
    <p class="text-xs text-ink/65 mt-1">Cruce: ${p.crucePagado ? (p.pago ? "15% ya pagado ✅ (en tu envío solo pagas la guía)" : "ya pagado con tu compra") : p.cobro === "comision" && p.pago ? `15% por adelantado: ${swmMXN(p.pago.monto || 0)}` : p.cobro === "auto" ? "lo más barato (por peso o 15%), al pedir tu envío" : p.cobro === "comision" ? `15% del valor${swmValorPesos(Number(p.valorTotal) || 0, p.moneda) ? ` (≈ ${swmMXN(swmCruceComision(swmValorPesos(Number(p.valorTotal), p.moneda)))})` : ""}` : "por peso"}${p.cobrable ? ` · ${p.cobrable} kg${p.cobro === "peso" && !p.crucePagado ? ` → ${swmMXN(swmCrucePeso(p.cobrable))}` : ""}` : ""}</p>
    ${swmPagoHTML("paquete", p)}
    ${extra}
    ${fotos ? `<div class="mt-2 flex flex-wrap gap-2">${fotos}</div>` : ""}
    ${p.notaClienta ? `<p class="mt-2 rounded-xl bg-blush/25 px-3 py-2 text-sm">💬 ${escapeHtml(p.notaClienta)}</p>` : ""}
    ${swmExtrasHTML(p)}
    ${p.correccion && p.correccion.estado === "pedida" ? `<div class="mt-3 rounded-xl bg-sale/[0.06] border border-sale/30 p-3 text-sm"><b>✏️ Mae te pidió corregir tus datos:</b><p class="mt-1">${escapeHtml(p.correccion.motivo || "")}</p><p class="mt-1 text-xs text-ink/65">Hasta que lo corrijas no puedes pedir el envío de este paquete.</p></div>` : ""}
    ${swmPuedeEditar(p) ? (swm.editando === p.id || (p.correccion && p.correccion.estado === "pedida")
      ? swmEditarFormHTML(p)
      : `<button type="button" data-swm-editar-toggle="${escapeHtml(p.id)}" class="mt-2 mr-3 text-xs font-semibold text-rose-ink underline">✏️ Editar mis datos</button>`) : ""}
    ${p.status === "registrado" && p.origen !== "compra" ? `<button type="button" data-swm-cancel="paquete:${escapeHtml(p.id)}" class="mt-2 text-xs text-ink/60 underline">Cancelar registro</button>` : ""}
    ${p.datosPendientes ? `<form data-swm-completar="${escapeHtml(p.id)}" class="mt-3 rounded-xl bg-sale/[0.06] border border-sale/30 p-3 space-y-2" novalidate>
      <p class="text-sm"><b>⚠️ Este paquete llegó sin registrar.</b> Dime qué trae y cuánto costó para poder enviártelo. Se suma un cargo de <b>${swmMXN(p.cargoSinRegistro || 80)}</b> a tu envío.</p>
      ${swmDeclaracionHTML()}
      ${swmCobroElegir(p.cobro)}
      <p data-c-err class="hidden text-xs text-sale"></p>
      <button type="submit" class="rounded-full bg-rose-deep px-4 py-2 text-xs font-semibold text-cream">Guardar datos</button>
    </form>` : ""}` });
}

/* Servicios extra de un paquete: revisión del contenido con fotos y
   separar artículos para mandar solo una parte (se cobran con el envío). */
function swmExtrasHTML(p) {
  const out = [];
  const rv = p.revision;
  if (rv && rv.estado === "hecha") {
    const fotos = (rv.fotos || []).map((f) => `<button type="button" data-swm-ver-foto="/.netlify/functions/swm-foto?id=${escapeHtml(f)}"><img src="/.netlify/functions/swm-foto?id=${escapeHtml(f)}" alt="Foto del contenido" loading="lazy" class="w-28 h-28 rounded-xl object-cover bg-pill"></button>`).join("");
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

/* ¿Tiene algo por pagar? (igual que porPagar en swm-core.js) */
const swmPorPagar = (kind, r) => Boolean(r && r.cotizacion && !(r.pago && r.pago.status === "pagado")
  && (kind === "paquete" ? !r.crucePagado && r.pago && r.status !== "cancelado" : r.status === "cotizado"));

function swmPagoHTML(kind, r) {
  if (!swmPorPagar(kind, r)) return "";
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
    ${kind === "paquete" ? "" : r.cotizacion.cupon ? `<p class="text-xs text-rose-ink font-semibold">🎟️ Cupón ${escapeHtml(r.cotizacion.cupon)}: −${swmMXN(r.cotizacion.descuento)} (antes ${swmMXN(r.cotizacion.totalSinDescuento)})</p>`
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
  const [siguiente, accion] = swmCotSiguiente(c, "Mae está armando tu cotización", { pagado: "Mae hará tu compra pronto", comprado: "Tus productos van a la bodega", cancelado: "Cancelada" });
  return swmCardHTML({ key: `compra:${c.id}`, id: `swm-compra-${c.id}`, folio: c.folio, pill: swmPill(SWM_COMPRA_STATUS, c.status),
    sub: [c.tienda, swmDate(c.createdAt)].filter(Boolean).join(" · "), siguiente: escapeHtml(siguiente), accion, body: `
    ${swmStepsHTML("compra", c.status)}
    <p class="text-xs text-ink/65 mt-2">${swmDate(c.createdAt)} · Cruce ${c.cobro === "comision" ? "15% (se paga con la compra)" : "por peso (se paga al enviar)"}</p>
    ${c.tienda ? `<p class="mt-1 text-sm font-semibold">${escapeHtml(c.tienda)}</p>` : ""}
    ${c.links ? `<p class="mt-2 text-xs whitespace-pre-wrap break-all rounded-xl bg-pill/70 px-3 py-2">${escapeHtml(c.links)}</p>` : ""}
    ${q && q.items ? `<ul class="mt-2 text-sm divide-y divide-ink/5 rounded-xl bg-pill/60 px-3 py-1">${q.items.map((x) => `<li class="flex justify-between gap-3 py-1"><span>${x.cantidad} × ${escapeHtml(x.nombre)}${x.tono ? ` <span class="text-ink/65">· ${escapeHtml(x.tono)}</span>` : ""}</span><span class="tabular-nums shrink-0">${swmMXN(x.precio * x.cantidad)}</span></li>`).join("")}</ul>` : ""}
    ${c.notaClienta ? `<p class="mt-2 rounded-xl bg-blush/25 px-3 py-2 text-sm">💬 ${escapeHtml(c.notaClienta)}</p>` : ""}
    ${lines}${swmPagoHTML("compra", c)}
    ${c.status === "pagado" ? `<p class="mt-2 text-xs text-ink/70">Pagado el ${swmDate(c.pago && c.pago.paidAt)}. Te aviso cuando haga tu compra.</p>` : ""}
    ${c.status === "comprado" ? `<p class="mt-2 text-xs text-ink/70">Tus productos ya van al almacén; los ves en "Mis paquetes".</p>` : ""}
    ${["solicitud", "cotizado"].includes(c.status) && (!c.pago || c.pago.status === "pendiente") ? `<button type="button" data-swm-cancel="compra:${escapeHtml(c.id)}" class="mt-2 text-xs text-ink/60 underline">Cancelar</button>` : ""}` });
}

function swmEnvioCardHTML(e) {
  const pk = (e.paqueteIds || []).map((id) => swm.paquetes.find((p) => p.id === id)).filter(Boolean);
  const q = e.cotizacion;
  const line = (l, v) => (v ? `<div class="flex justify-between"><span>${l}</span><span class="tabular-nums">${swmMXN(v)}</span></div>` : "");
  const d = e.direccion || {};
  const [siguiente, accion] = swmCotSiguiente(e, "Mae está cotizando tu envío", {
    pagado: "Estamos preparando tu caja", en_mexico: "Ya está en México, sale pronto a tu casa",
    enviado: e.guia ? `Va en camino · guía ${e.guia}` : "Va en camino a tu casa", entregado: "¡Entregado! 💗", cancelado: "Cancelado" });
  return swmCardHTML({ key: `envio:${e.id}`, id: `swm-envio-${e.id}`, folio: e.folio, pill: swmPill(SWM_ENVIO_STATUS, e.status),
    sub: `${swmDate(e.createdAt)} · ${pk.length} paquete${pk.length === 1 ? "" : "s"}`, siguiente: escapeHtml(siguiente), accion, body: `
    ${swmStepsHTML("envio", e.status)}
    <p class="text-xs text-ink/65 mt-2">${swmDate(e.createdAt)} · ${pk.length} paquete${pk.length === 1 ? "" : "s"}: ${escapeHtml(pk.map((p) => p.folio).join(", "))}${e.consolidar ? " · en una sola caja" : ""}</p>
    <p class="text-xs text-ink/65">A: ${escapeHtml([d.nombre, d.ciudad, d.cp].filter(Boolean).join(" · "))}</p>
    ${e.notaClienta ? `<p class="mt-2 rounded-xl bg-blush/25 px-3 py-2 text-sm">💬 ${escapeHtml(e.notaClienta)}</p>` : ""}
    ${q ? `<div class="mt-2 text-sm space-y-0.5">${line(q.premioLealtad ? `Cruce a México <span class="text-[#2f8f5b] font-semibold">(${q.lealtadPct || 50}% por lealtad 🎁)</span>` : "Cruce a México", q.cruce)}${line("Consolidación", q.consolidacion)}${line("Paquete(s) sin registrar", q.sinRegistro)}${line("Servicios extra", q.extras)}${q.descuento ? `<div class="flex justify-between text-rose-ink"><span>Cupón ${escapeHtml(q.cupon)}</span><span class="tabular-nums">−${swmMXN(q.descuento)}</span></div>` : ""}${line("Envío nacional", q.envio)}
      <div class="flex justify-between font-semibold border-t border-ink/10 pt-1"><span>Total</span><span class="tabular-nums">${swmMXN(q.total)}</span></div></div>` : `<p class="mt-2 text-xs text-ink/70">Te mando la cotización del envío por correo y aquí mismo.</p>`}
    ${swmPagoHTML("envio", e)}
    ${e.guia ? `<p class="mt-2 text-sm">🚚 ${escapeHtml(e.paqueteria || "Paquetería")}: <b>${escapeHtml(e.guia)}</b></p>` : ""}
    ${["solicitado", "cotizado"].includes(e.status) && (!e.pago || e.pago.status === "pendiente") ? `<button type="button" data-swm-cancel="envio:${escapeHtml(e.id)}" class="mt-2 text-xs text-ink/60 underline">Cancelar envío</button>` : ""}` });
}

/* ----------------------------- Formularios ----------------------------- */
/* Con quién viene el paquete: ayuda a encontrarlo en la bodega. */
const SWM_PAQUETERIAS = ["UPS", "USPS", "FedEx", "Amazon", "DHL", "OnTrac", "Otra"];
const swmPaqueteriaSelect = (attrs, actual = "") => `<label class="flex flex-col gap-1 text-xs font-semibold">Paquetería *<select ${attrs} class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal bg-white">
    <option value=""${actual ? "" : " selected"} disabled>Elige la paquetería</option>
    ${SWM_PAQUETERIAS.map((x) => `<option value="${x}"${actual === x ? " selected" : ""}>${x}</option>`).join("")}
  </select></label>`;
const swmInput = (id, label, attrs = "") => `<label class="flex flex-col gap-1 text-xs font-semibold">${label}<input id="${id}" ${attrs} class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" /></label>`;
/* Qué trae el paquete: hasta 10 capturas o PDF de la factura/resumen o,
   si no sube nada, cada artículo con su costo escrito uno por uno; más el
   valor total de los artículos con tax, sin envío. Lo usan
   "Registrar paquete" y "completar datos". */
const SWM_MAX_ARCHIVOS = 10;
const SWM_MAX_ARCHIVO = 1.5 * 1024 * 1024; // por archivo, ya achicado
const SWM_MAX_TOTAL = 4 * 1024 * 1024; // todos juntos
const SWM_MONEDAS = [["USD", "Dólares (USD)"], ["MXN", "Pesos (MXN)"], ["KRW", "Wones (KRW)"], ["EUR", "Euros (EUR)"], ["JPY", "Yenes (JPY)"], ["CNY", "Yuanes (CNY)"]];
const swmDeclRow = (a = {}) => `<div data-decl-row style="display:grid;grid-template-columns:minmax(0,1fr) 3.25rem 5.5rem;gap:0.5rem;" class="">
    <input data-d="desc" maxlength="120" placeholder="Ej. Crema Laneige" value="${escapeHtml(a.desc || "")}" aria-label="Artículo" class="rounded-xl border border-ink/15 px-3 py-2 text-sm min-w-0" />
    <input data-d="cant" type="number" min="1" step="1" value="${Number(a.cant) || 1}" inputmode="numeric" aria-label="Cantidad" class="rounded-xl border border-ink/15 px-2 py-2 text-sm min-w-0" />
    <input data-d="costo" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Costo c/u" value="${a.costo || ""}" aria-label="Costo de cada uno" class="rounded-xl border border-ink/15 px-2 py-2 text-sm min-w-0" />
  </div>`;
const swmDeclTexto = (p) => ((p.articulos || []).length
  ? p.articulos.map((x) => `${x.desc}${x.cant > 1 ? ` x${x.cant}` : ""} $${x.costo}`).join("\n")
  : p.contenido && !/^Ver \d* ?captura/.test(p.contenido) ? p.contenido : "");
const swmDeclaracionHTML = (p = {}) => `<div data-decl data-previos="${swmNumArchivos(p)}" class="space-y-3">
    <div>
      <p class="text-sm font-semibold">¿Qué trae tu paquete? *</p>
      <p class="text-xs text-ink/65">Sube capturas de tu compra <b>o</b> escribe qué trae.</p>
    </div>
    <label class="flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-rose-deep/40 bg-blush/15 px-4 py-4 text-center hover:bg-blush/30 focus-within:ring-2 focus-within:ring-rose-deep">
      <span class="text-3xl" aria-hidden="true">📷</span>
      <b class="text-sm text-rose-ink">Subir capturas o factura</b>
      <span class="text-[11px] text-ink/60">Fotos o PDF · hasta ${SWM_MAX_ARCHIVOS}</span>
      <input data-decl-file type="file" multiple accept="application/pdf,image/*" class="sr-only" /></label>
    <p data-decl-files class="text-xs font-semibold text-green-800"></p>
    <label class="flex flex-col gap-1 text-xs font-semibold">✍️ O escribe qué trae
      <textarea data-decl-que rows="2" maxlength="300" placeholder="Ej. maquillaje Rare Beauty y 2 cremas CeraVe" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal">${escapeHtml(swmDeclTexto(p))}</textarea></label>
    <div>
      <p class="text-sm font-semibold">¿Cuánto costó todo? *</p>
      <p class="text-xs text-ink/65">El total de tus productos <b>con tax (impuestos), sin el envío</b>.</p>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0.5rem;" class="mt-1">
        <input data-decl-total type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ej. 85.50" value="${p.valorTotal || ""}" aria-label="Valor total de los artículos" class="rounded-xl border border-ink/15 px-3 py-2 text-sm min-w-0" />
        <select data-decl-moneda aria-label="Moneda" class="rounded-xl border border-ink/15 px-2 py-2 text-sm bg-white">${SWM_MONEDAS.map(([v, l]) => `<option value="${v}"${p.moneda === v ? " selected" : ""}>${l}</option>`).join("")}</select>
      </div>
      <p data-decl-estimado class="mt-1 text-xs font-semibold text-ink/75"></p>
    </div>
  </div>`;

/* Las fotos grandes se achican antes de subirlas (las capturas de iPhone
   pesan varios MB); los PDF se mandan tal cual. */
async function swmShrinkImage(file) {
  if (!/^image\//.test(file.type) || file.size < 300 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch (err) {
    return file;
  }
}

const swmNumArchivos = (p) => (p.facturas || []).length || (p.factura ? 1 : 0);

/* Valor declarado en pesos con los tipos de cambio de Mae, y el cruce del
   15% si eligió esa forma de pago. */
function swmValorPesos(valor, moneda) {
  const rate = moneda === "MXN" ? 1 : (swm.tiposCambio || {})[moneda];
  return valor > 0 && rate ? valor * rate : 0;
}
const swmCruceComision = (pesos) => Math.ceil(pesos * (swm.comisionPct || 15) / 100);

function swmActualizarEstimado(root) {
  const box = root && root.querySelector("[data-decl]");
  if (!box) return;
  const out = box.querySelector("[data-decl-estimado]");
  const moneda = box.querySelector("[data-decl-moneda]").value;
  const pesos = swmValorPesos(parseFloat(box.querySelector("[data-decl-total]").value) || 0, moneda);
  const radio = root.querySelector('input[name="swm-cobro"]:checked');
  const check = root.querySelector('[data-c="comision"]');
  const comision = radio ? radio.value === "comision" : !!(check && check.checked);
  const est = root.querySelector("[data-wiz-est]");
  if (est) est.textContent = pesos ? `Con lo que declaraste: ≈ ${swmMXN(swmCruceComision(pesos))}` : "";
  if (!pesos) { out.textContent = ""; return; }
  if (est) { out.textContent = moneda === "MXN" ? "" : `≈ ${swmMXN(pesos)}`; return; }
  out.textContent = `${moneda === "MXN" ? "" : `≈ ${swmMXN(pesos)} · `}${comision ? `tu cruce con el ${swm.comisionPct || 15}%: ${swmMXN(swmCruceComision(pesos))}` : "el cruce se cobra por peso cuando llegue"}`;
}

/* Paquetería según el número de rastreo (para no tener que elegirla). */
function swmDetectarPaqueteria(r) {
  const t = String(r || "").replace(/\s+/g, "").toUpperCase();
  if (!t) return "";
  if (/^1Z[0-9A-Z]{16}$/.test(t)) return "UPS";
  if (/^TBA\d+/.test(t)) return "Amazon";
  if (/^(94|93|92|95)\d{20}$/.test(t) || /^\d{20,22}$/.test(t) || /^[A-Z]{2}\d{9}US$/.test(t)) return "USPS";
  if (/^(\d{12}|\d{15})$/.test(t)) return "FedEx";
  if (/^\d{10}$/.test(t)) return "DHL";
  if (/^[CD]\d{14}$/.test(t)) return "OnTrac";
  return "";
}

/* Cómo paga el cruce: por peso al final (con su envío) o el 15% ahora (y al
   final solo la guía). */
const swmCobroElegir = (actual = "peso") => `<fieldset class="space-y-2"><legend class="text-sm font-semibold">¿Cómo pagas el cruce a México?</legend>
    <label class="flex gap-2 rounded-xl border-2 border-ink/15 bg-white p-3 text-sm has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20"><input type="radio" name="swm-cobro" value="peso"${actual === "comision" ? "" : " checked"} class="mt-0.5 accent-[#c4466e]"><span><b>⚖️ Por peso, al final</b><span class="block text-xs text-ink/65">Lo pagas junto con tu envío a casa, según lo que pese la caja.</span></span></label>
    <label class="flex gap-2 rounded-xl border-2 border-ink/15 bg-white p-3 text-sm has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20"><input type="radio" name="swm-cobro" value="comision"${actual === "comision" ? " checked" : ""} class="mt-0.5 accent-[#c4466e]"><span><b>💲 15% de lo que costó, ahora</b><span class="block text-xs text-ink/65">Lo pagas al registrar y al final solo pagas la guía. Conviene si es pesado pero barato.</span><span data-wiz-est class="block text-xs font-semibold text-rose-ink"></span></span></label>
  </fieldset>`;

/* Editar lo registrado (mientras va en camino) o corregirlo cuando Mae lo pide. */
const swmPuedeEditar = (p) => p.origen !== "compra" && !p.datosPendientes
  && (p.status === "registrado" || (p.correccion && p.correccion.estado === "pedida" && p.status === "recibido"));

function swmEditarFormHTML(p) {
  const n = swmNumArchivos(p);
  return `<form data-swm-editar="${escapeHtml(p.id)}" class="mt-3 rounded-xl border border-ink/15 p-3 space-y-3" novalidate>
      ${p.status === "registrado" ? `<div class="grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-xs font-semibold">Tienda<input data-e="tienda" maxlength="80" value="${escapeHtml(p.tienda || "")}" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" /></label>
        ${swmPaqueteriaSelect('data-e="paqueteria"', p.paqueteria || "")}
        <label class="flex flex-col gap-1 text-xs font-semibold">Número de rastreo (guía) *<input data-e="rastreo" maxlength="80" value="${escapeHtml(p.rastreo || "")}" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" /></label>
      </div>` : ""}
      ${swmDeclaracionHTML(p)}
      ${n ? `<label class="flex items-center gap-2 text-xs"><input type="checkbox" data-e="quitar" class="accent-[#c4466e]" /> Quitar mis ${n} archivo${n === 1 ? "" : "s"} anterior${n === 1 ? "" : "es"} (si no, se suman los nuevos)</label>` : ""}
      ${p.crucePagado || (p.pago && p.pago.status !== "pendiente") ? "" : swmCobroElegir(p.cobro)}
      <p data-c-err class="hidden text-xs text-sale"></p>
      <div class="flex gap-2"><button type="submit" class="rounded-full bg-rose-deep px-4 py-2 text-xs font-semibold text-cream">Guardar cambios</button>
      ${p.correccion && p.correccion.estado === "pedida" ? "" : `<button type="button" data-swm-editar-toggle="${escapeHtml(p.id)}" class="rounded-full px-4 py-2 text-xs font-semibold text-ink/70">Cancelar</button>`}</div>
    </form>`;
}

function swmValidarDeclaracion(box) {
  const articulos = [...box.querySelectorAll("[data-decl-row]")].map((r) => ({
    desc: r.querySelector('[data-d="desc"]').value.trim(),
    cant: r.querySelector('[data-d="cant"]').value,
    costo: r.querySelector('[data-d="costo"]').value,
  })).filter((a) => a.desc || parseFloat(a.costo) > 0);
  if (articulos.some((a) => !a.desc || !(parseFloat(a.costo) > 0))) throw new Error("A cada artículo ponle qué es y cuánto costó.");
  const files = [...(box.querySelector("[data-decl-file]").files || [])];
  const queTrae = (box.querySelector("[data-decl-que]") || {}).value?.trim() || "";
  const previos = Number(box.dataset.previos) || 0;
  if (!articulos.length && !files.length && !previos && queTrae.length < 3) throw new Error("Sube capturas de tu compra o escribe qué trae tu paquete (ej. maquillaje y 2 cremas).");
  if (files.length > SWM_MAX_ARCHIVOS) throw new Error(`Puedes subir hasta ${SWM_MAX_ARCHIVOS} capturas o archivos.`);
  const valorTotal = box.querySelector("[data-decl-total]").value;
  const moneda = box.querySelector("[data-decl-moneda]").value;
  if (!(parseFloat(valorTotal) > 0)) throw new Error("Escribe cuánto costó todo (con tax, sin envío).");
  return { articulos, files, valorTotal, moneda, queTrae };
}

async function swmLeerDeclaracion(root) {
  const { articulos, files, valorTotal, moneda, queTrae } = swmValidarDeclaracion(root.querySelector("[data-decl]"));
  const facturas = [];
  let total = 0;
  for (const original of files) {
    const file = await swmShrinkImage(original);
    if (file.size > SWM_MAX_ARCHIVO) throw new Error(`"${original.name}" pesa mucho (máximo 1.5 MB). Si es PDF, mejor sube una captura.`);
    total += file.size;
    if (total > SWM_MAX_TOTAL) throw new Error("Tus archivos juntos pesan mucho (máximo 4 MB). Sube menos o capturas más ligeras.");
    facturas.push({ filename: file.name, contentType: file.type, dataBase64: await swmFileToBase64(file) });
  }
  return { articulos, valorTotal, moneda, facturas, queTrae };
}

const swmAcepta = () => `<label class="flex gap-2 text-sm"><input id="swm-acepta" type="checkbox" class="mt-0.5 accent-[#c4466e]" /><span>Confirmo que no trae <b>nada ilegal</b> ni artículos de cristal (velas, jarrones, etc.), muebles ni pallets.</span></label>`;
const swmFormShell = (title, inner, submit) => `<form data-swm-submit class="rounded-3xl border border-ink/10 p-5 space-y-4" novalidate>
    <div class="flex items-center justify-between"><b class="text-base">${title}</b><button type="button" data-swm-form="" aria-label="Cerrar" class="text-2xl leading-none text-ink/60">&times;</button></div>
    ${inner}
    <p data-swm-err class="hidden rounded-xl bg-sale/10 px-3 py-2 text-sm text-sale" role="alert"></p>
    <button type="submit" class="inline-flex items-center rounded-full bg-rose-deep px-6 py-3 text-sm font-semibold text-cream hover:bg-rose-ink disabled:opacity-60">${submit}</button>
  </form>`;

/* ------------------------- Personal shopper -------------------------
   Dos formas: compras en línea (la clienta arma su carrito y Mae lo compra)
   y compras en vivo en tiendas físicas (cita de $50 USD por videollamada). */
function openPsSection(tab = "", { restore = false } = {}) {
  document.getElementById("search-input").value = "";
  showHomeView("ps", tab ? { ver: "personal-shopper", tipo: tab === "tienda" ? "en-tienda" : "en-linea" } : { ver: "personal-shopper" });
  setPsTab(tab);
  if (!restore) document.getElementById("ps-section").scrollIntoView({ behavior: "auto", block: "start" });
}

/* Link directo al cotizador: alpacca.mx/?ver=cotizador */
function openPsCalc({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  showHomeView("ps", { ver: "cotizador" });
  setPsTab("linea");
  if (!restore) setTimeout(() => document.getElementById("ps-calc").scrollIntoView({ behavior: "auto", block: "start" }), 0);
}

function setPsTab(tab) {
  document.querySelectorAll("#ps-section [data-ps-tab]").forEach((b) => {
    const on = b.dataset.psTab === tab;
    b.setAttribute("aria-selected", String(on));
    b.classList.toggle("border-rose-deep", on);
    b.classList.toggle("bg-blush/30", on);
    b.classList.toggle("border-ink/10", !on);
  });
  document.getElementById("ps-linea").classList.toggle("hidden", tab !== "linea");
  document.getElementById("ps-tienda").classList.toggle("hidden", tab !== "tienda");
  document.getElementById("ps-wa-linea").href = swmCompraWaLink(document.getElementById("ps-tienda-nombre").value.trim());
  psCalcTc();
}

function initPsSection() {
  const sec = document.getElementById("ps-section");
  if (!sec) return;
  initPsCalc();
  document.getElementById("ps-close").addEventListener("click", () => showHomeView("home"));
  sec.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ps-tab]");
    if (!b) return;
    const tab = b.dataset.psTab;
    pushRoute({ ver: "personal-shopper", tipo: tab === "tienda" ? "en-tienda" : "en-linea" });
    setPsTab(tab);
    document.getElementById(`ps-${tab}`).scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  document.getElementById("ps-tienda-nombre").addEventListener("input", (e) => { document.getElementById("ps-wa-linea").href = swmCompraWaLink(e.target.value.trim()); });
  document.getElementById("ps-wa-tienda").href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola Mae 💕 Quiero apartar una cita de compras en vivo en tiendas de EE.UU. ¿Qué días tienes disponibles?")}`;
  // Links "Yo compro por ti" de otras partes de la página (data-ps-open).
  document.addEventListener("click", (e) => {
    const a = e.target.closest("button[data-ps-open]");
    if (!a) return;
    e.preventDefault();
    openPsSection(a.dataset.psOpen);
  });
}

/* Cotizador de Personal shopper: precio de la tienda (USD, sin tax) →
   pesos ya en México. Misma cuenta que la cotización de una compra en el
   admin: (USD + 8.25% de tax) × tipo de cambio, + 15% de comisión y cruce
   (redondeado hacia arriba, como crucePorComision). */
const PS_TAX_PCT = 8.25;
let psLista = [];
let psUltimo = null;

function psCotizar(usd, qty) {
  const tc = (typeof shippingSettings !== "undefined" && shippingSettings.exchangeRate) || 0;
  const conTaxUSD = Math.round(usd * qty * (1 + PS_TAX_PCT / 100) * 100) / 100;
  const pesos = Math.round(usd * qty * (1 + PS_TAX_PCT / 100) * tc * 100) / 100;
  const comision = Math.ceil(pesos * SWM_COMISION_PCT / 100);
  return { tc, conTaxUSD, pesos, comision, total: Math.round((pesos + comision) * 100) / 100 };
}

function psCalcTc() {
  const el = document.getElementById("ps-calc-tc");
  const tc = (typeof shippingSettings !== "undefined" && shippingSettings.exchangeRate) || 0;
  if (el) el.textContent = tc ? `$${tc.toFixed(2)} por dólar` : "—";
}

function psCalcular(e) {
  e.preventDefault();
  const err = document.getElementById("ps-calc-err");
  const out = document.getElementById("ps-calc-out");
  const usd = parseFloat(document.getElementById("ps-calc-usd").value);
  const qty = Math.max(1, parseInt(document.getElementById("ps-calc-qty").value, 10) || 1);
  const nombre = document.getElementById("ps-calc-nombre").value.trim();
  err.classList.add("hidden");
  psCalcTc();
  if (!(usd > 0)) { err.textContent = "Pon el precio del producto en dólares."; err.classList.remove("hidden"); out.classList.add("hidden"); return; }
  const c = psCotizar(usd, qty);
  if (!c.tc) { err.textContent = "Todavía estoy cargando el tipo de cambio, intenta en unos segundos."; err.classList.remove("hidden"); return; }
  psUltimo = { nombre, usd, qty, ...c };
  const fila = (t, v, cls = "") => `<div class="flex justify-between gap-3 ${cls}"><span>${t}</span><span>${v}</span></div>`;
  out.innerHTML = `
    ${fila(`Precio en la tienda${qty > 1 ? ` (${qty} × US$${usd.toFixed(2)})` : ""}`, `US$${(usd * qty).toFixed(2)}`)}
    ${fila(`+ Tax de Texas (${PS_TAX_PCT}%)`, `US$${(c.conTaxUSD - usd * qty).toFixed(2)}`)}
    ${fila(`En pesos (× $${c.tc.toFixed(2)})`, swmMXN(c.pesos))}
    ${fila(`+ Comisión y cruce a México (${SWM_COMISION_PCT}%)`, swmMXN(c.comision))}
    <div class="flex justify-between gap-3 border-t border-ink/10 pt-2 mt-1 text-base font-bold text-rose-ink"><span>Te sale ya en México</span><span>${swmMXN(c.total)}</span></div>
    ${qty > 1 ? `<p class="text-xs text-ink/70 text-right">${swmMXN(c.total / qty)} por pieza</p>` : ""}
    <button type="button" data-ps-calc-add class="mt-2 w-full rounded-full border border-ink px-4 py-2 text-sm font-semibold hover:bg-ink hover:text-cream transition">➕ Agregar a mi lista</button>`;
  out.classList.remove("hidden");
}

function psCalcRenderLista() {
  const box = document.getElementById("ps-calc-lista");
  if (!psLista.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  const total = psLista.reduce((s, x) => s + x.total, 0);
  const txt = `Hola Mae 💕 Quiero cotizar estos productos:\n${psLista.map((x) => `• ${x.nombre || "Producto"} x${x.qty} (US$${x.usd.toFixed(2)} c/u) ≈ ${swmMXN(x.total)}`).join("\n")}\nTotal aprox: ${swmMXN(total)}`;
  box.innerHTML = `<div class="rounded-2xl border border-ink/10 p-4 space-y-2">
    <b class="block text-sm">Mi lista</b>
    <ul class="divide-y divide-ink/10 text-sm">${psLista.map((x, i) => `<li class="flex items-center justify-between gap-3 py-2"><span class="min-w-0">${x.qty} × ${escapeHtml(x.nombre || "Producto")} <span class="text-ink/60">(US$${x.usd.toFixed(2)})</span></span><span class="shrink-0 flex items-center gap-2"><b>${swmMXN(x.total)}</b><button type="button" data-ps-calc-del="${i}" aria-label="Quitar" class="text-ink/50 hover:text-sale text-lg leading-none">×</button></span></li>`).join("")}</ul>
    <div class="flex justify-between border-t border-ink/10 pt-2 text-base font-bold text-rose-ink"><span>Total aprox.</span><span>${swmMXN(total)}</span></div>
    <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener" class="flex justify-center items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">💬 Mandarle mi lista a Mae</a>
  </div>`;
  box.classList.remove("hidden");
}

function initPsCalc() {
  const form = document.getElementById("ps-calc-form");
  if (!form) return;
  psCalcTc();
  form.addEventListener("submit", psCalcular);
  document.getElementById("ps-calc").addEventListener("click", (e) => {
    if (e.target.closest("[data-ps-calc-add]") && psUltimo) {
      psLista.push(psUltimo);
      psUltimo = null;
      document.getElementById("ps-calc-out").classList.add("hidden");
      ["ps-calc-nombre", "ps-calc-usd"].forEach((id) => { document.getElementById(id).value = ""; });
      document.getElementById("ps-calc-qty").value = "1";
      psCalcRenderLista();
      document.getElementById("ps-calc-usd").focus();
      return;
    }
    const del = e.target.closest("[data-ps-calc-del]");
    if (del) { psLista.splice(Number(del.dataset.psCalcDel), 1); psCalcRenderLista(); }
  });
}

function swmCompraWaLink(tienda) {
  const code = swm.casillero ? ` Mi casillero es ${swm.casillero}.` : "";
  const txt = `Hola Mae 💕 Quiero cotizar mi carrito${tienda ? ` de ${tienda}` : ""}.${code} Te mando las capturas:`;
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(txt)}`;
}


/* Dirección para "Pedir mi envío": la principal de "Mis direcciones" o,
   si no tiene, la última que usó (en este teléfono o en su envío anterior). */
function swmUltimaDireccion() {
  const principal = typeof direccionPrincipal === "function" && direccionPrincipal();
  if (principal) return principal;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("alpacca_swm_dir") || "{}"); } catch (err) { saved = {}; }
  if (saved.calle) return saved;
  const last = swm.envios.filter((e) => e.direccion && e.direccion.calle).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  return last ? last.direccion : {};
}

function swmFormHTML() {
  if (swm.form === "paquete") {
    return `<form data-swm-submit class="rounded-3xl border border-ink/10 bg-white p-5 space-y-4 scroll-mt-28" novalidate>
      <div class="flex items-center justify-between"><b class="text-base">📦 Registrar un paquete</b><button type="button" data-swm-form="" aria-label="Cerrar" class="text-2xl leading-none text-ink/60">&times;</button></div>
      <p class="text-xs text-ink/65">Regístralo en cuanto la tienda te dé el número de rastreo.</p>
      ${swmInput("swm-f-rastreo", "Número de rastreo (guía) *", 'maxlength="80" required autocomplete="off" placeholder="Ej. 1Z999AA10123456784"')}
      <p data-swm-paq-detectada class="-mt-2 text-xs text-ink/65"></p>
      ${swmInput("swm-f-tienda", "¿En qué tienda compraste? (opcional)", 'maxlength="80" placeholder="Sephora, Ulta, Amazon..."')}
      ${swmDeclaracionHTML()}
      ${swmCobroElegir()}
      ${swmAcepta()}
      <details class="text-xs"><summary class="cursor-pointer text-ink/60">¿La paquetería no es la correcta? Elígela</summary><div class="mt-2">${swmPaqueteriaSelect('id="swm-f-paqueteria"')}</div></details>
      <p data-swm-err class="hidden rounded-xl bg-sale/10 px-3 py-2 text-sm text-sale" role="alert"></p>
      <button type="submit" class="inline-flex items-center rounded-full bg-rose-deep px-6 py-3 text-sm font-semibold text-cream hover:bg-rose-ink disabled:opacity-60">Registrar paquete ✓</button>
    </form>`;
  }
  if (swm.form === "envio") {
    // El envío a casa se pide cuando el paquete ya cruzó a México.
    const disp = swm.paquetes.filter((p) => p.status === "recibido" && p.enMexicoAt && !p.datosPendientes);
    const faltan = swm.paquetes.filter((p) => p.status === "recibido" && p.datosPendientes);
    if (faltan.length && !disp.length) return `<div class="rounded-2xl bg-sale/[0.06] p-4 text-sm">Primero completa los datos de ${escapeHtml(faltan.map((p) => p.folio).join(", "))} en "Mis paquetes" (llegaron sin registrar). <button type="button" data-swm-form="" class="underline">Cerrar</button></div>`;
    if (!disp.length) return `<div class="rounded-2xl bg-pill p-4 text-sm">Todavía no tienes paquetes en México. Cuando crucen te aviso y aquí podrás pedir tu envío a casa. <button type="button" data-swm-form="" class="underline">Cerrar</button></div>`;
    const saved = swmUltimaDireccion();
    const tieneDir = Boolean(saved.nombre && saved.calle && saved.ciudad && /^\d{5}$/.test(saved.cp || ""));
    const dv = (k, d = "") => escapeHtml(saved[k] || d);
    // Desde "Juntar mis paquetes en México" solo van marcados los que ya cruzaron.
    const enMx = disp.filter((p) => p.enMexicoAt);
    const marcar = (p) => !swm.soloMexico || !!p.enMexicoAt;
    const checks = disp.map((p) => `<label class="flex items-center gap-2 rounded-xl border border-ink/15 p-3 text-sm"><input type="checkbox" data-swm-pick="${escapeHtml(p.id)}"${marcar(p) ? " checked" : ""} class="accent-[#c4466e]"><span><b>${escapeHtml(p.folio)}</b> · ${escapeHtml([p.tienda, p.cobrable && `${p.cobrable} kg`].filter(Boolean).join(" · "))}${p.enMexicoAt ? ' · <span class="font-semibold text-green-800">🇲🇽 En México</span>' : ""}</span></label>`).join("");
    return swmFormShell("🚚 Pedir mi envío a casa", `
      <div class="space-y-2"><p class="text-xs font-semibold">¿Qué paquetes te mando?</p>${checks}</div>
      ${disp.length > 1 ? `<label class="flex gap-2 rounded-xl bg-pill/60 p-3 text-sm"><input id="swm-f-consolidar" type="checkbox"${enMx.length > 1 ? " checked" : ""} class="mt-0.5 accent-[#c4466e]"><span><b>📦 Juntar todo en una sola caja</b><span class="block text-xs text-ink/65">Pagas una sola guía a tu casa en vez de una por paquete. +$100 por cada 12 kg.</span></span></label>` : ""}
      <p class="text-xs font-semibold">¿A dónde te lo mandamos?</p>
      ${tieneDir ? `<div data-swm-dir-resumen class="flex items-start justify-between gap-3 rounded-xl border border-ink/15 px-3 py-2.5 text-sm">
        <span>📍 <b>${dv("nombre")}</b><span class="block text-ink/75">${escapeHtml([saved.calle, saved.colonia].filter(Boolean).join(", "))}</span><span class="block text-ink/75">${escapeHtml([saved.ciudad, saved.estado].filter(Boolean).join(", "))} · CP ${dv("cp")}</span>${saved.telefono ? `<span class="block text-xs text-ink/60">Tel. ${dv("telefono")}</span>` : ""}</span>
        <button type="button" data-swm-cambiar-dir class="shrink-0 text-xs font-semibold text-rose-ink underline">Cambiar</button></div>` : ""}
      <div data-swm-dir-campos class="grid gap-3 sm:grid-cols-2${tieneDir ? " hidden" : ""}">
        ${(typeof misDirecciones !== "undefined" && (misDirecciones || []).length > 1) ? `<div class="sm:col-span-2"><p class="text-xs text-ink/70 mb-1.5">Usar una dirección guardada:</p><div class="flex flex-wrap gap-1.5">${misDirecciones.map((d) => `<button type="button" data-swm-usar-dir="${escapeHtml(d.id)}" class="rounded-full border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink/80">📍 ${escapeHtml(d.alias || d.calle)}</button>`).join("")}</div></div>` : ""}
        ${swmInput("swm-d-nombre", "Nombre de quien recibe", `maxlength="100" value="${dv("nombre", swm.name)}"`)}
        ${swmInput("swm-d-telefono", "Teléfono", `maxlength="30" inputmode="tel" value="${dv("telefono", swm.phone)}"`)}
        ${swmInput("swm-d-calle", "Calle y número", `maxlength="150" value="${dv("calle")}"`)}
        ${swmInput("swm-d-colonia", "Colonia", `maxlength="100" value="${dv("colonia")}"`)}
        ${swmInput("swm-d-ciudad", "Ciudad", `maxlength="80" value="${dv("ciudad")}"`)}
        ${swmInput("swm-d-estado", "Estado", `maxlength="60" value="${dv("estado")}"`)}
        ${swmInput("swm-d-cp", "Código postal", `maxlength="5" inputmode="numeric" value="${dv("cp")}"`)}
        ${swmInput("swm-d-referencias", "Referencias (opcional)", `maxlength="200" value="${dv("referencias")}"`)}
      </div>
      <p class="text-xs text-ink/65">Te mando aquí la cotización: el cruce a México${disp.length > 1 ? ", juntar en una caja (si lo elegiste)" : ""} y la guía a tu casa (Estafeta desde $250). La pagas aquí mismo.</p>`, "Pedir cotización de envío");
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
  const dirs = typeof loadMisDirecciones === "function" ? loadMisDirecciones() : Promise.resolve();
  try {
    const res = await fetch("/.netlify/functions/swm-client", { headers: { Authorization: `Bearer ${getCustomerToken()}` }, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) swm.error = "Tu sesión venció. Vuelve a iniciar sesión.";
    else if (!res.ok) swm.error = data.error || "No se pudo cargar tu casillero.";
    else Object.assign(swm, { lealtad: data.lealtad || null, referido: data.referido || null, premios: data.premios || [], paquetes: data.paquetes || [], compras: data.compras || [], envios: data.envios || [], name: data.name || "", phone: data.phone || "", casillero: data.casillero || "", precios: data.precios || swm.precios, almacenajeDias: data.almacenajeDias || 30, tiposCambio: data.tiposCambio || {}, comisionPct: data.comisionPct || 15, error: "" });
  } catch (err) {
    swm.error = "No se pudo cargar tu casillero. Revisa tu conexión.";
  }
  await dirs;
  swm.loading = false;
  swm.loaded = true;
  if ([...swm.compras, ...swm.envios].some((x) => x.status === "cotizado")) swm.tab = swm.envios.some((x) => x.status === "cotizado") ? "envios" : "compras";
  document.getElementById("swm-rules").open = !swmActiva();
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
    body = { accion: "registrar_paquete", tienda: val("swm-f-tienda"), paqueteria: val("swm-f-paqueteria") || swmDetectarPaqueteria(val("swm-f-rastreo")) || "Otra", rastreo: val("swm-f-rastreo"), cobro, aceptaRestricciones: document.getElementById("swm-acepta").checked };
    if (!body.paqueteria) return fail("Elige con qué paquetería viene tu paquete (UPS, USPS, FedEx, Amazon...).");
    if (!body.rastreo.trim()) return fail("Pon el número de rastreo (guía) de tu paquete: sin él no podemos identificarlo cuando llegue.");
    try { Object.assign(body, await swmLeerDeclaracion(form)); } catch (ex) { return fail(ex.message); }
    if (!body.aceptaRestricciones) return fail("Confirma que tu paquete no trae nada ilegal ni artículos de cristal, muebles ni pallets.");
  } else if (swm.form === "envio") {
    const ids = [...form.querySelectorAll("[data-swm-pick]:checked")].map((c) => c.dataset.swmPick);
    const direccion = Object.fromEntries(["nombre", "telefono", "calle", "colonia", "ciudad", "estado", "cp", "referencias"].map((k) => [k, val(`swm-d-${k}`).trim()]));
    if (!ids.length) return fail("Elige al menos un paquete.");
    if (!direccion.nombre || !direccion.telefono || !direccion.calle || !direccion.ciudad || !/^\d{5}$/.test(direccion.cp)) {
      const campos = form.querySelector("[data-swm-dir-campos]");
      campos.classList.remove("hidden");
      if (form.querySelector("[data-swm-dir-resumen]")) form.querySelector("[data-swm-dir-resumen]").classList.add("hidden");
      return fail("Completa tu dirección: nombre, teléfono, calle y número, ciudad y código postal de 5 dígitos.");
    }
    try { localStorage.setItem("alpacca_swm_dir", JSON.stringify(direccion)); } catch (e) { /* nada */ }
    if (typeof guardarDireccionUsada === "function") guardarDireccionUsada(direccion);
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
    document.getElementById("swm-form-box").innerHTML = `<p class="rounded-2xl bg-[#eef8f2] px-4 py-3 text-sm text-green-800">¡Listo! ${tab === "paquetes" ? (body.cobro === "comision" ? "Registré tu paquete. Paga tu cruce del 15% arriba (en “Tu siguiente paso”) y al final solo pagas la guía." : "Registré tu paquete. Te aviso por correo cuando llegue al almacén.") : "Recibí tu solicitud. Te mando la cotización por correo y aquí mismo."} 💗</p>`;
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

/* Foto del paquete en grande, encima de la página (tocar para cerrar). */
function swmVerFoto(src) {
  const box = document.createElement("div");
  box.className = "fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Foto de tu paquete");
  box.innerHTML = `<img src="${escapeHtml(src)}" alt="Foto de tu paquete" class="max-h-full max-w-full rounded-2xl object-contain"><button type="button" class="absolute top-4 right-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-ink">Cerrar ✕</button>`;
  const cerrar = () => { box.remove(); document.removeEventListener("keydown", esc); };
  const esc = (e) => { if (e.key === "Escape") cerrar(); };
  box.addEventListener("click", cerrar);
  document.addEventListener("keydown", esc);
  document.body.appendChild(box);
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
  best.textContent = cPeso && cCom ? (cPeso <= cCom ? `Te conviene pagar por peso (ahorras ${swmMXN(cCom - cPeso)}).` : `Te conviene pagar el 15% (ahorras ${swmMXN(cPeso - cCom)}).`) : "";
}

function initSwm() {
  const sec = document.getElementById("swm-section");
  if (!sec) return;
  document.getElementById("swm-tarifa").innerHTML = Object.entries(SWM_TARIFA)
    .map(([kg, mxn]) => `<tr class="odd:bg-pill/60"><td class="px-3 py-1.5">${kg} kg</td><td class="px-3 py-1.5 text-right">${swmMXN(mxn).replace(/\.00$/, "")}</td></tr>`)
    .join("");
  ["swm-c-kg", "swm-c-alto", "swm-c-ancho", "swm-c-largo", "swm-c-usd"].forEach((id) => document.getElementById(id).addEventListener("input", updateSwmCalc));
  document.getElementById("swm-c-ejemplo").innerHTML = `Ejemplo: una caja de 2 kg cruza por <b>${swmMXN(SWM_TARIFA[2]).replace(/\.00$/, "")}</b>; si tus compras fueron de US$100, el 15% sale en unos ${swmMXN(Math.ceil(100 * (((typeof shippingSettings !== "undefined" && shippingSettings.exchangeRate) || 19.5)) * SWM_COMISION_PCT / 100)).replace(/\.00$/, "")}.`;
  // Ilustración de la portada: solo se muestra si ya existe el archivo.
  const heroImg = document.getElementById("swm-hero-img");
  if (heroImg) {
    const show = () => { heroImg.classList.remove("hidden"); heroImg.closest(".swm-guest").classList.add("sm:pr-72", "lg:pr-80"); };
    if (heroImg.complete && heroImg.naturalWidth) show(); else heroImg.addEventListener("load", show, { once: true });
  }
  document.getElementById("swm-close").addEventListener("click", () => showHomeView("home"));
  const wa = document.getElementById("swm-wa");
  const waHref = whatsappHref("Hola Mae! Tengo una duda sobre la dirección americana (compras en EE.UU.).");
  if (waHref) { wa.href = waHref; wa.target = "_blank"; wa.rel = "noopener"; }

  const estimado = (e) => {
    if (e.target.closest("[data-decl-total], [data-decl-moneda], input[name='swm-cobro'], [data-c='comision']")) {
      swmActualizarEstimado(e.target.closest("form") || e.target.closest("[data-decl]").parentElement);
    }
  };
  sec.addEventListener("input", estimado);
  // Al escribir el rastreo se ve qué paquetería detectamos.
  sec.addEventListener("input", (e) => {
    if (e.target.id !== "swm-f-rastreo") return;
    const p = swmDetectarPaqueteria(e.target.value);
    const out = sec.querySelector("[data-swm-paq-detectada]");
    if (out) out.textContent = p ? `✓ Paquetería: ${p}` : "";
  });
  sec.addEventListener("change", estimado);
  sec.addEventListener("change", (e) => {
    const input = e.target.closest("[data-decl-file]");
    if (!input) return;
    const n = (input.files || []).length;
    const out = input.closest("[data-decl]").querySelector("[data-decl-files]");
    out.textContent = n > SWM_MAX_ARCHIVOS ? `Elegiste ${n}; el máximo es ${SWM_MAX_ARCHIVOS}.` : n ? `✅ ${n} archivo${n === 1 ? "" : "s"} listo${n === 1 ? "" : "s"}. Se suben al terminar.` : "";
  });
  sec.addEventListener("click", (e) => {
    if (e.target.closest("[data-swm-dirmx-toggle]")) {
      swm.dirMxOpen = !swm.dirMxOpen;
      renderSwmWelcome();
      const box = document.getElementById("swm-welcome");
      if (swm.dirMxOpen && box) box.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const editToggle = e.target.closest("[data-swm-editar-toggle]");
    if (editToggle) {
      swm.editando = swm.editando === editToggle.dataset.swmEditarToggle ? "" : editToggle.dataset.swmEditarToggle;
      renderSwmCasillero();
      const form = document.querySelector(`[data-swm-editar="${CSS.escape(swm.editando)}"]`);
      if (form) { swmActualizarEstimado(form); form.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
      return;
    }
    const addRow = e.target.closest("[data-decl-add]");
    if (addRow) {
      const rows = addRow.closest("[data-decl]").querySelector("[data-decl-rows]");
      if (rows.children.length < 60) rows.insertAdjacentHTML("beforeend", swmDeclRow());
      rows.lastElementChild.querySelector('[data-d="desc"]').focus();
      return;
    }
    const t = e.target;
    if (t.closest("[data-swm-login]")) { openAccountPanelDefault(); return; }
    const verFoto = t.closest("[data-swm-ver-foto]");
    if (verFoto) { swmVerFoto(verFoto.dataset.swmVerFoto); return; }
    if (t.closest("[data-swm-abrir-dir]")) {
      swm.addrOpen = true; renderSwmAddress();
      document.getElementById("swm-address").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const irA = t.closest("[data-swm-ir]");
    if (irA) {
      const [kind, id] = irA.dataset.swmIr.split(":");
      swm.tab = { paquete: "paquetes", compra: "compras", envio: "envios" }[kind];
      swm.abiertas[`${kind}:${id}`] = true;
      renderSwmCasillero();
      const card = document.getElementById(`swm-${kind}-${id}`);
      if (card) { card.classList.add("ring-2", "ring-rose-deep"); card.scrollIntoView({ behavior: "smooth", block: "start" }); }
      return;
    }
    const resumen = t.closest("[data-swm-card] > summary");
    if (resumen) { const card = resumen.parentElement; swm.abiertas[card.dataset.swmCard] = !card.open; return; }
    const usarDir = t.closest("[data-swm-usar-dir]");
    if (usarDir) {
      const d = (misDirecciones || []).find((x) => x.id === usarDir.dataset.swmUsarDir) || {};
      ["nombre", "telefono", "calle", "colonia", "ciudad", "estado", "cp", "referencias"].forEach((k) => { const el = document.getElementById(`swm-d-${k}`); if (el) el.value = d[k] || ""; });
      usarDir.parentElement.querySelectorAll("[data-swm-usar-dir]").forEach((b) => b.classList.toggle("border-rose-deep", b === usarDir));
      return;
    }
    const cambiarDir = t.closest("[data-swm-cambiar-dir]");
    if (cambiarDir) {
      const form = cambiarDir.closest("form");
      form.querySelector("[data-swm-dir-resumen]").classList.add("hidden");
      form.querySelector("[data-swm-dir-campos]").classList.remove("hidden");
      form.querySelector("#swm-d-calle").focus();
      return;
    }
    const copy = t.closest("[data-swm-copy]");
    if (copy && copy.closest("#swm-addr")) {
      try { localStorage.setItem("alpacca_swm_copio", "1"); } catch (err) { /* sin almacenamiento: no pasa nada */ }
      setTimeout(renderSwmWelcome, 0);
    }
    if (copy) {
      const done = () => { const old = copy.textContent; copy.textContent = "¡Copiado!"; setTimeout(() => { copy.textContent = old; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(copy.dataset.swmCopy).then(done, () => {});
      return;
    }
    const f = t.closest("[data-swm-form]");
    if (f) {
      swm.soloMexico = f.hasAttribute("data-swm-solo-mx");
      swm.form = swm.form === f.dataset.swmForm && !swm.soloMexico ? "" : f.dataset.swmForm;
      document.getElementById("swm-form-box").innerHTML = swmFormHTML();
      if (swm.form) document.getElementById("swm-form-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const tab = t.closest("[data-swm-tab]");
    if (tab) {
      swm.tab = tab.dataset.swmTab;
      renderSwmCasillero();
      if (tab.closest("#swm-welcome")) document.querySelector('#swm-casillero [role="tablist"]').scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
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
    const dirmx = e.target.closest("[data-swm-dirmx]");
    if (dirmx) { e.preventDefault(); swmGuardarDirMx(dirmx); return; }
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
    const edit = e.target.closest("[data-swm-editar]");
    if (edit) {
      e.preventDefault();
      const err = edit.querySelector("[data-c-err]");
      const btn = edit.querySelector('button[type="submit"]');
      const radio = edit.querySelector('input[name="swm-cobro"]:checked');
      const cobro = radio ? radio.value : undefined;
      const extra = {};
      const tienda = edit.querySelector('[data-e="tienda"]');
      const rastreo = edit.querySelector('[data-e="rastreo"]');
      if (tienda) extra.tienda = tienda.value.trim();
      const paqueteria = edit.querySelector('[data-e="paqueteria"]');
      if (paqueteria) {
        extra.paqueteria = paqueteria.value;
        if (!extra.paqueteria) { err.textContent = "Elige con qué paquetería viene tu paquete."; err.classList.remove("hidden"); return; }
      }
      if (rastreo) {
        extra.rastreo = rastreo.value.trim();
        if (!extra.rastreo) { err.textContent = "Pon el número de rastreo (guía) de tu paquete."; err.classList.remove("hidden"); return; }
      }
      const quitar = edit.querySelector('[data-e="quitar"]');
      if (quitar && quitar.checked) extra.quitarArchivos = true;
      const p = swm.paquetes.find((x) => x.id === edit.dataset.swmEditar) || {};
      const yaTiene = swmNumArchivos(p) && !extra.quitarArchivos;
      btn.disabled = true;
      // Si ya tiene capturas, no le pedimos volver a escribir ni subir nada.
      const leer = yaTiene
        ? swmLeerDeclaracion(edit, cobro).catch((ex) => {
          if (/^Sube capturas/.test(ex.message)) {
            const box = edit.querySelector("[data-decl]");
            return { articulos: [], valorTotal: box.querySelector("[data-decl-total]").value, moneda: box.querySelector("[data-decl-moneda]").value, facturas: [] };
          }
          throw ex;
        })
        : swmLeerDeclaracion(edit, cobro);
      leer
        .then((dec) => {
          if (!(parseFloat(dec.valorTotal) > 0)) throw new Error("Escribe el valor total de los artículos (con tax, sin envío).");
          return swmPost({ accion: "editar_paquete", id: edit.dataset.swmEditar, cobro, ...extra, ...dec });
        })
        .then(() => { swm.editando = ""; return loadSwm(); }, (ex) => { err.textContent = ex.message; err.classList.remove("hidden"); btn.disabled = false; });
      return;
    }
    const comp = e.target.closest("[data-swm-completar]");
    if (comp) {
      e.preventDefault();
      const err = comp.querySelector("[data-c-err]");
      const btn = comp.querySelector('button[type="submit"]');
      const cobro = (comp.querySelector('input[name="swm-cobro"]:checked') || {}).value || "peso";
      btn.disabled = true;
      swmLeerDeclaracion(comp, cobro)
        .then((dec) => swmPost({ accion: "completar_paquete", id: comp.dataset.swmCompletar, cobro, ...dec }))
        .then(loadSwm, (ex) => { err.textContent = ex.message; err.classList.remove("hidden"); btn.disabled = false; });
    }
  });
}

initSwm();
initPsSection();
