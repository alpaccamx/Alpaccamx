/* ======================================================================
   Preventa (alpacca.mx/?ver=preventa): Mae sube productos (ej. marcas
   completas de Sephora, con todos sus tonos y tamaños); la clienta elige
   tono, los aparta pagando un anticipo (tarjeta con Mercado Pago o
   transferencia con comprobante) y paga el resto + envío cuando llegan.
   En "Stock en México" sale un aviso que lleva aquí. Usa la sesión de la
   tienda y los helpers de app.js (escapeHtml, getCustomerToken,
   shippingSettings, showHomeView, openAccountPanelDefault,
   direccionPrincipal, loadMisDirecciones, normalizeForSearch). Backend:
   preventa.js; Mae lo maneja en /admin.html → Stock en México → Preventa.
   ====================================================================== */

const PV_BAG_KEY = "alpacca_preventa_bolsa2";
const PV_PAGINA = 40;
let pv = {
  resumen: false, lista: false, cargando: false, error: "", config: null, abierta: false, total: 0,
  productos: [], apartados: [], bag: pvLeerBolsa(), checkout: false, entrega: "envio", nuevo: "",
  grupo: "", q: "", mostrar: PV_PAGINA, detalles: {}, picker: null,
};

const pvMXN = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Math.round(n || 0));
const pvNorm = (t) => (typeof normalizeForSearch === "function" ? normalizeForSearch(t || "") : String(t || "").toLowerCase());

/* Bolsa: { "<producto>|<sku>": { id, sku, qty, nombre, marca, variante, tamano, precio, imagen } } */
function pvLeerBolsa() {
  try {
    const b = JSON.parse(localStorage.getItem(PV_BAG_KEY) || "{}") || {};
    return Object.fromEntries(Object.entries(b).filter(([, v]) => v && typeof v === "object" && v.qty > 0));
  } catch (err) { return {}; }
}
function pvGuardarBolsa() {
  try { localStorage.setItem(PV_BAG_KEY, JSON.stringify(pv.bag)); } catch (err) { /* nada */ }
}

const PV_STATUS = {
  nuevo: ["💳 Paga tu anticipo para apartar", "bg-blush/40 text-rose-ink"],
  apartado: ["✅ Apartado · esperando que llegue", "bg-[#eef8f2] text-green-800"],
  llego: ["📦 ¡Llegó! Paga el resto", "bg-blush/40 text-rose-ink"],
  liquidado: ["✅ Liquidado · preparando tu entrega", "bg-[#eef8f2] text-green-800"],
  enviado: ["🚚 En camino", "bg-lilac/15 text-lilac-ink"],
  entregado: ["🎁 Entregado", "bg-pill text-ink/70"],
  cancelado: ["Cancelado", "bg-pill text-ink/50"],
  vencido: ["⌛ Venció (no se pagó a tiempo)", "bg-pill text-ink/50"],
};
const pvEstado = (a) => (a.vencido ? "vencido" : a.status);
const pvPill = (a) => { const [t, c] = PV_STATUS[pvEstado(a)] || [a.status, "bg-pill"]; return `<span class="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${c}">${t}</span>`; };
const pvAnticipoDe = (total) => Math.ceil(total * ((pv.config && pv.config.anticipoPct) || 50) / 100);
const pvTipoVar = (p) => (/size/i.test(p.variacion || "") ? "tamaño" : "tono");

/* Etapa que le toca pagar (misma regla que el servidor). */
function pvEtapa(a) {
  if (a.status === "nuevo" && !a.vencido && a.anticipo && a.anticipo.status !== "pagado") return "anticipo";
  if (a.status === "llego" && a.resto && a.resto.status !== "pagado" && a.resto.monto > 0) return "resto";
  return null;
}

function pvCierreTexto(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  const fecha = new Date(t).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
  const mins = Math.round((t - Date.now()) / 60000);
  const falta = mins <= 0 ? "" : mins < 60 ? `faltan ${mins} min` : mins < 48 * 60 ? `faltan ${Math.round(mins / 60)} h` : `faltan ${Math.round(mins / 1440)} días`;
  return `Aparta antes del ${fecha}${falta ? ` (${falta})` : ""}`;
}

