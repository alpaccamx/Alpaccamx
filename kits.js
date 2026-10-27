/* Kits Emprende (alpacca.mx/kits): kits armados de skincare y de
   maquillaje para revender, en tres presupuestos. Los productos de cada
   kit están en assets/data/kits.json (SKU y piezas); precios, fotos y
   disponibilidad salen del catálogo en vivo, y el envío de la misma tabla
   que el carrito. Cada kit muestra cuánto le sale cada pieza con envío y
   en cuánto revenderla (calcReventa en app.js), y se agrega completo al
   carrito con un botón. */

let kitsData = null;
let kitsTab = "skincare";

function openKitsSection(tab = "", { restore = false } = {}) {
  if (tab) kitsTab = tab;
  document.getElementById("search-input").value = "";
  showHomeView("kits", { ver: "kits", tipo: kitsTab });
  renderKits();
  if (!restore) document.getElementById("kits-section").scrollIntoView({ behavior: "auto", block: "start" });
}

async function loadKitsData() {
  if (kitsData) return kitsData;
  try {
    const res = await fetch("./assets/data/kits.json");
    kitsData = res.ok ? await res.json() : { kits: [] };
  } catch (err) {
    kitsData = { kits: [] };
  }
  return kitsData;
}

/* Líneas del kit con el producto del catálogo; las que ya no existen o
   no están disponibles se marcan para avisar. */
function kitLines(kit) {
  return kit.items.map(([sku, qty], i) => {
    const elegido = kitSel[`${kit.id}:${i}`] || sku;
    return { sku: elegido, qty, idx: i, base: sku, product: products.find((p) => p.id === elegido) || null };
  });
}

/* Tono elegido por línea de kit ("kit:índice" -> SKU). Si no hay, va el
   de assets/data/kits.json, que es el más popular. */
const kitSel = {};

const tonoDe = (p) => {
  const m = /\(([^)]*)\)$/.exec(p.nombre || "");
  return m ? m[1] : p.nombre;
};

/* Los otros tonos/versiones del mismo producto (misma marca, nombre y
   presentación), disponibles. Igual que claveAmazon en app.js. */
function kitTonos(sku) {
  const base = products.find((p) => p.id === sku);
  if (!base) return [];
  const clave = claveAmazon(base);
  return products.filter((p) => p.disponible && claveAmazon(p) === clave && (p.presentacion || "") === (base.presentacion || ""));
}

function kitTotals(kit) {
  const lines = kitLines(kit).filter((l) => l.product && l.product.disponible);
  const items = lines.map((l) => [l.sku, { product: l.product, qty: l.qty }]);
  const kg = items.reduce((t, [, it]) => t + (it.product.peso || 0) * it.qty, 0);
  const korea = koreaParcelWeights(items.map(([, it]) => ({ peso: it.product.peso, qty: it.qty, presentacion: it.product.presentacion })));
  const base = shippingEstimate(kg, "", korea);
  const coreaMXN = base ? base.coreaMXN : 0;
  const nacionalMXN = nacionalMaxMXN(kg);
  const s = { coreaMXN, nacionalMXN, hasNacional: nacionalMXN > 0 };
  const r = calcReventa(items, s);
  const productos = items.reduce((t, [, it]) => t + it.product.precio * it.qty, 0);
  return { lines, faltan: kit.items.length - lines.length, productos, envio: coreaMXN + nacionalMXN, total: productos + coreaMXN + nacionalMXN, reventa: r, piezas: lines.reduce((t, l) => t + l.qty, 0) };
}

