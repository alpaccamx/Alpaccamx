/* ======================================================================
   Shop with Mae (alpacca.mx/?ver=shopwithmae): personal shopper y cruce
   de paquetes de EE.UU. a México. Usa la sesión de la tienda (Mi cuenta)
   y los helpers de app.js (escapeHtml, getCustomerToken, whatsappHref,
   shippingSettings, showHomeView...). Las solicitudes se guardan con la
   función swm-requests y Mae las ve en /admin.html → Encargos USA.
   ====================================================================== */

/* Misma tarifa que netlify/functions/lib/swm-pricing.js -- si cambias
   una, cambia la otra. */
const SWM_TARIFA = { 1: 250, 2: 350, 3: 450, 4: 450, 5: 550, 6: 760, 7: 760, 8: 1000, 9: 1000, 10: 1000, 11: 1000, 12: 1200, 13: 1200, 14: 1400, 15: 2000 };
const SWM_KILO_EXTRA = 120;
const SWM_COMISION_PCT = 15;

/* Dirección americana. El "Last name" es el nombre de la clienta: así
   Mae sabe de quién es cada paquete que llega. */
const SWM_ADDRESS = {
  address1: "648 White Cliffs Drive",
  address2: "Apartment B",
  city: "El Paso",
  state: "Texas",
  zip: "79912-8225",
  phone: "+1 (915) 291-7727",
  firstName: "Maelyn Arias",
};

const SWM_STAGES = [
  ["solicitud", "Solicitud recibida"],
  ["cotizado", "Cotización lista"],
  ["esperando_paquete", "Esperando tu paquete"],
  ["recibido", "Recibido en EE.UU."],
  ["en_camino_mx", "En camino a México"],
  ["enviado", "Enviado"],
  ["entregado", "Entregado"],
];

let swmState = { loaded: false, loading: false, requests: [], name: "", error: "" };

const swmMXN = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

function swmPesoCobrable(kg, alto, ancho, largo) {
  const vol = alto > 0 && ancho > 0 && largo > 0 ? (alto * ancho * largo) / 5000 : 0;
  const p = Math.max(kg || 0, vol);
  return { vol, cobrable: p > 0 ? Math.ceil(p - 1e-9) : 0 };
}
function swmCrucePeso(kg) {
  if (!kg) return 0;
  return kg <= 15 ? SWM_TARIFA[kg] : SWM_TARIFA[15] + (kg - 15) * SWM_KILO_EXTRA;
}