async function pvGet(qs = "") {
  const token = getCustomerToken();
  const res = await fetch(`/.netlify/functions/preventa${qs}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo cargar la preventa.");
  return data;
}

/* Lo poquito que necesita la tienda en cada visita (menú y aviso en Stock). */
async function loadPreventaResumen() {
  try {
    const d = await pvGet("?resumen=1");
    Object.assign(pv, { config: d.config, abierta: !!d.abierta, total: d.total || 0, apartados: d.apartados || pv.apartados, resumen: true });
  } catch (err) { /* sin preventa no pasa nada */ }
  renderPreventaBanner();
  if (typeof renderMobileMenu === "function" && document.getElementById("mobile-menu-items")) renderMobileMenu();
}

/* Toda la lista (sin tonos) + mis apartados; al abrir la preventa. */
async function loadPreventa() {
  pv.cargando = true;
  renderPreventa();
  try {
    const d = await pvGet();
    Object.assign(pv, { config: d.config, abierta: !!d.abierta, productos: d.productos || [], total: (d.productos || []).length, apartados: d.apartados || [], error: "", lista: true, resumen: true });
    const ids = new Set(pv.productos.filter((p) => !p.agotado).map((p) => p.id));
    Object.keys(pv.bag).forEach((k) => { if (!ids.has(pv.bag[k].id)) delete pv.bag[k]; });
    pvGuardarBolsa();
  } catch (err) {
    pv.error = err.message;
  }
  pv.cargando = false;
  renderPreventa();
  renderPreventaBanner();
}

/* Entrada del menú (solo con la preventa abierta). */
function preventaMenuItem() {
  if (!pv.abierta || !pv.config) return null;
  return { type: "link", label: `🛍️ ${pv.config.titulo} · Aparta con ${pv.config.anticipoPct}%`, href: "#preventa-section" };
}

function openPreventa({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  showHomeView("preventa", { ver: "preventa" });
  if (!pv.lista && !pv.cargando) loadPreventa(); else renderPreventa();
  if (!restore) document.getElementById("preventa-section").scrollIntoView({ behavior: "auto", block: "start" });
}

/* Se llama desde app.js cuando la clienta inicia o cierra sesión. */
function preventaOnAuthChange() {
  pv.apartados = [];
  if (pv.lista) loadPreventa(); else loadPreventaResumen();
}

/* Aviso arriba de "Stock en México". */
function renderPreventaBanner() {
  const el = document.getElementById("preventa-banner");
  if (!el) return;
  const visible = pv.abierta || pv.apartados.length > 0;
  el.classList.toggle("hidden", !visible);
  if (!visible) { el.innerHTML = ""; return; }
  const c = pv.config || {};
  el.innerHTML = `<button type="button" data-pv-abrir class="w-full flex items-center gap-4 rounded-3xl bg-gradient-to-br from-blush/70 via-[#fff4f8] to-white p-4 sm:p-5 text-left hover:shadow-md transition">
    <span class="shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl" aria-hidden="true">🛍️</span>
    <span class="min-w-0 flex-1"><b class="block font-display text-lg sm:text-xl text-ink">${escapeHtml(c.titulo || "Preventa")}</b>
      <span class="block text-sm text-ink/75">${pv.abierta ? `Aparta con el ${c.anticipoPct || 50}%${pv.total ? ` · ${pv.total} productos` : ""}${c.cierre ? ` · ${escapeHtml(pvCierreTexto(c.cierre))}` : ""}` : "Ver mis apartados"}</span></span>
    <span class="shrink-0 rounded-full bg-rose-deep px-4 py-2 text-sm font-semibold text-cream">Ver →</span>
  </button>`;
}

function pvFiltrados() {
  const q = pvNorm(pv.q).trim();
  const palabras = q ? q.split(/\s+/) : [];
  return pv.productos.filter((p) => (!pv.grupo || p.grupo === pv.grupo)
    && (!palabras.length || palabras.every((w) => pvNorm(`${p.marca} ${p.nombre} ${p.grupo}`).includes(w))));
}

function renderPreventa() {
  const box = document.getElementById("preventa-box");
  if (!box) return;
  const c = pv.config || {};
  const pct = c.anticipoPct || 50;
  if (!pv.lista) {
    box.innerHTML = pv.cargando || !pv.error ? '<p class="py-10 text-center text-sm text-ink/70">Cargando la preventa…</p>'
      : `<p class="mt-4 rounded-2xl bg-sale/10 px-4 py-3 text-sm text-sale">${escapeHtml(pv.error)}</p>`;
    return;
  }
  const chips = [
    `💗 Aparta con el ${pct}%`,
    pv.abierta && c.cierre ? `⏰ ${pvCierreTexto(c.cierre)}` : "",
    c.llegada ? `📦 Llega aprox. ${c.llegada}` : "",
    !pv.abierta ? "🔒 La preventa ya cerró" : "",
  ].filter(Boolean).map((t) => `<span class="inline-block rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-rose-ink">${escapeHtml(t)}</span>`).join("");
  const pasos = [
    ["1", "Elige tono y aparta", `Pagas el ${pct}% con tarjeta o transferencia.`],
    ["2", "Te aviso cuando llegue", "Te escribo por correo y WhatsApp."],
    ["3", "Pagas el resto", "Más el envío, y te lo mando (o te lo entrego en Juárez)."],
  ].map(([n, t, d]) => `<li class="flex gap-3 rounded-2xl bg-white/70 p-3"><span class="shrink-0 w-7 h-7 rounded-full bg-rose-deep text-cream text-sm font-bold flex items-center justify-center">${n}</span><span><b class="block text-sm">${t}</b><span class="block text-xs text-ink/75">${d}</span></span></li>`).join("");
  box.innerHTML = `
    <div class="rounded-3xl bg-gradient-to-br from-blush/60 via-[#fff4f8] to-white p-5 sm:p-7">
      <p class="text-xs font-bold uppercase tracking-wide text-rose-ink">Preventa</p>
      <h2 id="preventa-title" class="font-display text-2xl sm:text-3xl text-ink mt-1">🛍️ ${escapeHtml(c.titulo || "Preventa")}</h2>
      ${c.descripcion ? `<p class="text-sm text-ink/80 mt-2 max-w-2xl">${escapeHtml(c.descripcion)}</p>` : ""}
      <div class="flex flex-wrap gap-2 mt-3">${chips}</div>
      ${pv.abierta ? `<ol class="grid sm:grid-cols-3 gap-2 mt-4">${pasos}</ol>` : ""}
    </div>
    ${pvBannerPagoHTML()}
    ${pv.error ? `<p class="mt-4 rounded-2xl bg-sale/10 px-4 py-3 text-sm text-sale">${escapeHtml(pv.error)}</p>` : ""}
    ${pv.abierta ? pvCatalogoHTML() : ""}
    ${pvBolsaHTML()}
    <div id="pv-checkout" class="scroll-mt-28">${pv.checkout ? pvCheckoutHTML() : ""}</div>
    ${pvMisApartadosHTML()}`;
}

function pvCatalogoHTML() {
  const conteo = {};
  pv.productos.forEach((p) => { if (p.grupo) conteo[p.grupo] = (conteo[p.grupo] || 0) + 1; });
  const grupos = Object.keys(conteo);
  const chip = (g, t) => `<button type="button" data-pv-grupo="${escapeHtml(g)}" class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${pv.grupo === g ? "bg-ink text-cream" : "bg-pill text-ink/80 hover:bg-ink/10"}">${escapeHtml(t)}</button>`;
  const lista = pvFiltrados();
  const vis = lista.slice(0, pv.mostrar);
  return `<div class="mt-6 space-y-3">
      ${grupos.length > 1 ? `<div class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">${chip("", `Todo (${pv.productos.length})`)}${grupos.map((g) => chip(g, `${g} (${conteo[g]})`)).join("")}</div>` : ""}
      <input type="search" data-pv-buscar value="${escapeHtml(pv.q)}" placeholder="🔍 Buscar (ej. labial, blush, perfume)" class="w-full rounded-xl border border-ink/15 px-4 py-2.5 text-sm" />
      <p class="text-xs text-ink/60">${lista.length} producto${lista.length === 1 ? "" : "s"}</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-8 mt-4">${vis.map(pvCardHTML).join("") || '<p class="col-span-full text-center text-sm text-ink/70 py-6">No encontré productos con eso.</p>'}</div>
    ${lista.length > vis.length ? `<div class="mt-6 text-center"><button type="button" data-pv-mas-productos class="rounded-full border border-ink px-6 py-2.5 text-sm font-semibold hover:bg-ink hover:text-cream transition">Ver más (${lista.length - vis.length})</button></div>` : ""}`;
}

/* Al regresar de Mercado Pago (?pago=ok|pendiente|error). */
function pvBannerPagoHTML() {
  const params = new URLSearchParams(location.search);
  if (params.get("ver") !== "preventa") return "";
  const msg = {
    ok: ["bg-[#eef8f2] text-green-800", "¡Gracias! Recibimos tu pago con tarjeta. En unos segundos se marca en tu apartado (y te llega un correo)."],
    pendiente: ["bg-[#fff6e5] text-[#8a5a00]", "Tu pago quedó pendiente en Mercado Pago. En cuanto se acredite se marca solo."],
    error: ["bg-sale/10 text-sale", "El pago con tarjeta no se completó. Puedes intentarlo otra vez o pagar por transferencia."],
  }[params.get("pago")];
  return msg ? `<p class="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${msg[0]}">${msg[1]}</p>` : "";
}

const pvEnBolsa = (id) => Object.values(pv.bag).filter((x) => x.id === id).reduce((s, x) => s + x.qty, 0);

function pvCardHTML(p) {
  const enBolsa = pvEnBolsa(p.id);
  const agotado = p.agotado || p.disponibles === 0;
  const img = p.imagen
    ? `<img src="${escapeHtml(p.imagen)}" alt="${escapeHtml(p.nombre)}" loading="lazy" class="w-full h-full object-contain p-3">`
    : '<span class="w-full h-full flex items-center justify-center text-4xl">🛍️</span>';
  const etiqueta = agotado ? '<span class="absolute top-2 left-2 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-white">Agotado</span>'
    : p.disponibles != null && p.disponibles <= 5 ? `<span class="absolute top-2 left-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-rose-ink shadow-sm">Quedan ${p.disponibles}</span>` : "";
  const varios = p.numVariantes > 1;
  const enBolsaTag = enBolsa ? `<span class="absolute top-2 right-2 rounded-full bg-rose-deep px-2.5 py-1 text-[11px] font-bold text-cream">${enBolsa} apartado${enBolsa === 1 ? "" : "s"}</span>` : "";
  const boton = agotado ? '<button type="button" disabled class="mt-2.5 w-full h-9 rounded-full border border-ink/20 text-[13px] font-semibold text-ink/40">Agotado</button>'
    : `<button type="button" data-pv-elegir="${escapeHtml(p.id)}" class="tap mt-2.5 w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-full border border-ink text-ink text-[13px] font-semibold hover:bg-ink hover:text-cream transition">💗 ${varios ? `Elegir ${pvTipoVar(p)}` : "Apartar"}</button>`;
  return `<article class="flex flex-col">
    <button type="button" data-pv-elegir="${escapeHtml(p.id)}" ${agotado ? "disabled" : ""} class="relative aspect-square rounded-2xl bg-pill overflow-hidden" aria-label="Ver ${escapeHtml(p.nombre)}">${img}${etiqueta}${enBolsaTag}</button>
    ${p.marca ? `<p class="mt-2.5 text-xs font-bold uppercase tracking-wide text-ink">${escapeHtml(p.marca)}</p>` : '<span class="mt-2.5"></span>'}
    <p class="text-sm text-ink/85 leading-snug line-clamp-2">${escapeHtml(p.nombre)}</p>
    ${varios ? `<p class="text-xs text-ink/60 mt-0.5">${p.numVariantes} ${pvTipoVar(p) === "tamaño" ? "tamaños" : "tonos"}</p>` : p.descripcion ? `<p class="text-xs text-ink/60 mt-0.5 line-clamp-1">${escapeHtml(p.descripcion)}</p>` : ""}
    <p class="mt-1.5 text-base font-bold text-ink">${p.precioMax > p.precio ? '<span class="text-xs font-normal text-ink/60">Desde </span>' : ""}${pvMXN(p.precio)}${p.precioAntes > p.precio ? ` <s class="text-xs font-normal text-ink/50">${pvMXN(p.precioAntes)}</s>` : ""}</p>
    <p class="text-xs font-semibold text-rose-ink">Aparta con ${pvMXN(pvAnticipoDe(p.precio))}</p>
    <div class="mt-auto">${boton}</div>
  </article>`;
}

/* ---------- Selector de tono / tamaño ---------- */
async function pvAbrirPicker(id) {
  const base = pv.productos.find((p) => p.id === id);
  if (!base) return;
  pv.picker = { id, sku: "", qty: 1, cargando: !pv.detalles[id], error: "" };
  pvRenderPicker();
  if (!pv.detalles[id]) {
    try {
      let prod = (await pvGet(`?producto=${encodeURIComponent(id)}`)).producto;
      // Si llega otro producto (caché vieja), se pide otra vez sin caché.
      if (!prod || prod.id !== id) prod = (await pvGet(`?producto=${encodeURIComponent(id)}&t=${Date.now()}`)).producto;
      if (!prod || prod.id !== id) throw new Error("No se pudieron cargar los tonos. Intenta otra vez.");
      pv.detalles[id] = prod;
    } catch (err) { if (pv.picker) pv.picker.error = err.message; }
    if (!pv.picker || pv.picker.id !== id) return;
    pv.picker.cargando = false;
  }
  const d = pv.detalles[id];
  const libres = d ? (d.variantes || []).filter((v) => !v.agotado) : [];
  if (pv.picker && libres.length === 1) pv.picker.sku = libres[0].id;
  pvRenderPicker();
}

function pvCerrarPicker() {
  pv.picker = null;
  const el = document.getElementById("pv-picker");
  if (el) el.remove();
  document.documentElement.classList.remove("overflow-hidden");
}

function pvRenderPicker() {
  let el = document.getElementById("pv-picker");
  if (!pv.picker) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "pv-picker";
    el.className = "fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    document.body.appendChild(el);
    document.documentElement.classList.add("overflow-hidden");
  }
  const pk = pv.picker;
  const base = pv.productos.find((p) => p.id === pk.id) || {};
  const d = pv.detalles[pk.id];
  const vs = d ? d.variantes || [] : [];
  const sel = vs.find((v) => v.id === pk.sku);
  const tipo = pvTipoVar(base);
  const precio = sel ? sel.precio : base.precio;
  const antes = sel ? sel.precioAntes : base.precioAntes;
  const img = (sel && sel.imagen) || base.imagen;
  const opciones = vs.map((v) => {
    const on = v.id === pk.sku;
    const sw = v.swatch ? `<img src="${escapeHtml(v.swatch)}" alt="" loading="lazy" class="w-9 h-9 rounded-full object-cover border border-ink/10">` : "";
    return `<button type="button" data-pv-sku="${escapeHtml(v.id)}" ${v.agotado ? "disabled" : ""} title="${escapeHtml(`${v.nombre}${v.desc ? ` · ${v.desc}` : ""}`)}"
      class="flex items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-left text-xs transition ${on ? "border-rose-deep bg-blush/30" : "border-ink/10 bg-white hover:border-ink/30"} ${v.agotado ? "opacity-40 line-through" : ""}">
      ${sw}<span class="min-w-0"><b class="block truncate">${escapeHtml(v.nombre || v.tamano || "Único")}</b>${v.tamano && v.nombre ? `<span class="block truncate text-ink/60">${escapeHtml(v.tamano)}</span>` : ""}</span></button>`;
  }).join("");
  const necesita = vs.length > 0 && !sel;
  el.innerHTML = `<div class="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6">
    <button type="button" data-pv-picker-cerrar aria-label="Cerrar" class="absolute top-3 right-3 w-10 h-10 rounded-full text-2xl text-ink/70 hover:bg-ink/5">×</button>
    <div class="flex gap-4">
      <div class="shrink-0 w-28 h-28 sm:w-40 sm:h-40 rounded-2xl bg-pill overflow-hidden">${img ? `<img src="${escapeHtml(img)}" alt="" class="w-full h-full object-contain p-2">` : ""}</div>
      <div class="min-w-0 pr-8">
        ${base.marca ? `<p class="text-xs font-bold uppercase tracking-wide">${escapeHtml(base.marca)}</p>` : ""}
        <p class="text-base font-semibold leading-snug">${escapeHtml(base.nombre || "")}</p>
        ${sel ? `<p class="mt-1 text-sm text-ink/80">${escapeHtml(sel.nombre)}${sel.desc ? ` · <span class="text-ink/60">${escapeHtml(sel.desc)}</span>` : ""}</p>${sel.tamano ? `<p class="text-xs text-ink/60">${escapeHtml(sel.tamano)}</p>` : ""}` : ""}
        <p class="mt-2 text-lg font-bold">${pvMXN(precio)}${antes > precio ? ` <s class="text-xs font-normal text-ink/50">${pvMXN(antes)}</s>` : ""}</p>
        <p class="text-xs font-semibold text-rose-ink">Aparta con ${pvMXN(pvAnticipoDe(precio))}</p>
      </div>
    </div>
    ${pk.cargando ? `<p class="mt-5 text-sm text-ink/70">Cargando ${tipo === "tamaño" ? "tamaños" : "tonos"}…</p>` : ""}
    ${pk.error ? `<p class="mt-5 text-sm text-sale">${escapeHtml(pk.error)}</p>` : ""}
    ${vs.length ? `<p class="mt-5 text-sm font-semibold">${vs.length > 1 ? `Elige ${tipo === "tamaño" ? "el tamaño" : "el tono"} (${vs.length}):` : "Presentación:"}</p>
      <div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">${opciones}</div>` : ""}
    <div class="sticky bottom-0 -mx-5 sm:-mx-6 mt-5 border-t border-ink/10 bg-white px-5 sm:px-6 pt-3 pb-1 flex items-center gap-3">
      <div class="flex items-center rounded-full border border-ink/20 h-11">
        <button type="button" data-pv-picker-qty="-1" aria-label="Menos" class="w-10 h-10 text-lg">−</button>
        <span class="w-6 text-center text-sm font-bold">${pk.qty}</span>
        <button type="button" data-pv-picker-qty="1" aria-label="Más" class="w-10 h-10 text-lg">+</button>
      </div>
      <button type="button" data-pv-picker-agregar ${necesita || pk.cargando ? "disabled" : ""} class="flex-1 h-11 rounded-full bg-rose-deep text-sm font-semibold text-cream hover:bg-rose-ink transition disabled:opacity-40">${necesita ? `Elige ${tipo === "tamaño" ? "un tamaño" : "un tono"}` : `💗 Agregar a mi apartado · ${pvMXN(precio * pk.qty)}`}</button>
    </div>
  </div>`;
}

function pvAgregarDesdePicker() {
  const pk = pv.picker;
  if (!pk) return;
  const base = pv.productos.find((p) => p.id === pk.id);
  const d = pv.detalles[pk.id];
  const v = d && (d.variantes || []).find((x) => x.id === pk.sku);
  if (d && (d.variantes || []).length && !v) return;
  const k = `${pk.id}|${v ? v.id : ""}`;
  const prev = pv.bag[k];
  pv.bag[k] = {
    id: pk.id, sku: v ? v.id : "", qty: (prev ? prev.qty : 0) + pk.qty, nombre: base.nombre, marca: base.marca || "",
    variante: v ? v.nombre : "", tamano: v ? v.tamano : "", precio: v ? v.precio : base.precio, imagen: (v && v.imagen) || base.imagen || "",
    peso: Number(v ? v.peso : base.peso) || 0, vol: Number(v ? v.vol : base.vol) || 0,
  };
  pvGuardarBolsa();
  pvCerrarPicker();
  renderPreventa();
}

/* ---------- Bolsa y apartar ---------- */
function pvTotales() {
  const items = Object.entries(pv.bag).map(([k, x]) => ({ k, ...x }));
  const piezas = items.reduce((s, x) => s + x.qty, 0);
  const total = Math.round(items.reduce((s, x) => s + x.precio * x.qty, 0) * 100) / 100;
  // Igual que el servidor: Estafeta cobra el mayor entre peso real y
  // volumétrico (cm³ × 1.2 de empaque ÷ 5000).
  const real = items.reduce((s, x) => s + (Number(x.peso) || 0) * x.qty, 0);
  const vol = items.reduce((s, x) => s + (Number(x.vol) || 0) * x.qty, 0) * 1.2 / 5000;
  const peso = Math.round(Math.max(real, vol) * 100) / 100;
  return { items, piezas, total, peso, anticipo: pvAnticipoDe(total) };
}

/* Envío estimado con la tabla de Estafeta de la tienda (app.js); solo de
   referencia: se paga al liquidar. */
function pvEnvioTexto(cp) {
  const { peso } = pvTotales();
  if (!/^\d{5}$/.test(cp || "")) return "Pon tu código postal para ver cuánto sale el envío aprox.";
  const costo = typeof nacionalShippingMXN === "function" && peso > 0 ? nacionalShippingMXN(cp, peso) : null;
  return costo != null ? `🚚 Envío estimado a CP ${cp}: <b>${pvMXN(costo)}</b> (${peso.toFixed(2)} kg de envío aprox., contando el tamaño de las cajas). No se paga hoy: se paga al liquidar.`
    : "🚚 El envío te lo confirmo cuando lleguen tus productos; se paga al liquidar.";
}

function pvBolsaHTML() {
  const { piezas, total, anticipo } = pvTotales();
  if (!pv.abierta || !piezas || pv.checkout) return "";
  return `<div class="sticky bottom-3 z-30 mt-6 flex justify-center">
    <button type="button" data-pv-checkout class="flex items-center gap-3 rounded-full bg-rose-deep px-5 py-3 text-sm font-semibold text-cream shadow-lg hover:bg-rose-ink transition">
      <span>💗 Apartar ${piezas} pieza${piezas === 1 ? "" : "s"}</span><span class="rounded-full bg-white/20 px-2.5 py-0.5">Anticipo ${pvMXN(anticipo)} de ${pvMXN(total)}</span>
    </button></div>`;
}

const pvInput = (k, label, value, attrs = "") => `<label class="flex flex-col gap-1 text-xs font-semibold">${label}<input data-pv-dir="${k}" value="${escapeHtml(value || "")}" ${attrs} class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" /></label>`;

function pvCheckoutHTML() {
  if (!getCustomerToken()) {
    return `<div class="mt-6 rounded-2xl bg-blush/25 p-5 text-center">
      <p class="text-sm text-ink/85">Para apartar inicia sesión o crea tu cuenta (así ves tus apartados y te aviso cuando lleguen).</p>
      <button type="button" data-pv-login class="mt-3 inline-flex items-center rounded-full bg-rose-deep px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rose-ink transition">Iniciar sesión o crear cuenta</button>
      <button type="button" data-pv-cerrar class="mt-3 ml-2 text-xs underline text-ink/70">Seguir viendo</button>
    </div>`;
  }
  const { items, total, anticipo } = pvTotales();
  if (!items.length) return "";
  const d = (typeof direccionPrincipal === "function" && direccionPrincipal()) || {};
  const cuenta = typeof myAccountCache !== "undefined" && myAccountCache ? myAccountCache : {};
  const pct = (pv.config && pv.config.anticipoPct) || 50;
  const opt = (v, t, desc) => `<label class="flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 cursor-pointer has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20">
      <input type="radio" name="pv-entrega" value="${v}" ${pv.entrega === v ? "checked" : ""} data-pv-entrega class="accent-[#c4466e] w-5 h-5 shrink-0"><span><b class="block text-sm">${t}</b><span class="block text-xs text-ink/70">${desc}</span></span></label>`;
  return `<form data-pv-form class="mt-6 rounded-3xl border border-ink/10 p-5 space-y-4" novalidate>
    <div class="flex items-center justify-between gap-3"><h3 class="font-display text-lg">Tu apartado</h3><button type="button" data-pv-cerrar class="text-xs underline text-ink/70">Seguir eligiendo</button></div>
    <ul class="divide-y divide-ink/10 text-sm">${items.map((x) => `<li class="flex gap-3 py-2.5">
      ${x.imagen ? `<img src="${escapeHtml(x.imagen)}" alt="" class="w-14 h-14 rounded-lg bg-pill object-contain shrink-0">` : ""}
      <div class="min-w-0 flex-1">
        <span class="block leading-snug">${escapeHtml(x.marca ? `${x.marca} · ` : "")}${escapeHtml(x.nombre)}</span>${x.variante || x.tamano ? `<span class="block text-xs text-ink/60">${escapeHtml([x.variante, x.tamano].filter(Boolean).join(" · "))}</span>` : ""}
        <div class="mt-1.5 flex items-center justify-between gap-3">
          <span class="flex items-center rounded-full border border-ink/15 h-8"><button type="button" data-pv-bolsa="${escapeHtml(x.k)}" data-d="-1" aria-label="Menos" class="w-8 h-8">−</button><span class="w-5 text-center text-xs font-bold">${x.qty}</span><button type="button" data-pv-bolsa="${escapeHtml(x.k)}" data-d="1" aria-label="Más" class="w-8 h-8">+</button></span>
          <b>${pvMXN(x.precio * x.qty)}</b>
        </div>
      </div></li>`).join("")}</ul>
    <div class="rounded-2xl bg-pill p-3 text-sm space-y-1">
      <div class="flex justify-between"><span>Total de productos</span><b>${pvMXN(total)}</b></div>
      <div class="flex justify-between text-rose-ink"><span>Hoy pagas (${pct}%) para apartar</span><b>${pvMXN(anticipo)}</b></div>
      <div class="flex justify-between text-ink/70"><span>Cuando llegue pagas</span><span>${pvMXN(total - anticipo)}${pv.entrega === "envio" ? " + envío" : ""}</span></div>
      <p data-pv-envio-est class="text-xs text-ink/70 pt-1 ${pv.entrega === "envio" ? "" : "hidden"}">${pvEnvioTexto(d.cp)}</p>
    </div>
    <fieldset class="space-y-2"><legend class="text-sm font-semibold mb-1">¿Cómo te lo entrego?</legend>
      ${opt("envio", "📦 Envío a mi domicilio", "El envío depende del peso y lo pagas al liquidar, junto con el resto.")}
      ${opt("personal", "📍 Entrega personal en Ciudad Juárez", "Sin costo de envío.")}
    </fieldset>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      ${pvInput("nombre", "Nombre de quien recibe *", d.nombre || cuenta.name)}
      ${pvInput("telefono", "Teléfono (10 dígitos) *", d.telefono || cuenta.phone, 'inputmode="tel"')}
      <div data-pv-dir-envio class="contents ${pv.entrega === "envio" ? "" : "hidden"}">
        ${pvInput("calle", "Calle y número *", d.calle)}
        ${pvInput("colonia", "Colonia", d.colonia)}
        ${pvInput("ciudad", "Ciudad *", d.ciudad)}
        ${pvInput("estado", "Estado", d.estado)}
        ${pvInput("cp", "Código postal *", d.cp, 'inputmode="numeric" maxlength="5"')}
        ${pvInput("referencias", "Referencias", d.referencias)}
      </div>
    </div>
    <label class="flex flex-col gap-1 text-xs font-semibold">Nota para Mae (opcional)<textarea data-pv-nota rows="2" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" placeholder="Ej. si se agota mi tono, cámbialo por el más parecido"></textarea></label>
    <p data-pv-err class="hidden text-sm text-sale"></p>
    <button type="submit" class="w-full rounded-full bg-rose-deep px-5 py-3 text-sm font-semibold text-cream hover:bg-rose-ink transition">💗 Apartar y pagar anticipo de ${pvMXN(anticipo)}</button>
    <p class="text-xs text-ink/70 text-center">Tienes ${(pv.config && pv.config.horasParaPagar) || 24} horas para pagar el anticipo; si no, se libera el lugar.</p>
  </form>`;
}

function pvPagoHTML(a) {
  const etapa = pvEtapa(a);
  if (!etapa) return "";
  const p = a[etapa];
  const total = p.monto;
  const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
  const titulo = etapa === "anticipo" ? `Paga tu anticipo: ${fmt(total)}` : `Paga el resto: ${fmt(total)}${a.envio ? ` (incluye envío ${fmt(a.envio)})` : ""}`;
  if (p.status === "revision") {
    return `<div class="mt-3 rounded-xl bg-[#fff6e5] p-3 text-sm"><b>🔎 Estamos revisando tu comprobante</b><p class="text-xs mt-1">Te avisamos por correo en cuanto se confirme.</p></div>`;
  }
  const s = typeof shippingSettings !== "undefined" ? shippingSettings : {};
  const copiar = (v) => `<button type="button" data-pv-copy="${escapeHtml(v)}" class="ml-1 text-xs underline">Copiar</button>`;
  const bank = [s.bankName && `<div>Banco: <b>${escapeHtml(s.bankName)}</b></div>`, s.bankHolder && `<div>Titular: <b>${escapeHtml(s.bankHolder)}</b></div>`,
    s.bankClabe && `<div>CLABE: <b>${escapeHtml(s.bankClabe)}</b> ${copiar(s.bankClabe)}</div>`,
    s.bankAccount && `<div>Cuenta: <b>${escapeHtml(s.bankAccount)}</b> ${copiar(s.bankAccount)}</div>`].filter(Boolean).join("");
  const k = escapeHtml(a.id);
  const opt = (v, t, d) => `<label class="flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 cursor-pointer has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20">
      <input type="radio" name="pv-pm-${k}" value="${v}" data-pv-pm="${k}" class="accent-[#c4466e] w-5 h-5 shrink-0"><span><b class="block text-sm">${t}</b><span class="block text-xs text-ink/70">${d}</span></span></label>`;
  return `<div class="mt-3 rounded-xl bg-pill p-3 space-y-2">
    <b class="block text-sm">${titulo}</b>
    ${p.rechazo ? `<p class="text-xs text-sale">${escapeHtml(p.rechazo)}</p>` : ""}
    <p class="text-xs font-semibold text-ink/80">¿Cómo quieres pagar?</p>
    ${opt("tr", "🏦 Transferencia o depósito", "Subes la captura de tu transferencia")}
    ${opt("mp", "💳 Tarjeta (Mercado Pago)", "Pagas en línea, sin subir comprobante")}
    <div data-pv-pm-box="mp:${k}" class="hidden rounded-xl bg-white p-3 space-y-2">
      <button type="button" data-pv-pay-mp="${k}" class="w-full rounded-full bg-[#0074C2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#00609F]">💳 Pagar ${fmt(total)} en Mercado Pago</button>
      <p class="text-xs text-ink/70">Al terminar regresas aquí y se marca pagado solito.</p>
    </div>
    <div data-pv-pm-box="tr:${k}" class="hidden rounded-xl bg-white p-3 text-sm space-y-2">
      <p><b>1.</b> Transfiere exactamente <b>${fmt(total)}</b> ${copiar(Number(total).toFixed(2))}</p>
      <div class="rounded-lg bg-pill/60 px-3 py-2 space-y-0.5">${bank || '<p class="text-xs text-ink/70">Cargando datos bancarios...</p>'}<div>Concepto: <b>${escapeHtml(a.folio)}</b></div></div>
      <label class="flex flex-col gap-1"><span><b>2.</b> Sube la captura de tu transferencia (foto o PDF)</span>
        <input type="file" accept="image/*,application/pdf" data-pv-proof="${k}" class="text-xs font-normal" /></label>
      <p data-pv-proof-msg="${k}" class="text-xs"></p>
    </div>
  </div>`;
}

function pvApartadoHTML(a) {
  const fecha = new Date(a.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const restoBase = Math.round((a.total - a.anticipo.monto) * 100) / 100;
  const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
  const filas = [
    ["Total de productos", fmt(a.total)],
    [`Anticipo (${a.anticipoPct}%)`, `${fmt(a.anticipo.monto)} ${a.anticipo.status === "pagado" ? "✅" : ""}`],
    [a.status === "llego" || a.resto.status === "pagado" ? `Resto${a.envio ? " + envío" : ""}` : "Resto al llegar", `${fmt(a.status === "llego" || a.resto.status === "pagado" ? a.resto.monto : restoBase)}${a.entrega === "envio" && !["llego", "liquidado", "enviado", "entregado"].includes(a.status) ? " + envío" : ""} ${a.resto.status === "pagado" ? "✅" : ""}`],
  ];
  return `<article data-pv-ap="${escapeHtml(a.id)}" class="min-w-0 rounded-2xl border ${a.id === pv.nuevo ? "border-rose-deep" : "border-ink/10"} bg-white p-4">
    <div class="flex flex-wrap items-center justify-between gap-2"><b class="text-sm">${escapeHtml(a.folio)} <span class="font-normal text-ink/60">· ${fecha}</span></b>${pvPill(a)}</div>
    <ul class="mt-2 text-sm text-ink/85 space-y-0.5">${a.items.map((it) => `<li>${it.qty} × ${escapeHtml(it.marca ? `${it.marca} · ` : "")}${escapeHtml(it.nombre)}${it.variante || it.tamano ? ` <span class="text-ink/60">(${escapeHtml([it.variante, it.tamano].filter(Boolean).join(" · "))})</span>` : ""}</li>`).join("")}</ul>
    <div class="mt-2 text-xs text-ink/75 space-y-0.5">${filas.map(([t, v]) => `<div class="flex justify-between gap-3"><span>${t}</span><span class="font-semibold text-ink">${v}</span></div>`).join("")}</div>
    ${a.entrega === "personal" ? '<p class="mt-2 text-xs text-ink/70">📍 Entrega personal en Ciudad Juárez</p>' : ""}
    ${a.status === "enviado" && a.guia ? `<p class="mt-2 text-sm">🚚 ${escapeHtml(a.paqueteria || "")} · Guía <b>${escapeHtml(a.guia)}</b></p>` : ""}
    ${pvPagoHTML(a)}
    ${a.status === "nuevo" && !a.vencido && !["pagado", "revision"].includes(a.anticipo.status) ? `<button type="button" data-pv-cancelar="${escapeHtml(a.id)}" class="mt-2 text-xs underline text-ink/60">Cancelar este apartado</button>` : ""}
  </article>`;
}

function pvMisApartadosHTML() {
  if (!getCustomerToken()) return pv.abierta ? '<p class="mt-6 text-xs text-ink/70 text-center">¿Ya apartaste? <button type="button" data-pv-login class="underline font-semibold">Inicia sesión</button> para ver tus apartados.</p>' : "";
  if (!pv.apartados.length) return "";
  const activos = pv.apartados.filter((a) => !["cancelado", "entregado"].includes(a.status) && !a.vencido);
  const otros = pv.apartados.filter((a) => !activos.includes(a));
  return `<div id="pv-mis" class="mt-10 scroll-mt-28">
    <h3 class="font-display text-lg mb-3">Mis apartados</h3>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">${activos.map(pvApartadoHTML).join("")}</div>
    ${otros.length ? `<details class="mt-3"><summary class="cursor-pointer text-xs text-ink/70">Ver anteriores (${otros.length})</summary><div class="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">${otros.map(pvApartadoHTML).join("")}</div></details>` : ""}
  </div>`;
}

async function pvPost(body) {
  const res = await fetch("/.netlify/functions/preventa", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCustomerToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Algo falló. Intenta de nuevo.");
  return data;
}

async function pvApartar(form) {
  const err = form.querySelector("[data-pv-err]");
  const btn = form.querySelector('button[type="submit"]');
  const fail = (m) => { err.textContent = m; err.classList.remove("hidden"); };
  err.classList.add("hidden");
  const direccion = Object.fromEntries([...form.querySelectorAll("[data-pv-dir]")].map((i) => [i.dataset.pvDir, i.value.trim()]));
  if (!direccion.nombre || direccion.telefono.replace(/\D/g, "").length < 10) return fail("Pon tu nombre y un teléfono de 10 dígitos.");
  if (pv.entrega === "envio" && (!direccion.calle || !direccion.ciudad || !/^\d{5}$/.test(direccion.cp))) return fail("Completa tu dirección: calle y número, ciudad y código postal de 5 dígitos.");
  const items = Object.values(pv.bag).map((x) => ({ id: x.id, sku: x.sku, qty: x.qty }));
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "Apartando...";
  try {
    const data = await pvPost({ accion: "apartar", items, entrega: pv.entrega, direccion, nota: form.querySelector("[data-pv-nota]").value });
    if (pv.entrega === "envio" && typeof guardarDireccionUsada === "function") guardarDireccionUsada(direccion);
    pv.bag = {};
    pvGuardarBolsa();
    pv.checkout = false;
    pv.nuevo = data.apartado.id;
    await loadPreventa();
    const card = document.querySelector(`[data-pv-ap="${CSS.escape(pv.nuevo)}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (ex) {
    fail(ex.message);
    btn.disabled = false;
    btn.textContent = label;
  }
}

function pvFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function pvSubirComprobante(id, input) {
  const msg = document.querySelector(`[data-pv-proof-msg="${CSS.escape(id)}"]`);
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { msg.textContent = "El archivo debe pesar menos de 5 MB."; msg.className = "text-xs text-sale"; return; }
  msg.textContent = "Subiendo...";
  msg.className = "text-xs text-ink/70";
  try {
    await pvPost({ accion: "pagar", id, metodo: "transferencia" });
    await pvPost({ accion: "comprobante", id, filename: file.name, contentType: file.type, dataBase64: await pvFileToBase64(file) });
    await loadPreventa();
  } catch (ex) {
    msg.textContent = ex.message;
    msg.className = "text-xs text-sale";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("preventa-box");
  if (!box) return;
  const banner = document.getElementById("preventa-banner");
  if (banner) banner.addEventListener("click", (e) => { if (e.target.closest("[data-pv-abrir]")) openPreventa(); });

  // Selector de tono (va pegado al body).
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t.closest("#pv-picker")) return;
    if (t.id === "pv-picker" || t.closest("[data-pv-picker-cerrar]")) { pvCerrarPicker(); return; }
    const sku = t.closest("[data-pv-sku]");
    if (sku && pv.picker) { pv.picker.sku = sku.dataset.pvSku; pvRenderPicker(); return; }
    const q = t.closest("[data-pv-picker-qty]");
    if (q && pv.picker) { pv.picker.qty = Math.max(1, Math.min(20, pv.picker.qty + Number(q.dataset.pvPickerQty))); pvRenderPicker(); return; }
    if (t.closest("[data-pv-picker-agregar]")) pvAgregarDesdePicker();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pv.picker) pvCerrarPicker(); });

  box.addEventListener("click", async (e) => {
    const t = e.target;
    const elegir = t.closest("[data-pv-elegir]");
    if (elegir) { pvAbrirPicker(elegir.dataset.pvElegir); return; }
    const grupo = t.closest("[data-pv-grupo]");
    if (grupo) { pv.grupo = grupo.dataset.pvGrupo; pv.mostrar = PV_PAGINA; renderPreventa(); return; }
    if (t.closest("[data-pv-mas-productos]")) { pv.mostrar += PV_PAGINA; renderPreventa(); return; }
    const bolsa = t.closest("[data-pv-bolsa]");
    if (bolsa) {
      const k = bolsa.dataset.pvBolsa;
      if (pv.bag[k]) {
        pv.bag[k].qty += Number(bolsa.dataset.d);
        if (pv.bag[k].qty <= 0) delete pv.bag[k];
        pvGuardarBolsa();
        if (!Object.keys(pv.bag).length) pv.checkout = false;
        renderPreventa();
      }
      return;
    }
    if (t.closest("[data-pv-checkout]")) {
      pv.checkout = true;
      if (getCustomerToken() && typeof loadMisDirecciones === "function") await loadMisDirecciones();
      renderPreventa();
      document.getElementById("pv-checkout").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (t.closest("[data-pv-cerrar]")) { pv.checkout = false; renderPreventa(); return; }
    if (t.closest("[data-pv-login]")) { openAccountPanelDefault(); return; }
    const copy = t.closest("[data-pv-copy]");
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.pvCopy); copy.textContent = "¡Copiado!"; } catch (err) { /* nada */ }
      return;
    }
    const mp = t.closest("[data-pv-pay-mp]");
    if (mp) {
      mp.disabled = true;
      mp.textContent = "Abriendo Mercado Pago...";
      try {
        const data = await pvPost({ accion: "pagar", id: mp.dataset.pvPayMp, metodo: "mercadopago" });
        if (data.redirectUrl) location.href = data.redirectUrl;
      } catch (ex) {
        mp.disabled = false;
        mp.textContent = "💳 Pagar en Mercado Pago";
        alert(ex.message);
      }
      return;
    }
    const cancelar = t.closest("[data-pv-cancelar]");
    if (cancelar) {
      if (!confirm("¿Cancelar este apartado? Se libera el lugar para otra clienta.")) return;
      try { await pvPost({ accion: "cancelar", id: cancelar.dataset.pvCancelar }); await loadPreventa(); } catch (ex) { alert(ex.message); }
    }
  });
  let buscarTimer = null;
  box.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches('[data-pv-dir="cp"]')) {
      const est = box.querySelector("[data-pv-envio-est]");
      if (est) est.innerHTML = pvEnvioTexto(t.value.trim());
      return;
    }
    if (!t.matches("[data-pv-buscar]")) return;
    clearTimeout(buscarTimer);
    buscarTimer = setTimeout(() => {
      pv.q = t.value;
      pv.mostrar = PV_PAGINA;
      const pos = t.selectionStart;
      renderPreventa();
      const nuevo = box.querySelector("[data-pv-buscar]");
      if (nuevo) { nuevo.focus(); try { nuevo.setSelectionRange(pos, pos); } catch (err) { /* nada */ } }
    }, 250);
  });
  box.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-pv-entrega]")) {
      pv.entrega = t.value;
      const form = t.closest("form");
      form.querySelector("[data-pv-dir-envio]").classList.toggle("hidden", pv.entrega !== "envio");
      form.querySelector("[data-pv-envio-est]").classList.toggle("hidden", pv.entrega !== "envio");
      return;
    }
    if (t.matches("[data-pv-pm]")) {
      const k = t.dataset.pvPm;
      box.querySelectorAll(`[data-pv-pm-box$=":${CSS.escape(k)}"]`).forEach((el) => el.classList.toggle("hidden", el.dataset.pvPmBox !== `${t.value}:${k}`));
      return;
    }
    if (t.matches("[data-pv-proof]")) pvSubirComprobante(t.dataset.pvProof, t);
  });
  box.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-pv-form]");
    if (!form) return;
    e.preventDefault();
    pvApartar(form);
  });
  if (new URLSearchParams(location.search).get("ver") !== "preventa") loadPreventaResumen();
});
