"use strict";

/* ======================================================================
   CONFIG — edita estos valores con los datos de tu negocio
   ====================================================================== */
const CONFIG = {
  // Google Sheets: Archivo > Compartir > Publicar en la Web > elige la
  // hoja > formato "Valores separados por comas (.csv)" > Publicar.
  // Pega aquí el link que te da Google.
  GOOGLE_SHEET_CSV_URL: "PEGA_AQUI_TU_URL_CSV",

  // Número de WhatsApp con código de país, solo dígitos, sin "+" ni espacios.
  // Ejemplo México: 5215512345678 (52 + 1 + 10 dígitos)
  WHATSAPP_NUMBER: "52XXXXXXXXXX",

  BUSINESS_NAME: "KKUL",

  // Mensaje de la barra superior.
  SHIPPING_MESSAGE: "Envíos a todo México desde $189 MXN 🚚💨",

  // Mensajes que se muestran en la barra deslizante debajo del banner.
  TICKER_MESSAGES: [
    "Envíos a todo México 🇲🇽",
    "Cotiza sin compromiso ✨",
    "Atención por WhatsApp 💬",
  ],

  // Íconos de redes sociales en la barra superior. Pon "" en href para ocultar uno.
  SOCIAL_LINKS: [
    { name: "Facebook", href: "", icon: "facebook" },
    { name: "Instagram", href: "", icon: "instagram" },
    { name: "TikTok", href: "", icon: "tiktok" },
  ],

  // Slides del banner principal. Agrega o quita objetos para más o menos slides.
  HERO_SLIDES: [
    {
      title: "Skincare coreano, directo a tu puerta",
      subtitle: "Arma tu pedido y cotiza por WhatsApp — sin pagos en línea.",
      ctaText: "Ver catálogo",
      ctaHref: "#product-grid",
    },
    {
      title: "Lo nuevo llegó a KKUL",
      subtitle: "Descubre las últimas novedades de skincare y maquillaje coreano.",
      ctaText: "Ver novedades",
      ctaHref: "#featured-section",
    },
  ],
};

/* ======================================================================
   Íconos SVG usados en la barra superior / contacto
   ====================================================================== */
const ICONS = {
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.23 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.23 22 17.08 22 12.06z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
  tiktok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M16.5 2h-3v13.5a2.5 2.5 0 1 1-2.5-2.5c.17 0 .34.02.5.05V9.9a5.5 5.5 0 1 0 5 5.48V8.2a7.4 7.4 0 0 0 4.5 1.5V6.7A4.5 4.5 0 0 1 16.5 2z"/></svg>`,
  whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm0 18.2h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.55 3.7-8.24 8.26-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.71 8.23-8.25 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.06 0 1.22.88 2.4 1 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28z"/></svg>`,
};

/* ======================================================================
   Catálogo de ejemplo — se usa mientras no conectes tu Google Sheet,
   o si la hoja no pudo cargarse (sin conexión, URL incorrecta, etc.)
   ====================================================================== */