function kitCardHTML(kit) {
  const t = kitTotals(kit);
  const ganancia = t.reventa.ventaTotal - t.total;
  const pct = t.total > 0 ? Math.round((ganancia / t.total) * 100) : 0;
  const tipoTxt = kit.tipo === "skincare" ? "Skincare coreano" : "Maquillaje coreano";
  const precioTxt = kit.envioIncluido
    ? `<p class="text-3xl sm:text-4xl font-extrabold text-rose-deep tabular-nums">${formatPrice(t.total)}</p><p class="text-xs font-semibold text-green-800">✅ Envío a todo México incluido</p>`
    : `<p class="text-3xl sm:text-4xl font-extrabold text-rose-deep tabular-nums">${formatPrice(t.productos)}</p><p class="text-xs text-ink/70">+ envío a todo México: ${formatPrice(t.envio)}</p>`;
  const productosHTML = t.lines
    .map((l) => {
      const p = l.product;
      const r = t.reventa.lineas[l.sku] || {};
      const img = p.imagen || placeholderImg(p.categoria || "Alpacca", "#e9c3be");
      const tonos = kitTonos(l.base);
      const selector = tonos.length > 1
        ? `<label class="mt-2 block text-xs text-ink/70">Tono / versión <span class="text-ink/50">(⭐ el más popular)</span>
            <select data-kit-tono="${escapeAttr(kit.id)}:${l.idx}" class="mt-0.5 w-full rounded-lg border border-ink/20 bg-white px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lilac">
              ${tonos.map((o) => `<option value="${escapeAttr(o.id)}" ${o.id === p.id ? "selected" : ""}>${escapeHtml(tonoDe(o))}${o.precio !== p.precio ? ` (${formatPrice(o.precio)})` : ""}${o.id === l.base ? " ⭐" : ""}</option>`).join("")}
            </select></label>`
        : "";
      return `
      <li class="relative rounded-2xl bg-white border border-ink/10 p-3 flex flex-col hover:border-rose-deep hover:shadow-md transition">
        <span class="absolute top-2 right-2 z-10 rounded-full bg-[#5b2a2a] text-cream text-lg sm:text-xl font-extrabold px-3.5 py-1 shadow-md ring-2 ring-white">x${l.qty}</span>
        <button type="button" data-open-product="${escapeAttr(p.id)}" aria-label="Ver ${escapeAttr(p.nombre)}" class="tap text-left cursor-pointer">
          <img src="${escapeAttr(img)}" alt="" loading="lazy" decoding="async" class="w-full aspect-square object-contain rounded-xl bg-white" />
          <p class="mt-2 text-xs font-bold uppercase tracking-wide text-rose-deep">${escapeHtml(p.marca || "")}</p>
          <p class="text-sm text-ink leading-snug line-clamp-2">${escapeHtml(tonos.length > 1 ? p.nombre.replace(/\s\((#?[^)]*)\)$/, "") : p.nombre)}</p>
        </button>
        ${selector}
        <div class="mt-auto pt-2 text-xs leading-snug">
          <p class="text-ink/50 line-through tabular-nums">${formatPrice(r.ventaPieza || 0)}</p>
          <p class="inline-block rounded-lg bg-blush/40 px-2 py-0.5 text-base font-bold text-rose-deep tabular-nums">${formatPrice(p.precio)}</p>
          <p class="mt-1 text-ink/70">Te sale en <b class="tabular-nums">${formatPrice(Math.round(r.costoPieza || 0))}</b> con envío</p>
          <p class="text-green-800">Véndelo en <b class="tabular-nums">${formatPrice(r.ventaPieza || 0)}</b></p>
          <button type="button" data-open-product="${escapeAttr(p.id)}" class="tap mt-1.5 font-semibold text-rose-ink underline">Ver detalles</button>
        </div>
      </li>`;
    })
    .join("");
  return `
  <article class="rounded-3xl bg-gradient-to-b from-[#fde8f0] to-white border border-rose/20 p-5 sm:p-7 shadow-sm" aria-labelledby="kit-${kit.id}">
    <p class="text-xs font-bold uppercase tracking-[0.3em] text-rose-deep/80">${tipoTxt}</p>
    <h3 id="kit-${kit.id}" class="font-display text-3xl sm:text-4xl font-extrabold text-rose-deep leading-none mt-1">${kit.emoji} Kit Emprende ${escapeHtml(kit.nombre)}</h3>
    <div class="mt-4 grid grid-cols-2 gap-2 text-center">
      <div class="rounded-2xl bg-white/80 border border-ink/10 py-2"><b class="block text-2xl text-ink">${t.lines.length}</b><span class="text-xs text-ink/70">productos</span></div>
      <div class="rounded-2xl bg-white/80 border border-ink/10 py-2"><b class="block text-2xl text-ink">${t.piezas}</b><span class="text-xs text-ink/70">piezas</span></div>
    </div>
    <div class="mt-4 rounded-2xl bg-white border border-ink/10 p-4 space-y-1.5 text-sm tabular-nums">
      <div class="flex justify-between items-baseline rounded-xl bg-green-50 -mx-2 px-2 py-1.5 font-semibold text-green-800"><span>💰 Lo vendes todo en</span><span class="text-base font-extrabold">${formatPrice(t.reventa.ventaTotal)}</span></div>
      <div class="flex justify-between"><span>Productos</span><span>${formatPrice(t.productos)}</span></div>
      <div class="flex justify-between"><span>Envío a todo México${kit.envioIncluido ? " (incluido)" : ""}</span><span>${formatPrice(t.envio)}</span></div>
      <div class="flex justify-between font-bold text-ink border-t border-ink/10 pt-1.5"><span>Tu inversión</span><span>${formatPrice(t.total)}</span></div>
    </div>
    <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
      <div>${precioTxt}</div>
      <p class="rounded-full bg-green-600 text-white font-bold px-4 py-2 text-sm shadow-sm">⭐ Ganancia aprox. ${formatPrice(ganancia)} (${pct}%)</p>
    </div>
    ${t.faltan ? `<p class="mt-3 text-xs text-rose-ink">${t.faltan === 1 ? "1 producto de este kit no está disponible por ahora" : `${t.faltan} productos de este kit no están disponibles por ahora`}; el kit se agrega sin ${t.faltan === 1 ? "él" : "ellos"}.</p>` : ""}
    <button type="button" data-kit-add="${kit.id}" class="tap mt-4 w-full rounded-full bg-rose-deep text-cream font-semibold py-3 hover:bg-rose-ink transition">🛒 Agregar el kit completo al carrito</button>
    <details data-kit-details="${kit.id}" class="mt-3 group">
      <summary class="cursor-pointer list-none text-center text-sm font-semibold text-rose-ink underline">Ver los ${t.lines.length} productos del kit</summary>
      <ul class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">${productosHTML}</ul>
    </details>
  </article>`;
}

