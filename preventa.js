/* ======================================================================
   Preventa (alpacca.mx/?ver=preventa), arriba de "Stock en México": Mae
   sube productos (ej. del Sephora Sale) con cupo; la clienta los aparta
   pagando un anticipo (tarjeta con Mercado Pago o transferencia con
   comprobante) y paga el resto + envío cuando llegan. Usa la sesión de la
   tienda y los helpers de app.js (escapeHtml, getCustomerToken,
   shippingSettings, showHomeView, renderStockGrid, openAccountPanelDefault,
   direccionPrincipal, loadMisDirecciones). Backend: preventa.js; Mae lo
   maneja en /admin.html → Stock en México → Preventa.
   ====================================================================== */

const PV_BAG_KEY = "alpacca_preventa_bolsa";
let pv = { loaded: false, loading: false, error: "", config: null, abierta: false, productos: [], apartados: [], bag: pvLeerBolsa(), checkout: false, entrega: "envio", nuevo: "" };

const pvMXN = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

function pvLeerBolsa() {
  try { return JSON.parse(localStorage.getItem(PV_BAG_KEY) || "{}") || {}; } catch (err) { return {}; }
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

async function loadPreventa() {
  pv.loading = true;
  try {
    const token = getCustomerToken();
    const res = await fetch("/.netlify/functions/preventa", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo cargar la preventa.");
    Object.assign(pv, { config: data.config, abierta: !!data.abierta, productos: data.productos || [], apartados: data.apartados || [], error: "" });
    // Lo que ya no existe o se agotó sale de la bolsa.
    const ids = new Map(pv.productos.map((p) => [p.id, p]));
    Object.keys(pv.bag).forEach((id) => { const p = ids.get(id); if (!p || !p.disponibles) delete pv.bag[id]; else pv.bag[id] = Math.min(pv.bag[id], p.disponibles); });
    pvGuardarBolsa();
  } catch (err) {
    pv.error = err.message;
  }
  pv.loading = false;
  pv.loaded = true;
  renderPreventa();
  if (typeof renderMobileMenu === "function" && document.getElementById("mobile-menu-items")) renderMobileMenu();
}

/* Entrada del menú (solo con la preventa abierta). */
function preventaMenuItem() {
  if (!pv.abierta || !pv.config) return null;
  return { type: "link", label: `🛍️ ${pv.config.titulo} · Aparta con ${pv.config.anticipoPct}%`, href: "#preventa-box" };
}

function openPreventa({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  if (typeof renderStockGrid === "function") renderStockGrid(restore);
  showHomeView("stock", { ver: "preventa" });
  renderPreventa();
  if (!restore) setTimeout(() => document.getElementById("preventa-box").scrollIntoView({ behavior: "auto", block: "start" }), 0);
}

/* Se llama desde app.js cuando la clienta inicia o cierra sesión. */
function preventaOnAuthChange() {
  pv.apartados = [];
  loadPreventa();
}

function renderPreventa() {
  const box = document.getElementById("preventa-box");
  if (!box) return;
  if (!pv.loaded) { if (!pv.loading) loadPreventa(); return; }
  const visible = pv.abierta || pv.apartados.length > 0;
  box.classList.toggle("hidden", !visible);
  if (!visible) { box.innerHTML = ""; return; }
  const c = pv.config || {};
  const pct = c.anticipoPct || 50;
  const chips = [
    `💗 Aparta con el ${pct}%`,
    pv.abierta && c.cierre ? `⏰ ${pvCierreTexto(c.cierre)}` : "",
    c.llegada ? `📦 Llega aprox. ${c.llegada}` : "",
    !pv.abierta ? "🔒 La preventa ya cerró" : "",
  ].filter(Boolean).map((t) => `<span class="inline-block rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-rose-ink">${escapeHtml(t)}</span>`).join("");
  const pasos = [
    ["1", "Elige y aparta", `Pagas el ${pct}% con tarjeta o transferencia.`],
    ["2", "Te aviso cuando llegue", "Te escribo por correo y WhatsApp."],
    ["3", "Pagas el resto", "Más el envío, y te lo mando (o te lo entrego en Juárez)."],
  ].map(([n, t, d]) => `<li class="flex gap-3 rounded-2xl bg-white/70 p-3"><span class="shrink-0 w-7 h-7 rounded-full bg-rose-deep text-cream text-sm font-bold flex items-center justify-center">${n}</span><span><b class="block text-sm">${t}</b><span class="block text-xs text-ink/75">${d}</span></span></li>`).join("");
  box.innerHTML = `
    <div class="rounded-3xl bg-gradient-to-br from-blush/60 via-[#fff4f8] to-white p-5 sm:p-7">
      <p class="text-xs font-bold uppercase tracking-wide text-rose-ink">Preventa</p>
      <h2 class="font-display text-2xl sm:text-3xl text-ink mt-1">🛍️ ${escapeHtml(c.titulo || "Preventa")}</h2>
      ${c.descripcion ? `<p class="text-sm text-ink/80 mt-2 max-w-2xl">${escapeHtml(c.descripcion)}</p>` : ""}
      <div class="flex flex-wrap gap-2 mt-3">${chips}</div>
      ${pv.abierta ? `<ol class="grid sm:grid-cols-3 gap-2 mt-4">${pasos}</ol>` : ""}
    </div>
    ${pvBannerHTML()}
    ${pv.error ? `<p class="mt-4 rounded-2xl bg-sale/10 px-4 py-3 text-sm text-sale">${escapeHtml(pv.error)}</p>` : ""}
    ${pv.abierta ? `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-8 mt-6">${pv.productos.map(pvCardHTML).join("") || '<p class="col-span-full text-center text-sm text-ink/70 py-6">Muy pronto subo los productos 💗</p>'}</div>` : ""}
    ${pvBolsaHTML()}
    <div id="pv-checkout">${pv.checkout ? pvCheckoutHTML() : ""}</div>
    ${pvMisApartadosHTML()}
    <hr class="mt-10 border-ink/10">`;
}

/* Al regresar de Mercado Pago (?pago=ok|pendiente|error). */
function pvBannerHTML() {
  const params = new URLSearchParams(location.search);
  if (params.get("ver") !== "preventa") return "";
  const msg = {
    ok: ["bg-[#eef8f2] text-green-800", "¡Gracias! Recibimos tu pago con tarjeta. En unos segundos se marca en tu apartado (y te llega un correo)."],
    pendiente: ["bg-[#fff6e5] text-[#8a5a00]", "Tu pago quedó pendiente en Mercado Pago. En cuanto se acredite se marca solo."],
    error: ["bg-sale/10 text-sale", "El pago con tarjeta no se completó. Puedes intentarlo otra vez o pagar por transferencia."],
  }[params.get("pago")];
  return msg ? `<p class="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${msg[0]}">${msg[1]}</p>` : "";
}

function pvCardHTML(p) {
  const enBolsa = pv.bag[p.id] || 0;
  const agotado = !p.disponibles;
  const img = p.imagen
    ? `<img src="${escapeHtml(p.imagen)}" alt="${escapeHtml(p.nombre)}" loading="lazy" class="w-full h-full object-contain p-3">`
    : '<span class="w-full h-full flex items-center justify-center text-4xl">🛍️</span>';
  const etiqueta = agotado ? '<span class="absolute top-2 left-2 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-white">Agotado</span>'
    : p.disponibles <= 5 ? `<span class="absolute top-2 left-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-rose-ink shadow-sm">Quedan ${p.disponibles}</span>` : "";
  const control = agotado ? '<button type="button" disabled class="mt-2.5 w-full h-9 rounded-full border border-ink/20 text-[13px] font-semibold text-ink/40">Agotado</button>'
    : enBolsa ? `<div class="mt-2.5 flex items-center justify-between gap-2 rounded-full border border-rose-deep bg-blush/20 px-1 h-9">
        <button type="button" data-pv-menos="${escapeHtml(p.id)}" aria-label="Quitar uno" class="w-7 h-7 rounded-full text-lg leading-none text-rose-ink hover:bg-white">−</button>
        <span class="text-[13px] font-bold text-rose-ink">${enBolsa} apartado${enBolsa === 1 ? "" : "s"}</span>
        <button type="button" data-pv-mas="${escapeHtml(p.id)}" aria-label="Agregar uno" ${enBolsa >= p.disponibles ? "disabled" : ""} class="w-7 h-7 rounded-full text-lg leading-none text-rose-ink hover:bg-white disabled:opacity-30">+</button>
      </div>`
      : `<button type="button" data-pv-mas="${escapeHtml(p.id)}" class="tap mt-2.5 w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-full border border-ink text-ink text-[13px] font-semibold hover:bg-ink hover:text-cream transition">💗 Apartar</button>`;
  return `<article class="flex flex-col">
    <div class="relative aspect-square rounded-2xl bg-pill overflow-hidden">${img}${etiqueta}</div>
    ${p.marca ? `<p class="mt-2.5 text-xs font-bold uppercase tracking-wide text-ink">${escapeHtml(p.marca)}</p>` : '<span class="mt-2.5"></span>'}
    <p class="text-sm text-ink/85 leading-snug">${escapeHtml(p.nombre)}</p>
    ${p.descripcion ? `<p class="text-xs text-ink/60 mt-0.5 line-clamp-2">${escapeHtml(p.descripcion)}</p>` : ""}
    <p class="mt-1.5 text-base font-bold text-ink">${pvMXN(p.precio)}${p.precioAntes > p.precio ? ` <s class="text-xs font-normal text-ink/50">${pvMXN(p.precioAntes)}</s>` : ""}</p>
    <p class="text-xs font-semibold text-rose-ink">Aparta con ${pvMXN(pvAnticipoDe(p.precio))}</p>
    <div class="mt-auto">${control}</div>
  </article>`;
}

function pvBolsaItems() {
  const ids = new Map(pv.productos.map((p) => [p.id, p]));
  return Object.entries(pv.bag).map(([id, qty]) => ({ p: ids.get(id), qty })).filter((x) => x.p && x.qty > 0);
}
function pvTotales() {
  const items = pvBolsaItems();
  const piezas = items.reduce((s, x) => s + x.qty, 0);
  const total = Math.round(items.reduce((s, x) => s + x.p.precio * x.qty, 0) * 100) / 100;
  return { items, piezas, total, anticipo: pvAnticipoDe(total) };
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
    <ul class="divide-y divide-ink/10 text-sm">${items.map(({ p, qty }) => `<li class="flex justify-between gap-3 py-2"><span>${qty} × ${escapeHtml(p.marca ? `${p.marca} · ` : "")}${escapeHtml(p.nombre)}</span><b class="shrink-0">${pvMXN(p.precio * qty)}</b></li>`).join("")}</ul>
    <div class="rounded-2xl bg-pill p-3 text-sm space-y-1">
      <div class="flex justify-between"><span>Total de productos</span><b>${pvMXN(total)}</b></div>
      <div class="flex justify-between text-rose-ink"><span>Hoy pagas (${pct}%) para apartar</span><b>${pvMXN(anticipo)}</b></div>
      <div class="flex justify-between text-ink/70"><span>Cuando llegue pagas</span><span>${pvMXN(total - anticipo)}${pv.entrega === "envio" ? " + envío" : ""}</span></div>
    </div>
    <fieldset class="space-y-2"><legend class="text-sm font-semibold mb-1">¿Cómo te lo entrego?</legend>
      ${opt("envio", "📦 Envío a mi domicilio", "El envío lo pagas junto con el resto, cuando llegue.")}
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
    <label class="flex flex-col gap-1 text-xs font-semibold">Nota para Mae (opcional)<textarea data-pv-nota rows="2" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" placeholder="Ej. si se agota, cámbialo por el tono 02"></textarea></label>
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
  const titulo = etapa === "anticipo" ? `Paga tu anticipo: ${pvMXN(total)}` : `Paga el resto: ${pvMXN(total)}${a.envio ? ` (incluye envío ${pvMXN(a.envio)})` : ""}`;
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
      <button type="button" data-pv-pay-mp="${k}" class="w-full rounded-full bg-[#0074C2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#00609F]">💳 Pagar ${pvMXN(total)} en Mercado Pago</button>
      <p class="text-xs text-ink/70">Al terminar regresas aquí y se marca pagado solito.</p>
    </div>
    <div data-pv-pm-box="tr:${k}" class="hidden rounded-xl bg-white p-3 text-sm space-y-2">
      <p><b>1.</b> Transfiere exactamente <b>${pvMXN(total)}</b> ${copiar(Number(total).toFixed(2))}</p>
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
  const filas = [
    ["Total de productos", pvMXN(a.total)],
    [`Anticipo (${a.anticipoPct}%)`, `${pvMXN(a.anticipo.monto)} ${a.anticipo.status === "pagado" ? "✅" : ""}`],
    [a.status === "llego" || a.resto.status === "pagado" ? `Resto${a.envio ? " + envío" : ""}` : "Resto al llegar", `${pvMXN(a.status === "llego" || a.resto.status === "pagado" ? a.resto.monto : restoBase)}${a.entrega === "envio" && !["llego", "liquidado", "enviado", "entregado"].includes(a.status) ? " + envío" : ""} ${a.resto.status === "pagado" ? "✅" : ""}`],
  ];
  return `<article data-pv-ap="${escapeHtml(a.id)}" class="min-w-0 rounded-2xl border ${a.id === pv.nuevo ? "border-rose-deep" : "border-ink/10"} bg-white p-4">
    <div class="flex flex-wrap items-center justify-between gap-2"><b class="text-sm">${escapeHtml(a.folio)} <span class="font-normal text-ink/60">· ${fecha}</span></b>${pvPill(a)}</div>
    <ul class="mt-2 text-sm text-ink/85">${a.items.map((it) => `<li>${it.qty} × ${escapeHtml(it.marca ? `${it.marca} · ` : "")}${escapeHtml(it.nombre)}</li>`).join("")}</ul>
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
  return `<div class="mt-8">
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
  const items = pvBolsaItems().map(({ p, qty }) => ({ id: p.id, qty }));
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
  box.addEventListener("click", async (e) => {
    const t = e.target;
    const mas = t.closest("[data-pv-mas]");
    if (mas) {
      const id = mas.dataset.pvMas;
      const p = pv.productos.find((x) => x.id === id);
      if (p && (pv.bag[id] || 0) < p.disponibles) { pv.bag[id] = (pv.bag[id] || 0) + 1; pvGuardarBolsa(); renderPreventa(); }
      return;
    }
    const menos = t.closest("[data-pv-menos]");
    if (menos) {
      const id = menos.dataset.pvMenos;
      pv.bag[id] = (pv.bag[id] || 0) - 1;
      if (pv.bag[id] <= 0) delete pv.bag[id];
      pvGuardarBolsa();
      renderPreventa();
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
  box.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-pv-entrega]")) {
      pv.entrega = t.value;
      const form = t.closest("form");
      form.querySelector("[data-pv-dir-envio]").classList.toggle("hidden", pv.entrega !== "envio");
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
  loadPreventa();
});