function placeholderImg(label, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#263d42"
      text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const DEMO_PRODUCTS = [
  { id: "d1", nombre: "Espuma Limpiadora de Té Verde", categoria: "Skincare", marca: "Haruharu", precio: 320, imagen: placeholderImg("Limpiadora", "#e9c3be"), descripcion: "Limpieza suave diaria.", disponible: true, destacado: ["Nuevo"] },
  { id: "d2", nombre: "Sérum de Niacinamida 10%", categoria: "Skincare", marca: "Round Lab", precio: 450, imagen: placeholderImg("Sérum", "#f3d9d0"), descripcion: "Ilumina y empareja el tono.", disponible: true, destacado: ["Nuevo", "Best Seller"] },
  { id: "d3", nombre: "Crema Hidratante Cica", categoria: "Skincare", marca: "Dr.Althea", precio: 520, imagen: placeholderImg("Crema", "#e9c3be"), descripcion: "Calma e hidrata piel sensible.", disponible: true, destacado: ["Best Seller"] },
  { id: "d4", nombre: "Protector Solar SPF50 PA++++", categoria: "Skincare", marca: "Beauty of Joseon", precio: 380, imagen: placeholderImg("Sunscreen", "#f3d9d0"), descripcion: "Ligero, sin dejar residuo blanco.", disponible: false, destacado: [] },
  { id: "d5", nombre: "Base Cushion Glow", categoria: "Maquillaje", marca: "Missha", precio: 480, imagen: placeholderImg("Cushion", "#fbe6c8"), descripcion: "Cobertura media, acabado luminoso.", disponible: true, destacado: ["Nuevo"] },
  { id: "d6", nombre: "Labial Tinta Frutal", categoria: "Maquillaje", marca: "Rom&nd", precio: 260, imagen: placeholderImg("Labial", "#fbe6c8"), descripcion: "Larga duración, tono jugoso.", disponible: true, destacado: ["Best Seller"] },
  { id: "d7", nombre: "Mascarilla Capilar Reparadora", categoria: "Cuidado Capilar", marca: "Mise en Scene", precio: 300, imagen: placeholderImg("Cabello", "#d9e2df"), descripcion: "Repara puntas abiertas.", disponible: true, destacado: [] },
  { id: "d8", nombre: "Mascarilla de Tela Hidratante (5pz)", categoria: "Skincare", marca: "Mediheal", precio: 210, imagen: placeholderImg("Mascarilla", "#e9c3be"), descripcion: "Hidratación profunda 20 min.", disponible: true, destacado: ["Recomendado"] },
];

/* ======================================================================
   Estado
   ====================================================================== */
let products = [];
let activeCategory = "Todos";
let searchTerm = "";
const CART_KEY = "kkul_cart_v1";
let cart = loadCart();

/* ======================================================================
   Utilidades
   ====================================================================== */
function formatPrice(n) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function setStatus(text) {
  const banner = document.getElementById("status-banner");
  const el = document.getElementById("status-text");
  el.textContent = text;
  banner.classList.remove("hidden");
}

function hideStatus() {
  document.getElementById("status-banner").classList.add("hidden");
}

/* ======================================================================
   Parser de CSV (soporta comillas, comas y saltos de línea dentro de celdas)
   ====================================================================== */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c === "\r") {
      // ignorar
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function findCol(headers, aliases) {
  return headers.findIndex((h) => aliases.includes(h));
}

function csvToProducts(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const iNombre = findCol(headers, ["nombre", "producto", "name"]);
  const iCategoria = findCol(headers, ["categoria", "categoría", "category"]);
  const iMarca = findCol(headers, ["marca", "brand"]);
  const iPrecio = findCol(headers, ["precio", "price"]);
  const iImagen = findCol(headers, ["imagen", "image", "foto", "imagen url"]);
  const iDescripcion = findCol(headers, ["descripcion", "descripción", "description"]);
  const iSku = findCol(headers, ["sku", "codigo", "código"]);
  const iDisponible = findCol(headers, ["disponible", "stock", "available"]);
  const iDestacado = findCol(headers, ["destacado", "coleccion", "colección", "tag", "tags", "etiqueta", "etiquetas"]);

  return rows
    .slice(1)
    .map((r, n) => {
      const get = (i) => (i >= 0 && r[i] != null ? r[i].trim() : "");
      const disponibleRaw = get(iDisponible).toLowerCase();
      const disponible =
        disponibleRaw === ""
          ? true
          : ["si", "sí", "yes", "true", "1", "disponible"].includes(disponibleRaw);
      const precioRaw = get(iPrecio).replace(/[^0-9.,]/g, "").replace(",", ".");
      const destacado = get(iDestacado)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: get(iSku) || `row${n}`,
        nombre: get(iNombre) || "Producto sin nombre",
        categoria: get(iCategoria) || "General",
        marca: get(iMarca),
        precio: parseFloat(precioRaw) || 0,
        imagen: get(iImagen),
        descripcion: get(iDescripcion),
        disponible,
        destacado,
      };
    })
    .filter((p) => p.nombre && p.nombre !== "Producto sin nombre");
}