function openSwmSection({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  showHomeView("swm", { ver: "shopwithmae" });
  renderSwm();
  if (!restore) document.getElementById("swm-section").scrollIntoView({ behavior: "auto", block: "start" });
}

/* Se llama desde app.js cuando la clienta inicia o cierra sesión. */
function swmOnAuthChange() {
  swmState = { loaded: false, loading: false, requests: [], name: "", error: "" };
  if (!document.getElementById("swm-section").classList.contains("hidden")) renderSwm();
}

function renderSwm() {
  renderSwmAddress();
  renderSwmForm();
  renderSwmMine();
  if (getCustomerToken() && !swmState.loaded && !swmState.loading) loadSwmRequests();
}

function swmLoginPrompt(text) {
  return `<div class="rounded-2xl bg-blush/25 p-5 text-center">
    <p class="text-sm text-ink/85">${text}</p>
    <button type="button" data-swm-login class="mt-3 inline-flex items-center rounded-full bg-rose-deep px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rose-ink transition">Iniciar sesión o crear cuenta</button>
  </div>`;
}

function renderSwmAddress() {
  const el = document.getElementById("swm-address");
  const h = `<h3 class="font-display text-xl sm:text-2xl text-ink mb-3">🏠 Tu dirección americana</h3>`;
  if (!getCustomerToken()) {
    el.innerHTML = h + swmLoginPrompt("Inicia sesión para ver la dirección en EE.UU. a la que vas a mandar tus compras.");
    return;
  }
  const last = swmState.name || (typeof myAccountCache !== "undefined" && myAccountCache.name) || "Tu nombre";
  const row = (label, value) => `<div class="flex items-center justify-between gap-3 py-2 border-b border-white/30 last:border-0">
      <div class="min-w-0"><span class="block text-[11px] uppercase tracking-wide text-cream/80">${label}</span><b class="block text-base text-cream break-words">${escapeHtml(value)}</b></div>
      <button type="button" data-swm-copy="${escapeHtml(value)}" class="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-cream hover:bg-white/30">Copiar</button>
    </div>`;
  el.innerHTML = `${h}
    <div class="grid gap-4 md:grid-cols-[1fr_0.8fr]">
      <div class="rounded-3xl bg-rose-deep p-5">
        ${row("Address", SWM_ADDRESS.address1)}
        ${row("Address 2", SWM_ADDRESS.address2)}
        ${row("City", SWM_ADDRESS.city)}
        ${row("State", SWM_ADDRESS.state)}
        ${row("ZIP code", SWM_ADDRESS.zip)}
        ${row("Phone", SWM_ADDRESS.phone)}
        ${row("Name (First name)", SWM_ADDRESS.firstName)}
        ${row("Last name", last)}
      </div>
      <div class="rounded-3xl bg-pill p-5 text-sm text-ink/85 space-y-3">
        <p><b>⚠️ Muy importante:</b> pon el pedido a nombre de <b>${escapeHtml(SWM_ADDRESS.firstName)}</b> y en <b>Last name</b> tu nombre (<b>${escapeHtml(last)}</b>). Si no lo haces así, el paquete no podrá ser recibido.</p>
        <p>Pide que la guía <b>no requiera firma</b> al momento de la entrega.</p>
        <p>Cuando hagas tu compra, registra tu paquete aquí abajo con la tienda y el número de rastreo para que sepamos que es tuyo.</p>
      </div>
    </div>`;
}

function swmPaqueteRowHTML() {
  return `<div data-swm-paquete class="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] items-end">
    <label class="flex flex-col gap-1 text-xs">Tienda<input data-f="tienda" type="text" maxlength="80" placeholder="Sephora, Ulta, Amazon..." class="rounded-lg border border-ink/15 px-3 py-2 text-sm" /></label>
    <label class="flex flex-col gap-1 text-xs">Número de rastreo<input data-f="rastreo" type="text" maxlength="80" placeholder="Opcional si aún no lo tienes" class="rounded-lg border border-ink/15 px-3 py-2 text-sm" /></label>
    <label class="flex flex-col gap-1 text-xs">¿Qué trae?<input data-f="contenido" type="text" maxlength="300" placeholder="Ej. 2 cremas, 1 perfume" class="rounded-lg border border-ink/15 px-3 py-2 text-sm" /></label>
    <button type="button" data-swm-del-paquete aria-label="Quitar paquete" class="h-10 w-10 rounded-full text-ink/60 hover:bg-ink/5 text-xl">&times;</button>
  </div>`;
}

function renderSwmForm() {
  const el = document.getElementById("swm-solicitud");
  const h = `<h3 class="font-display text-xl sm:text-2xl text-ink mb-3">✨ Quiero usar el servicio</h3>`;
  if (!getCustomerToken()) {
    el.innerHTML = h + swmLoginPrompt("Inicia sesión con tu cuenta de Alpacca para mandar tu solicitud y darle seguimiento a tus paquetes.");
    return;
  }
  if (el.querySelector("form")) return; // no borrar lo que ya escribió
  const opt = (name, value, title, sub, checked) => `<label class="flex gap-3 rounded-2xl border border-ink/15 p-3 cursor-pointer has-[:checked]:border-rose-deep has-[:checked]:bg-blush/20">
      <input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""} class="mt-1 accent-[#c4466e]" />
      <span><b class="block text-sm">${title}</b><span class="text-xs text-ink/70">${sub}</span></span></label>`;
  el.innerHTML = `${h}
  <form id="swm-form" class="rounded-3xl border border-ink/10 p-5 space-y-5" novalidate>
    <fieldset class="grid gap-2 sm:grid-cols-2"><legend class="text-sm font-semibold mb-2">¿Quién hace la compra?</legend>
      ${opt("tipo", "yo_compro", "Yo compro", "Ya hice o voy a hacer mi compra y la mando a la dirección americana.", true)}
      ${opt("tipo", "compra_mae", "Que Mae compre por mí", "Te paso los links; te cotizo y, cuando pagas, hago la compra.", false)}
    </fieldset>
    <div data-swm-when="yo_compro" class="space-y-2">
      <p class="text-sm font-semibold">Tus paquetes</p>
      <div id="swm-paquetes" class="space-y-3">${swmPaqueteRowHTML()}</div>
      <button type="button" id="swm-add-paquete" class="text-sm font-semibold text-rose-ink underline">+ Agregar otro paquete</button>
      <p class="text-xs text-ink/65">Si son de varias tiendas, regístralos todos aquí. Cada caja cruza por separado (se cobra según su peso).</p>
      <label class="flex gap-2 text-sm mt-2"><input id="swm-consolidar" type="checkbox" class="mt-0.5 accent-[#c4466e]" /> <span><b>Consolidar mis cajas en un solo envío nacional</b> (+$100 MXN por grupo de cajas, siempre que juntas no pasen de 12 kg; si pasan, hay un cargo adicional).</span></label>
    </div>
    <label data-swm-when="compra_mae" class="hidden flex-col gap-1 text-sm font-semibold">Links de los productos (uno por línea, con tono o talla y cantidad)
      <textarea id="swm-links" rows="5" maxlength="4000" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" placeholder="https://www.sephora.com/...  · Tono 2N · 1 pieza"></textarea>
    </label>
    <label class="flex flex-col gap-1 text-sm font-semibold sm:max-w-xs">Valor aproximado de tus productos (USD, con tax)
      <input id="swm-valor" type="number" min="0" step="0.01" inputmode="decimal" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" />
    </label>
    <fieldset class="grid gap-2 sm:grid-cols-2"><legend class="text-sm font-semibold mb-2">¿Cómo quieres pagar el cruce?</legend>
      ${opt("cobro", "peso", "Según el peso o dimensiones", "Pagas el cruce y el envío cuando tu paquete llega a nuestro almacén.", true)}
      ${opt("cobro", "comision", "15% del valor del paquete", "Pagas productos y cruce desde el principio; el envío al final.", false)}
    </fieldset>
    <label class="flex flex-col gap-1 text-sm font-semibold">Notas (opcional)
      <textarea id="swm-notas" rows="2" maxlength="1000" class="rounded-xl border border-ink/15 px-3 py-2 text-sm font-normal" placeholder="Ciudad y código postal de entrega, dudas, etc."></textarea>
    </label>
    <label class="flex gap-2 text-sm"><input id="swm-acepta" type="checkbox" class="mt-0.5 accent-[#c4466e]" /> <span>Confirmo que mi pedido <b>no trae artículos de cristal</b> (velas, jarrones, etc.), muebles ni pallets.</span></label>
    <p id="swm-form-error" class="hidden rounded-xl bg-sale/10 px-3 py-2 text-sm text-sale" role="alert"></p>
    <button type="submit" id="swm-submit" class="inline-flex items-center rounded-full bg-rose-deep px-6 py-3 text-sm font-semibold text-cream hover:bg-rose-ink transition disabled:opacity-60">Mandar solicitud</button>
  </form>`;
}

function renderSwmMine() {
  const el = document.getElementById("swm-mine");
  if (!getCustomerToken()) { el.innerHTML = ""; return; }
  const h = `<h3 class="font-display text-xl sm:text-2xl text-ink mb-3">📦 Mis solicitudes</h3>`;
  if (swmState.loading && !swmState.loaded) { el.innerHTML = h + `<p class="text-sm text-ink/70">Cargando...</p>`; return; }
  if (swmState.error) { el.innerHTML = h + `<p class="text-sm text-sale">${escapeHtml(swmState.error)}</p>`; return; }
  if (!swmState.requests.length) { el.innerHTML = h + `<p class="text-sm text-ink/70">Todavía no tienes solicitudes. Cuando mandes una, aquí verás en qué va.</p>`; return; }
  el.innerHTML = h + `<div class="space-y-4">${swmState.requests.map(swmRequestCardHTML).join("")}</div>`;
}

function swmRequestCardHTML(r) {
  const cancelled = r.stage === "cancelado";
  const idx = SWM_STAGES.findIndex(([k]) => k === r.stage);
  const steps = SWM_STAGES.map(([k, label], i) => {
    const done = !cancelled && i <= idx;
    return `<li class="flex flex-col items-center text-center gap-1 min-w-0">
      <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${done ? "bg-rose-deep text-cream" : "bg-ink/10 text-ink/50"}">${done ? "✓" : i + 1}</span>
      <span class="text-[10px] leading-tight ${i === idx ? "font-bold text-ink" : "text-ink/60"}">${label}</span></li>`;
  }).join("");
  const m = r.montos || {};
  const p = r.pagos || {};
  const line = (k, label) => (m[k] > 0
    ? `<div class="flex justify-between text-sm"><span>${label}</span><span class="tabular-nums">${swmMXN(m[k])} ${p[k] ? '<b class="text-green-700 text-xs">· Pagado</b>' : '<b class="text-rose-ink text-xs">· Por pagar</b>'}</span></div>`
    : "");
  const lines = [line("productos", "Productos"), line("cruce", "Cruce a México"), line("consolidacion", "Consolidación de cajas"), line("envio", "Envío nacional")].join("");
  const due = ["productos", "cruce", "consolidacion", "envio"].reduce((s, k) => s + (m[k] > 0 && !p[k] ? m[k] : 0), 0);
  const tipo = r.tipo === "compra_mae" ? "Mae compra por ti" : "Tú compras";
  const cobro = r.cobro === "comision" ? "Cruce: 15% del valor" : "Cruce: por peso";
  const peso = r.peso && r.peso.cobrable ? `<p class="text-xs text-ink/70 mt-1">Peso cobrado: ${r.peso.cobrable} kg${r.consolidar ? " · Consolidado en un solo envío" : ""}</p>` : (r.consolidar ? `<p class="text-xs text-ink/70 mt-1">Pediste consolidar tus cajas en un solo envío nacional.</p>` : "");
  const guia = r.guia ? `<p class="text-sm mt-2">🚚 Guía${r.paqueteria ? ` ${escapeHtml(r.paqueteria)}` : ""}: <b>${escapeHtml(r.guia)}</b></p>` : "";
  const nota = r.notaClienta ? `<p class="mt-3 rounded-xl bg-blush/25 px-3 py-2 text-sm">💬 ${escapeHtml(r.notaClienta)}</p>` : "";
  const pay = due > 0
    ? `<div class="mt-3 rounded-xl bg-pill p-3 text-sm"><b>Total por pagar: ${swmMXN(due)}</b>
        <p class="text-xs text-ink/70 mt-1">${swmBankText()}</p>
        <a href="${escapeHtml(whatsappHref(`Hola Mae! Te mando mi comprobante de pago de Shop with Mae ${r.folio} (${swmMXN(due)}).`) || "#")}" target="_blank" rel="noopener" class="mt-2 inline-flex rounded-full bg-[#25d366] px-4 py-2 text-xs font-semibold text-white">Mandar comprobante por WhatsApp</a></div>`
    : "";
  const paquetes = (r.paquetes || []).map((x) => `<li>${escapeHtml([x.tienda, x.rastreo && `rastreo ${x.rastreo}`, x.contenido, x.cobrable && `${x.cobrable} kg → cruce ${swmMXN(x.cruce)}`].filter(Boolean).join(" · "))}</li>`).join("");
  return `<article class="rounded-3xl border border-ink/10 p-4 sm:p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <b class="text-base">${escapeHtml(r.folio)}</b>
      <span class="text-xs text-ink/65">${escapeHtml(tipo)} · ${escapeHtml(cobro)} · ${new Date(r.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
    </div>
    ${cancelled ? '<p class="mt-3 text-sm font-semibold text-sale">Solicitud cancelada</p>' : `<ol class="mt-4 grid grid-cols-7 gap-1">${steps}</ol>`}
    ${paquetes ? `<ul class="mt-3 text-xs text-ink/75 list-disc pl-5">${paquetes}</ul>` : ""}
    ${nota}
    ${lines ? `<div class="mt-3 space-y-1">${lines}</div>` : ""}${peso}${guia}${pay}
  </article>`;
}

function swmBankText() {
  const s = typeof shippingSettings !== "undefined" ? shippingSettings : {};
  const parts = [s.bankName && `Banco ${s.bankName}`, s.bankHolder && `a nombre de ${s.bankHolder}`, s.bankClabe && `CLABE ${s.bankClabe}`].filter(Boolean);
  return parts.length ? `Paga por transferencia: ${escapeHtml(parts.join(", "))}. Después mándame tu comprobante.` : "Escríbeme por WhatsApp para darte los datos de pago.";
}

async function loadSwmRequests() {
  swmState.loading = true;
  renderSwmMine();
  try {
    const res = await fetch("/.netlify/functions/swm-requests", { headers: { Authorization: `Bearer ${getCustomerToken()}` }, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { swmState.error = "Tu sesión venció. Vuelve a iniciar sesión."; }
    else if (!res.ok) { swmState.error = data.error || "No se pudieron cargar tus solicitudes."; }
    else { swmState.requests = data.requests || []; swmState.name = data.name || ""; swmState.error = ""; }
  } catch (err) {
    swmState.error = "No se pudieron cargar tus solicitudes. Revisa tu conexión.";
  }
  swmState.loading = false;
  swmState.loaded = true;
  renderSwmAddress();
  renderSwmMine();
}

async function submitSwmForm(e) {
  e.preventDefault();
  const form = e.target;
  const err = document.getElementById("swm-form-error");
  const btn = document.getElementById("swm-submit");
  const tipo = form.querySelector('input[name="tipo"]:checked').value;
  const body = {
    tipo,
    cobro: form.querySelector('input[name="cobro"]:checked').value,
    paquetes: tipo === "yo_compro"
      ? [...form.querySelectorAll("[data-swm-paquete]")].map((row) => ({
          tienda: row.querySelector('[data-f="tienda"]').value,
          rastreo: row.querySelector('[data-f="rastreo"]').value,
          contenido: row.querySelector('[data-f="contenido"]').value,
        }))
      : [],
    links: tipo === "compra_mae" ? document.getElementById("swm-links").value : "",
    valorUSD: document.getElementById("swm-valor").value,
    notas: document.getElementById("swm-notas").value,
    aceptaRestricciones: document.getElementById("swm-acepta").checked,
    consolidar: tipo === "yo_compro" && document.getElementById("swm-consolidar").checked,
  };
  const fail = (msg) => { err.textContent = msg; err.classList.remove("hidden"); };
  err.classList.add("hidden");
  if (tipo === "yo_compro" && !body.paquetes.some((p) => p.tienda.trim() || p.rastreo.trim())) return fail("Agrega al menos un paquete con la tienda o el número de rastreo.");
  if (tipo === "compra_mae" && !body.links.trim()) return fail("Pega los links de los productos que quieres.");
  if (!body.aceptaRestricciones) return fail("Confirma que tu pedido no trae artículos de cristal, muebles ni pallets.");
  btn.disabled = true;
  btn.textContent = "Mandando...";
  try {
    const res = await fetch("/.netlify/functions/swm-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCustomerToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo mandar tu solicitud.");
    swmState.requests = [data.request, ...swmState.requests];
    document.getElementById("swm-solicitud").innerHTML = "";
    renderSwmForm();
    renderSwmMine();
    const first = document.querySelector("#swm-mine article");
    if (first) first.insertAdjacentHTML("afterbegin", `<p class="mb-3 rounded-xl bg-[#eef8f2] px-3 py-2 text-sm text-green-800">¡Listo! Recibí tu solicitud ${escapeHtml(data.request.folio)}. Te aviso por correo cuando la revise. 💗</p>`);
    document.getElementById("swm-mine").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (ex) {
    fail(ex.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Mandar solicitud";
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
    if (e.target.closest("[data-swm-login]")) { openAccountPanelDefault(); return; }
    const copy = e.target.closest("[data-swm-copy]");
    if (copy) {
      const done = () => { const t = copy.textContent; copy.textContent = "¡Copiado!"; setTimeout(() => { copy.textContent = t; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(copy.dataset.swmCopy).then(done, () => {});
      return;
    }
    if (e.target.closest("#swm-add-paquete")) {
      document.getElementById("swm-paquetes").insertAdjacentHTML("beforeend", swmPaqueteRowHTML());
      return;
    }
    const del = e.target.closest("[data-swm-del-paquete]");
    if (del) {
      const rows = document.querySelectorAll("[data-swm-paquete]");
      if (rows.length > 1) del.closest("[data-swm-paquete]").remove();
      else del.closest("[data-swm-paquete]").querySelectorAll("input").forEach((i) => { i.value = ""; });
      return;
    }
    const a = e.target.closest('a[href^="#swm-"]');
    if (a) {
      e.preventDefault();
      document.getElementById(a.getAttribute("href").slice(1)).scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  sec.addEventListener("change", (e) => {
    if (e.target.name === "tipo") {
      sec.querySelectorAll("[data-swm-when]").forEach((x) => {
        const on = x.dataset.swmWhen === e.target.value;
        x.classList.toggle("hidden", !on);
        if (x.tagName === "LABEL") x.classList.toggle("flex", on);
      });
    }
  });
  sec.addEventListener("submit", (e) => { if (e.target.id === "swm-form") submitSwmForm(e); });
}

initSwm();
