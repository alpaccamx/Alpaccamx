"use strict";

/* ======================================================================
   CONFIG — edita estos valores con los datos de tu negocio
   ====================================================================== */
const CONFIG = {
  // Google Sheets: Archivo > Compartir > Publicar en la Web > elige la
  // hoja > formato "Valores separados por comas (.csv)" > Publicar.
  // Pega aquí el link que te da Google.
  GOOGLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=926701642&single=true&output=csv",

  // Opcional: URL CSV publicada de una pestaña "Config" con dos columnas
  // (Clave | Valor) para el tipo de cambio USD→MXN y tu comisión. Ver
  // README para el formato exacto.
  SHIPPING_CONFIG_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=532326747&single=true&output=csv",

  // Opcional: URL CSV publicada de una pestaña con la tabla de tarifas de
  // envío Corea → EE.UU. por peso (columnas: Peso Total de la Unidad |
  // Costo (USD), más una fila "Cada 1 kg adicional" al final). Ver README.
  // Si se deja el placeholder, el envío Corea-EE.UU. no aparece.
  SHIPPING_KOREA_RATES_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=888962170&single=true&output=csv",

  // Opcional: URL CSV publicada de una pestaña con la tabla de envío
  // nacional (Estafeta Terrestre) por zona de código postal y peso
  // (columnas: Estado | CP Destino | Peso (kg) | Costo Estafeta
  // Terrestre (MXN)). Ver README. Si se deja el placeholder, el envío
  // nacional simplemente no aparece en la cotización.
  SHIPPING_NACIONAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=117332024&single=true&output=csv",

  // Número de WhatsApp con código de país, solo dígitos, sin "+" ni espacios.
  // Ejemplo México: 5215512345678 (52 + 1 + 10 dígitos)
  WHATSAPP_NUMBER: "5216571920559",

  BUSINESS_NAME: "Mae",

  // Mensaje de la barra superior.
  SHIPPING_MESSAGE: "📦 Pedido mínimo de compra: $5,700 MXN ✨",

  // Pedido mínimo para poder enviar la cotización, en pesos mexicanos (monto fijo).
  MIN_ORDER_MXN: 5700,

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
  // "imageMobile" es opcional: si lo pones, esa imagen se usa en pantallas
  // angostas (celular) y "image" se usa en pantallas sm y más grandes
  // (tablet/escritorio). Si lo dejas vacío, se usa "image" en ambas.
  HERO_SLIDES: [
    {
      image: "assets/hero/skincare-mayoreo-banner-pc.png",
      // imageMobile: "assets/hero/skincare-mayoreo-banner-mobile.jpg",
      imageAlt: "Skincare coreano para tu negocio - venta por mayoreo Alpacca, marcas reales, resultados reales.",
    },
  ],

  // Emojis para las etiquetas de la columna opcional "TipoPiel" del Sheet.
  // Si una etiqueta no aparece aquí, se usa el emoji por defecto.
  SKIN_TYPE_EMOJI: {
    Grasa: "✨", Seca: "💧", Mixta: "🌗", Sensible: "🌸", Normal: "🙂",
  },
  SKIN_TYPE_DEFAULT_EMOJI: "🏷️",

  // Quiz de tipo de piel. El "type" de cada opción debe coincidir con una
  // etiqueta de SKIN_TYPE_EMOJI y con los valores que uses en la columna
  // "TipoPiel" de tu Google Sheet. Agrega, quita o reordena preguntas y
  // opciones libremente.
  SKIN_QUIZ: [
    {
      question: "¿Cómo se siente tu piel unas horas después de lavarla (sin crema)?",
      options: [
        { label: "Tirante y áspera", type: "Seca" },
        { label: "Cómoda, ni grasosa ni tirante", type: "Normal" },
        { label: "Brillante en toda la cara", type: "Grasa" },
        { label: "Brillante solo en frente, nariz y mentón", type: "Mixta" },
      ],
    },
    {
      question: "¿Cómo reacciona tu piel a productos nuevos?",
      options: [
        { label: "Sin problema, aguanta todo", type: "Grasa" },
        { label: "Se irrita o se pone roja fácil", type: "Sensible" },
        { label: "Se reseca todavía más", type: "Seca" },
        { label: "Depende de la zona de la cara", type: "Mixta" },
      ],
    },
    {
      question: "¿Qué tan notorios son tus poros?",
      options: [
        { label: "Casi no se notan", type: "Seca" },
        { label: "Se notan poco, parejos", type: "Normal" },
        { label: "Se notan en toda la cara", type: "Grasa" },
        { label: "Se notan solo en frente, nariz y mentón", type: "Mixta" },
      ],
    },
    {
      question: "¿Con qué frecuencia sientes brillo en el rostro durante el día?",
      options: [
        { label: "Casi nunca", type: "Seca" },
        { label: "Rara vez", type: "Normal" },
        { label: "Todo el día", type: "Grasa" },
        { label: "Se pone roja o incómoda con sol o viento", type: "Sensible" },
      ],
    },
  ],

  // Franja promocional ancha, entre las colecciones y las marcas.
  PROMO_BANNER: {
    title: "Skincare asiático que tus clientes van a querer",
    subtitle: "Productos coreanos seleccionados para tu negocio.",
    ctaText: "Explorar catálogo",
    ctaHref: "#catalog-section",
  },

  // Beneficios (franja de 4 íconos antes del footer).
  BENEFITS: [
    { emoji: "🚚", title: "Envíos", text: "A todo México" },
    { emoji: "💬", title: "Atención por WhatsApp", text: "Resolvemos tus dudas" },
    { emoji: "🔒", title: "Cotización sin compromiso", text: "Sin pagos en línea" },
    { emoji: "✅", title: "Catálogo verificado", text: "Disponibilidad real" },
  ],

  // ------------------------------------------------------------------
  // Cosmético Americano — colección aparte con su propio catálogo, carrito y
  // reglas de compra (precios en pesos, MOQ por color/tono, pedido mínimo
  // propio). No comparte carrito ni pedido mínimo con el resto del sitio.
  // ------------------------------------------------------------------
  AMERICANO: {
    // Google Sheet publicado como CSV (mismo procedimiento que el catálogo
    // principal, ver README) con columnas: Nombre, Marca, Precio USD,
    // PrecioOriginal USD, Precio, PrecioOriginal, MOQ (mínimo de unidades
    // por color/tono), Imagen, Descripcion, Disponible, Presentacion
    // (opcional), SKU (opcional). Igual que el catálogo principal, las
    // columnas Precio/PrecioOriginal ya vienen en pesos (fórmula en el
    // Sheet que convierte Precio USD con el tipo de cambio de Config y le
    // suma SU PROPIA comisión — no la misma que la del catálogo coreano).
    SHEET_CSV_URL:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=1261141661&single=true&output=csv",

    // Número de WhatsApp para pedidos de esta colección (puede ser el
    // mismo que CONFIG.WHATSAPP_NUMBER o uno distinto).
    WHATSAPP_NUMBER: "5216571920559",

    BUSINESS_NAME: "Mae",

    TITLE: "Cosmético Americano",
    SUBTITLE: "Maquillaje y belleza de marca, directo de proveedor — Mínimo de orden por color/tono. Envío se cotiza aparte.",

    // Pedido mínimo para poder enviar el pedido, en pesos (monto fijo,
    // igual que CONFIG.MIN_ORDER_MXN del catálogo principal). Ajústalo
    // cuando cambies el tipo de cambio o tu comisión en el Sheet.
    MIN_ORDER_MXN: 18000,
  },

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
    <text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#3d3a42"
      text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const DEMO_PRODUCTS = [
  { id: "d1", nombre: "Espuma Limpiadora de Té Verde", categoria: "Skincare", marca: "Haruharu", precio: 320, peso: 0.18, presentacion: "Pieza individual", imagen: placeholderImg("Limpiadora", "#e9c3be"), descripcion: "Limpieza suave diaria.", disponible: true, destacado: ["Nuevo", "Best Seller"], tipoPiel: ["Normal", "Mixta"] },
  { id: "d1b", nombre: "Espuma Limpiadora de Té Verde", categoria: "Skincare", marca: "Haruharu", precio: 3450, peso: 2.2, presentacion: "Caja con 12 piezas", imagen: placeholderImg("Limpiadora", "#e9c3be"), descripcion: "Limpieza suave diaria.", disponible: true, destacado: [], tipoPiel: ["Normal", "Mixta"] },
  { id: "d2", nombre: "Sérum de Niacinamida 10%", categoria: "Skincare", marca: "Round Lab", precio: 450, peso: 0.09, presentacion: "Pieza individual", imagen: placeholderImg("Sérum", "#f3d9d0"), descripcion: "Ilumina y empareja el tono.", disponible: true, destacado: ["Nuevo", "Best Seller"], tipoPiel: ["Grasa", "Mixta"] },
  { id: "d3", nombre: "Crema Hidratante Cica", categoria: "Skincare", marca: "Dr.Althea", precio: 520, peso: 0.15, imagen: placeholderImg("Crema", "#e9c3be"), descripcion: "Calma e hidrata piel sensible.", disponible: true, destacado: ["Best Seller"], tipoPiel: ["Sensible", "Seca"] },
  { id: "d4", nombre: "Protector Solar SPF50 PA++++", categoria: "Skincare", marca: "Beauty of Joseon", precio: 380, peso: 0.06, imagen: placeholderImg("Sunscreen", "#f3d9d0"), descripcion: "Ligero, sin dejar residuo blanco.", disponible: false, destacado: [], tipoPiel: ["Normal"] },
  { id: "d5", nombre: "Base Cushion Glow - 3 Colors (#21 Light Beige)", categoria: "Maquillaje", marca: "Missha", precio: 480, peso: 0.12, presentacion: "Pieza individual", imagen: placeholderImg("Cushion", "#fbe6c8"), descripcion: "Cobertura media, acabado luminoso.", disponible: true, destacado: ["Nuevo", "Best Seller"], tipoPiel: [] },
  { id: "d5b", nombre: "Base Cushion Glow - 3 Colors (#23 Natural Beige)", categoria: "Maquillaje", marca: "Missha", precio: 480, peso: 0.12, presentacion: "Pieza individual", imagen: placeholderImg("Cushion", "#fbe6c8"), descripcion: "Cobertura media, acabado luminoso.", disponible: true, destacado: [], tipoPiel: [] },
  { id: "d5c", nombre: "Base Cushion Glow - 3 Colors (#27 Sand Beige)", categoria: "Maquillaje", marca: "Missha", precio: 480, peso: 0.12, presentacion: "Pieza individual", imagen: placeholderImg("Cushion", "#fbe6c8"), descripcion: "Cobertura media, acabado luminoso.", disponible: true, destacado: [], tipoPiel: [] },
  { id: "d6", nombre: "Labial Tinta Frutal", categoria: "Maquillaje", marca: "Rom&nd", precio: 260, peso: 0.03, imagen: placeholderImg("Labial", "#fbe6c8"), descripcion: "Larga duración, tono jugoso.", disponible: true, destacado: ["Best Seller"], tipoPiel: [] },
  { id: "d7", nombre: "Mascarilla Capilar Reparadora", categoria: "Cuidado Capilar", marca: "Mise en Scene", precio: 300, peso: 0.2, imagen: placeholderImg("Cabello", "#d9e2df"), descripcion: "Repara puntas abiertas.", disponible: true, destacado: ["Best Seller"], tipoPiel: [] },
  { id: "d8", nombre: "Mascarilla de Tela Hidratante (5pz)", categoria: "Skincare", marca: "Mediheal", precio: 210, peso: 0.11, imagen: placeholderImg("Mascarilla", "#e9c3be"), descripcion: "Hidratación profunda 20 min.", disponible: true, destacado: ["Recomendado"], tipoPiel: ["Seca", "Sensible"] },
  { id: "d9", nombre: "Mild Acidic pH Sheet Mask - 6 Types (Aqua Fit)", categoria: "Skincare", marca: "Abib", precio: 31, peso: 0.036, presentacion: "Pieza individual", imagen: placeholderImg("Sheet Mask", "#d9e2df"), descripcion: "Mascarilla en lámina de pH ligeramente ácido que equilibra e hidrata la piel.", disponible: true, destacado: ["Nuevo"], tipoPiel: ["Normal", "Seca", "Sensible", "Mixta"] },
  { id: "d9b", nombre: "Mild Acidic pH Sheet Mask - 6 Types (Glutathiosome Fit)", categoria: "Skincare", marca: "Abib", precio: 31, peso: 0.036, presentacion: "Pieza individual", imagen: placeholderImg("Sheet Mask", "#d9e2df"), descripcion: "Con glutatión encapsulado que ilumina el tono.", disponible: true, destacado: [], tipoPiel: ["Normal", "Mixta", "Sensible"] },
  { id: "d9c", nombre: "Mild Acidic pH Sheet Mask - 6 Types (Heartleaf Fit)", categoria: "Skincare", marca: "Abib", precio: 31, peso: 0.036, presentacion: "Pieza individual", imagen: placeholderImg("Sheet Mask", "#d9e2df"), descripcion: "Con Houttuynia cordata que calma la piel sensible.", disponible: true, destacado: [], tipoPiel: ["Sensible", "Seca", "Normal"] },
  { id: "d9d", nombre: "Mild Acidic pH Sheet Mask - 6 Types (Aqua Fit)", categoria: "Skincare", marca: "Abib", precio: 207, peso: 0.36, presentacion: "Caja con 10 piezas", imagen: placeholderImg("Sheet Mask", "#d9e2df"), descripcion: "Mascarilla en lámina de pH ligeramente ácido que equilibra e hidrata la piel.", disponible: true, destacado: [], tipoPiel: ["Normal", "Seca", "Sensible", "Mixta"] },
  { id: "d9e", nombre: "Mild Acidic pH Sheet Mask - 6 Types (Honey Fit)", categoria: "Skincare", marca: "Abib", precio: 207, peso: 0.36, presentacion: "Caja con 10 piezas", imagen: placeholderImg("Sheet Mask", "#d9e2df"), descripcion: "Con miel, propóleo y jalea real que nutre la piel seca.", disponible: true, destacado: [], tipoPiel: ["Seca", "Normal", "Sensible"] },
  { id: "d10", nombre: "Mild Acidic pH Sheet Mask Set - 6 Types (Aqua Fit)", categoria: "Skincare", marca: "Abib", precio: 244, peso: 0.398, presentacion: "Pieza individual", imagen: placeholderImg("Sheet Mask Set", "#f3d9d0"), descripcion: "Mascarilla en lámina de pH ligeramente ácido que equilibra e hidrata la piel.", disponible: true, destacado: [], tipoPiel: ["Normal", "Seca", "Sensible", "Mixta"] },
  { id: "d10b", nombre: "Mild Acidic pH Sheet Mask Set - 6 Types (Jericho Rose Fit)", categoria: "Skincare", marca: "Abib", precio: 244, peso: 0.398, presentacion: "Pieza individual", imagen: placeholderImg("Sheet Mask Set", "#f3d9d0"), descripcion: "Con Rosa de Jericó que reafirma e hidrata sin irritar.", disponible: true, destacado: [], tipoPiel: ["Normal", "Seca", "Mixta"] },
];

/* ======================================================================
   Estado
   ====================================================================== */
let products = [];
const CART_KEY = "alpacca_cart_v1";
let cart = loadCart();

let americanoProducts = [];
const AMERICANO_CART_KEY = "alpacca_americano_cart_v1";
let americanoCart = loadAmericanoCart();

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

function loadAmericanoCart() {
  try {
    return JSON.parse(localStorage.getItem(AMERICANO_CART_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAmericanoCart() {
  localStorage.setItem(AMERICANO_CART_KEY, JSON.stringify(americanoCart));
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
  const iTipoPiel = findCol(headers, ["tipopiel", "tipo de piel", "piel", "skintype"]);
  const iPeso = findCol(headers, ["peso", "peso (kg)", "peso kg", "weight", "pesokg"]);
  const iPresentacion = findCol(headers, ["presentacion", "presentación", "empaque", "variante", "unidad"]);

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
      const pesoRaw = get(iPeso).replace(/[^0-9.,]/g, "").replace(",", ".");
      const splitTags = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);
      return {
        id: get(iSku) || `row${n}`,
        nombre: get(iNombre) || "Producto sin nombre",
        categoria: get(iCategoria) || "General",
        marca: get(iMarca),
        precio: parseFloat(precioRaw) || 0,
        peso: parseFloat(pesoRaw) || 0,
        presentacion: get(iPresentacion),
        imagen: get(iImagen),
        descripcion: get(iDescripcion),
        disponible,
        destacado: splitTags(get(iDestacado)),
        tipoPiel: splitTags(get(iTipoPiel)),
      };
    })
    .filter((p) => p.nombre && p.nombre !== "Producto sin nombre");
}

/* ======================================================================
   Cosmético Americano — parser de su propio Sheet. Igual que el catálogo
   principal, lee el precio final YA EN PESOS desde las columnas
   Precio / PrecioOriginal (la conversión de Precio USD con el tipo de
   cambio y la comisión propia de esta colección se hace con una fórmula
   dentro del Sheet, ver README). MOQ es por fila — cada fila es un
   color/tono/versión con su propio mínimo de unidades.
   ====================================================================== */
function csvToAmericanoProducts(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const iNombre = findCol(headers, ["nombre", "producto", "name"]);
  const iMarca = findCol(headers, ["marca", "brand"]);
  const iPrecio = findCol(headers, ["precio", "precio mxn", "price"]);
  const iPrecioOriginal = findCol(headers, ["preciooriginal", "precio original", "precio sephora mxn", "precio tienda mxn", "original price"]);
  const iMoq = findCol(headers, ["moq", "minimo", "mínimo", "cantidad minima", "cantidad mínima"]);
  const iImagen = findCol(headers, ["imagen", "image", "foto", "imagen url"]);
  const iDescripcion = findCol(headers, ["descripcion", "descripción", "description"]);
  const iSku = findCol(headers, ["sku", "codigo", "código"]);
  const iDisponible = findCol(headers, ["disponible", "stock", "available"]);
  const iPresentacion = findCol(headers, ["presentacion", "presentación", "empaque", "variante", "unidad"]);

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
      const precioOriginalRaw = get(iPrecioOriginal).replace(/[^0-9.,]/g, "").replace(",", ".");
      const moqRaw = get(iMoq).replace(/[^0-9.,]/g, "").replace(",", ".");
      const moq = Math.max(1, Math.round(parseFloat(moqRaw)) || 1);
      return {
        id: get(iSku) || `americano${n}`,
        nombre: get(iNombre) || "Producto sin nombre",
        marca: get(iMarca),
        precio: parseFloat(precioRaw) || 0,
        precioOriginal: parseFloat(precioOriginalRaw) || 0,
        moq,
        presentacion: get(iPresentacion),
        imagen: get(iImagen),
        descripcion: get(iDescripcion),
        disponible,
      };
    })
    .filter((p) => p.nombre && p.nombre !== "Producto sin nombre");
}