/* ======================================================================
   Carga de productos
   ====================================================================== */
async function loadProducts() {
  const isPlaceholder = !CONFIG.GOOGLE_SHEET_CSV_URL || CONFIG.GOOGLE_SHEET_CSV_URL.includes("PEGA_AQUI");

  if (isPlaceholder) {
    products = DEMO_PRODUCTS;
    setStatus("Mostrando catálogo de ejemplo. Conecta tu Google Sheet: edita CONFIG.GOOGLE_SHEET_CSV_URL en app.js.");
    renderAll();
    return;
  }

  try {
    const res = await fetch(CONFIG.GOOGLE_SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const parsed = csvToProducts(text);
    if (!parsed.length) throw new Error("CSV vacío o encabezados no reconocidos");
    products = parsed;
    hideStatus();
  } catch (err) {
    console.warn("No se pudo cargar el Google Sheet, usando catálogo de ejemplo:", err);
    products = DEMO_PRODUCTS;
    setStatus("No se pudo conectar con Google Sheets en este momento — mostrando catálogo de ejemplo.");
  }
  renderAll();
}

/* ======================================================================
   Barra superior: redes sociales + mensaje de envíos
   ====================================================================== */
function renderTopBar() {
  document.getElementById("shipping-message").textContent = CONFIG.SHIPPING_MESSAGE || "";

  const wrap = document.getElementById("social-links");
  const links = (CONFIG.SOCIAL_LINKS || []).filter((s) => s.href);
  wrap.innerHTML = links
    .map(
      (s) => `<a href="${escapeAttr(s.href)}" target="_blank" rel="noopener" aria-label="${escapeAttr(s.name)}"
        class="text-ink/70 hover:text-ink transition">${ICONS[s.icon] || ""}</a>`
    )
    .join("");
}

/* ======================================================================
   Banner principal (hero con varios slides)
   ====================================================================== */
let heroIndex = 0;
let heroTimer = null;

function renderHeroSlide() {
  const slides = CONFIG.HERO_SLIDES || [];
  if (!slides.length) return;
  const slide = slides[heroIndex];

  document.getElementById("hero-slides").innerHTML = `
    <div class="text-center">
      <h1 class="font-logo text-3xl sm:text-5xl text-ink text-balance">${escapeHtml(slide.title)}</h1>
      <p class="mt-3 text-ink/70 max-w-xl mx-auto">${escapeHtml(slide.subtitle || "")}</p>
      ${
        slide.ctaText
          ? `<a href="${escapeAttr(slide.ctaHref || "#")}"
              class="inline-block mt-6 rounded-full bg-ink text-cream font-semibold px-6 py-3 hover:bg-ink/90 transition">
              ${escapeHtml(slide.ctaText)}
            </a>`
          : ""
      }
    </div>`;

  document.getElementById("hero-dots").innerHTML = slides
    .map(
      (_, i) => `<button type="button" data-dot="${i}" aria-label="Ver slide ${i + 1}"
        class="w-2.5 h-2.5 rounded-full transition ${i === heroIndex ? "bg-ink" : "bg-ink/25"}"></button>`
    )
    .join("");

  document.querySelectorAll("[data-dot]").forEach((dot) => {
    dot.addEventListener("click", () => {
      heroIndex = Number(dot.dataset.dot);
      renderHeroSlide();
      restartHeroTimer();
    });
  });
}

function restartHeroTimer() {
  clearInterval(heroTimer);
  const slides = CONFIG.HERO_SLIDES || [];
  if (slides.length < 2) return;
  heroTimer = setInterval(() => {
    heroIndex = (heroIndex + 1) % slides.length;
    renderHeroSlide();
  }, 6000);
}

/* ======================================================================
   Barra deslizante (ticker)
   ====================================================================== */
function renderTicker() {
  const messages = CONFIG.TICKER_MESSAGES || [];
  if (!messages.length) return;
  const items = messages.map((m) => `<span>${escapeHtml(m)}</span>`).join("");
  // se duplica el contenido para que la animación haga un loop continuo
  document.getElementById("ticker-track").innerHTML = items + items;
}

/* ======================================================================
   Navegación de categorías (barra horizontal con flechas)
   ====================================================================== */
function renderCategoryNav() {
  const nav = document.getElementById("category-nav");
  const categories = [...new Set(products.map((p) => p.categoria))];
  nav.innerHTML = categories
    .map(
      (cat) =>
        `<a href="#product-grid" data-cat-link="${escapeAttr(cat)}"
          class="text-sm font-semibold text-ink/70 hover:text-ink transition">${escapeHtml(cat)}</a>`
    )
    .join("");

  nav.querySelectorAll("[data-cat-link]").forEach((link) => {
    link.addEventListener("click", () => {
      activeCategory = link.dataset.catLink;
      renderCategoryFilters();
      renderProducts();
    });
  });

  const prevBtn = document.getElementById("nav-prev");
  const nextBtn = document.getElementById("nav-next");
  prevBtn.addEventListener("click", () => nav.scrollBy({ left: -200, behavior: "smooth" }));
  nextBtn.addEventListener("click", () => nav.scrollBy({ left: 200, behavior: "smooth" }));
}

/* ======================================================================
   Render: filtros de categoría
   ====================================================================== */
function renderCategoryFilters() {
  const wrap = document.getElementById("category-filters");
  const categories = ["Todos", ...new Set(products.map((p) => p.categoria))];
  wrap.innerHTML = categories
    .map((cat) => {
      const active = cat === activeCategory;
      return `<button type="button" data-cat="${escapeAttr(cat)}"
        class="rounded-full px-4 py-1.5 text-sm font-semibold border transition
          ${active ? "bg-ink text-cream border-ink" : "bg-transparent text-ink/70 border-ink/20 hover:border-ink/40"}">
        ${escapeHtml(cat)}
      </button>`;
    })
    .join("");

  wrap.querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderCategoryFilters();
      renderProducts();
    });
  });
}