async function renderKits() {
  const wrap = document.getElementById("kits-list");
  if (!wrap) return;
  document.querySelectorAll("#kits-section [data-kits-tab]").forEach((b) => {
    const on = b.dataset.kitsTab === kitsTab;
    b.setAttribute("aria-selected", String(on));
    b.classList.toggle("bg-rose-deep", on);
    b.classList.toggle("text-cream", on);
    b.classList.toggle("bg-white", !on);
    b.classList.toggle("text-ink", !on);
  });
  const data = await loadKitsData();
  // El catálogo y las tarifas cargan aparte: mientras, se avisa y se
  // vuelve a intentar.
  if (!products.length || !shippingKoreaRates.tiers.length) {
    wrap.innerHTML = `<p class="text-center text-ink/70 py-10">Cargando kits…</p>`;
    setTimeout(() => { if (currentHomeView === "kits") renderKits(); }, 700);
    return;
  }
  const abiertos = [...wrap.querySelectorAll("details[data-kit-details][open]")].map((d) => d.dataset.kitDetails);
  wrap.innerHTML = data.kits.filter((k) => k.tipo === kitsTab).map(kitCardHTML).join("") || `<p class="text-center text-ink/70 py-10">Pronto habrá kits aquí.</p>`;
  abiertos.forEach((id) => { const d = wrap.querySelector(`details[data-kit-details="${id}"]`); if (d) d.open = true; });
}

function addKitToCart(id) {
  const kit = kitsData && kitsData.kits.find((k) => k.id === id);
  if (!kit) return;
  if (Object.keys(americanoCart).length) {
    americanoCart = {};
    saveAmericanoCart();
    renderAmericanoCart();
  }
  let piezas = 0;
  for (const l of kitLines(kit)) {
    if (!l.product || !l.product.disponible) continue;
    if (cart[l.sku]) cart[l.sku].qty += l.qty;
    else cart[l.sku] = { product: l.product, qty: l.qty };
    piezas += l.qty;
  }
  saveCart();
  renderCart();
  if (typeof avisoAgregado === "function") avisoAgregado(`Kit ${kit.nombre} agregado a tu carrito`); else openCart();
  announce(`Agregaste el Kit Emprende ${kit.nombre} (${piezas} piezas) a tu carrito.`);
}

function initKitsSection() {
  const sec = document.getElementById("kits-section");
  if (!sec) return;
  document.getElementById("kits-close").addEventListener("click", () => showHomeView("home"));
  sec.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-kits-tab]");
    if (tab) {
      kitsTab = tab.dataset.kitsTab;
      pushRoute({ ver: "kits", tipo: kitsTab });
      renderKits();
      return;
    }
    const add = e.target.closest("[data-kit-add]");
    if (add) addKitToCart(add.dataset.kitAdd);
  });
  sec.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-kit-tono]");
    if (!sel) return;
    kitSel[sel.dataset.kitTono] = sel.value;
    const y = window.scrollY;
    renderKits().then(() => window.scrollTo(0, y));
  });
}

initKitsSection();