/* ======================================================================
   Tarifas de envío (opcionales) — Corea→EE.UU. por tabla de peso,
   y envío nacional en México (Estafeta Terrestre) por zona de código
   postal + peso, leídas desde pestañas CSV separadas del Google Sheet.
   Ver README.
   ====================================================================== */
function normalizeKey(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

let shippingSettings = { exchangeRate: 0 };
let shippingKoreaRates = { tiers: [], extraPerKgUSD: 0 };
let shippingNacionalRates = [];

const SHIPPING_SETTING_ALIASES = {
  exchangeRate: ["tipodecambio", "tipocambio", "exchangerate", "dolar", "usdmxn"],
};

function csvToShippingSettings(text) {
  const rows = parseCSV(text);
  const settings = { exchangeRate: 0 };
  rows.forEach((r) => {
    const key = normalizeKey(r[0]);
    const value = parseFloat((r[1] || "").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
    for (const field in SHIPPING_SETTING_ALIASES) {
      if (SHIPPING_SETTING_ALIASES[field].includes(key)) settings[field] = value;
    }
  });
  return settings;
}

function csvToNacionalRates(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const iEstado = findCol(headers, ["estado"]);
  const iCp = findCol(headers, ["cp destino", "codigo postal", "cp"]);
  const iPeso = findCol(headers, ["peso (kg)", "peso"]);
  const iCosto = findCol(headers, ["costo estafeta terrestre (mxn)", "costo estafeta terrestre", "costo estafeta", "costo"]);

  const rates = [];
  rows.slice(1).forEach((r) => {
    const estado = (r[iEstado] || "").trim();
    const cpRange = (r[iCp] || "").trim();
    const peso = parseFloat((r[iPeso] || "").replace(",", "."));
    const costo = parseFloat((r[iCosto] || "").replace(/[^0-9.,]/g, "").replace(",", "."));
    const m = cpRange.match(/(\d{4,5})\s*-\s*(\d{4,5})/);
    if (!estado || !m || isNaN(peso) || isNaN(costo)) return;
    rates.push({ estado, cpMin: parseInt(m[1], 10), cpMax: parseInt(m[2], 10), pesoKg: peso, costoMXN: costo });
  });
  return rates;
}

function nacionalShippingMXN(cp, pesoKg) {
  const cpNum = parseInt((cp || "").trim(), 10);
  if (isNaN(cpNum) || pesoKg <= 0 || !shippingNacionalRates.length) return null;

  const zonesInRange = shippingNacionalRates.filter((r) => cpNum >= r.cpMin && cpNum <= r.cpMax);
  if (!zonesInRange.length) return null;

  // Si el CP cae en más de una zona (rangos que se traslapan en tu tabla),
  // se prefiere la zona con el rango más angosto (más específico).
  const narrowestSpan = Math.min(...zonesInRange.map((r) => r.cpMax - r.cpMin));
  const zoneRows = zonesInRange.filter((r) => r.cpMax - r.cpMin === narrowestSpan);

  const sorted = zoneRows.slice().sort((a, b) => a.pesoKg - b.pesoKg);
  const tier = sorted.find((r) => pesoKg <= r.pesoKg);
  return tier ? tier.costoMXN : null;
}

function csvToKoreaShippingTiers(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { tiers: [], extraPerKgUSD: 0 };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const iPeso = findCol(headers, ["peso total de la unidad", "peso hasta", "peso hasta (kg)", "peso (kg)", "peso"]);
  const iCosto = findCol(headers, ["costo (usd)", "costo usd", "costo"]);

  const tiers = [];
  let extraPerKgUSD = 0;

  rows.slice(1).forEach((r) => {
    const pesoRaw = (r[iPeso] || "").trim().toLowerCase();
    const costo = parseFloat((r[iCosto] || "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

    if (pesoRaw.includes("adicional") || pesoRaw.includes("extra")) {
      extraPerKgUSD = costo;
      return;
    }
    const maxKg = parseFloat(pesoRaw.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!isNaN(maxKg)) tiers.push({ maxKg, costoUSD: costo });
  });

  tiers.sort((a, b) => a.maxKg - b.maxKg);
  return { tiers, extraPerKgUSD };
}

function koreaShippingUSD(pesoKg) {
  const { tiers, extraPerKgUSD } = shippingKoreaRates;
  if (!tiers.length || pesoKg <= 0) return 0;
  const inRange = tiers.find((t) => pesoKg <= t.maxKg);
  if (inRange) return inRange.costoUSD;
  const last = tiers[tiers.length - 1];
  const extraKg = Math.ceil(pesoKg - last.maxKg);
  return last.costoUSD + extraKg * extraPerKgUSD;
}

function shippingEstimate(pesoKg, cp) {
  if (pesoKg <= 0) return null;
  const hasKorea = shippingKoreaRates.tiers.length > 0 && shippingSettings.exchangeRate > 0;
  const nacionalMXN = nacionalShippingMXN(cp, pesoKg);
  const hasNacional = nacionalMXN !== null;
  if (!hasKorea && !hasNacional) return null;

  const coreaUSD = hasKorea ? koreaShippingUSD(pesoKg) : 0;
  const coreaMXN = coreaUSD * (shippingSettings.exchangeRate || 0);

  return { hasKorea, hasNacional, coreaUSD, coreaMXN, nacionalMXN: nacionalMXN || 0, totalMXN: coreaMXN + (nacionalMXN || 0) };
}

async function loadShippingSettings() {
  const isPlaceholder = !CONFIG.SHIPPING_CONFIG_CSV_URL || CONFIG.SHIPPING_CONFIG_CSV_URL.includes("PEGA_AQUI");
  if (isPlaceholder) return;
  try {
    const res = await fetch(CONFIG.SHIPPING_CONFIG_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    shippingSettings = csvToShippingSettings(text);
    renderCart();
  } catch (err) {
    console.warn("No se pudo cargar la configuración de envíos:", err);
  }
}

async function loadShippingKoreaRates() {
  const isPlaceholder = !CONFIG.SHIPPING_KOREA_RATES_CSV_URL || CONFIG.SHIPPING_KOREA_RATES_CSV_URL.includes("PEGA_AQUI");
  if (isPlaceholder) return;
  try {
    const res = await fetch(CONFIG.SHIPPING_KOREA_RATES_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    shippingKoreaRates = csvToKoreaShippingTiers(text);
    renderCart();
  } catch (err) {
    console.warn("No se pudo cargar la tabla de tarifas Corea-EE.UU.:", err);
  }
}

async function loadShippingNacionalRates() {
  const isPlaceholder = !CONFIG.SHIPPING_NACIONAL_CSV_URL || CONFIG.SHIPPING_NACIONAL_CSV_URL.includes("PEGA_AQUI");
  if (isPlaceholder) return;
  try {
    const res = await fetch(CONFIG.SHIPPING_NACIONAL_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    shippingNacionalRates = csvToNacionalRates(text);
    renderCart();
  } catch (err) {
    console.warn("No se pudo cargar la tabla de envío nacional:", err);
  }
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
   Carga de productos — Cosmético Americano (Sheet aparte, opcional). Si no se
   configuró CONFIG.AMERICANO.SHEET_CSV_URL, la sección completa se oculta.
   ====================================================================== */
async function loadAmericanoProducts() {
  const url = CONFIG.AMERICANO.SHEET_CSV_URL;
  const isPlaceholder = !url || url.includes("PEGA_AQUI");
  if (isPlaceholder) return;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    americanoProducts = csvToAmericanoProducts(text);
  } catch (err) {
    console.warn("No se pudo cargar el catálogo de Cosmético Americano:", err);
    americanoProducts = [];
  }
  renderAmericanoSection();
  renderAmericanoCart();
  renderCategoryNav();
  renderMobileMenu();
}

/* ======================================================================
   Barra superior: redes sociales + mensaje de envíos
   ====================================================================== */
function renderTopBar() {
  document.getElementById("shipping-message").textContent = CONFIG.SHIPPING_MESSAGE || "";

  const links = (CONFIG.SOCIAL_LINKS || []).filter((s) => s.href);
  const linksHTML = links
    .map(
      (s) => `<a href="${escapeAttr(s.href)}" target="_blank" rel="noopener" aria-label="${escapeAttr(s.name)}"
        class="hover:text-ink transition">${ICONS[s.icon] || ""}</a>`
    )
    .join("");

  document.getElementById("social-links").innerHTML = linksHTML;
  document.getElementById("footer-social").innerHTML = linksHTML;
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

  const secondaryHref = whatsappHref(`Hola ${CONFIG.BUSINESS_NAME}! Tengo una pregunta.`);

  document.getElementById("hero-slides").innerHTML = slide.image
    ? `<picture>
        ${
          slide.imageMobile
            ? `<source media="(max-width: 639px)" srcset="${escapeAttr(slide.imageMobile)}">`
            : ""
        }
        <img src="${escapeAttr(slide.image)}" alt="${escapeAttr(slide.imageAlt || "")}"
          class="w-full h-full sm:max-w-[1200px] sm:mx-auto object-contain sm:object-cover sm:object-bottom" />
      </picture>`
    : `
    <div class="text-center px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      ${
        slide.eyebrow
          ? `<p class="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-rose mb-2">${escapeHtml(slide.eyebrow)}</p>`
          : ""
      }
      <h1 class="font-logo text-3xl sm:text-5xl text-ink text-balance">${escapeHtml(slide.title)}</h1>
      <p class="mt-3 text-ink/70 max-w-xl mx-auto">${escapeHtml(slide.subtitle || "")}</p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        ${
          slide.ctaText
            ? `<a href="${escapeAttr(slide.ctaHref || "#")}"
                class="inline-block rounded-full bg-rose text-cream font-semibold px-6 py-3 hover:bg-rose/90 transition">
                ${escapeHtml(slide.ctaText)}
              </a>`
            : ""
        }
        ${
          slide.ctaSecondaryText && secondaryHref
            ? `<a href="${escapeAttr(secondaryHref)}" target="_blank" rel="noopener"
                class="inline-block rounded-full border border-ink/20 text-ink font-semibold px-6 py-3 hover:border-rose hover:text-rose transition">
                ${escapeHtml(slide.ctaSecondaryText)}
              </a>`
            : ""
        }
      </div>
    </div>`;

  document.getElementById("hero-dots").innerHTML =
    slides.length < 2
      ? ""
      : slides
          .map(
            (_, i) => `<button type="button" data-dot="${i}" aria-label="Ver slide ${i + 1}"
        class="w-2.5 h-2.5 rounded-full transition ${i === heroIndex ? "bg-rose" : "bg-ink/20"}"></button>`
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
   Ítems del menú — se usan tanto en la barra horizontal de escritorio
   (siempre visible, debajo del header) como en el menú ☰ de móvil.
   "Marcas" es un caso especial: en vez de enlazar directo a la sección,
   trae la lista de marcas para mostrarse como menú desplegable.
   ====================================================================== */
const CATEGORY_MENU_OPTIONS = ["Skincare", "Suplementos"];

function getMenuItems() {
  const items = [{ type: "link", label: "Skincare Asiático", href: "#catalog-section" }];

  if (americanoProducts.length) {
    items.push({ type: "link", label: CONFIG.AMERICANO.TITLE || "Cosmético Americano", href: "#americano-section" });
  }

  const brandsSection = document.getElementById("brands-section");
  if (brandsSection && !brandsSection.classList.contains("hidden")) {
    const brands = [...new Set(products.map((p) => p.marca).filter(Boolean))].sort();
    items.push({ type: "brands", label: "Marcas", options: brands });
  }

  const availableCategories = CATEGORY_MENU_OPTIONS.filter((cat) =>
    products.some((p) => p.categoria === cat)
  );
  if (availableCategories.length) {
    items.push({ type: "categories", label: "Categorías", options: availableCategories });
  }

  const countries = getCountryOptions();
  if (countries.length >= 2) {
    items.push({ type: "country", label: "País", options: countries });
  }

  return items;
}

function menuItemHTML(item, variant) {
  const isHorizontal = variant === "horizontal";
  const base = isHorizontal
    ? "text-sm font-semibold whitespace-nowrap"
    : "block px-5 py-4 border-b border-ink/10 font-semibold uppercase text-sm tracking-wide";

  if (item.type === "brands" || item.type === "categories" || item.type === "country") {
    const key = item.type;
    const optionAttr =
      item.type === "brands" ? "data-menu-brand" : item.type === "categories" ? "data-menu-category" : "data-menu-country";
    const dropdownOptions = item.options
      .map(
        (v) =>
          `<button type="button" ${optionAttr}="${escapeAttr(v)}"
            class="block w-full text-left px-4 py-2 text-sm text-ink/70 hover:bg-blush/40 hover:text-ink transition">${escapeHtml(v)}</button>`
      )
      .join("");
    if (isHorizontal) {
      return `<div class="relative" data-${key}-dropdown>
        <button type="button" data-${key}-toggle
          class="${base} text-ink/80 hover:text-ink transition inline-flex items-center gap-1">
          ${escapeHtml(item.label)}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div data-${key}-panel
          class="hidden fixed w-52 max-h-80 overflow-y-auto rounded-xl border border-ink/10 bg-cream shadow-lg py-2 z-50">
          ${dropdownOptions}
        </div>
      </div>`;
    }
    return `<div data-${key}-dropdown>
      <button type="button" data-${key}-toggle
        class="${base} w-full text-left text-ink/80 hover:text-ink transition inline-flex items-center justify-between">
        ${escapeHtml(item.label)}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div data-${key}-panel class="hidden bg-blush/10">${dropdownOptions}</div>
    </div>`;
  }
  return `<a href="${escapeAttr(item.href)}" data-menu-link
    class="${base} text-ink/80 hover:text-ink transition">${escapeHtml(item.label)}</a>`;
}

function wireMenuItems(container, onNavigate) {
  container.querySelectorAll("[data-menu-link]").forEach((link) => {
    link.addEventListener("click", () => {
      if (onNavigate) onNavigate();
    });
  });

  container.querySelectorAll("[data-brands-dropdown], [data-categories-dropdown], [data-country-dropdown]").forEach((wrap) => {
    const toggle = wrap.querySelector("[data-brands-toggle], [data-categories-toggle], [data-country-toggle]");
    const panel = wrap.querySelector("[data-brands-panel], [data-categories-panel], [data-country-panel]");
    // El panel fixed se saca al <body> para que no quede atrapado por el
    // "contenedor" que crea el backdrop-blur del header en elementos fixed
    // (si no, "top"/"left" quedan relativos al header en vez de la ventana).
    if (panel.classList.contains("fixed")) {
      document.body.appendChild(panel);
      panel.__trigger = wrap;
    }
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel.classList.contains("fixed")) {
        const rect = toggle.getBoundingClientRect();
        panel.style.top = `${rect.bottom + 2}px`;
        panel.style.left = `${rect.left}px`;
      }
      panel.classList.toggle("hidden");
    });
    panel.querySelectorAll("[data-menu-brand]").forEach((btn) => {
      btn.addEventListener("click", () => {
        panel.classList.add("hidden");
        if (onNavigate) onNavigate();
        showBrandProducts(btn.dataset.menuBrand);
      });
    });
    panel.querySelectorAll("[data-menu-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        panel.classList.add("hidden");
        if (onNavigate) onNavigate();
        showCategoryProducts(btn.dataset.menuCategory);
      });
    });
    panel.querySelectorAll("[data-menu-country]").forEach((btn) => {
      btn.addEventListener("click", () => {
        panel.classList.add("hidden");
        if (onNavigate) onNavigate();
        showCountryProducts(btn.dataset.menuCountry);
      });
    });
  });
}

document.addEventListener("click", (e) => {
  document.querySelectorAll("[data-brands-panel], [data-categories-panel], [data-country-panel]").forEach((panel) => {
    const owner = panel.__trigger || panel.parentElement;
    if (!panel.contains(e.target) && !owner.contains(e.target)) panel.classList.add("hidden");
  });
});

/* ======================================================================
   Navegación de escritorio (barra horizontal con flechas, siempre visible)
   ====================================================================== */
function renderCategoryNav() {
  const nav = document.getElementById("category-nav");
  const items = getMenuItems();
  nav.innerHTML = items.map((item) => menuItemHTML(item, "horizontal")).join("");
  wireMenuItems(nav);

  const prevBtn = document.getElementById("nav-prev");
  const nextBtn = document.getElementById("nav-next");
  prevBtn.addEventListener("click", () => nav.scrollBy({ left: -200, behavior: "smooth" }));
  nextBtn.addEventListener("click", () => nav.scrollBy({ left: 200, behavior: "smooth" }));
}

/* ======================================================================
   Menú móvil (☰)
   ====================================================================== */
function renderMobileMenu() {
  const nav = document.getElementById("mobile-menu-items");
  const items = getMenuItems();
  nav.innerHTML = items.map((item) => menuItemHTML(item, "vertical")).join("");
  wireMenuItems(nav, closeMobileMenu);
}

function openMobileMenu() {
  document.getElementById("mobile-menu").classList.remove("-translate-x-full");
  document.getElementById("menu-overlay").classList.remove("opacity-0", "pointer-events-none");
}

function closeMobileMenu() {
  document.getElementById("mobile-menu").classList.add("-translate-x-full");
  document.getElementById("menu-overlay").classList.add("opacity-0", "pointer-events-none");
}

/* ======================================================================
   Tarjeta de producto — reutilizada por Best Seller y tipo de piel.
   ====================================================================== */
function productCardHTML(p, { rank } = {}) {
  const img = p.imagen || placeholderImg(p.categoria || "Alpacca", "#e9c3be");
  const hasVariants = p.variants && p.variants.length > 1;
  return `
    <div class="group rounded-2xl bg-white/60 border border-ink/10 overflow-hidden flex flex-col h-full transition duration-300 hover:shadow-lg hover:border-rose/30">
      <div class="aspect-square bg-blush/20 overflow-hidden relative">
        ${rank ? `<span class="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-rose text-cream font-logo text-base flex items-center justify-center shadow">${rank}</span>` : ""}
        <img data-card-img src="${escapeAttr(img)}" alt="${escapeAttr(p.nombre)}" loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        <div data-card-badge class="absolute top-2 ${rank ? "right-2" : "left-2"}">${!p.disponible ? agotadoBadgeHTML() : ""}</div>
      </div>
      <div class="p-3 flex flex-col flex-1">
        ${
          p.presentacion
            ? `<span class="inline-block w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${
                p.presentacion.startsWith("Caja") ? "bg-lilac/20 text-lilac" : "bg-blush/50 text-ink/70"
              }">${escapeHtml(p.presentacion)}</span>`
            : ""
        }
        <span class="text-[11px] uppercase tracking-wide text-ink/40">${escapeHtml(p.marca || p.categoria)}</span>
        <h3 class="font-semibold text-sm text-ink leading-snug mt-0.5 line-clamp-2">${escapeHtml(p.nombre)}</h3>
        ${
          hasVariants
            ? `<select data-variant-select
                class="mt-1 w-full truncate text-xs border border-ink/15 rounded-md pl-1.5 pr-5 py-1 bg-white/70 text-ink/80 focus:outline-none focus:ring-2 focus:ring-blush">
                <option value="" selected disabled>Selecciona una versión</option>
                ${p.variants
                  .map((v) => `<option value="${escapeAttr(v.product.id)}">${escapeHtml(v.label)}</option>`)
                  .join("")}
              </select>`
            : ""
        }
        <div class="mt-auto pt-2 flex items-center justify-between gap-2">
          <div class="leading-tight">
            <span data-card-price class="font-display text-ink block">${formatPrice(p.precio)}</span>
            <span data-card-unit>${boxUnitPriceHTML(p)}</span>
          </div>
          <button data-add="${hasVariants ? "" : escapeAttr(p.id)}" ${!p.disponible || hasVariants ? "disabled" : ""}
            class="rounded-full bg-rose text-cream text-xs font-semibold px-3 py-1.5 hover:bg-rose/90 transition disabled:opacity-30 disabled:cursor-not-allowed">
            Agregar
          </button>
        </div>
      </div>
    </div>`;
}

function agotadoBadgeHTML() {
  return `<span class="bg-ink text-cream text-[10px] font-bold uppercase px-2 py-1 rounded-full">Agotado</span>`;
}

/* Agrupa variantes de tono/color o tipo/aroma del mismo producto en una
   sola tarjeta con selector, para que el catálogo no se vea saturado del
   mismo producto repetido por cada tono. Cada presentación (Pieza
   individual, Caja con 20 piezas, Caja con 160 piezas, etc.) se trata
   como un producto distinto e independiente: NUNCA se agrupan entre sí,
   cada una se muestra en su propia tarjeta (con su propio selector de
   tono si aplica). Cubre dos casos:
     - "... (#13 Neutral Ivory)"       → tono/color con código numérico
     - "... - 6 Types (Aqua Fit)"      → variante de tipo/aroma, señalada
                                          por "- N Types/Colors/..." antes
                                          del paréntesis final, para no
                                          agrupar paréntesis sueltos como
                                          "(5pz)" en productos sin variantes */
const SHADE_VARIANT_RE = /^(.*)\s\((#[^)]*)\)$/;
const TYPE_VARIANT_RE = /^(.*-\s*\d+\s+[A-Za-zÀ-ÿ]+)\s\(([^)]+)\)$/;

function groupVariants(list) {
  const parsed = list.map((p) => {
    const m = SHADE_VARIANT_RE.exec(p.nombre || "") || TYPE_VARIANT_RE.exec(p.nombre || "");
    const baseName = m ? m[1] : p.nombre || "";
    const shadeLabel = m ? m[2] : null;
    return { p, baseName, shadeLabel };
  });

  const order = [];
  const groups = new Map();
  for (const { p, baseName, shadeLabel } of parsed) {
    const key = `${p.marca}||${baseName}||${p.presentacion || ""}`;

    let entry = groups.get(key);
    const isNewFamily = !entry;
    if (isNewFamily) {
      entry = { ...p, nombre: baseName, variants: [] };
      groups.set(key, entry);
      order.push(entry);
    }
    // Solo se agrupa en un selector si hay más de un tono dentro de la
    // misma presentación exacta; un producto con un solo tono se muestra
    // tal cual, sin lista.
    if (shadeLabel) {
      entry.variants.push({ label: shadeLabel, product: p });
    } else if (isNewFamily) {
      order[order.length - 1] = p;
      groups.set(key, p);
    }
  }
  for (const entry of order) {
    if (entry.variants && entry.variants.length <= 1) delete entry.variants;
  }
  return order;
}

function wireVariantSelectors(container) {
  container.querySelectorAll("[data-variant-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const variant = products.find((p) => p.id === select.value);
      const card = select.closest(".group");
      if (!card) return;

      const addBtn = card.querySelector("[data-add]");
      if (!variant) {
        addBtn.dataset.add = "";
        addBtn.disabled = true;
        return;
      }
      addBtn.dataset.add = variant.id;
      addBtn.disabled = !variant.disponible;

      const priceEl = card.querySelector("[data-card-price]");
      if (priceEl) priceEl.textContent = formatPrice(variant.precio);

      const unitEl = card.querySelector("[data-card-unit]");
      if (unitEl) unitEl.innerHTML = boxUnitPriceHTML(variant);

      const badgeEl = card.querySelector("[data-card-badge]");
      if (badgeEl) badgeEl.innerHTML = variant.disponible ? "" : agotadoBadgeHTML();

      const imgEl = card.querySelector("[data-card-img]");
      if (imgEl && variant.imagen) imgEl.src = variant.imagen;
    });
  });
}

/* Para presentaciones "Caja con N piezas", muestra el costo por pieza
   individual para que el cliente no tenga que dividir el total. */
function boxUnitPriceHTML(p) {
  const match = /Caja con (\d+) piezas/i.exec(p.presentacion || "");
  if (!match) return "";
  const qty = Number(match[1]);
  if (!qty) return "";
  return `<span class="block text-[10px] text-ink/40">${formatPrice(p.precio / qty)} c/u</span>`;
}

function wireAddButtons(container) {
  container.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

/* ======================================================================
   Cosmético Americano — tarjeta de producto propia (precio en pesos, precio
   original tachado si aplica, y MOQ por color/tono en vez de la etiqueta
   de presentación normal).
   ====================================================================== */
function americanoProductCardHTML(p) {
  const img = p.imagen || placeholderImg(p.marca || "Cosmético Americano", "#e9c3be");
  const hasVariants = p.variants && p.variants.length > 1;
  const hasDiscount = p.precioOriginal > p.precio;
  return `
    <div class="group rounded-2xl bg-white/60 border border-ink/10 overflow-hidden flex flex-col h-full transition duration-300 hover:shadow-lg hover:border-rose/30">
      <div class="aspect-square bg-blush/20 overflow-hidden relative">
        <img data-card-img src="${escapeAttr(img)}" alt="${escapeAttr(p.nombre)}" loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        <div data-card-badge class="absolute top-2 left-2">${!p.disponible ? agotadoBadgeHTML() : ""}</div>
      </div>
      <div class="p-3 flex flex-col flex-1">
        <span class="inline-block w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 bg-ink/10 text-ink/70" data-card-moq>MOQ: ${p.moq}</span>
        <span class="text-[11px] uppercase tracking-wide text-ink/40">${escapeHtml(p.marca)}</span>
        <h3 class="font-semibold text-sm text-ink leading-snug mt-0.5 line-clamp-2">${escapeHtml(p.nombre)}</h3>
        ${
          hasVariants
            ? `<select data-variant-select
                class="mt-1 w-full truncate text-xs border border-ink/15 rounded-md pl-1.5 pr-5 py-1 bg-white/70 text-ink/80 focus:outline-none focus:ring-2 focus:ring-blush">
                <option value="" selected disabled>Selecciona una versión</option>
                ${p.variants
                  .map((v) => `<option value="${escapeAttr(v.product.id)}">${escapeHtml(v.label)}</option>`)
                  .join("")}
              </select>`
            : ""
        }
        <div class="mt-auto pt-2 flex items-center justify-between gap-2">
          <div class="leading-tight">
            <span data-card-price class="font-display text-ink block">${formatPrice(p.precio)}</span>
            ${hasDiscount ? `<span data-card-original class="flex items-center gap-1 text-[10px]"><span class="text-ink/40">Precio Sephora</span><span class="text-red-500 line-through">${formatPrice(p.precioOriginal)}</span></span>` : `<span data-card-original class="hidden"></span>`}
          </div>
          <button data-americano-add="${hasVariants ? "" : escapeAttr(p.id)}" ${!p.disponible || hasVariants ? "disabled" : ""}
            class="rounded-full bg-ink text-cream text-xs font-semibold px-3 py-1.5 hover:bg-ink/90 transition disabled:opacity-30 disabled:cursor-not-allowed">
            Agregar
          </button>
        </div>
      </div>
    </div>`;
}

function wireAmericanoAddButtons(container) {
  container.querySelectorAll("[data-americano-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToAmericanoCart(btn.dataset.americanoAdd));
  });
}

function wireAmericanoVariantSelectors(container) {
  container.querySelectorAll("[data-variant-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const variant = americanoProducts.find((p) => p.id === select.value);
      const card = select.closest(".group");
      if (!card) return;

      const addBtn = card.querySelector("[data-americano-add]");
      if (!variant) {
        addBtn.dataset.americanoAdd = "";
        addBtn.disabled = true;
        return;
      }
      addBtn.dataset.americanoAdd = variant.id;
      addBtn.disabled = !variant.disponible;

      const priceEl = card.querySelector("[data-card-price]");
      if (priceEl) priceEl.textContent = formatPrice(variant.precio);

      const originalEl = card.querySelector("[data-card-original]");
      if (originalEl) {
        const hasDiscount = variant.precioOriginal > variant.precio;
        originalEl.className = hasDiscount ? "flex items-center gap-1 text-[10px]" : "hidden";
        originalEl.innerHTML = hasDiscount
          ? `<span class="text-ink/40">Precio Sephora</span><span class="text-red-500 line-through">${formatPrice(variant.precioOriginal)}</span>`
          : "";
      }

      const moqEl = card.querySelector("[data-card-moq]");
      if (moqEl) moqEl.textContent = `MOQ: ${variant.moq}`;

      const badgeEl = card.querySelector("[data-card-badge]");
      if (badgeEl) badgeEl.innerHTML = variant.disponible ? "" : agotadoBadgeHTML();

      const imgEl = card.querySelector("[data-card-img]");
      if (imgEl && variant.imagen) imgEl.src = variant.imagen;
    });
  });
}

function renderAmericanoSection() {
  const section = document.getElementById("americano-section");
  if (!americanoProducts.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  document.getElementById("americano-section-title").textContent = CONFIG.AMERICANO.TITLE || "Cosmético Americano";
  document.getElementById("americano-section-subtitle").textContent = CONFIG.AMERICANO.SUBTITLE || "";
  document.getElementById("americano-min-order-note").textContent =
    `Pedido mínimo: ${formatPrice(CONFIG.AMERICANO.MIN_ORDER_MXN)} · MOQ por color/tono`;

  const items = groupVariants(americanoProducts);
  const grid = document.getElementById("americano-grid");
  const empty = document.getElementById("americano-empty");
  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => americanoProductCardHTML(p)).join("");
    wireAmericanoAddButtons(grid);
    wireAmericanoVariantSelectors(grid);
  }
}

/* ======================================================================
   Best Seller — top 6 numerado. Usa los productos cuya columna
   "Destacado" incluye la etiqueta "Best Seller" (hasta 6, en el orden
   del Google Sheet). Si no hay ninguno, la sección se oculta.
   ====================================================================== */
function renderBestSellers() {
  const section = document.getElementById("featured-section");
  const items = groupVariants(products.filter((p) => (p.destacado || []).includes("Best Seller"))).slice(0, 6);

  if (!items.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const grid = document.getElementById("featured-top");
  grid.innerHTML = items.map((p, i) => productCardHTML(p, { rank: i + 1 })).join("");
  wireAddButtons(grid);
  wireVariantSelectors(grid);
}

/* ======================================================================
   Quiz de tipo de piel. Preguntas en CONFIG.SKIN_QUIZ; cada opción apunta
   a un tipo (debe coincidir con las etiquetas de la columna "TipoPiel" del
   Google Sheet). Al terminar, se guarda el resultado en localStorage y se
   muestran los productos de ese tipo. Se oculta si el catálogo no tiene
   datos de TipoPiel, o si no hay preguntas configuradas.
   ====================================================================== */
const SKIN_QUIZ_KEY = "alpacca_skin_quiz_result_v1";
let quizIndex = 0;
let quizAnswers = [];

function renderSkinTypeSection() {
  const section = document.getElementById("skintype-section");
  const hasSkinData = products.some((p) => (p.tipoPiel || []).length > 0);
  const hasQuiz = (CONFIG.SKIN_QUIZ || []).length > 0;

  if (!hasSkinData || !hasQuiz) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const saved = localStorage.getItem(SKIN_QUIZ_KEY);
  if (saved) {
    showQuizResult(saved);
  } else {
    quizIndex = 0;
    quizAnswers = [];
    renderQuizQuestion();
  }
}

function renderQuizQuestion() {
  document.getElementById("skin-quiz").classList.remove("hidden");
  document.getElementById("skin-quiz-result").classList.add("hidden");

  const questions = CONFIG.SKIN_QUIZ;
  const q = questions[quizIndex];

  document.getElementById("quiz-progress").innerHTML = questions
    .map((_, i) => `<span class="w-6 h-1.5 rounded-full ${i <= quizIndex ? "bg-rose" : "bg-ink/15"}"></span>`)
    .join("");

  document.getElementById("quiz-question").textContent = q.question;

  const optionsWrap = document.getElementById("quiz-options");
  optionsWrap.innerHTML = q.options
    .map(
      (opt, i) => `<button type="button" data-opt="${i}"
        class="rounded-xl border border-ink/15 bg-white/60 px-4 py-3 text-sm font-semibold text-ink text-left hover:border-ink/40 hover:bg-white transition">
        ${escapeHtml(opt.label)}
      </button>`
    )
    .join("");
  optionsWrap.querySelectorAll("[data-opt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      quizAnswers[quizIndex] = q.options[Number(btn.dataset.opt)].type;
      if (quizIndex < questions.length - 1) {
        quizIndex += 1;
        renderQuizQuestion();
      } else {
        const result = computeQuizResult(quizAnswers);
        localStorage.setItem(SKIN_QUIZ_KEY, result);
        showQuizResult(result);
      }
    });
  });

  const backBtn = document.getElementById("quiz-back");
  if (quizIndex > 0) {
    backBtn.classList.remove("hidden");
    backBtn.onclick = () => {
      quizIndex -= 1;
      renderQuizQuestion();
    };
  } else {
    backBtn.classList.add("hidden");
  }
}

function computeQuizResult(answers) {
  const counts = {};
  answers.forEach((type) => {
    counts[type] = (counts[type] || 0) + 1;
  });
  let best = answers[0];
  let bestCount = 0;
  answers.forEach((type) => {
    if (counts[type] > bestCount) {
      best = type;
      bestCount = counts[type];
    }
  });
  return best;
}

function showQuizResult(type) {
  document.getElementById("skin-quiz").classList.add("hidden");
  document.getElementById("skin-quiz-result").classList.remove("hidden");

  document.getElementById("quiz-result-emoji").textContent = CONFIG.SKIN_TYPE_EMOJI[type] || CONFIG.SKIN_TYPE_DEFAULT_EMOJI;
  document.getElementById("quiz-result-label").textContent = type;

  const items = groupVariants(products.filter((p) => (p.tipoPiel || []).includes(type)));
  const row = document.getElementById("skintype-row");
  const empty = document.getElementById("skintype-empty");

  if (!items.length) {
    row.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    row.innerHTML = items
      .map((p) => `<div class="w-40 sm:w-48 flex-shrink-0 snap-start">${productCardHTML(p)}</div>`)
      .join("");
    wireAddButtons(row);
    wireVariantSelectors(row);
  }
}

/* ======================================================================
   Franja promocional ancha
   ====================================================================== */
function renderPromoBanner() {
  const promo = CONFIG.PROMO_BANNER;
  if (!promo) return;
  document.getElementById("promo-title").textContent = promo.title || "";
  document.getElementById("promo-subtitle").textContent = promo.subtitle || "";
  const cta = document.getElementById("promo-cta");
  if (promo.ctaText) {
    cta.textContent = promo.ctaText;
    cta.href = promo.ctaHref || "#";
    cta.classList.remove("hidden");
  } else {
    cta.classList.add("hidden");
  }
}

/* ======================================================================
   Marcas — derivadas de la columna Marca del catálogo (no logos externos)
   ====================================================================== */
const BRANDS_PREVIEW_COUNT = 5;

function renderBrands(showAll = false) {
  const section = document.getElementById("brands-section");
  const brands = [...new Set(products.map((p) => p.marca).filter(Boolean))].sort();
  if (!brands.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const brandButton = (b) => `<button type="button" data-brand="${escapeAttr(b)}"
        class="rounded-xl border border-ink/10 bg-white/50 py-4 px-3 text-center text-sm font-semibold text-ink/70 hover:border-rose hover:text-rose transition">${escapeHtml(b)}</button>`;

  const hasMore = !showAll && brands.length > BRANDS_PREVIEW_COUNT;
  const visibleBrands = hasMore ? brands.slice(0, BRANDS_PREVIEW_COUNT) : brands;

  const moreTile = hasMore
    ? `<button type="button" id="brands-show-more"
        class="rounded-xl border border-ink/10 bg-white/50 py-4 px-3 text-center text-sm font-semibold text-ink/70 hover:border-rose hover:text-rose transition">Y más</button>`
    : "";

  document.getElementById("brands-grid").innerHTML = visibleBrands.map(brandButton).join("") + moreTile;

  document.querySelectorAll("[data-brand]").forEach((btn) => {
    btn.addEventListener("click", () => showBrandProducts(btn.dataset.brand));
  });

  const showMoreBtn = document.getElementById("brands-show-more");
  if (showMoreBtn) {
    showMoreBtn.addEventListener("click", () => renderBrands(true));
  }
}

function showBrandProducts(marca) {
  const items = groupVariants(products.filter((p) => p.marca === marca));
  const grid = document.getElementById("brand-products-grid");
  const empty = document.getElementById("brand-products-empty");

  document.getElementById("brand-products-title").textContent = `Productos de ${marca}`;

  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => productCardHTML(p)).join("");
    wireAddButtons(grid);
    wireVariantSelectors(grid);
  }

  showHomeView("brands");
  document.getElementById("brand-products-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ======================================================================
   País -- las marcas se agrupan por país de origen. Solo Shiseido es
   japonesa; el resto del catálogo es surcoreano.
   ====================================================================== */
const COUNTRY_BRAND_OVERRIDES = { Japón: ["Shiseido", "SK-II"] };
const COUNTRY_ORDER = ["Corea del Sur", "Japón"];

function brandCountry(marca) {
  for (const [country, brands] of Object.entries(COUNTRY_BRAND_OVERRIDES)) {
    if (brands.includes(marca)) return country;
  }
  return "Corea del Sur";
}

function getCountryOptions() {
  const present = new Set(products.map((p) => brandCountry(p.marca)).filter(Boolean));
  const ordered = COUNTRY_ORDER.filter((c) => present.has(c));
  const rest = [...present].filter((c) => !COUNTRY_ORDER.includes(c)).sort();
  return [...ordered, ...rest];
}

function showCountryProducts(pais) {
  const items = groupVariants(products.filter((p) => brandCountry(p.marca) === pais));
  const grid = document.getElementById("country-products-grid");
  const empty = document.getElementById("country-products-empty");

  document.getElementById("country-products-title").textContent = `Marcas de ${pais}`;

  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => productCardHTML(p)).join("");
    wireAddButtons(grid);
    wireVariantSelectors(grid);
  }

  showHomeView("country");
  document.getElementById("country-products-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showCategoryProducts(categoria) {
  const items = groupVariants(products.filter((p) => p.categoria === categoria));
  const grid = document.getElementById("category-products-grid");
  const empty = document.getElementById("category-products-empty");

  document.getElementById("category-products-title").textContent = `Categoría: ${categoria}`;

  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => productCardHTML(p)).join("");
    wireAddButtons(grid);
    wireVariantSelectors(grid);
  }

  showHomeView("categories");
  document.getElementById("category-products-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ======================================================================
   Búsqueda — filtra por nombre, marca y categoría. Muestra resultados
   en vivo mientras el cliente escribe; solo hace scroll al enviar
   (Enter) para no saltar la página en cada tecla.
   ====================================================================== */
function normalizeForSearch(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/* Solo una de estas vistas está visible a la vez: el home normal, los
   resultados de búsqueda, el catálogo completo, o los productos de una
   marca. Header, barra de categorías y footer siempre se quedan visibles. */
function showHomeView(view) {
  document.getElementById("homepage-sections").classList.toggle("hidden", view !== "home");
  document.getElementById("search-results-section").classList.toggle("hidden", view !== "search");
  document.getElementById("catalog-section").classList.toggle("hidden", view !== "catalog");
  document.getElementById("brand-products-section").classList.toggle("hidden", view !== "brands");
  document.getElementById("category-products-section").classList.toggle("hidden", view !== "categories");
  document.getElementById("country-products-section").classList.toggle("hidden", view !== "country");
}

function renderSearchResults(query) {
  const q = normalizeForSearch(query).trim();

  if (!q) {
    showHomeView("home");
    return;
  }

  const items = groupVariants(
    products.filter(
      (p) =>
        normalizeForSearch(p.nombre).includes(q) ||
        normalizeForSearch(p.marca).includes(q) ||
        normalizeForSearch(p.categoria).includes(q)
    )
  );

  document.getElementById("search-results-title").textContent = `Resultados para "${query.trim()}"`;
  showHomeView("search");

  const grid = document.getElementById("search-results-grid");
  const empty = document.getElementById("search-results-empty");
  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => productCardHTML(p)).join("");
    wireAddButtons(grid);
    wireVariantSelectors(grid);
  }
}

/* ======================================================================
   Catálogo completo -- todos los productos del Sheet, sin filtrar.
   ====================================================================== */
function openFullCatalog() {
  document.getElementById("search-input").value = "";

  const items = groupVariants(products);
  const grid = document.getElementById("catalog-grid");
  const empty = document.getElementById("catalog-empty");
  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => productCardHTML(p)).join("");
    wireAddButtons(grid);
    wireVariantSelectors(grid);
  }

  showHomeView("catalog");
}

/* ======================================================================
   Beneficios
   ====================================================================== */
function renderBenefits() {
  const items = CONFIG.BENEFITS || [];
  document.getElementById("benefits-grid").innerHTML = items
    .map(
      (b) => `<div class="text-center">
        <div class="text-3xl mb-2">${b.emoji || ""}</div>
        <p class="font-semibold text-sm text-ink">${escapeHtml(b.title)}</p>
        <p class="text-xs text-ink/50 mt-0.5">${escapeHtml(b.text)}</p>
      </div>`
    )
    .join("");
}

function renderAll() {
  // El orden importa: renderCategoryNav/renderMobileMenu leen qué secciones
  // quedaron visibles, así que corren después de decidir esa visibilidad.
  renderBestSellers();
  renderSkinTypeSection();
  renderBrands();
  renderCategoryNav();
  renderMobileMenu();
  renderCart();
}

/* ======================================================================
   Cosmético Americano — carrito propio (independiente del carrito principal:
   estado, localStorage, mínimo de pedido y mensaje de WhatsApp separados).
   El MOQ es por variante (color/tono): al agregar un producto por primera
   vez se agrega la cantidad mínima completa, y no se puede bajar de ahí
   sin quitar la línea del carrito.
   ====================================================================== */
function addToAmericanoCart(id) {
  const product = americanoProducts.find((p) => p.id === id);
  if (!product || !product.disponible) return;
  if (americanoCart[id]) americanoCart[id].qty += 1;
  else americanoCart[id] = { product, qty: Math.max(1, product.moq || 1) };
  saveAmericanoCart();
  renderAmericanoCart();
  openAmericanoCart();
}

function changeAmericanoQty(id, delta) {
  const item = americanoCart[id];
  if (!item) return;
  const newQty = item.qty + delta;
  const moq = Math.max(1, item.product.moq || 1);
  if (newQty < moq) delete americanoCart[id];
  else item.qty = newQty;
  saveAmericanoCart();
  renderAmericanoCart();
}

function removeFromAmericanoCart(id) {
  delete americanoCart[id];
  saveAmericanoCart();
  renderAmericanoCart();
}

function americanoCartTotal() {
  return Object.values(americanoCart).reduce((sum, it) => sum + it.product.precio * it.qty, 0);
}

function americanoCartCount() {
  return Object.values(americanoCart).reduce((sum, it) => sum + it.qty, 0);
}

function renderAmericanoCart() {
  const wrap = document.getElementById("americano-cart-items");
  const emptyMsg = document.getElementById("americano-cart-empty");
  const items = Object.entries(americanoCart);

  const total = americanoCartTotal();
  const minMXN = CONFIG.AMERICANO.MIN_ORDER_MXN || 0;
  const belowMin = items.length > 0 && total < minMXN;

  document.getElementById("americano-cart-count").textContent = americanoCartCount();
  document.getElementById("americano-cart-total-label").textContent = `Total productos (${americanoCartCount()})`;
  document.getElementById("americano-cart-total").textContent = formatPrice(total);
  document.getElementById("americano-cart-total-header").textContent = formatPrice(total);

  const minMsg = document.getElementById("americano-cart-min-order");
  if (belowMin) {
    minMsg.textContent = `Te faltan ${formatPrice(minMXN - total)} para tu pedido mínimo de ${formatPrice(minMXN)}.`;
    minMsg.classList.remove("hidden");
  } else {
    minMsg.classList.add("hidden");
  }

  const sendBtn = document.getElementById("americano-send-quote");
  sendBtn.disabled = items.length === 0 || belowMin;

  if (!items.length) {
    wrap.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  wrap.innerHTML = items
    .map(([id, it]) => {
      const img = it.product.imagen || placeholderImg(it.product.marca || "Cosmético Americano", "#e9c3be");
      const moq = Math.max(1, it.product.moq || 1);
      return `
      <div class="flex gap-3 items-center">
        <img src="${escapeAttr(img)}" alt="${escapeAttr(it.product.nombre)}" class="w-16 h-16 rounded-lg object-cover border border-ink/10" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ink truncate">${escapeHtml(it.product.nombre)}</p>
          <p class="text-xs text-ink/50">${formatPrice(it.product.precio)} c/u · MOQ ${moq}</p>
          <div class="mt-1 flex items-center gap-2">
            <button data-americano-dec="${escapeAttr(id)}" class="w-6 h-6 rounded-full border border-ink/20 text-ink text-sm leading-none hover:bg-ink/5">−</button>
            <span class="text-sm w-5 text-center">${it.qty}</span>
            <button data-americano-inc="${escapeAttr(id)}" class="w-6 h-6 rounded-full border border-ink/20 text-ink text-sm leading-none hover:bg-ink/5">+</button>
            <button data-americano-remove="${escapeAttr(id)}" class="ml-2 text-xs text-ink/40 hover:text-ink/70 underline">quitar</button>
          </div>
        </div>
        <span class="text-sm font-semibold text-ink whitespace-nowrap">${formatPrice(it.product.precio * it.qty)}</span>
      </div>`;
    })
    .join("");

  wrap.querySelectorAll("[data-americano-inc]").forEach((b) => b.addEventListener("click", () => changeAmericanoQty(b.dataset.americanoInc, 1)));
  wrap.querySelectorAll("[data-americano-dec]").forEach((b) => b.addEventListener("click", () => changeAmericanoQty(b.dataset.americanoDec, -1)));
  wrap.querySelectorAll("[data-americano-remove]").forEach((b) => b.addEventListener("click", () => removeFromAmericanoCart(b.dataset.americanoRemove)));
}

function openAmericanoCart() {
  document.getElementById("americano-cart-drawer").classList.remove("translate-x-full");
  document.getElementById("americano-cart-overlay").classList.remove("opacity-0", "pointer-events-none");
}

function closeAmericanoCart() {
  document.getElementById("americano-cart-drawer").classList.add("translate-x-full");
  document.getElementById("americano-cart-overlay").classList.add("opacity-0", "pointer-events-none");
}

function buildAmericanoWhatsAppMessage() {
  const items = Object.values(americanoCart);
  const name = document.getElementById("americano-customer-name").value.trim();
  const phone = document.getElementById("americano-customer-phone").value.trim();
  const notes = document.getElementById("americano-customer-notes").value.trim();

  const lines = items.map((it, i) => {
    const marca = it.product.marca ? `${it.product.marca} — ` : "";
    return `${i + 1}. ${marca}${it.product.nombre} x${it.qty} (MOQ ${it.product.moq}) — ${formatPrice(it.product.precio * it.qty)}`;
  });

  const parts = [
    `Hola ${CONFIG.AMERICANO.BUSINESS_NAME}! Quiero pedir esto de ${CONFIG.AMERICANO.TITLE || "Cosmético Americano"}:`,
    "",
    ...lines,
    "",
    `*Total: ${formatPrice(americanoCartTotal())}*`,
    "Envío e importación se cotizan aparte.",
    "",
    `Nombre: ${name}`,
  ];
  if (phone) parts.push(`Teléfono: ${phone}`);
  if (notes) parts.push(`Notas: ${notes}`);

  return parts.join("\n");
}

function sendAmericanoQuote(e) {
  e.preventDefault();
  if (!Object.keys(americanoCart).length) return;

  const minMXN = CONFIG.AMERICANO.MIN_ORDER_MXN || 0;
  if (americanoCartTotal() < minMXN) {
    setStatus(`Tu pedido de ${CONFIG.AMERICANO.TITLE || "Cosmético Americano"} no alcanza el mínimo de compra (${formatPrice(minMXN)}).`);
    return;
  }

  const numberIsPlaceholder = !CONFIG.AMERICANO.WHATSAPP_NUMBER || CONFIG.AMERICANO.WHATSAPP_NUMBER.includes("XXXX");
  if (numberIsPlaceholder) {
    setStatus("Falta configurar CONFIG.AMERICANO.WHATSAPP_NUMBER en app.js con tu número real.");
    return;
  }

  const message = buildAmericanoWhatsAppMessage();
  const url = `https://wa.me/${CONFIG.AMERICANO.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) window.location.href = url;

  americanoCart = {};
  saveAmericanoCart();
  renderAmericanoCart();
  document.getElementById("americano-quote-form").reset();
  closeAmericanoCart();
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

function cartWeight() {
  return Object.values(cart).reduce((sum, it) => sum + (it.product.peso || 0) * it.qty, 0);
}

function formatWeight(kg) {
  return `${(kg || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
}

function minOrderMXN() {
  return CONFIG.MIN_ORDER_MXN || 0;
}

function updateNacionalShippingUI() {
  const row = document.getElementById("cart-shipping-nacional-row");
  const label = document.getElementById("cart-shipping-nacional-label");
  const amount = document.getElementById("cart-shipping-nacional");
  const cp = document.getElementById("customer-cp").value.trim();

  if (!Object.keys(cart).length || cp.length !== 5) {
    row.classList.add("hidden");
    renderGrandTotal();
    return;
  }

  const shipping = shippingEstimate(cartWeight(), cp);
  if (shipping && shipping.hasNacional) {
    label.textContent = `🚚 Envío nacional (estimado) a CP ${cp}`;
    amount.textContent = formatPrice(shipping.nacionalMXN);
  } else {
    label.textContent = "🚚 Envío nacional";
    amount.textContent = "Se confirmará por WhatsApp";
  }
  row.classList.remove("hidden");
  renderGrandTotal();
}

function renderGrandTotal() {
  const cp = document.getElementById("customer-cp").value.trim();
  const shipping = shippingEstimate(cartWeight(), cp);

  let grandTotal = cartTotal();
  if (shipping && shipping.hasKorea) grandTotal += shipping.coreaMXN;
  if (shipping && shipping.hasNacional) grandTotal += shipping.nacionalMXN;

  document.getElementById("cart-grand-total").textContent = formatPrice(grandTotal);
}

function renderCart() {
  const wrap = document.getElementById("cart-items");
  const emptyMsg = document.getElementById("cart-empty");
  const items = Object.entries(cart);

  const total = cartTotal();
  const minMXN = minOrderMXN();
  const belowMin = items.length > 0 && total < minMXN;

  document.getElementById("cart-count").textContent = cartCount();
  document.getElementById("cart-total-label").textContent = `Total productos (${cartCount()})`;
  document.getElementById("cart-total").textContent = formatPrice(total);
  document.getElementById("cart-total-header").textContent = formatPrice(total);

  const minMsg = document.getElementById("cart-min-order");
  if (belowMin) {
    minMsg.textContent = `Te faltan ${formatPrice(minMXN - total)} para tu pedido mínimo de ${formatPrice(minMXN)}.`;
    minMsg.classList.remove("hidden");
  } else {
    minMsg.classList.add("hidden");
  }

  const koreaRow = document.getElementById("cart-shipping-korea-row");
  const shipping = shippingEstimate(cartWeight(), "");
  if (items.length && shipping && shipping.hasKorea) {
    document.getElementById("cart-shipping-korea").textContent = formatPrice(shipping.coreaMXN);
    koreaRow.classList.remove("hidden");
  } else {
    koreaRow.classList.add("hidden");
  }
  updateNacionalShippingUI();

  const sendBtn = document.getElementById("send-quote");
  sendBtn.disabled = items.length === 0 || belowMin;

  if (!items.length) {
    wrap.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  wrap.innerHTML = items
    .map(([id, it]) => {
      const img = it.product.imagen || placeholderImg(it.product.categoria || "Alpacca", "#e9c3be");
      return `
      <div class="flex gap-3 items-center">
        <img src="${escapeAttr(img)}" alt="${escapeAttr(it.product.nombre)}" class="w-16 h-16 rounded-lg object-cover border border-ink/10" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ink truncate">${escapeHtml(it.product.nombre)}</p>
          ${it.product.presentacion ? `<p class="text-xs text-ink/50">${escapeHtml(it.product.presentacion)}</p>` : ""}
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
  const cp = document.getElementById("customer-cp").value.trim();
  const notes = document.getElementById("customer-notes").value.trim();

  const lines = items.map((it, i) => {
    const nombre = it.product.presentacion ? `${it.product.nombre} (${it.product.presentacion})` : it.product.nombre;
    const marca = it.product.marca ? `${it.product.marca} — ` : "";
    return `${i + 1}. ${marca}${nombre} x${it.qty} — ${formatPrice(it.product.precio * it.qty)}`;
  });

  const weight = cartWeight();
  const shipping = shippingEstimate(weight, cp);
  const grandTotal = cartTotal() + (shipping ? shipping.totalMXN : 0);

  const parts = [
    `Hola ${CONFIG.BUSINESS_NAME}! Quiero cotizar lo siguiente:`,
    "",
    ...lines,
    "",
    `Subtotal productos: ${formatPrice(cartTotal())}`,
    `📦 Peso total estimado: ${formatWeight(weight)}`,
  ];

  if (shipping) {
    parts.push(`🚚 Envío estimado (referencia, sujeto a confirmación): ${formatPrice(shipping.totalMXN)}`);
    if (shipping.hasKorea) {
      parts.push(`   • Corea→México: ${formatPrice(shipping.coreaMXN)}`);
    }
    if (shipping.hasNacional) {
      parts.push(`   • Nacional MX (Estafeta, CP ${cp}): ${formatPrice(shipping.nacionalMXN)}`);
    }
  }

  parts.push("", `*Total a pagar: ${formatPrice(grandTotal)}*`);

  parts.push("", `Nombre: ${name}`);
  if (phone) parts.push(`Teléfono: ${phone}`);
  if (cp) parts.push(`Código postal: ${cp}`);
  if (notes) parts.push(`Notas: ${notes}`);

  return parts.join("\n");
}

function sendQuote(e) {
  e.preventDefault();
  if (!Object.keys(cart).length) return;

  if (cartTotal() < minOrderMXN()) {
    setStatus(`Tu pedido no alcanza el mínimo de compra (${formatPrice(minOrderMXN())}).`);
    return;
  }

  const numberIsPlaceholder = !CONFIG.WHATSAPP_NUMBER || CONFIG.WHATSAPP_NUMBER.includes("XXXX");
  if (numberIsPlaceholder) {
    setStatus("Falta configurar CONFIG.WHATSAPP_NUMBER en app.js con tu número real.");
    return;
  }

  const message = buildWhatsAppMessage();
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const opened = window.open(url, "_blank", "noopener");
  // Algunos navegadores integrados (ej. el de WhatsApp) bloquean la
  // ventana emergente en vez de abrirla; en ese caso navegamos en la
  // misma pestaña para que el link sí funcione.
  if (!opened) window.location.href = url;

  cart = {};
  saveCart();
  renderCart();
  document.getElementById("quote-form").reset();
  closeCart();
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
/* Construye el link de WhatsApp con un mensaje dado, o null si todavía
   falta configurar CONFIG.WHATSAPP_NUMBER. Se usa en todos los botones
   "Hablar con Mae" del sitio (flotante, footer, hero, sección de
   confianza) para que ninguno quede con un link roto o desactualizado. */
function whatsappHref(message) {
  const numberIsPlaceholder = !CONFIG.WHATSAPP_NUMBER || CONFIG.WHATSAPP_NUMBER.includes("XXXX");
  if (numberIsPlaceholder) return null;
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function initWhatsAppFloat() {
  const buttons = [
    document.getElementById("whatsapp-float"),
    document.getElementById("footer-contact-link"),
    document.getElementById("why-alpacca-whatsapp"),
  ].filter(Boolean);

  const href = whatsappHref(`Hola ${CONFIG.BUSINESS_NAME}! Tengo una pregunta.`);

  if (!href) {
    buttons.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        setStatus("Falta configurar CONFIG.WHATSAPP_NUMBER en app.js con tu número real.");
      })
    );
    return;
  }

  buttons.forEach((btn) => {
    btn.href = href;
    btn.target = "_blank";
    btn.rel = "noopener";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  document.getElementById("cart-toggle").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-overlay").addEventListener("click", closeCart);

  document.getElementById("americano-cart-toggle").addEventListener("click", openAmericanoCart);
  document.getElementById("americano-cart-close").addEventListener("click", closeAmericanoCart);
  document.getElementById("americano-cart-overlay").addEventListener("click", closeAmericanoCart);
  document.getElementById("americano-quote-form").addEventListener("submit", sendAmericanoQuote);
  document.getElementById("americano-close").addEventListener("click", () => {
    document.getElementById("americano-section").classList.add("hidden");
    document.getElementById("top").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("menu-toggle").addEventListener("click", openMobileMenu);
  document.getElementById("menu-close").addEventListener("click", closeMobileMenu);
  document.getElementById("menu-overlay").addEventListener("click", closeMobileMenu);
  document.getElementById("quote-form").addEventListener("submit", sendQuote);
  document.getElementById("customer-cp").addEventListener("input", updateNacionalShippingUI);

  document.getElementById("quiz-retake").addEventListener("click", () => {
    localStorage.removeItem(SKIN_QUIZ_KEY);
    quizIndex = 0;
    quizAnswers = [];
    renderQuizQuestion();
  });

  document.getElementById("brand-products-clear").addEventListener("click", () => {
    showHomeView("home");
    document.getElementById("brands-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("category-products-clear").addEventListener("click", () => {
    showHomeView("home");
  });

  document.getElementById("country-products-clear").addEventListener("click", () => {
    showHomeView("home");
  });

  document.getElementById("footer-shipping-link").addEventListener("click", openCart);

  const faqMinOrder = document.getElementById("faq-min-order");
  if (faqMinOrder && CONFIG.MIN_ORDER_MXN) {
    faqMinOrder.textContent = `Es de ${formatPrice(CONFIG.MIN_ORDER_MXN)}.`;
  }

  // Si el usuario hace clic en un enlace ancla (menú, footer, CTAs) mientras
  // la búsqueda está activa, primero hay que volver a mostrar las secciones
  // normales -- si no, el navegador intenta saltar a una sección que sigue
  // oculta y no pasa nada.
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute("href").slice(1);
    if (href === "catalog-section") {
      openFullCatalog();
      return;
    }
    if (href === "americano-section" && americanoProducts.length) {
      document.getElementById("americano-section").classList.remove("hidden");
      return;
    }
    const target = document.getElementById(href);
    const homepageSections = document.getElementById("homepage-sections");
    if (target && homepageSections.contains(target) && homepageSections.classList.contains("hidden")) {
      showHomeView("home");
    }
  });

  const searchInput = document.getElementById("search-input");
  document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    renderSearchResults(searchInput.value);
    document.getElementById("search-results-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));
  document.getElementById("search-results-clear").addEventListener("click", () => {
    searchInput.value = "";
    showHomeView("home");
  });
  document.getElementById("catalog-clear").addEventListener("click", () => showHomeView("home"));

  renderTopBar();
  renderHeroSlide();
  restartHeroTimer();
  renderTicker();
  renderPromoBanner();
  renderBenefits();
  initWhatsAppFloat();

  loadProducts();
  loadShippingSettings();
  loadShippingKoreaRates();
  loadShippingNacionalRates();
  renderCart();

  loadAmericanoProducts();
  renderAmericanoCart();
});