/* ======================================================================
   Render: grid de productos
   ====================================================================== */
function getFilteredProducts() {
  const term = searchTerm.trim().toLowerCase();
  return products.filter((p) => {
    const matchesCategory = activeCategory === "Todos" || p.categoria === activeCategory;
    const matchesSearch =
      !term ||
      [p.nombre, p.marca, p.categoria, p.descripcion].join(" ").toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });
}

function productCardHTML(p) {
  const img = p.imagen || placeholderImg(p.categoria || "KKUL", "#e9c3be");
  return `
    <div class="group rounded-2xl bg-white/60 border border-ink/10 overflow-hidden flex flex-col h-full">
      <div class="aspect-square bg-blush/20 overflow-hidden relative">
        <img src="${escapeAttr(img)}" alt="${escapeAttr(p.nombre)}" loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ${!p.disponible ? `<span class="absolute top-2 left-2 bg-ink text-cream text-[10px] font-bold uppercase px-2 py-1 rounded-full">Agotado</span>` : ""}
      </div>
      <div class="p-3 flex flex-col flex-1">
        <span class="text-[11px] uppercase tracking-wide text-ink/40">${escapeHtml(p.marca || p.categoria)}</span>
        <h3 class="font-semibold text-sm text-ink leading-snug mt-0.5 line-clamp-2">${escapeHtml(p.nombre)}</h3>
        <div class="mt-auto pt-2 flex items-center justify-between gap-2">
          <span class="font-display text-ink">${formatPrice(p.precio)}</span>
          <button data-add="${escapeAttr(p.id)}" ${!p.disponible ? "disabled" : ""}
            class="rounded-full bg-ink text-cream text-xs font-semibold px-3 py-1.5 hover:bg-ink/90 transition disabled:opacity-30 disabled:cursor-not-allowed">
            Agregar
          </button>
        </div>
      </div>
    </div>`;
}

function wireAddButtons(container) {
  container.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

function renderProducts() {
  const grid = document.getElementById("product-grid");
  const empty = document.getElementById("empty-state");
  const list = getFilteredProducts();

  if (!list.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  grid.innerHTML = list.map(productCardHTML).join("");
  wireAddButtons(grid);
}

/* ======================================================================
   Colecciones destacadas (pestañas) — usa la columna opcional "Destacado"
   del Google Sheet (ej. "Nuevo", "Best Seller"). Si ningún producto trae
   esa columna, la sección se oculta automáticamente.
   ====================================================================== */
let activeFeaturedTag = null;

function getFeaturedTagMap() {
  const map = new Map();
  products.forEach((p) => {
    (p.destacado || []).forEach((tag) => {
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag).push(p);
    });
  });
  return map;
}

function renderFeatured() {
  const section = document.getElementById("featured-section");
  const tagMap = getFeaturedTagMap();
  const tags = [...tagMap.keys()];

  if (!tags.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  if (!activeFeaturedTag || !tagMap.has(activeFeaturedTag)) activeFeaturedTag = tags[0];

  const tabsWrap = document.getElementById("featured-tabs");
  tabsWrap.innerHTML = tags
    .map((tag) => {
      const active = tag === activeFeaturedTag;
      return `<button type="button" data-tab="${escapeAttr(tag)}"
        class="rounded-full px-3 py-1 text-xs font-semibold border transition
          ${active ? "bg-ink text-cream border-ink" : "bg-transparent text-ink/70 border-ink/20 hover:border-ink/40"}">
        ${escapeHtml(tag)}
      </button>`;
    })
    .join("");
  tabsWrap.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFeaturedTag = btn.dataset.tab;
      renderFeatured();
    });
  });

  const row = document.getElementById("featured-row");
  const items = tagMap.get(activeFeaturedTag) || [];
  row.innerHTML = items
    .map((p) => `<div class="w-40 sm:w-48 flex-shrink-0 snap-start">${productCardHTML(p)}</div>`)
    .join("");
  wireAddButtons(row);
}

function renderAll() {
  renderCategoryNav();
  renderFeatured();
  renderCategoryFilters();
  renderProducts();
  renderCart();
}

/* ======================================================================
   Carrito
   ====================================================================== */
function addToCart(id) {
  const product = products.find((p) => p.id === id);
  if (!product || !product.disponible) return;
  if (cart[id]) cart[id].qty += 1;
  else cart[id] = { product, qty: 1 };
  saveCart();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
  renderCart();
}

function cartTotal() {
  return Object.values(cart).reduce((sum, it) => sum + it.product.precio * it.qty, 0);
}

function cartCount() {
  return Object.values(cart).reduce((sum, it) => sum + it.qty, 0);
}

function renderCart() {
  const wrap = document.getElementById("cart-items");
  const emptyMsg = document.getElementById("cart-empty");
  const items = Object.entries(cart);

  document.getElementById("cart-count").textContent = cartCount();
  document.getElementById("cart-total").textContent = formatPrice(cartTotal());
  document.getElementById("cart-total-header").textContent = formatPrice(cartTotal());

  const sendBtn = document.getElementById("send-quote");
  sendBtn.disabled = items.length === 0;

  if (!items.length) {
    wrap.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  wrap.innerHTML = items
    .map(([id, it]) => {
      const img = it.product.imagen || placeholderImg(it.product.categoria || "KKUL", "#e9c3be");
      return `
      <div class="flex gap-3 items-center">
        <img src="${escapeAttr(img)}" alt="${escapeAttr(it.product.nombre)}" class="w-16 h-16 rounded-lg object-cover border border-ink/10" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ink truncate">${escapeHtml(it.product.nombre)}</p>
          <p class="text-xs text-ink/50">${formatPrice(it.product.precio)} c/u</p>
          <div class="mt-1 flex items-center gap-2">
            <button data-dec="${escapeAttr(id)}" class="w-6 h-6 rounded-full border border-ink/20 text-ink text-sm leading-none hover:bg-ink/5">−</button>
            <span class="text-sm w-5 text-center">${it.qty}</span>
            <button data-inc="${escapeAttr(id)}" class="w-6 h-6 rounded-full border border-ink/20 text-ink text-sm leading-none hover:bg-ink/5">+</button>
            <button data-remove="${escapeAttr(id)}" class="ml-2 text-xs text-ink/40 hover:text-ink/70 underline">quitar</button>
          </div>
        </div>
        <span class="text-sm font-semibold text-ink whitespace-nowrap">${formatPrice(it.product.precio * it.qty)}</span>
      </div>`;
    })
    .join("");

  wrap.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.inc, 1)));
  wrap.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.dec, -1)));
  wrap.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => removeFromCart(b.dataset.remove)));
}

/* ======================================================================
   Drawer del carrito
   ====================================================================== */
function openCart() {
  document.getElementById("cart-drawer").classList.remove("translate-x-full");
  const overlay = document.getElementById("cart-overlay");
  overlay.classList.remove("opacity-0", "pointer-events-none");
}

function closeCart() {
  document.getElementById("cart-drawer").classList.add("translate-x-full");
  const overlay = document.getElementById("cart-overlay");
  overlay.classList.add("opacity-0", "pointer-events-none");
}

/* ======================================================================
   Envío de cotización por WhatsApp
   ====================================================================== */
function buildWhatsAppMessage() {
  const items = Object.values(cart);
  const name = document.getElementById("customer-name").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  const notes = document.getElementById("customer-notes").value.trim();

  const lines = items.map(
    (it, i) => `${i + 1}. ${it.product.nombre} x${it.qty} — ${formatPrice(it.product.precio * it.qty)}`
  );

  const parts = [
    `Hola ${CONFIG.BUSINESS_NAME}! Quiero cotizar lo siguiente:`,
    "",
    ...lines,
    "",
    `*Total estimado: ${formatPrice(cartTotal())}*`,
    "",
    `Nombre: ${name}`,
  ];
  if (phone) parts.push(`Teléfono: ${phone}`);
  if (notes) parts.push(`Notas: ${notes}`);

  return parts.join("\n");
}

function sendQuote(e) {
  e.preventDefault();
  if (!Object.keys(cart).length) return;

  const numberIsPlaceholder = !CONFIG.WHATSAPP_NUMBER || CONFIG.WHATSAPP_NUMBER.includes("XXXX");
  if (numberIsPlaceholder) {
    setStatus("Falta configurar CONFIG.WHATSAPP_NUMBER en app.js con tu número real.");
    return;
  }

  const message = buildWhatsAppMessage();
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}

/* ======================================================================
   Helpers de escape (evitar inyección de HTML desde el CSV)
   ====================================================================== */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

/* ======================================================================
   Inicialización
   ====================================================================== */
function initWhatsAppFloat() {
  const btn = document.getElementById("whatsapp-float");
  const numberIsPlaceholder = !CONFIG.WHATSAPP_NUMBER || CONFIG.WHATSAPP_NUMBER.includes("XXXX");
  if (numberIsPlaceholder) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      setStatus("Falta configurar CONFIG.WHATSAPP_NUMBER en app.js con tu número real.");
    });
    return;
  }
  const message = encodeURIComponent(`Hola ${CONFIG.BUSINESS_NAME}! Tengo una pregunta.`);
  btn.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${message}`;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  document.getElementById("cart-toggle").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-overlay").addEventListener("click", closeCart);
  document.getElementById("quote-form").addEventListener("submit", sendQuote);

  const syncSearch = (value) => {
    searchTerm = value;
    document.getElementById("search-input").value = value;
    document.getElementById("search-input-mobile").value = value;
    renderProducts();
  };
  document.getElementById("search-input").addEventListener("input", (e) => syncSearch(e.target.value));
  document.getElementById("search-input-mobile").addEventListener("input", (e) => syncSearch(e.target.value));

  renderTopBar();
  renderHeroSlide();
  restartHeroTimer();
  renderTicker();
  initWhatsAppFloat();

  loadProducts();
  renderCart();
});
