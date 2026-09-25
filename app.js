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

  // Opcional: URL CSV publicada de una pestaña "Stock" con los productos
  // que tienes listos para entrega inmediata (columnas: SKU | Piezas
  // Disponibles | Precio MXN). El SKU debe coincidir exactamente con la
  // columna SKU de tu catálogo principal. El precio de esta pestaña
  // reemplaza al precio normal del producto (para que puedas fijar tu
  // propio precio de venta inmediata), y a esos productos no se les
  // cobra el envío Corea→México (ya están en México), solo el nacional.
  // Si un SKU también existe en tu catálogo principal, se crea una
  // TARJETA APARTE para la entrega inmediata -- el producto normal se
  // sigue mostrando igual (encargado desde Corea) en Best Seller, marcas,
  // categorías, búsqueda y el catálogo completo; la versión en stock solo
  // aparece en la sección "✅ En stock". Si se deja el placeholder, no
  // aparece esa sección.
  STOCK_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=1208388065&single=true&output=csv",

  // Número de WhatsApp con código de país, solo dígitos, sin "+" ni espacios.
  // Ejemplo México: 5215512345678 (52 + 1 + 10 dígitos)
  WHATSAPP_NUMBER: "5216571920559",

  BUSINESS_NAME: "Mae",

  // Mensaje de la barra superior.
  SHIPPING_MESSAGE: "📦 Stock sin mínimo de compra con 50% de descuento ✨",

  // Pedido mínimo para poder enviar la cotización, en pesos mexicanos (monto fijo).
  MIN_ORDER_MXN: 5700,

  // El precio para pagar con tarjeta (Mercado Pago) se lee directo de la
  // columna opcional "Precio Tarjeta" de tu Google Sheet (ver README
  // sección 4) -- son dos precios fijos y ya anunciados de antemano, en
  // vez de un cargo que el sitio calcule y le sume al cliente en el
  // momento de pagar. Si no agregas esa columna, se cobra igual que por
  // transferencia.

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
      image: "assets/hero/hero-anua-50-descuento.webp",
      imageMobile: "assets/hero/hero-anua-50-descuento-mobile.webp",
      imageAlt: "Hasta 50% de descuento en tus productos Anua favoritos: ampolla, tónico, sérum y crema.",
    },
    {
      image: "assets/hero/hero-productos-coleccion.webp",
      imageMobile: "assets/hero/hero-productos-coleccion-mobile.webp",
      imageAlt: "Colección de skincare coreano Alpacca: COSRX, Anua, Beauty of Joseon, mixsoon, haruharu wonder y AXIS-Y.",
    },
    {
      image: "assets/hero/hero-nida-skincare.webp",
      imageMobile: "assets/hero/hero-nida-skincare-mobile.webp",
      imageAlt: "El mejor skincare coreano NIDA: crema hidratante, contorno de ojos y sérums.",
    },
    {
      image: "assets/hero/hero-anua-txa.webp",
      imageMobile: "assets/hero/hero-anua-txa-mobile.webp",
      imageAlt: "Anua TXA: kit para una piel más luminosa y radiante -- mascarilla, sérum, tónico y almohadillas.",
    },
    {
      image: "assets/hero/hero-cuida-tu-piel.webp",
      imageMobile: "assets/hero/hero-cuida-tu-piel-mobile.webp",
      imageAlt: "Cuida tu piel en cualquier momento y lugar: base Clio, sérum y crema solar Goodal, labial Ink Velvet.",
    },
    {
      image: "assets/hero/hero-anua-100-serum.webp",
      imageMobile: "assets/hero/hero-anua-100-serum-mobile.webp",
      imageAlt: "Anua 100+ PDRN: el sérum No.1 de Corea -- rutina con sérum, crema y discos iluminadores para una piel más firme e hidratada.",
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

  // Tiles de "preocupación de piel" (acceso rápido, aparte del quiz de
  // arriba). Cada una hace match contra la columna "TipoPiel" de tu
  // Sheet buscando cualquiera de sus "keywords" como texto dentro de la
  // etiqueta (sin importar mayúsculas/acentos) -- así aprovechan las
  // etiquetas más descriptivas que ya tienes ahí (ej. "Piel con acné",
  // "Piel opaca / con manchas", "Piel madura"), no solo el tipo base
  // (Grasa/Seca/Mixta/Sensible/Normal). Si un producto no tiene ninguna
  // etiqueta así de específica, simplemente no aparece en ninguna.
  SKIN_CONCERNS: [
    { key: "acne", label: "Acné", emoji: "🔴", keywords: ["acne"] },
    { key: "manchas", label: "Manchas y opacidad", emoji: "✨", keywords: ["opaca", "mancha"] },
    { key: "madura", label: "Piel madura", emoji: "🌿", keywords: ["madura", "linea de expresion", "antienvejec"] },
    { key: "poros", label: "Poros dilatados", emoji: "🔍", keywords: ["poro"] },
    { key: "hidratacion", label: "Hidratación profunda", emoji: "💧", keywords: ["deshidratada"] },
  ],

  // Oferta por tiempo limitado -- banner oscuro con cuenta regresiva y
  // una fila de productos en oferta, arriba de "Best Seller". Se oculta
  // sola si "enabled" es false, si ya pasó "endsAt", o si ninguno de los
  // "productIds" existe ahorita en el catálogo. "productIds" son los SKU
  // tal como vienen en tu Sheet (columna SKU). Para activar una oferta,
  // dime qué productos y hasta cuándo, y yo actualizo esto -- igual que
  // con las imágenes del carrusel.
  TIME_DEAL: {
    enabled: false,
    title: "",
    subtitle: "",
    endsAt: "", // ej. "2026-10-05T23:59:59-06:00"
    productIds: [],
  },

  // Franja promocional ancha, entre las colecciones y las marcas.
  PROMO_BANNER: {
    title: "Skincare asiático que tus clientes van a querer",
    subtitle: "Productos coreanos seleccionados para tu negocio.",
    ctaText: "Explorar catálogo",
    ctaHref: "#catalog-section",
  },

  // Marcas que se muestran primero en "Marcas en el catálogo" (en este
  // orden), antes de darle a "Y más". Deben coincidir con el nombre tal
  // cual aparece en la columna "Marca" del catálogo (sin distinguir
  // mayúsculas/minúsculas) -- si una no existe todavía en el catálogo,
  // simplemente no aparece.
  FEATURED_BRANDS: ["Anua", "Dr. Althea", "Centellian24", "Medicube", "Skin1004", "mixsoon", "Tocobo"],

  // Beneficios (franja de 4 íconos antes del footer).
  BENEFITS: [
    { icon: "truck", title: "Envíos", text: "A todo México" },
    { icon: "chat", title: "Atención por WhatsApp", text: "Resolvemos tus dudas" },
    { icon: "lock", title: "Cotización sin compromiso", text: "Sin pagos en línea" },
    { icon: "badgeCheck", title: "Catálogo verificado", text: "Disponibilidad real" },
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
    SUBTITLE: "Envío se cotiza aparte.",

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
   Íconos de línea para las franjas de "beneficios" / "por qué Alpacca"
   -- mismo estilo (trazo, sin relleno) para que todos combinen entre sí,
   en vez de mezclar emojis sueltos que se ven distinto en cada equipo.
   ====================================================================== */
const BENEFIT_ICONS = {
  globe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="m9 12 2 2 4-4"/></svg>`,
  chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  bag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
  box: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  truck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  badgeCheck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 2.4 2.4L18 4l.6 3.6L22 9l-1.6 3.4L22 15l-3.4.6L18 20l-3.6-.6L12 22l-2.4-2.6L6 20l-.6-3.6L2 15l1.6-2.6L2 9l3.4-.6L6 4l3.6.4z"/><path d="m9 12 2 2 4-4"/></svg>`,
};

/* Círculo rosa con un ícono de línea adentro -- el mismo tratamiento
   visual en toda la página para que los "beneficios"/"por qué Alpacca"
   se vean como un solo sistema, no como íconos sueltos. */
function benefitIconHTML(name, sizeClass = "w-10 h-10") {
  const svg = (BENEFIT_ICONS[name] || "").replace("<svg ", '<svg class="w-1/2 h-1/2" ');
  return `<span class="inline-flex items-center justify-center ${sizeClass} rounded-full bg-rose/10 text-rose" aria-hidden="true">${svg}</span>`;
}

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
// Moneda en la que se muestran los precios (el cobro real, en checkout,
// siempre es en pesos -- este toggle es solo de referencia visual para
// clientes que piensan en dólares). Se guarda en localStorage para que se
// recuerde entre visitas. El USD se calcula dividiendo el Precio en pesos
// (ya con el margen de Mae incluido) entre el "Tipo de cambio" real de la
// pestaña Config -- así el dólar mostrado respeta el mismo margen que el
// peso, en vez de mostrar directo la columna "Precio USD" del catálogo
// (que es SU COSTO mayorista, no un precio de venta).
let displayCurrency = localStorage.getItem("displayCurrency") === "USD" ? "USD" : "MXN";

function formatPrice(n) {
  const mxn = n || 0;
  if (displayCurrency === "USD" && shippingSettings.exchangeRate > 0) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      mxn / shippingSettings.exchangeRate
    );
  }
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(mxn);
}

/* Muestra/oculta el botón MXN↔USD (solo tiene sentido una vez que se
   cargó el "Tipo de cambio" de Config) y refleja la moneda activa en su
   texto. */
function updateCurrencyToggleButton() {
  const btn = document.getElementById("currency-toggle");
  if (!btn) return;
  const available = shippingSettings.exchangeRate > 0;
  btn.classList.toggle("hidden", !available);
  btn.textContent = displayCurrency === "USD" ? "USD $" : "MXN $";
  btn.setAttribute("aria-pressed", displayCurrency === "USD" ? "true" : "false");
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

/* ======================================================================
   Favoritos -- guardados por dispositivo (localStorage), no requiere
   cuenta. Solo se guarda el id del producto; los datos (precio,
   disponibilidad, etc.) siempre se leen frescos del catálogo actual al
   pintar la sección, así nunca se muestra un precio viejo.
   ====================================================================== */
const WISHLIST_KEY = "alpacca_wishlist";

function loadWishlist() {
  try {
    const arr = JSON.parse(localStorage.getItem(WISHLIST_KEY));
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

let wishlist = loadWishlist();

function saveWishlist() {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishlist]));
}

function isWishlisted(id) {
  return wishlist.has(id);
}

/* Agrega/quita el producto y regresa el nuevo estado (true = ya quedó
   guardado). */
function toggleWishlist(id) {
  const active = !wishlist.has(id);
  if (active) wishlist.add(id);
  else wishlist.delete(id);
  saveWishlist();
  updateWishlistCountBadge();
  return active;
}

function updateWishlistCountBadge() {
  const el = document.getElementById("wishlist-count");
  if (!el) return;
  el.textContent = wishlist.size;
  el.classList.toggle("hidden", wishlist.size === 0);
}

function wishlistButtonHTML(id) {
  const active = isWishlisted(id);
  return `
    <button type="button" data-wishlist="${escapeAttr(id)}" aria-label="${active ? "Quitar de favoritos" : "Guardar en favoritos"}"
      class="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow transition ${active ? "text-rose" : "text-ink/40 hover:text-rose"}">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="${active ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    </button>`;
}

/* Un solo listener delegado (en vez de "wire" en cada grid) para que
   funcione en CUALQUIER tarjeta de producto sin importar en qué sección
   se pintó -- catálogo, búsqueda, marca, stock, favoritos, etc. */
function initWishlist() {
  updateWishlistCountBadge();
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-wishlist]");
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.wishlist;
    const active = toggleWishlist(id);
    btn.classList.toggle("text-rose", active);
    btn.classList.toggle("text-ink/40", !active);
    btn.classList.toggle("hover:text-rose", !active);
    btn.setAttribute("aria-label", active ? "Quitar de favoritos" : "Guardar en favoritos");
    btn.querySelector("svg").setAttribute("fill", active ? "currentColor" : "none");
    // Si la sección de favoritos está abierta, se vuelve a pintar de una
    // vez -- si no, quitar uno desde ahí lo dejaría ahí hasta refrescar.
    const section = document.getElementById("wishlist-section");
    if (section && !section.classList.contains("hidden")) openWishlistSection();
  });

  document.getElementById("wishlist-toggle").addEventListener("click", openWishlistSection);
  document.getElementById("wishlist-clear").addEventListener("click", () => showHomeView("home"));
}

function openWishlistSection() {
  document.getElementById("search-input").value = "";

  const items = groupVariants(products.filter((p) => wishlist.has(p.id)));
  const grid = document.getElementById("wishlist-grid");
  const empty = document.getElementById("wishlist-empty");
  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => productCardHTML(p)).join("");
    wireAddButtons(grid);
    wireVariantSelectors(grid);
  }

  showHomeView("wishlist");
  document.getElementById("wishlist-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ======================================================================
   Avísame cuando vuelva (restock) -- modal chiquito que se abre desde
   cualquier botón "🔔 Avísame" (productos agotados). Solo guarda la
   solicitud (netlify/functions/restock-notify-request.js); no hay aviso
   automático, Mae la ve en /admin.html y le escribe a mano.
   ====================================================================== */
let restockContext = null;

function openRestockModal({ sku, productName, marca }) {
  restockContext = { sku, productName, marca };
  document.getElementById("restock-product-name").textContent = productName;
  document.getElementById("restock-phone").value = "";
  document.getElementById("restock-name").value = "";
  document.getElementById("restock-error").classList.add("hidden");
  document.getElementById("restock-success").classList.add("hidden");
  document.getElementById("restock-fields").classList.remove("hidden");
  const overlay = document.getElementById("restock-overlay");
  overlay.classList.remove("opacity-0", "pointer-events-none");
}

function closeRestockModal() {
  document.getElementById("restock-overlay").classList.add("opacity-0", "pointer-events-none");
}

async function handleRestockSubmit(e) {
  e.preventDefault();
  const phone = document.getElementById("restock-phone").value.trim();
  const name = document.getElementById("restock-name").value.trim();
  const errorEl = document.getElementById("restock-error");
  const btn = document.getElementById("restock-submit");
  errorEl.classList.add("hidden");
  btn.disabled = true;
  try {
    const res = await fetch("/.netlify/functions/restock-notify-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...restockContext, phone, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo guardar tu solicitud.");
    document.getElementById("restock-fields").classList.add("hidden");
    document.getElementById("restock-success").classList.remove("hidden");
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

function initRestock() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-restock]");
    if (!btn) return;
    e.preventDefault();
    openRestockModal({
      sku: btn.dataset.restockSku,
      productName: btn.dataset.restockName,
      marca: btn.dataset.restockMarca,
    });
  });
  document.getElementById("restock-close").addEventListener("click", closeRestockModal);
  document.getElementById("restock-overlay").addEventListener("click", (e) => {
    if (e.target.id === "restock-overlay") closeRestockModal();
  });
  document.getElementById("restock-form").addEventListener("submit", handleRestockSubmit);
}

/* ======================================================================
   Calificaciones de producto -- solo clientas con cuenta que ya tienen
   un pedido PAGADO con ese SKU pueden calificar (lo valida el servidor,
   ver customer-submit-review.js). Guardar de nuevo actualiza tu propia
   reseña en vez de crear otra.
   ====================================================================== */
const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function starIconHTML(filled, sizeClass = "w-3.5 h-3.5") {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${sizeClass} ${filled ? "text-amber-400" : "text-ink/20"}" viewBox="0 0 24 24" fill="currentColor"><path d="${STAR_PATH}"/></svg>`;
}

/* Mapa sku -> { avg, count }, para las estrellas de las tarjetas de
   producto -- se carga una vez al inicio (product-reviews.js sin
   parámetro "sku" regresa el resumen de TODOS los productos con alguna
   reseña). */
let reviewSummaries = new Map();

async function loadReviewSummaries() {
  try {
    const res = await fetch("/.netlify/functions/product-reviews", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    reviewSummaries = new Map(Object.entries(data.summaries || {}));
    renderAll();
  } catch (err) {
    console.warn("No se pudieron cargar las reseñas:", err);
  }
}

/* Línea chiquita de "⭐ 4.8 (12)" para una tarjeta de producto -- vacío
   si todavía no tiene ninguna reseña (no se muestra "0 reseñas"). Usa
   p.stockSku si es un producto de Stock (ver cartItemsForOrder), porque
   es el mismo sku con el que se guardan sus reseñas. */
function productReviewSummaryHTML(p) {
  const sku = p.stockSku || p.id;
  const summary = reviewSummaries.get(sku);
  if (!summary || !summary.count) return "";
  return `
    <button type="button" data-view-reviews="${escapeAttr(sku)}" data-view-reviews-name="${escapeAttr(p.nombre)}"
      class="flex items-center gap-1 text-[11px] text-ink/60 hover:text-ink mt-0.5">
      ${starIconHTML(true, "w-3 h-3")}
      <span class="font-semibold">${summary.avg}</span>
      <span class="text-ink/40">(${summary.count})</span>
    </button>`;
}

async function openReviewsListModal(sku, productName) {
  document.getElementById("reviews-list-title").textContent = `⭐ Reseñas de ${productName}`;
  document.getElementById("reviews-list-summary").textContent = "Cargando…";
  document.getElementById("reviews-list-items").innerHTML = "";
  document.getElementById("reviews-list-overlay").classList.remove("opacity-0", "pointer-events-none");
  try {
    const res = await fetch(`/.netlify/functions/product-reviews?sku=${encodeURIComponent(sku)}`, { cache: "no-store" });
    const data = await res.json();
    document.getElementById("reviews-list-summary").textContent = data.count
      ? `${data.avg} ⭐ · ${data.count} reseña${data.count === 1 ? "" : "s"}`
      : "Todavía no hay reseñas para este producto.";
    document.getElementById("reviews-list-items").innerHTML = (data.reviews || [])
      .map(
        (r) => `
        <div class="border-t border-ink/10 pt-3">
          <div class="flex items-center gap-0.5">${[1, 2, 3, 4, 5].map((n) => starIconHTML(n <= r.rating, "w-3.5 h-3.5")).join("")}</div>
          <p class="text-xs font-semibold text-ink mt-1">${escapeHtml(r.customerName || "Clienta Alpacca")}</p>
          ${r.comment ? `<p class="text-sm text-ink/70 mt-0.5">${escapeHtml(r.comment)}</p>` : ""}
        </div>`
      )
      .join("");
  } catch (err) {
    document.getElementById("reviews-list-summary").textContent = "No se pudieron cargar las reseñas.";
  }
}

function closeReviewsListModal() {
  document.getElementById("reviews-list-overlay").classList.add("opacity-0", "pointer-events-none");
}

let reviewContext = null;
let reviewRating = 0;

function renderReviewStarsPicker() {
  const wrap = document.getElementById("review-stars");
  wrap.innerHTML = [1, 2, 3, 4, 5]
    .map(
      (n) => `
      <button type="button" data-star="${n}" aria-label="${n} estrella${n === 1 ? "" : "s"}" class="p-0.5">
        ${starIconHTML(n <= reviewRating, "w-6 h-6")}
      </button>`
    )
    .join("");
  wrap.querySelectorAll("[data-star]").forEach((btn) => {
    btn.addEventListener("click", () => {
      reviewRating = Number(btn.dataset.star);
      renderReviewStarsPicker();
    });
  });
}

function openReviewModal({ sku, productName }) {
  reviewContext = { sku, productName };
  reviewRating = 0;
  document.getElementById("review-product-name").textContent = productName;
  document.getElementById("review-comment").value = "";
  document.getElementById("review-error").classList.add("hidden");
  document.getElementById("review-success").classList.add("hidden");
  document.getElementById("review-fields").classList.remove("hidden");
  renderReviewStarsPicker();
  document.getElementById("review-overlay").classList.remove("opacity-0", "pointer-events-none");
}

function closeReviewModal() {
  document.getElementById("review-overlay").classList.add("opacity-0", "pointer-events-none");
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("review-error");
  const btn = document.getElementById("review-submit");
  errorEl.classList.add("hidden");
  if (!reviewRating) {
    errorEl.textContent = "Selecciona cuántas estrellas le das.";
    errorEl.classList.remove("hidden");
    return;
  }
  const comment = document.getElementById("review-comment").value.trim();
  const token = getCustomerToken();
  btn.disabled = true;
  try {
    const res = await fetch("/.netlify/functions/customer-submit-review", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sku: reviewContext.sku, rating: reviewRating, comment }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo guardar tu calificación.");
    document.getElementById("review-fields").classList.add("hidden");
    document.getElementById("review-success").classList.remove("hidden");
    loadReviewSummaries();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

function initReviews() {
  document.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-view-reviews]");
    if (viewBtn) {
      e.preventDefault();
      openReviewsListModal(viewBtn.dataset.viewReviews, viewBtn.dataset.viewReviewsName);
      return;
    }
    const reviewBtn = e.target.closest("[data-review]");
    if (reviewBtn) {
      e.preventDefault();
      openReviewModal({ sku: reviewBtn.dataset.review, productName: reviewBtn.dataset.reviewName });
    }
  });
  document.getElementById("review-close").addEventListener("click", closeReviewModal);
  document.getElementById("review-overlay").addEventListener("click", (e) => {
    if (e.target.id === "review-overlay") closeReviewModal();
  });
  document.getElementById("review-form").addEventListener("submit", handleReviewSubmit);
  document.getElementById("reviews-list-close").addEventListener("click", closeReviewsListModal);
  document.getElementById("reviews-list-overlay").addEventListener("click", (e) => {
    if (e.target.id === "reviews-list-overlay") closeReviewsListModal();
  });
}

/* El carrito guarda en localStorage una copia completa de cada producto
   (precio, precio con tarjeta, peso...) tal como estaba cuando se agregó,
   y el carrito no se vacía solo -- puede quedarse ahí días. Si Mae
   corrige un precio en su Google Sheet mientras tanto, sin este refresco
   la clienta seguiría viendo y pagando el precio viejo, porque nada
   comparaba lo guardado contra el catálogo recién cargado. Se llama cada
   vez que se vuelve a cargar el catálogo/stock, y quita del carrito lo
   que ya no exista (producto eliminado o agotado). */
function syncCartWithProducts() {
  let changed = false;
  Object.keys(cart).forEach((id) => {
    const fresh = products.find((p) => p.id === id);
    if (!fresh) {
      delete cart[id];
      changed = true;
      return;
    }
    if (cart[id].product !== fresh) {
      cart[id].product = fresh;
      changed = true;
    }
  });
  if (changed) saveCart();
}

function syncAmericanoCartWithProducts() {
  let changed = false;
  Object.keys(americanoCart).forEach((id) => {
    const fresh = americanoProducts.find((p) => p.id === id);
    if (!fresh) {
      delete americanoCart[id];
      changed = true;
      return;
    }
    if (americanoCart[id].product !== fresh) {
      americanoCart[id].product = fresh;
      changed = true;
    }
  });
  if (changed) saveAmericanoCart();
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

/* Además del match exacto, prueba el encabezado sin su explicación entre
   paréntesis al final (ej. "Precio Tarjeta MXN (opcional)" -> "precio
   tarjeta mxn"). Así funcionan tal cual los encabezados de las plantillas
   que se entregan, sin que el usuario tenga que dejarlos exactamente
   igual a los alias internos. */
function findCol(headers, aliases) {
  const exact = headers.findIndex((h) => aliases.includes(h));
  if (exact >= 0) return exact;
  const stripParens = (h) => h.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return headers.findIndex((h) => aliases.includes(stripParens(h)));
}

function csvToProducts(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const iNombre = findCol(headers, ["nombre", "producto", "name"]);
  const iCategoria = findCol(headers, ["categoria", "categoría", "category"]);
  const iMarca = findCol(headers, ["marca", "brand"]);
  const iPrecio = findCol(headers, ["precio", "price"]);
  const iPrecioTarjeta = findCol(headers, ["precio tarjeta", "preciotarjeta", "precio con tarjeta", "card price"]);
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
      const precioTarjetaRaw = get(iPrecioTarjeta).replace(/[^0-9.,]/g, "").replace(",", ".");
      const pesoRaw = get(iPeso).replace(/[^0-9.,]/g, "").replace(",", ".");
      const splitTags = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);
      const precio = parseFloat(precioRaw) || 0;
      const precioTarjeta = parseFloat(precioTarjetaRaw) || precio;
      return {
        id: get(iSku) || `row${n}`,
        nombre: get(iNombre) || "Producto sin nombre",
        categoria: get(iCategoria) || "General",
        marca: get(iMarca),
        precio,
        precioTarjeta,
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

const BANK_DETAILS_DEFAULTS = { bankName: "", bankHolder: "", bankClabe: "", bankAccount: "", bankNote: "" };
let shippingSettings = { exchangeRate: 0, transferDiscountPct: 0, ...BANK_DETAILS_DEFAULTS };
let shippingKoreaRates = { tiers: [], extraPerKgUSD: 0, extraPerKgTarjetaUSD: null };
let shippingNacionalRates = [];
let stockData = new Map(); // SKU -> { piezas, precioMXN }
let soldStock = new Map(); // SKU -> piezas ya vendidas y pagadas (se resta de stockData)

const SHIPPING_SETTING_ALIASES = {
  exchangeRate: ["tipodecambio", "tipocambio", "exchangerate", "dolar", "usdmxn"],
  // Mismo % que "Descuento por transferencia (%)" usa Productos para
  // calcular "Precio Tarjeta" -- aquí se usa para que el envío también
  // tenga su precio de referencia con tarjeta (ver README sección 4).
  transferDiscountPct: ["descuentoportransferencia", "descuentotransferencia", "descuentoportransferenciaporciento"],
};

// Datos de depósito/transferencia (opcionales) que se muestran en el
// carrito junto al botón "Confirmar pedido por transferencia", para que
// el cliente sepa a dónde transferir sin tener que preguntarlo por chat.
// Se leen de la misma pestaña "Config" del Sheet, ver README sección 4.
const BANK_DETAIL_ALIASES = {
  bankName: ["banco", "nombredelbanco", "bank"],
  bankHolder: ["titular", "beneficiario", "nombretitular", "accountholder"],
  bankClabe: ["clabe", "clabeinterbancaria"],
  bankAccount: ["numerodecuenta", "cuenta", "numerocuenta", "accountnumber"],
  bankNote: ["conceptosugerido", "referencia", "notabancaria", "instruccionesdeposito"],
};

function csvToShippingSettings(text) {
  const rows = parseCSV(text);
  const settings = { exchangeRate: 0, transferDiscountPct: 0, ...BANK_DETAILS_DEFAULTS };
  rows.forEach((r) => {
    const key = normalizeKey(r[0]);
    const rawValue = (r[1] || "").trim();
    const numValue = parseFloat(rawValue.replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
    for (const field in SHIPPING_SETTING_ALIASES) {
      if (SHIPPING_SETTING_ALIASES[field].includes(key)) settings[field] = numValue;
    }
    for (const field in BANK_DETAIL_ALIASES) {
      if (BANK_DETAIL_ALIASES[field].includes(key)) settings[field] = rawValue;
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
  // Opcional: costo con tarjeta (Mercado Pago) por fila. Si se deja vacío
  // o no se agrega la columna, se calcula con el % de "Descuento por
  // transferencia" de Config (ver shippingEstimate).
  const iCostoTarjeta = findCol(headers, [
    "costo estafeta terrestre tarjeta (mxn)",
    "costo estafeta terrestre tarjeta",
    "costo tarjeta (mxn)",
    "costo tarjeta",
  ]);

  const rates = [];
  rows.slice(1).forEach((r) => {
    const estado = (r[iEstado] || "").trim();
    const cpRange = (r[iCp] || "").trim();
    const peso = parseFloat((r[iPeso] || "").replace(",", "."));
    const costo = parseFloat((r[iCosto] || "").replace(/[^0-9.,]/g, "").replace(",", "."));
    const costoTarjetaRaw = iCostoTarjeta >= 0 ? (r[iCostoTarjeta] || "").replace(/[^0-9.,]/g, "").replace(",", ".") : "";
    const costoTarjetaParsed = parseFloat(costoTarjetaRaw);
    const m = cpRange.match(/(\d{4,5})\s*-\s*(\d{4,5})/);
    if (!estado || !m || isNaN(peso) || isNaN(costo)) return;
    rates.push({
      estado,
      cpMin: parseInt(m[1], 10),
      cpMax: parseInt(m[2], 10),
      pesoKg: peso,
      costoMXN: costo,
      costoTarjetaMXN: isNaN(costoTarjetaParsed) ? null : costoTarjetaParsed,
    });
  });
  return rates;
}

/* Redondea SIEMPRE hacia arriba al múltiplo de "step" más cercano (igual
   que CEILING en Google Sheets), para que el precio con tarjeta calculado
   en automático (cuando no llenaste la columna "Costo Tarjeta") nunca
   quede por debajo de lo que realmente cuesta cubrir la comisión. */
function ceilTo(value, step) {
  return Math.ceil(value / step) * step;
}

function nacionalShippingMXN(cp, pesoKg, useTarjeta = false) {
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
  if (!tier) return null;
  if (!useTarjeta) return tier.costoMXN;
  if (tier.costoTarjetaMXN != null) return tier.costoTarjetaMXN;
  const pct = shippingSettings.transferDiscountPct || 0;
  return ceilTo(tier.costoMXN * (1 + pct / 100), 1);
}

function csvToKoreaShippingTiers(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { tiers: [], extraPerKgUSD: 0, extraPerKgTarjetaUSD: null };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const iPeso = findCol(headers, ["peso total de la unidad", "peso hasta", "peso hasta (kg)", "peso (kg)", "peso"]);
  const iCosto = findCol(headers, ["costo (usd)", "costo usd", "costo"]);
  // Opcional: costo con tarjeta (Mercado Pago) por fila (incluye la fila
  // de "cada 1 kg adicional"). Si se deja vacío o no se agrega la
  // columna, se calcula con el % de "Descuento por transferencia" de
  // Config (ver shippingEstimate).
  const iCostoTarjeta = findCol(headers, ["costo tarjeta (usd)", "costo tarjeta usd", "costo tarjeta"]);

  const tiers = [];
  let extraPerKgUSD = 0;
  let extraPerKgTarjetaUSD = null;

  rows.slice(1).forEach((r) => {
    const pesoRaw = (r[iPeso] || "").trim().toLowerCase();
    const costo = parseFloat((r[iCosto] || "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const costoTarjetaRaw = iCostoTarjeta >= 0 ? (r[iCostoTarjeta] || "").replace(/[^0-9.,]/g, "").replace(",", ".") : "";
    const costoTarjetaParsed = parseFloat(costoTarjetaRaw);
    const costoTarjetaUSD = isNaN(costoTarjetaParsed) ? null : costoTarjetaParsed;

    if (pesoRaw.includes("adicional") || pesoRaw.includes("extra")) {
      extraPerKgUSD = costo;
      extraPerKgTarjetaUSD = costoTarjetaUSD;
      return;
    }
    const maxKg = parseFloat(pesoRaw.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!isNaN(maxKg)) tiers.push({ maxKg, costoUSD: costo, costoTarjetaUSD });
  });

  tiers.sort((a, b) => a.maxKg - b.maxKg);
  return { tiers, extraPerKgUSD, extraPerKgTarjetaUSD };
}

function koreaShippingUSD(pesoKg, useTarjeta = false) {
  const { tiers, extraPerKgUSD, extraPerKgTarjetaUSD } = shippingKoreaRates;
  if (!tiers.length || pesoKg <= 0) return 0;
  const pct = shippingSettings.transferDiscountPct || 0;

  const inRange = tiers.find((t) => pesoKg <= t.maxKg);
  if (inRange) {
    if (!useTarjeta) return inRange.costoUSD;
    return inRange.costoTarjetaUSD != null ? inRange.costoTarjetaUSD : ceilTo(inRange.costoUSD * (1 + pct / 100), 1);
  }

  const last = tiers[tiers.length - 1];
  const extraKg = Math.ceil(pesoKg - last.maxKg);
  if (!useTarjeta) return last.costoUSD + extraKg * extraPerKgUSD;

  const baseTarjeta = last.costoTarjetaUSD != null ? last.costoTarjetaUSD : ceilTo(last.costoUSD * (1 + pct / 100), 1);
  const extraTarjeta = extraPerKgTarjetaUSD != null ? extraPerKgTarjetaUSD : ceilTo(extraPerKgUSD * (1 + pct / 100), 1);
  return baseTarjeta + extraKg * extraTarjeta;
}

/* koreaPesoKg: peso de solo los productos que SÍ vienen de Corea (todos,
   salvo los marcados "en stock" -- esos ya están en México y no pagan
   este tramo). Si no se pasa, se asume igual a pesoKg (compatibilidad). */
function shippingEstimate(pesoKg, cp, koreaPesoKg = pesoKg) {
  if (pesoKg <= 0) return null;
  const hasKorea = koreaPesoKg > 0 && shippingKoreaRates.tiers.length > 0 && shippingSettings.exchangeRate > 0;
  const nacionalMXN = nacionalShippingMXN(cp, pesoKg);
  const hasNacional = nacionalMXN !== null;
  if (!hasKorea && !hasNacional) return null;

  const coreaUSD = hasKorea ? koreaShippingUSD(koreaPesoKg) : 0;
  const coreaMXN = coreaUSD * (shippingSettings.exchangeRate || 0);
  const totalMXN = coreaMXN + (nacionalMXN || 0);

  // Precio de envío de referencia al pagar con tarjeta (Mercado Pago):
  // usa la columna "Costo Tarjeta" de tus tablas de tarifas si la
  // agregaste (ver README sección 1.1), y si no, cae al mismo % de
  // "Descuento por transferencia" que usan los productos -- el envío
  // también se cobra a través de la terminal, así que le aplica la misma
  // diferencia entre ambos métodos de pago.
  const nacionalMXNTarjeta = hasNacional ? nacionalShippingMXN(cp, pesoKg, true) || 0 : 0;
  const coreaUSDTarjeta = hasKorea ? koreaShippingUSD(koreaPesoKg, true) : 0;
  const coreaMXNTarjeta = coreaUSDTarjeta * (shippingSettings.exchangeRate || 0);
  const totalMXNTarjeta = coreaMXNTarjeta + nacionalMXNTarjeta;

  return {
    hasKorea, hasNacional, coreaUSD,
    coreaMXN, nacionalMXN: nacionalMXN || 0, totalMXN,
    coreaMXNTarjeta, nacionalMXNTarjeta, totalMXNTarjeta,
  };
}

async function loadShippingSettings() {
  const isPlaceholder = !CONFIG.SHIPPING_CONFIG_CSV_URL || CONFIG.SHIPPING_CONFIG_CSV_URL.includes("PEGA_AQUI");
  if (isPlaceholder) return;
  try {
    const res = await fetch(CONFIG.SHIPPING_CONFIG_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    shippingSettings = csvToShippingSettings(text);
    updateCurrencyToggleButton();
    renderFaqMinOrder();
    renderCart();
    renderBrands();
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
   Stock (entrega inmediata) — cruza por SKU con el catálogo principal.
   Los productos con Piezas Disponibles > 0 se marcan p.enStock = true,
   toman el precio de esta pestaña (no el calculado del catálogo) y no
   pagan envío Corea→México, solo el nacional.
   ====================================================================== */
function csvToStockData(text) {
  const rows = parseCSV(text);
  const map = new Map();
  if (!rows.length) return map;
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const iSku = findCol(headers, ["sku", "codigo", "código"]);
  const iPiezas = findCol(headers, ["piezas disponibles", "piezas", "cantidad", "stock"]);
  const iPrecio = findCol(headers, ["precio mxn", "precio", "price"]);
  // Opcional: precio para pagar con tarjeta vía Mercado Pago. Si se deja
  // vacío, se cobra lo mismo que por transferencia (Precio MXN).
  const iPrecioTarjeta = findCol(headers, ["precio tarjeta mxn", "precio tarjeta", "preciotarjeta"]);
  // Columnas opcionales -- solo se necesitan para productos que NO existen
  // todavía en el catálogo principal (para crearlos desde cero aquí mismo).
  const iNombre = findCol(headers, ["nombre", "producto", "name"]);
  const iMarca = findCol(headers, ["marca", "brand"]);
  const iImagen = findCol(headers, ["imagen", "image", "foto", "imagen url"]);
  const iDescripcion = findCol(headers, ["descripcion", "descripción", "description"]);
  const iCategoria = findCol(headers, ["categoria", "categoría", "category"]);
  const iPeso = findCol(headers, ["peso", "peso (kg)", "peso kg", "weight", "pesokg"]);
  if (iSku < 0) return map;

  rows.slice(1).forEach((r) => {
    const sku = (r[iSku] || "").trim();
    if (!sku) return;
    const get = (i) => (i >= 0 && r[i] != null ? r[i].trim() : "");
    const piezas = parseInt(get(iPiezas).replace(/[^0-9]/g, ""), 10) || 0;
    const precioMXN = parseFloat(get(iPrecio).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const precioTarjetaMXN = parseFloat(get(iPrecioTarjeta).replace(/[^0-9.,]/g, "").replace(",", ".")) || precioMXN;
    const pesoKg = parseFloat(get(iPeso).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    if (piezas > 0) {
      map.set(sku, {
        piezas,
        precioMXN,
        precioTarjetaMXN,
        nombre: get(iNombre),
        marca: get(iMarca),
        imagen: get(iImagen),
        descripcion: get(iDescripcion),
        categoria: get(iCategoria),
        pesoKg,
      });
    }
  });
  return map;
}

/* Sufijo del id que se le da a la tarjeta de "entrega inmediata" cuando el
   SKU YA existe en el catálogo principal. No se reusa el mismo producto
   (como se hacía antes) porque eso hacía que, en cuanto tenía stock,
   apareciera con el sello "En stock" en TODOS lados (Best Seller, marcas,
   categorías, catálogo completo...) en vez de seguir mostrándose ahí como
   el producto normal que se puede encargar. Con la tarjeta aparte, el
   producto original se queda intacto y solo la copia con este sufijo se
   filtra para que aparezca únicamente en la sección "En stock" (ver los
   `!p.enStock` en renderBestSellers, showBrandProducts, etc.). */
const STOCK_CLONE_ID_SUFFIX = "__stock";

function applyStockData() {
  stockData.forEach((entry, sku) => {
    const vendidas = soldStock.get(sku) || 0;
    const stockPiezas = Math.max(0, entry.piezas - vendidas);

    const original = products.find((p) => p.id === sku);
    if (original) {
      const stockId = `${sku}${STOCK_CLONE_ID_SUFFIX}`;
      let clone = products.find((p) => p.id === stockId);
      if (!clone) {
        // "stockSku" guarda el SKU real (sin el sufijo) para que el pedido
        // se registre y se descuente del stock con la clave correcta.
        clone = { ...original, id: stockId, stockSku: sku, destacado: [] };
        products.push(clone);
      } else {
        // Aunque el clone ya existiera de una vuelta anterior de
        // applyStockData() en esta misma sesión, sus datos "de catálogo"
        // (imagen, nombre, marca, descripción, etc.) se refrescan siempre
        // desde el original -- si no, corregir por ejemplo una foto en
        // "Productos Corea" no se reflejaba en "En stock" hasta recargar
        // la página desde cero.
        Object.assign(clone, original, { id: stockId, stockSku: sku, destacado: [] });
      }
      clone.enStock = true;
      clone.stockPiezas = stockPiezas;
      clone.precio = entry.precioMXN || original.precio;
      clone.precioTarjeta = entry.precioTarjetaMXN || clone.precio;
      if (entry.pesoKg) clone.peso = entry.pesoKg;
      return;
    }

    // SKU que no existe en el catálogo principal: es un producto que solo
    // vendes en stock. Si ya se había creado en una carga anterior, se
    // actualiza in place (mismo motivo que arriba: para que un cambio en
    // las columnas opcionales del Sheet se refleje sin recargar desde
    // cero); si no, se crea desde cero.
    const existingStockOnly = products.find((p) => p.id === sku && p.enStock);
    if (existingStockOnly) {
      existingStockOnly.stockPiezas = stockPiezas;
      existingStockOnly.precio = entry.precioMXN || existingStockOnly.precio;
      existingStockOnly.precioTarjeta = entry.precioTarjetaMXN || existingStockOnly.precio;
      if (entry.nombre) existingStockOnly.nombre = entry.nombre;
      if (entry.categoria) existingStockOnly.categoria = entry.categoria;
      if (entry.marca) existingStockOnly.marca = entry.marca;
      if (entry.imagen) existingStockOnly.imagen = entry.imagen;
      if (entry.descripcion) existingStockOnly.descripcion = entry.descripcion;
      if (entry.pesoKg) existingStockOnly.peso = entry.pesoKg;
      return;
    }

    if (!entry.nombre) return; // sin nombre no se puede mostrar el producto
    products.push({
      id: sku,
      nombre: entry.nombre,
      categoria: entry.categoria || "General",
      marca: entry.marca || "",
      precio: entry.precioMXN,
      precioTarjeta: entry.precioTarjetaMXN || entry.precioMXN,
      peso: entry.pesoKg,
      presentacion: "",
      imagen: entry.imagen,
      descripcion: entry.descripcion,
      disponible: true,
      destacado: [],
      tipoPiel: [],
      enStock: true,
      stockPiezas,
    });
  });
}

/* Trae cuántas piezas de cada SKU en stock ya se vendieron (pagos ya
   confirmados por Mercado Pago o marcados manualmente en /admin.html),
   para restarlas de las "Piezas Disponibles" y no sobrevender. */
async function loadSoldStock() {
  try {
    const res = await fetch("/.netlify/functions/stock-sold", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    soldStock = new Map(Object.entries(data.sold || {}));
  } catch (err) {
    console.warn("No se pudo cargar el stock ya vendido:", err);
  }
}

async function loadStockData() {
  const isPlaceholder = !CONFIG.STOCK_CSV_URL || CONFIG.STOCK_CSV_URL.includes("PEGA_AQUI");
  if (isPlaceholder) return;
  try {
    const res = await fetch(CONFIG.STOCK_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    await loadSoldStock();
    stockData = csvToStockData(text);
    applyStockData();
    syncCartWithProducts();
    renderAll();
    refreshCurrentView();
  } catch (err) {
    console.warn("No se pudo cargar la tabla de stock:", err);
  }
}

/* ======================================================================
   Carga de productos
   ====================================================================== */
/* El catálogo son ~9,000 filas (~2 MB de CSV) que se piden con
   "cache: no-store" para siempre traer el stock más fresco -- eso
   significa que CADA visita descarga el CSV completo de nuevo, y
   mientras tanto la página se ve vacía (nada se pinta hasta que termina
   de bajar Y parsear). Para que no se sienta tan lento, se guarda la
   última copia del CSV en localStorage: si ya existe, se pinta de
   inmediato con esa copia (puede tener unos minutos de atraso) mientras
   se descarga la versión fresca en segundo plano, y se vuelve a pintar
   en cuanto llega. Solo la primerísima visita (sin nada en caché
   todavía) se queda esperando al fetch, como antes. */
const PRODUCTS_CSV_CACHE_KEY = "alpacca_products_csv_cache_v1";

function loadCachedProductsCsv() {
  try {
    return localStorage.getItem(PRODUCTS_CSV_CACHE_KEY) || "";
  } catch {
    return "";
  }
}

function saveCachedProductsCsv(text) {
  try {
    localStorage.setItem(PRODUCTS_CSV_CACHE_KEY, text);
  } catch {
    // localStorage lleno o bloqueado (modo incógnito estricto, etc.) --
    // no es grave, nada más no se guarda la copia para la próxima vez.
  }
}
async function loadProducts() {
  const isPlaceholder = !CONFIG.GOOGLE_SHEET_CSV_URL || CONFIG.GOOGLE_SHEET_CSV_URL.includes("PEGA_AQUI");

  if (isPlaceholder) {
    products = DEMO_PRODUCTS;
    setStatus("Mostrando catálogo de ejemplo. Conecta tu Google Sheet: edita CONFIG.GOOGLE_SHEET_CSV_URL en app.js.");
    applyStockData();
    syncCartWithProducts();
    renderAll();
    refreshCurrentView();
    return;
  }

  const cachedCsv = loadCachedProductsCsv();
  if (cachedCsv) {
    try {
      const cachedParsed = csvToProducts(cachedCsv);
      if (cachedParsed.length) {
        products = cachedParsed;
        applyStockData();
        syncCartWithProducts();
        renderAll();
        refreshCurrentView();
      }
    } catch (err) {
      // Copia guardada corrupta -- se ignora, sigue con el fetch normal.
    }
  }

  try {
    const res = await fetch(CONFIG.GOOGLE_SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const parsed = csvToProducts(text);
    if (!parsed.length) throw new Error("CSV vacío o encabezados no reconocidos");
    products = parsed;
    saveCachedProductsCsv(text);
    hideStatus();
  } catch (err) {
    console.warn("No se pudo cargar el Google Sheet, usando catálogo de ejemplo:", err);
    // Si ya había una copia en caché, se deja lo que ya se pintó -- es
    // mejor un catálogo real un poco desactualizado que reemplazarlo por
    // el catálogo de ejemplo.
    if (!cachedCsv) {
      products = DEMO_PRODUCTS;
      setStatus("No se pudo conectar con Google Sheets en este momento — mostrando catálogo de ejemplo.");
    }
  }
  applyStockData();
  syncCartWithProducts();
  renderAll();
  refreshCurrentView();
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
  syncAmericanoCartWithProducts();
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
  const items = [{ type: "link", label: "Skincare en nuestra bodega en Corea 🇰🇷", href: "#catalog-section" }];

  if (americanoProducts.length) {
    items.push({ type: "link", label: CONFIG.AMERICANO.TITLE || "Cosmético Americano", href: "#americano-section" });
  }

  if (products.some((p) => p.enStock)) {
    items.push({ type: "link", label: "✅ En stock", href: "#stock-section" });
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
  // Solo se ofrece "Avísame" cuando de verdad está agotado -- no cuando
  // el botón está deshabilitado nada más porque falta elegir un tono
  // (hasVariants), que es una razón distinta.
  const outOfStock = !hasVariants && (!p.disponible || (p.enStock && p.stockPiezas <= 0));
  return `
    <div class="group rounded-2xl bg-white/60 border border-ink/10 overflow-hidden flex flex-col h-full transition duration-300 hover:shadow-lg hover:border-rose/30">
      <div class="aspect-square bg-blush/20 overflow-hidden relative">
        ${rank ? `<span class="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-rose text-cream font-logo text-base flex items-center justify-center shadow">${rank}</span>` : ""}
        <img data-card-img src="${escapeAttr(img)}" alt="${escapeAttr(p.nombre)}" loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        <div data-card-badge class="absolute top-2 ${rank ? "right-2" : "left-2"}">${!p.disponible ? agotadoBadgeHTML() : ""}</div>
        ${wishlistButtonHTML(p.id)}
      </div>
      <div class="p-3 flex flex-col flex-1">
        <div class="flex flex-wrap gap-1 mb-1">
          ${
            p.enStock
              ? p.stockPiezas > 0
                ? `<span class="inline-block w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Entrega inmediata · ${p.stockPiezas} ${p.stockPiezas === 1 ? "pieza disponible" : "piezas disponibles"}</span>`
                : `<span class="inline-block w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">❌ Agotado</span>`
              : ""
          }
          ${
            p.presentacion
              ? `<span class="inline-block w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  p.presentacion.startsWith("Caja") ? "bg-lilac/20 text-lilac" : "bg-blush/50 text-ink/70"
                }">${escapeHtml(p.presentacion)}</span>`
              : ""
          }
        </div>
        <span class="text-[11px] uppercase tracking-wide text-ink/40">${escapeHtml(p.marca || p.categoria)}</span>
        <h3 class="font-semibold ${productNameSizeClass(p.nombre)} text-ink leading-snug mt-0.5">${escapeHtml(p.nombre)}</h3>
        ${productReviewSummaryHTML(p)}
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
            ${
              p.precioTarjeta && p.precioTarjeta > p.precio + 0.5
                ? `<span class="block text-[10px] text-ink/40">🏦 Descuento por transferencia <span class="text-lilac font-semibold">(con tarjeta: ${formatPrice(p.precioTarjeta)})</span></span>`
                : ""
            }
          </div>
          ${
            outOfStock
              ? `<button type="button" data-restock="${escapeAttr(p.id)}" data-restock-name="${escapeAttr((p.marca ? p.marca + " -- " : "") + p.nombre)}" data-restock-sku="${escapeAttr(p.sku || p.id)}" data-restock-marca="${escapeAttr(p.marca || "")}"
                  class="rounded-full border border-rose text-rose text-xs font-semibold px-3 py-1.5 hover:bg-rose/10 transition">
                  🔔 Avísame
                </button>`
              : `<button data-add="${hasVariants ? "" : escapeAttr(p.id)}" ${hasVariants ? "disabled" : ""}
                  class="rounded-full bg-rose text-cream text-xs font-semibold px-3 py-1.5 hover:bg-rose/90 transition disabled:opacity-30 disabled:cursor-not-allowed">
                  Agregar
                </button>`
          }
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
  const img = p.imagen || "./assets/americano-coming-soon.jpg";
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
        <span class="inline-block w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 bg-ink/10 text-ink/70" data-card-moq>Mínimo de compra: ${p.moq}</span>
        <span class="text-[11px] uppercase tracking-wide text-ink/40">${escapeHtml(p.marca)}</span>
        <h3 class="font-semibold ${productNameSizeClass(p.nombre)} text-ink leading-snug mt-0.5">${escapeHtml(p.nombre)}</h3>
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
      if (moqEl) moqEl.textContent = `Mínimo de compra: ${variant.moq}`;

      const badgeEl = card.querySelector("[data-card-badge]");
      if (badgeEl) badgeEl.innerHTML = variant.disponible ? "" : agotadoBadgeHTML();

      const imgEl = card.querySelector("[data-card-img]");
      if (imgEl && variant.imagen) imgEl.src = variant.imagen;
    });
  });
}

function renderAmericanoSection() {
  // La visibilidad de #americano-section la controla showHomeView (está
  // oculta por defecto, igual que Catálogo/Marcas/Categorías/País -- solo
  // se muestra cuando alguien le da clic en el menú). Esta función solo
  // rellena su contenido, para que ya esté listo en cuanto se abra.
  if (!americanoProducts.length) return;

  document.getElementById("americano-section-title").textContent = CONFIG.AMERICANO.TITLE || "Cosmético Americano";
  document.getElementById("americano-section-subtitle").textContent = CONFIG.AMERICANO.SUBTITLE || "";
  document.getElementById("americano-min-order-note").textContent =
    `Pedido mínimo: ${formatPrice(CONFIG.AMERICANO.MIN_ORDER_MXN)} · Mínimo de orden de compra por color/tono`;

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
/* ======================================================================
   Oferta por tiempo limitado -- ver CONFIG.TIME_DEAL arriba.
   ====================================================================== */
let timeDealTimer = null;

function renderTimeDeal() {
  clearInterval(timeDealTimer);
  timeDealTimer = null;

  const section = document.getElementById("time-deal-section");
  const deal = CONFIG.TIME_DEAL || {};
  const endsAt = deal.endsAt ? new Date(deal.endsAt) : null;
  const items = groupVariants(products.filter((p) => !p.enStock && (deal.productIds || []).includes(p.id)));

  if (!deal.enabled || !endsAt || Number.isNaN(endsAt.getTime()) || endsAt <= new Date() || !items.length) {
    section.classList.add("hidden");
    return;
  }

  document.getElementById("time-deal-title").textContent = deal.title || "Oferta por tiempo limitado";
  document.getElementById("time-deal-subtitle").textContent = deal.subtitle || "";

  const row = document.getElementById("time-deal-row");
  row.innerHTML = items.map((p) => `<div class="w-40 sm:w-48 flex-shrink-0 snap-start">${productCardHTML(p)}</div>`).join("");
  wireAddButtons(row);
  wireVariantSelectors(row);

  const updateCountdown = () => {
    const diffMs = endsAt - new Date();
    if (diffMs <= 0) {
      section.classList.add("hidden");
      clearInterval(timeDealTimer);
      return;
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const units = [
      { label: "días", value: Math.floor(totalSeconds / 86400) },
      { label: "hrs", value: Math.floor((totalSeconds % 86400) / 3600) },
      { label: "min", value: Math.floor((totalSeconds % 3600) / 60) },
      { label: "seg", value: totalSeconds % 60 },
    ];
    document.getElementById("time-deal-countdown").innerHTML = units
      .map(
        (u) => `
        <div class="flex flex-col items-center">
          <span class="bg-cream/10 rounded-lg px-2.5 py-1.5 text-lg font-bold font-mono min-w-[2.75rem] text-center">${String(u.value).padStart(2, "0")}</span>
          <span class="text-[10px] text-cream/60 mt-0.5">${u.label}</span>
        </div>`
      )
      .join("");
  };

  updateCountdown();
  timeDealTimer = setInterval(updateCountdown, 1000);
  section.classList.remove("hidden");
}

function renderBestSellers() {
  const section = document.getElementById("featured-section");
  const items = groupVariants(products.filter((p) => !p.enStock && (p.destacado || []).includes("Best Seller"))).slice(0, 6);

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

  const items = groupVariants(products.filter((p) => !p.enStock && (p.tipoPiel || []).includes(type)));
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
   Marcas — derivadas de la columna Marca del catálogo.
   ====================================================================== */
const BRANDS_PREVIEW_COUNT_DEFAULT = 5;

function renderBrands(showAll = false) {
  const section = document.getElementById("brands-section");
  const allBrands = [...new Set(products.map((p) => p.marca).filter(Boolean))].sort();
  if (!allBrands.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  // Las marcas de CONFIG.FEATURED_BRANDS salen primero (en ese orden),
  // y el resto del catálogo llena lo que falte en orden alfabético.
  const byLowerName = new Map(allBrands.map((b) => [b.toLowerCase(), b]));
  const featuredLower = (CONFIG.FEATURED_BRANDS || []).map((b) => b.toLowerCase());
  const featured = featuredLower.map((f) => byLowerName.get(f)).filter(Boolean);
  const rest = allBrands.filter((b) => !featuredLower.includes(b.toLowerCase()));
  const brands = [...featured, ...rest];
  const previewCount = featured.length || BRANDS_PREVIEW_COUNT_DEFAULT;

  const brandButton = (b) => `<button type="button" data-brand="${escapeAttr(b)}"
        class="rounded-xl border border-ink/10 bg-white/50 py-4 px-3 text-center text-sm font-semibold text-ink/70 hover:border-rose hover:text-rose transition"><span>${escapeHtml(b)}</span></button>`;

  const hasMore = !showAll && brands.length > previewCount;
  const visibleBrands = hasMore ? brands.slice(0, previewCount) : brands;

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
  const items = groupVariants(products.filter((p) => !p.enStock && p.marca === marca));
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
  const items = groupVariants(products.filter((p) => !p.enStock && brandCountry(p.marca) === pais));
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
  const items = groupVariants(products.filter((p) => !p.enStock && p.categoria === categoria));
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
   Tiles de "preocupación de piel" -- ver CONFIG.SKIN_CONCERNS arriba.
   ====================================================================== */
function productMatchesConcern(p, concern) {
  return (p.tipoPiel || []).some((tag) => {
    const normalizedTag = normalizeForSearch(tag);
    return concern.keywords.some((kw) => normalizedTag.includes(normalizeForSearch(kw)));
  });
}

function renderConcernTiles() {
  const section = document.getElementById("concerns-section");
  const concerns = CONFIG.SKIN_CONCERNS || [];
  const withCounts = concerns
    .map((c) => ({ ...c, count: products.filter((p) => productMatchesConcern(p, c)).length }))
    .filter((c) => c.count > 0);

  if (!withCounts.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  document.getElementById("concerns-grid").innerHTML = withCounts
    .map(
      (c) => `
      <button type="button" data-concern="${escapeAttr(c.key)}"
        class="flex flex-col items-center gap-1.5 rounded-2xl border border-ink/10 bg-white/60 py-4 px-2 hover:border-rose/40 hover:shadow-md transition">
        <span class="text-2xl">${c.emoji}</span>
        <span class="text-xs font-semibold text-ink text-center leading-tight">${escapeHtml(c.label)}</span>
      </button>`
    )
    .join("");

  document.getElementById("concerns-grid").querySelectorAll("[data-concern]").forEach((btn) => {
    btn.addEventListener("click", () => showConcernProducts(btn.dataset.concern));
  });
}

function showConcernProducts(key) {
  const concern = (CONFIG.SKIN_CONCERNS || []).find((c) => c.key === key);
  if (!concern) return;

  const items = groupVariants(products.filter((p) => !p.enStock && productMatchesConcern(p, concern)));
  const grid = document.getElementById("concern-products-grid");
  const empty = document.getElementById("concern-products-empty");

  document.getElementById("concern-products-title").textContent = `${concern.emoji} ${concern.label}`;

  if (!items.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = items.map((p) => productCardHTML(p)).join("");
    wireAddButtons(grid);
    wireVariantSelectors(grid);
  }

  showHomeView("concerns");
  document.getElementById("concern-products-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ======================================================================
   Búsqueda — filtra por nombre, marca y categoría. Solo busca al enviar
   (Enter o el botón de lupa), no en cada tecla.
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
/* Qué vista está abierta ahorita -- para poder refrescarla en su lugar
   (sin scroll ni resetear el buscador) cuando llegan datos nuevos, ver
   refreshCurrentView() más abajo. */
let currentHomeView = "home";

function showHomeView(view) {
  currentHomeView = view;
  document.getElementById("homepage-sections").classList.toggle("hidden", view !== "home");
  document.getElementById("search-results-section").classList.toggle("hidden", view !== "search");
  document.getElementById("catalog-section").classList.toggle("hidden", view !== "catalog");
  document.getElementById("stock-section").classList.toggle("hidden", view !== "stock");
  document.getElementById("wishlist-section").classList.toggle("hidden", view !== "wishlist");
  document.getElementById("brand-products-section").classList.toggle("hidden", view !== "brands");
  document.getElementById("category-products-section").classList.toggle("hidden", view !== "categories");
  document.getElementById("country-products-section").classList.toggle("hidden", view !== "country");
  document.getElementById("concern-products-section").classList.toggle("hidden", view !== "concerns");
  document.getElementById("americano-section").classList.toggle("hidden", view !== "americano");
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
        !p.enStock &&
        (normalizeForSearch(p.nombre).includes(q) ||
          normalizeForSearch(p.marca).includes(q) ||
          normalizeForSearch(p.categoria).includes(q))
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
function renderCatalogGrid() {
  const items = groupVariants(products.filter((p) => !p.enStock));
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
}

function openFullCatalog() {
  document.getElementById("search-input").value = "";
  renderCatalogGrid();
  showHomeView("catalog");
  document.getElementById("catalog-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ======================================================================
   En stock -- solo los productos marcados como entrega inmediata. Esta es
   la sección que más rápido se espera ver (es la promesa de "entrega
   inmediata"), pero sus tarjetas dependen de que el catálogo principal
   ya haya cargado (ver applyStockData) -- si alguien la abre antes de
   que termine, refreshCurrentView() la vuelve a pintar en cuanto llegan
   más datos, sin que tenga que salir y volver a entrar.
   ====================================================================== */
function renderStockGrid() {
  const items = groupVariants(products.filter((p) => p.enStock));
  const grid = document.getElementById("stock-grid");
  const empty = document.getElementById("stock-empty");
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

function openStockSection() {
  document.getElementById("search-input").value = "";
  renderStockGrid();
  showHomeView("stock");
  document.getElementById("stock-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Se llama cada vez que llegan datos nuevos (catálogo, stock) para
   refrescar EN SU LUGAR la vista que esté abierta ahorita -- sin esto,
   si alguien abre "En stock" o "Catálogo completo" antes de que termine
   de cargar todo, se queda pegada con lo poco que había en ese momento
   (o vacía) para siempre, aunque los datos completos ya hayan llegado. */
function refreshCurrentView() {
  if (currentHomeView === "stock") renderStockGrid();
  else if (currentHomeView === "catalog") renderCatalogGrid();
}

/* ======================================================================
   Beneficios
   ====================================================================== */
function renderFaqMinOrder() {
  const faqMinOrder = document.getElementById("faq-min-order");
  if (faqMinOrder && CONFIG.MIN_ORDER_MXN) {
    faqMinOrder.textContent = `Es de ${formatPrice(CONFIG.MIN_ORDER_MXN)}.`;
  }
}

function renderBenefits() {
  const items = CONFIG.BENEFITS || [];
  document.getElementById("benefits-grid").innerHTML = items
    .map(
      (b) => `<div class="text-center flex flex-col items-center">
        <div class="mb-2">${benefitIconHTML(b.icon)}</div>
        <p class="font-semibold text-sm text-ink">${escapeHtml(b.title)}</p>
        <p class="text-xs text-ink/50 mt-0.5">${escapeHtml(b.text)}</p>
      </div>`
    )
    .join("");
}

function renderAll() {
  // Ya hay productos reales (o de ejemplo) que pintar -- se acabó la
  // espera, se quita el esqueleto de carga.
  document.getElementById("catalog-loading-skeleton").classList.add("hidden");

  // El orden importa: renderCategoryNav/renderMobileMenu leen qué secciones
  // quedaron visibles, así que corren después de decidir esa visibilidad.
  renderTimeDeal();
  renderBestSellers();
  renderConcernTiles();
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

  const switchNotice = document.getElementById("americano-cart-switch-notice");
  if (Object.keys(cart).length) {
    cart = {};
    saveCart();
    renderCart();
    switchNotice.textContent = "Se vació tu carrito de Skincare Coreano al agregar un producto de Cosmético Americano.";
    switchNotice.classList.remove("hidden");
  } else {
    switchNotice.classList.add("hidden");
  }

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

/* ======================================================================
   Un solo carrito visible arriba (icono/globito del header): muestra el
   total de la colección que tenga productos. Como agregar de una
   colección vacía la otra (ver addToCart/addToAmericanoCart), como
   mucho una de las dos tiene artículos a la vez.
   ====================================================================== */
function activeCartIsAmericano() {
  return Object.keys(americanoCart).length > 0;
}

function updateHeaderCartBadge() {
  const useAmericano = activeCartIsAmericano();
  document.getElementById("cart-count").textContent = useAmericano ? americanoCartCount() : cartCount();
  document.getElementById("cart-total-header").textContent = formatPrice(useAmericano ? americanoCartTotal() : cartTotal());
}

function renderAmericanoCart() {
  const wrap = document.getElementById("americano-cart-items");
  const emptyMsg = document.getElementById("americano-cart-empty");
  const items = Object.entries(americanoCart);

  const total = americanoCartTotal();
  const minMXN = CONFIG.AMERICANO.MIN_ORDER_MXN || 0;
  const belowMin = items.length > 0 && total < minMXN;

  document.getElementById("americano-cart-total-label").textContent = `Total productos (${americanoCartCount()})`;
  document.getElementById("americano-cart-total").textContent = formatPrice(total);
  updateHeaderCartBadge();

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
      const img = it.product.imagen || "./assets/americano-coming-soon.jpg";
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
  const currentQty = cart[id] ? cart[id].qty : 0;
  if (product.enStock && currentQty + 1 > product.stockPiezas) return;

  const switchNotice = document.getElementById("cart-switch-notice");
  if (Object.keys(americanoCart).length) {
    americanoCart = {};
    saveAmericanoCart();
    renderAmericanoCart();
    switchNotice.textContent = "Se vació tu carrito de Cosmético Americano al agregar un producto de Skincare Coreano.";
    switchNotice.classList.remove("hidden");
  } else {
    switchNotice.classList.add("hidden");
  }

  if (cart[id]) cart[id].qty += 1;
  else cart[id] = { product, qty: 1 };
  saveCart();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  const product = cart[id].product;
  const nextQty = cart[id].qty + delta;
  if (product.enStock && delta > 0 && nextQty > product.stockPiezas) return;
  cart[id].qty = nextQty;
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

/* Total del carrito si se paga con tarjeta vía Mercado Pago -- usa el
   precio de la columna "Precio Tarjeta" de cada producto (o el precio
   normal si esa columna no está configurada para ese producto). */
function cartTotalTarjeta() {
  return Object.values(cart).reduce(
    (sum, it) => sum + (it.product.precioTarjeta ?? it.product.precio) * it.qty,
    0
  );
}

function cartCount() {
  return Object.values(cart).reduce((sum, it) => sum + it.qty, 0);
}

function cartWeight() {
  return Object.values(cart).reduce((sum, it) => sum + (it.product.peso || 0) * it.qty, 0);
}

/* Peso de solo los productos que NO están en stock (los que sí vienen de
   Corea y pagan ese tramo de envío). */
function cartWeightNonStock() {
  return Object.values(cart).reduce(
    (sum, it) => sum + (it.product.enStock ? 0 : (it.product.peso || 0) * it.qty),
    0
  );
}

/* Total de solo los productos que NO están en stock -- el pedido mínimo
   no aplica a los productos en stock (entrega inmediata). */
function cartTotalNonStock() {
  return Object.values(cart).reduce(
    (sum, it) => sum + (it.product.enStock ? 0 : it.product.precio * it.qty),
    0
  );
}

function formatWeight(kg) {
  return `${(kg || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
}

function minOrderMXN() {
  return CONFIG.MIN_ORDER_MXN || 0;
}

/* Pinta los datos de depósito/transferencia (si se configuraron en el
   Sheet) en el bloque del carrito y en el del panel de éxito tras enviar
   el pedido -- ambos comparten el mismo contenido. Si no se configuró
   nada, el bloque se queda oculto y no cambia nada más del flujo. */
function bankDetailsHTML() {
  const s = shippingSettings;
  const rows = [];
  if (s.bankName) rows.push(`Banco: <strong>${escapeHtml(s.bankName)}</strong>`);
  if (s.bankHolder) rows.push(`Titular: <strong>${escapeHtml(s.bankHolder)}</strong>`);
  if (s.bankClabe) rows.push(`CLABE: <strong>${escapeHtml(s.bankClabe)}</strong>`);
  if (s.bankAccount) rows.push(`Cuenta: <strong>${escapeHtml(s.bankAccount)}</strong>`);
  if (s.bankNote) rows.push(escapeHtml(s.bankNote));
  return rows.map((r) => `<p>${r}</p>`).join("");
}

function hasBankDetails() {
  const s = shippingSettings;
  return !!(s.bankName || s.bankHolder || s.bankClabe || s.bankAccount);
}

function renderBankDetails() {
  const show = hasBankDetails();
  const html = show ? bankDetailsHTML() : "";
  ["cart-bank-details", "success-bank-details"].forEach((wrapperId) => {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    wrapper.classList.toggle("hidden", !show);
  });
  const cartBody = document.getElementById("cart-bank-details-body");
  if (cartBody) cartBody.innerHTML = html;
  const successBody = document.getElementById("success-bank-details-body");
  if (successBody) successBody.innerHTML = html;
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

  const shipping = shippingEstimate(cartWeight(), cp, cartWeightNonStock());
  if (shipping && shipping.hasNacional) {
    label.textContent = `🚚 Envío nacional (estimado) a CP ${cp}`;
    amount.textContent = formatPrice(shipping.nacionalMXN);
  } else {
    label.textContent = "🚚 Envío nacional";
    amount.textContent = "Te contactaremos para confirmarlo";
  }
  row.classList.remove("hidden");
  renderGrandTotal();
}

function renderGrandTotal() {
  const cp = document.getElementById("customer-cp").value.trim();
  const shipping = shippingEstimate(cartWeight(), cp, cartWeightNonStock());

  let grandTotal = cartTotal();
  if (shipping && shipping.hasKorea) grandTotal += shipping.coreaMXN;
  if (shipping && shipping.hasNacional) grandTotal += shipping.nacionalMXN;

  document.getElementById("cart-grand-total").textContent = formatPrice(grandTotal);
}

function renderCart() {
  const wrap = document.getElementById("cart-items");
  const emptyMsg = document.getElementById("cart-empty");
  const items = Object.entries(cart);

  updateCartLoginGate();
  renderBankDetails();

  const total = cartTotal();
  const nonStockTotal = cartTotalNonStock();
  const hasNonStockItems = Object.values(cart).some((it) => !it.product.enStock);
  const minMXN = minOrderMXN();
  const belowMin = hasNonStockItems && nonStockTotal < minMXN;

  document.getElementById("cart-total-label").textContent = `Total productos (${cartCount()})`;
  document.getElementById("cart-total").textContent = formatPrice(total);
  updateHeaderCartBadge();

  const minMsg = document.getElementById("cart-min-order");
  if (belowMin) {
    minMsg.textContent = `Te faltan ${formatPrice(minMXN - nonStockTotal)} para tu pedido mínimo de ${formatPrice(minMXN)} (no aplica a productos en stock).`;
    minMsg.classList.remove("hidden");
  } else {
    minMsg.classList.add("hidden");
  }

  const koreaRow = document.getElementById("cart-shipping-korea-row");
  const shipping = shippingEstimate(cartWeight(), "", cartWeightNonStock());
  if (items.length && shipping && shipping.hasKorea) {
    document.getElementById("cart-shipping-korea").textContent = formatPrice(shipping.coreaMXN);
    koreaRow.classList.remove("hidden");
  } else {
    koreaRow.classList.add("hidden");
  }
  updateNacionalShippingUI();

  const sendBtn = document.getElementById("send-quote");
  const payBtn = document.getElementById("pay-mercadopago");
  sendBtn.disabled = items.length === 0 || belowMin;
  if (payBtn) payBtn.disabled = items.length === 0 || belowMin;

  const transferNote = document.getElementById("cart-mp-surcharge-note");
  if (transferNote) {
    const cp = document.getElementById("customer-cp").value.trim();
    const shippingForNote = shippingEstimate(cartWeight(), cp, cartWeightNonStock());
    const totalConEnvio = total + (shippingForNote ? shippingForNote.totalMXN : 0);
    const tarjetaTotalConEnvio = cartTotalTarjeta() + (shippingForNote ? shippingForNote.totalMXNTarjeta : 0);
    if (items.length && tarjetaTotalConEnvio > totalConEnvio + 0.5) {
      transferNote.textContent = `🏦 Pagando por transferencia ahorras ${formatPrice(tarjetaTotalConEnvio - totalConEnvio)} (precio con tarjeta, incluyendo envío: ${formatPrice(tarjetaTotalConEnvio)})`;
      transferNote.classList.remove("hidden");
    } else {
      transferNote.classList.add("hidden");
    }
  }

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

/* No se permite comprar como invitado -- hay que iniciar sesión o crear
   cuenta antes de poder llenar el formulario de envío/pago, así todo
   pedido queda ligado a una cuenta (y se puede rastrear después desde
   "Mi cuenta"). Se llama cada vez que se abre el carrito o cambia, para
   que reaccione al instante si se loguea con el carrito abierto. */
function updateCartLoginGate() {
  const gate = document.getElementById("cart-login-required");
  const form = document.getElementById("quote-form");
  const loggedIn = Boolean(getCustomerToken());
  gate.classList.toggle("hidden", loggedIn);
  form.classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    const nameInput = document.getElementById("customer-name");
    const phoneInput = document.getElementById("customer-phone");
    if (nameInput && !nameInput.value && myAccountCache.name) nameInput.value = myAccountCache.name;
    if (phoneInput && !phoneInput.value && myAccountCache.phone) phoneInput.value = myAccountCache.phone;
  }
}

/* Si se loguea/registra viniendo del aviso de "inicia sesión para
   comprar" (con productos ya en el carrito), regresa directo al carrito
   en vez de dejarla parada en "Mis pedidos". */
function resumeCheckoutIfPending() {
  if (!Object.keys(cart).length) return;
  closeAccountPanel();
  openCart();
}

/* ======================================================================
   Drawer del carrito
   ====================================================================== */
function openCart() {
  updateCartLoginGate();
  document.getElementById("cart-drawer").classList.remove("translate-x-full");
  const overlay = document.getElementById("cart-overlay");
  overlay.classList.remove("opacity-0", "pointer-events-none");
}

function closeCart() {
  document.getElementById("cart-drawer").classList.add("translate-x-full");
  const overlay = document.getElementById("cart-overlay");
  overlay.classList.add("opacity-0", "pointer-events-none");
  // Si se cerró el carrito mientras se mostraba el panel de "pedido
  // enviado" (comprobante), lo regresa a la vista del formulario para la
  // próxima vez que se abra.
  document.getElementById("quote-success-panel").classList.add("hidden");
  document.getElementById("quote-form").classList.remove("hidden");
}

/* ======================================================================
   Pedido por transferencia (registro directo, sin pasar por WhatsApp)
   ====================================================================== */
/* Lee todos los campos del formulario del carrito principal, incluida la
   dirección completa que se necesita para generar la guía de paquetería. */
function getCustomerFields() {
  return {
    name: document.getElementById("customer-name").value.trim(),
    phone: document.getElementById("customer-phone").value.trim(),
    cp: document.getElementById("customer-cp").value.trim(),
    street: document.getElementById("customer-street").value.trim(),
    colonia: document.getElementById("customer-colonia").value.trim(),
    municipio: document.getElementById("customer-municipio").value.trim(),
    estado: document.getElementById("customer-estado").value.trim(),
    referencias: document.getElementById("customer-referencias").value.trim(),
    notes: document.getElementById("customer-notes").value.trim(),
  };
}

async function sendQuote(e) {
  e.preventDefault();
  if (!Object.keys(cart).length) return;
  // El formulario está oculto sin sesión (ver updateCartLoginGate), esto
  // es nomás por si acaso -- nunca debería llegar hasta aquí sin token.
  if (!getCustomerToken()) {
    setStatus("Inicia sesión para continuar tu compra.");
    return;
  }

  const hasNonStockItems = Object.values(cart).some((it) => !it.product.enStock);
  if (hasNonStockItems && cartTotalNonStock() < minOrderMXN()) {
    setStatus(`Tu pedido no alcanza el mínimo de compra (${formatPrice(minOrderMXN())}).`);
    return;
  }

  // El comprobante de transferencia es obligatorio -- no se registra el
  // pedido sin él (el input ya tiene "required", esto es por si acaso).
  const fileInput = document.getElementById("proof-file-input");
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    setStatus("Sube tu comprobante de transferencia para poder confirmar el pedido.");
    return;
  }
  const proofError = validateProofFile(file);
  if (proofError) {
    setStatus(proofError);
    return;
  }

  const sendBtn = document.getElementById("send-quote");
  const originalLabel = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = "<span>Enviando…</span>";

  const orderId = await recordTransferOrder();

  if (!orderId) {
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalLabel;
    setStatus("No se pudo registrar tu pedido. Intenta de nuevo o contáctanos por WhatsApp.");
    return;
  }

  sendBtn.innerHTML = "<span>Subiendo comprobante…</span>";
  let proofFailed = false;
  try {
    await uploadProofFile(orderId, file);
  } catch (err) {
    proofFailed = true;
  }

  sendBtn.disabled = false;
  sendBtn.innerHTML = originalLabel;

  cart = {};
  saveCart();
  renderCart();
  document.getElementById("quote-form").reset();
  // No se cierra el carrito aquí -- se queda abierto mostrando el panel
  // de "pedido enviado" (ver showQuoteSuccess).
  showQuoteSuccess(orderId, proofFailed);
}

/* Registra el pedido para que aparezca en /admin.html y, cuando
   confirmes el pago recibido, se descuenten las piezas vendidas del
   stock. Devuelve el orderId (o null si algo falló). */
function recordTransferOrder() {
  try {
    const c = getCustomerFields();
    const items = cartItemsForOrder();
    const subtotal = cartTotal();
    const weight = cartWeight();
    const shipping = shippingEstimate(weight, c.cp, cartWeightNonStock());
    const shippingMXN = shipping ? shipping.totalMXN : 0;

    return fetch("/.netlify/functions/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "transferencia",
        customer: c,
        items,
        subtotal,
        shippingMXN,
        // En transferencia no hay comisión de tarjeta -- el precio ya
        // cobrado es el mismo que el base.
        subtotalBase: subtotal,
        shippingMXNBase: shippingMXN,
        grandTotal: subtotal + shippingMXN,
        // Desglose de envío y peso, para que /admin.html pueda mostrarlos
        // sin tener que volver a adivinar el peso de cada producto.
        shippingKoreaMXN: shipping ? shipping.coreaMXN : 0,
        shippingNacionalMXN: shipping ? shipping.nacionalMXN : 0,
        weightKg: weight,
      }),
    })
      .then((res) => res.json())
      .then((data) => data.orderId || null)
      .catch((err) => {
        console.warn("No se pudo registrar el pedido:", err);
        return null;
      });
  } catch (err) {
    console.warn("No se pudo registrar el pedido:", err);
    return Promise.resolve(null);
  }
}

/* Muestra, dentro del mismo carrito, el panel de "pedido enviado" con el
   folio y los datos de depósito/transferencia. El comprobante ya se subió
   como parte del mismo envío (ver sendQuote) -- si por alguna razón esa
   subida falló, aquí se muestra un bloque para reintentarla, para no
   dejar el pedido sin comprobante. */
function showQuoteSuccess(orderId, proofFailed) {
  document.getElementById("quote-form").classList.add("hidden");
  const panel = document.getElementById("quote-success-panel");
  panel.classList.remove("hidden");
  document.getElementById("success-order-id").textContent = orderId.slice(0, 8).toUpperCase();

  const retryBlock = document.getElementById("proof-retry-block");
  retryBlock.classList.toggle("hidden", !proofFailed);
  if (proofFailed) {
    const retryInput = document.getElementById("proof-retry-file-input");
    retryInput.value = "";
    const retryStatus = document.getElementById("proof-retry-status");
    retryStatus.textContent = "";
    retryStatus.className = "text-[11px] text-ink/50 mt-1";

    const retryBtn = document.getElementById("proof-retry-btn");
    retryBtn.disabled = false;
    retryBtn.innerHTML = "<span>📤 Reintentar subir comprobante</span>";
    retryBtn.onclick = () => {
      const file = retryInput.files && retryInput.files[0];
      const showError = (msg) => {
        retryStatus.textContent = msg;
        retryStatus.className = "text-[11px] text-rose mt-1";
      };
      if (!file) {
        showError("Selecciona una imagen o PDF primero.");
        return;
      }
      const proofError = validateProofFile(file);
      if (proofError) {
        showError(proofError);
        return;
      }
      retryBtn.disabled = true;
      retryBtn.innerHTML = "<span>Subiendo…</span>";
      uploadProofFile(orderId, file)
        .then(() => {
          retryStatus.textContent = "✅ ¡Comprobante recibido! Gracias, te confirmaremos tu pedido pronto.";
          retryStatus.className = "text-[11px] text-ink/70 mt-1";
          retryBtn.innerHTML = "<span>✅ Comprobante enviado</span>";
        })
        .catch((err) => {
          showError(err.message || "No se pudo subir el comprobante. Intenta de nuevo.");
          retryBtn.disabled = false;
          retryBtn.innerHTML = "<span>📤 Reintentar subir comprobante</span>";
        });
    };
  }
}

const MAX_PROOF_FILE_MB = 4;

/* Valida tipo y tamaño del comprobante antes de mandarlo -- regresa un
   mensaje de error, o null si el archivo está bien. */
function validateProofFile(file) {
  const isAllowedType = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!isAllowedType) return "Solo se aceptan imágenes o archivos PDF.";
  if (file.size > MAX_PROOF_FILE_MB * 1024 * 1024) {
    return `El archivo pesa más de ${MAX_PROOF_FILE_MB}MB. Usa uno más ligero.`;
  }
  return null;
}

/* Sube el comprobante de pago (imagen o PDF) de un pedido ya registrado.
   Regresa una Promise que se rechaza con un Error si algo falla, para
   que quien la llame decida cómo avisarle al cliente. */
function uploadProofFile(orderId, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] || "";
      fetch("/.netlify/functions/upload-payment-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, filename: file.name, contentType: file.type, dataBase64: base64 }),
      })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || "No se pudo subir el comprobante.");
          resolve();
        })
        .catch(reject);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function closeQuoteSuccess() {
  closeCart();
}

function cartItemsForOrder({ useTarjetaPrice = false } = {}) {
  return Object.values(cart).map((it) => ({
    // "stockSku" es el SKU real de la hoja de Stock (sin el sufijo
    // "__stock" que se usa solo como id de la tarjeta en el sitio); hace
    // falta para que el descuento de piezas vendidas afecte la fila
    // correcta de tu Google Sheet.
    sku: it.product.stockSku || it.product.id,
    nombre: it.product.presentacion ? `${it.product.nombre} (${it.product.presentacion})` : it.product.nombre,
    marca: it.product.marca || "",
    qty: it.qty,
    precio: useTarjetaPrice ? (it.product.precioTarjeta ?? it.product.precio) : it.product.precio,
    // Precio de transferencia (sin comisión de tarjeta), siempre, para que
    // /admin.html pueda mostrar cuánto de "precio" es comisión cuando se
    // pagó con Mercado Pago (ver create-order.js).
    precioBase: it.product.precio,
    enStock: !!it.product.enStock,
  }));
}

/* ======================================================================
   Pago con Mercado Pago
   ====================================================================== */
async function payWithMercadoPago() {
  if (!Object.keys(cart).length) return;
  // El formulario está oculto sin sesión (ver updateCartLoginGate), esto
  // es nomás por si acaso -- nunca debería llegar hasta aquí sin token.
  if (!getCustomerToken()) {
    setStatus("Inicia sesión para continuar tu compra.");
    return;
  }

  // El comprobante de transferencia (obligatorio con "required" en el
  // HTML) vive en este mismo formulario, pero no aplica a Mercado Pago
  // -- se ignora nada más para esta validación.
  const form = document.getElementById("quote-form");
  const proofInput = document.getElementById("proof-file-input");
  const wasProofRequired = proofInput.required;
  proofInput.required = false;
  const formIsValid = form.reportValidity();
  proofInput.required = wasProofRequired;
  if (!formIsValid) return;

  const c = getCustomerFields();

  const hasNonStockItems = Object.values(cart).some((it) => !it.product.enStock);
  if (hasNonStockItems && cartTotalNonStock() < minOrderMXN()) {
    setStatus(`Tu pedido no alcanza el mínimo de compra (${formatPrice(minOrderMXN())}).`);
    return;
  }

  const payBtn = document.getElementById("pay-mercadopago");
  const originalLabel = payBtn.innerHTML;
  payBtn.disabled = true;
  payBtn.innerHTML = "<span>Redirigiendo…</span>";

  try {
    const weight = cartWeight();
    const shipping = shippingEstimate(weight, c.cp, cartWeightNonStock());
    const shippingMXN = shipping ? shipping.totalMXNTarjeta : 0;
    const subtotal = cartTotalTarjeta();
    // Precios/envío sin la comisión de tarjeta, solo para que
    // /admin.html pueda mostrar cuánto de lo cobrado es comisión (ver
    // create-order.js).
    const shippingMXNBase = shipping ? shipping.totalMXN : 0;
    const subtotalBase = cartTotal();

    const res = await fetch("/.netlify/functions/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "mercadopago",
        customer: c,
        items: cartItemsForOrder({ useTarjetaPrice: true }),
        subtotal,
        shippingMXN,
        subtotalBase,
        shippingMXNBase,
        grandTotal: subtotal + shippingMXN,
        // Desglose de envío (siempre a precio de transferencia, igual que
        // shippingMXNBase) y peso, para que /admin.html pueda mostrarlos.
        shippingKoreaMXN: shipping ? shipping.coreaMXN : 0,
        shippingNacionalMXN: shipping ? shipping.nacionalMXN : 0,
        weightKg: weight,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.redirectUrl) {
      throw new Error(data.error || "Mercado Pago no está configurado todavía.");
    }

    window.location.href = data.redirectUrl;
  } catch (err) {
    console.error(err);
    setStatus(err.message || "No se pudo iniciar el pago con Mercado Pago. Intenta de nuevo o paga por transferencia.");
    payBtn.disabled = false;
    payBtn.innerHTML = originalLabel;
  }
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

/* Nombres largos se ven bien en pantallas anchas pero se cortan con "..."
   en tarjetas angostas de celular (2 columnas). En vez de truncar, se
   reduce el tamaño de letra (y se permite una línea más en los muy
   largos) para que el nombre completo quepa. */
function productNameSizeClass(name) {
  const len = (name || "").length;
  if (len > 46) return "text-[11px] line-clamp-3";
  if (len > 32) return "text-xs line-clamp-2";
  return "text-sm line-clamp-2";
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

/* ======================================================================
   Mi cuenta (login / registro / mis pedidos)
   ====================================================================== */
const CUSTOMER_TOKEN_KEY = "alpacca_customer_token";

function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}
function setCustomerToken(token) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}
function clearCustomerToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

function openAccountPanel() {
  document.getElementById("account-drawer").classList.remove("translate-x-full");
  const overlay = document.getElementById("account-overlay");
  overlay.classList.remove("opacity-0", "pointer-events-none");
}

function closeAccountPanel() {
  document.getElementById("account-drawer").classList.add("translate-x-full");
  const overlay = document.getElementById("account-overlay");
  overlay.classList.add("opacity-0", "pointer-events-none");
}

const ACCOUNT_VIEWS = ["login", "signup", "forgot", "reset", "orders", "settings"];
function showAccountView(view) {
  ACCOUNT_VIEWS.forEach((v) => {
    document.getElementById(`account-view-${v}`).classList.toggle("hidden", v !== view);
  });
}

/* Al abrir el panel: si hay sesión, muestra "Mis pedidos" (y los carga);
   si no, la pantalla de inicio de sesión. */
function openAccountPanelDefault() {
  openAccountPanel();
  if (getCustomerToken()) {
    showAccountView("orders");
    loadMyOrders();
  } else {
    showAccountView("login");
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  const btn = document.getElementById("login-submit");
  errorEl.classList.add("hidden");
  btn.disabled = true;
  try {
    const res = await fetch("/.netlify/functions/customer-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
    setCustomerToken(data.token);
    document.getElementById("login-form").reset();
    showAccountView("orders");
    await loadMyOrders();
    resumeCheckoutIfPending();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const phone = document.getElementById("signup-phone").value.trim();
  const password = document.getElementById("signup-password").value;
  const errorEl = document.getElementById("signup-error");
  const btn = document.getElementById("signup-submit");
  errorEl.classList.add("hidden");
  btn.disabled = true;
  try {
    const res = await fetch("/.netlify/functions/customer-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo crear tu cuenta.");
    setCustomerToken(data.token);
    document.getElementById("signup-form").reset();
    showAccountView("orders");
    await loadMyOrders();
    resumeCheckoutIfPending();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

async function handleForgotSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();
  const btn = document.getElementById("forgot-submit");
  const successEl = document.getElementById("forgot-success");
  btn.disabled = true;
  try {
    await fetch("/.netlify/functions/customer-forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (err) {
    // Aunque falle la conexión, se muestra el mismo mensaje -- ver nota
    // en customer-forgot-password.js sobre no revelar qué correos existen.
  } finally {
    document.getElementById("forgot-form").reset();
    successEl.classList.remove("hidden");
    btn.disabled = false;
  }
}

async function handleResetSubmit(e) {
  e.preventDefault();
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const token = params.get("reset") || "";
  const newPassword = document.getElementById("reset-password").value;
  const errorEl = document.getElementById("reset-error");
  const btn = document.getElementById("reset-submit");
  errorEl.classList.add("hidden");
  btn.disabled = true;
  try {
    const res = await fetch("/.netlify/functions/customer-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo cambiar tu contraseña.");
    document.getElementById("reset-form").reset();
    // Limpia el link de la URL para que no se pueda reusar por accidente.
    window.history.replaceState({}, "", window.location.pathname);
    showAccountView("login");
    setStatus("✅ Tu contraseña se cambió. Ya puedes iniciar sesión.");
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

function logoutCustomer() {
  clearCustomerToken();
  showAccountView("login");
}

const ORDER_STATUS_LABELS = {
  pending: "⏳ Pendiente",
  paid: "✅ Pagado",
  cancelled: "✕ Cancelado",
  failed: "⚠️ No se pudo procesar",
};

const ORDER_STATUS_BADGE_CLASSES = {
  pending: "bg-lilac/20 text-ink/70",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-ink/10 text-ink/50",
  failed: "bg-red-100 text-red-700",
};

/* Mismo número corto que ya se manda por WhatsApp y se ve en el panel
   de éxito al pagar -- así la clienta puede usarlo para preguntar por
   su pedido y Mae lo ubica al toque en /admin.html. */
function orderNumber(o) {
  return (o.id || "").slice(0, 8).toUpperCase();
}

/* Línea de tiempo del pedido. Cancelado/fallido se muestran aparte (no
   tiene sentido un avance "recibido -> pagado -> enviado" para esos). */
function orderTimelineHTML(o) {
  if (o.status === "cancelled") {
    return `<p class="text-xs font-semibold text-ink/60 bg-ink/5 rounded-lg px-3 py-2">✕ Este pedido fue cancelado.</p>`;
  }
  if (o.status === "failed") {
    return `<p class="text-xs font-semibold text-rose bg-rose/10 rounded-lg px-3 py-2">⚠️ No se pudo procesar el pago de este pedido. Si crees que es un error, contáctanos.</p>`;
  }
  const steps = [
    { label: "Recibido", done: true },
    { label: "Pagado", done: o.status === "paid" },
    { label: "Enviado", done: !!o.trackingNumber },
  ];
  const stepsHTML = steps
    .map(
      (s, i) => `
      ${i > 0 ? `<div class="flex-1 h-0.5 ${s.done ? "bg-rose" : "bg-ink/15"}"></div>` : ""}
      <div class="flex flex-col items-center gap-1 shrink-0">
        <div class="w-2.5 h-2.5 rounded-full ${s.done ? "bg-rose" : "bg-ink/15"}"></div>
        <span class="text-[10px] ${s.done ? "text-ink font-semibold" : "text-ink/40"} whitespace-nowrap">${s.label}</span>
      </div>`
    )
    .join("");
  return `<div class="flex items-center px-1">${stepsHTML}</div>`;
}

function orderItemsDetailHTML(o) {
  // Solo se puede calificar lo que ya se pagó de verdad -- lo revalida
  // también el servidor en customer-submit-review.js.
  const canReview = o.status === "paid";
  return (o.items || [])
    .map(
      (it) => `
      <li class="flex justify-between gap-3 text-sm">
        <span class="text-ink/80">
          ${escapeHtml(it.nombre)} <span class="text-ink/40">x${it.qty}</span>
          ${
            canReview && it.sku
              ? `<button type="button" data-review="${escapeAttr(it.sku)}" data-review-name="${escapeAttr(it.nombre)}"
                  class="block text-[11px] text-rose font-semibold hover:underline mt-0.5">⭐ Calificar</button>`
              : ""
          }
        </span>
        <span class="text-ink/60 shrink-0">${formatPrice((it.precio || 0) * it.qty)}</span>
      </li>`
    )
    .join("");
}

function orderAddressHTML(o) {
  const c = o.customer || {};
  const parts = [c.street, c.colonia, c.municipio, c.estado, c.cp].filter(Boolean).join(", ");
  if (!parts) return "";
  return `<p class="text-xs text-ink/50">📍 Enviado a: ${escapeHtml(parts)}</p>`;
}

/* No todas las paqueterías tienen una URL de rastreo simple y
   predecible (el campo "Paquetería" es texto libre en /admin.html, y
   puede traer cosas como "enviosperros fedex_express" o el nombre que
   haya escrito Mae a mano). En vez de armar un mapa de URLs por
   paquetería que se puede romper o quedar incompleto, se manda a una
   búsqueda de Google con la guía y la paquetería -- casi siempre lleva
   directo a la página de rastreo correcta, sea cual sea. */
function orderTrackingUrl(o) {
  if (!o.trackingNumber) return null;
  const query = `rastrear guía ${o.carrier || ""} ${o.trackingNumber}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function orderTrackingDetailHTML(o) {
  if (!o.trackingNumber) return "";
  const url = orderTrackingUrl(o);
  return `
    <a href="${escapeAttr(url)}" target="_blank" rel="noopener"
      class="flex items-center justify-between gap-2 rounded-lg bg-lilac/10 px-3 py-2 hover:bg-lilac/20 transition">
      <span class="text-xs text-lilac font-semibold">🚚 Guía: ${escapeHtml(o.trackingNumber)}${o.carrier ? " · " + escapeHtml(o.carrier) : ""}</span>
      <span class="text-xs font-bold text-lilac shrink-0">Rastrear ›</span>
    </a>`;
}

function orderWhatsAppButtonHTML(o) {
  const href = whatsappHref(`Hola ${CONFIG.BUSINESS_NAME}! Tengo una duda sobre mi pedido #${orderNumber(o)}.`);
  if (!href) return "";
  return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener"
      class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/20 text-ink text-xs font-semibold py-2 hover:border-rose hover:text-rose transition">
      💬 Dudas de este pedido
    </a>`;
}

function myOrderCardHTML(o) {
  const statusLabel = ORDER_STATUS_LABELS[o.status] || o.status;
  const badgeClass = ORDER_STATUS_BADGE_CLASSES[o.status] || "bg-ink/10 text-ink/60";
  const fecha = o.createdAt
    ? new Date(o.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const itemsSummary = (o.items || []).map((it) => it.nombre).join(", ");
  const subtotal = o.subtotal != null ? o.subtotal : o.grandTotal;
  const shippingMXN = o.shippingMXN || 0;
  const canReorder = (o.items || []).length > 0;

  return `
    <details class="rounded-xl border border-ink/10 overflow-hidden bg-white/40">
      <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-3 p-3 hover:bg-ink/5 transition">
        <div class="min-w-0 flex-1">
          <p class="text-[11px] text-ink/40">#${orderNumber(o)} · ${fecha}</p>
          <p class="text-sm font-semibold text-ink truncate">${escapeHtml(itemsSummary)}</p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}">${statusLabel}</span>
          <span class="text-sm font-bold text-rose">${formatPrice(o.grandTotal)}</span>
        </div>
      </summary>
      <div class="border-t border-ink/10 p-3 space-y-3">
        ${orderTimelineHTML(o)}
        <ul class="space-y-1">${orderItemsDetailHTML(o)}</ul>
        <div class="text-xs text-ink/60 space-y-0.5 pt-2 border-t border-ink/10">
          <div class="flex justify-between"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
          ${shippingMXN > 0 ? `<div class="flex justify-between"><span>Envío</span><span>${formatPrice(shippingMXN)}</span></div>` : ""}
          <div class="flex justify-between text-ink font-bold text-sm pt-1"><span>Total</span><span>${formatPrice(o.grandTotal)}</span></div>
        </div>
        ${orderAddressHTML(o)}
        ${orderTrackingDetailHTML(o)}
        <div class="flex gap-2 pt-1">
          ${canReorder ? `<button type="button" data-reorder="${escapeAttr(o.id)}"
              class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-rose/10 text-rose text-xs font-semibold py-2 hover:bg-rose/20 transition">
              🔁 Volver a pedir
            </button>` : ""}
          ${orderWhatsAppButtonHTML(o)}
        </div>
      </div>
    </details>`;
}

/* Copia local de los pedidos ya cargados -- para "Volver a pedir" sin
   tener que volver a pedirle los datos al servidor. */
let myOrdersCache = [];

/* Datos de la cuenta (nombre/teléfono/correo) ya cargados, para
   precargar el formulario de "Editar mis datos" sin otra llamada. */
let myAccountCache = { name: "", phone: "", email: "" };

/* Filtro activo de la lista de pedidos: por estatus y por rango de
   fecha -- ver orderBucket() y ACCOUNT_ORDERS_RANGES más abajo. */
let accountOrdersStatusFilter = "all";
let accountOrdersRangeFilter = "all";

/* Agrupa un pedido en una de las 4 categorías que se muestran en el
   resumen -- "paid" se separa en "pagado" (todavía sin guía) y
   "enviado" (ya tiene guía), que es como Mae marca sus pedidos en
   /admin.html. No hay un estatus "entregado" separado todavía, así que
   no se muestra esa categoría (siempre saldría en cero). */
function orderBucket(o) {
  if (o.status === "pending") return "pending";
  if (o.status === "cancelled" || o.status === "failed") return "cancelled";
  if (o.status === "paid" && o.trackingNumber) return "shipped";
  if (o.status === "paid") return "paid";
  return "other";
}

const ACCOUNT_ORDERS_STATS = [
  { key: "pending", label: "Pendientes", icon: "⏳" },
  { key: "paid", label: "Pagados", icon: "✅" },
  { key: "shipped", label: "Enviados", icon: "🚚" },
  { key: "cancelled", label: "Cancelados", icon: "✕" },
];

const ACCOUNT_ORDERS_RANGES = [
  { key: "all", label: "Todo" },
  { key: "month", label: "Este mes" },
  { key: "3months", label: "Últimos 3 meses" },
];

function accountOrdersRangeBounds(rangeKey) {
  if (rangeKey === "all") return null;
  const days = rangeKey === "month" ? 30 : 90;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return from;
}

function renderAccountOrdersStats(orders) {
  const el = document.getElementById("account-orders-stats");
  const counts = { pending: 0, paid: 0, shipped: 0, cancelled: 0 };
  orders.forEach((o) => {
    const bucket = orderBucket(o);
    if (counts[bucket] != null) counts[bucket]++;
  });
  el.innerHTML = ACCOUNT_ORDERS_STATS.map((s) => {
    const active = accountOrdersStatusFilter === s.key;
    return `
      <button type="button" data-stat-filter="${s.key}"
        class="flex flex-col items-center gap-0.5 rounded-lg py-2 transition ${active ? "bg-rose text-cream" : "bg-ink/5 text-ink hover:bg-ink/10"}">
        <span class="text-base font-bold">${counts[s.key]}</span>
        <span class="text-[10px] font-semibold ${active ? "text-cream/90" : "text-ink/50"}">${s.icon} ${s.label}</span>
      </button>`;
  }).join("");
  el.classList.remove("hidden");
  el.querySelectorAll("[data-stat-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      accountOrdersStatusFilter = accountOrdersStatusFilter === btn.dataset.statFilter ? "all" : btn.dataset.statFilter;
      renderAccountOrdersStats(orders);
      applyAccountOrdersFilter();
    });
  });
}

function renderAccountOrdersRangeChips() {
  const el = document.getElementById("account-orders-range");
  el.innerHTML = ACCOUNT_ORDERS_RANGES.map((r) => {
    const active = accountOrdersRangeFilter === r.key;
    return `
      <button type="button" data-range-filter="${r.key}"
        class="rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-ink text-cream" : "bg-ink/5 text-ink/60 hover:bg-ink/10"}">
        ${r.label}
      </button>`;
  }).join("");
  el.classList.remove("hidden");
  el.querySelectorAll("[data-range-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      accountOrdersRangeFilter = btn.dataset.rangeFilter;
      renderAccountOrdersRangeChips();
      applyAccountOrdersFilter();
    });
  });
}

/* Aplica el filtro de estatus + rango de fecha sobre myOrdersCache y
   vuelve a pintar la lista -- se llama al cargar los pedidos y cada vez
   que se toca un filtro. */
function applyAccountOrdersFilter() {
  const listEl = document.getElementById("account-orders-list");
  const filteredEmptyEl = document.getElementById("account-orders-filtered-empty");
  const bounds = accountOrdersRangeBounds(accountOrdersRangeFilter);

  const filtered = myOrdersCache.filter((o) => {
    if (accountOrdersStatusFilter !== "all" && orderBucket(o) !== accountOrdersStatusFilter) return false;
    if (bounds && (!o.createdAt || new Date(o.createdAt) < bounds)) return false;
    return true;
  });

  const sorted = filtered.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  listEl.innerHTML = sorted.map(myOrderCardHTML).join("");
  listEl.querySelectorAll("[data-reorder]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      reorderFromOrder(btn.dataset.reorder);
    });
  });

  filteredEmptyEl.classList.toggle("hidden", sorted.length > 0 || myOrdersCache.length === 0);
}

/* Busca cada producto del pedido en el catálogo actual (por SKU) y lo
   agrega al carrito con la misma cantidad -- respetando el stock
   disponible si es un producto "en stock". Los que ya no existan o no
   quepan se avisan en vez de fallar en silencio. */
function reorderFromOrder(orderId) {
  const order = myOrdersCache.find((o) => o.id === orderId);
  if (!order) return;

  let addedCount = 0;
  const skipped = [];

  (order.items || []).forEach((it) => {
    const product = it.enStock
      ? products.find((p) => p.stockSku === it.sku && p.enStock)
      : products.find((p) => p.id === it.sku);
    if (!product || !product.disponible) {
      skipped.push(it.nombre);
      return;
    }
    const maxQty = product.enStock ? product.stockPiezas : Infinity;
    const currentQty = cart[product.id] ? cart[product.id].qty : 0;
    const qtyToAdd = Math.min(it.qty, Math.max(0, maxQty - currentQty));
    if (qtyToAdd <= 0) {
      skipped.push(it.nombre);
      return;
    }
    if (cart[product.id]) cart[product.id].qty += qtyToAdd;
    else cart[product.id] = { product, qty: qtyToAdd };
    addedCount += qtyToAdd;
  });

  saveCart();
  renderCart();

  const statusEl = document.getElementById("account-orders-status");
  if (addedCount > 0) {
    statusEl.textContent = skipped.length
      ? `Agregamos lo disponible de ese pedido al carrito. No se pudo agregar: ${skipped.join(", ")}.`
      : "✅ Agregamos los productos de ese pedido a tu carrito.";
    statusEl.classList.remove("hidden");
    closeAccountPanel();
    openCart();
  } else {
    statusEl.textContent = "Ningún producto de ese pedido está disponible ahorita.";
    statusEl.classList.remove("hidden");
  }
}

async function loadMyOrders() {
  const listEl = document.getElementById("account-orders-list");
  const emptyEl = document.getElementById("account-orders-empty");
  const filteredEmptyEl = document.getElementById("account-orders-filtered-empty");
  const loadingEl = document.getElementById("account-orders-loading");
  const summaryEl = document.getElementById("account-orders-summary");
  const statusEl = document.getElementById("account-orders-status");
  const statsEl = document.getElementById("account-orders-stats");
  const rangeEl = document.getElementById("account-orders-range");
  listEl.innerHTML = "";
  emptyEl.classList.add("hidden");
  filteredEmptyEl.classList.add("hidden");
  summaryEl.classList.add("hidden");
  statusEl.classList.add("hidden");
  statsEl.classList.add("hidden");
  rangeEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  accountOrdersStatusFilter = "all";
  accountOrdersRangeFilter = "all";

  const token = getCustomerToken();
  if (!token) {
    loadingEl.classList.add("hidden");
    showAccountView("login");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/customer-orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    loadingEl.classList.add("hidden");
    if (res.status === 401) {
      clearCustomerToken();
      showAccountView("login");
      return;
    }
    if (!res.ok) throw new Error(data.error || "No se pudieron cargar tus pedidos.");

    document.getElementById("account-name").textContent = data.name || "";
    myAccountCache = { name: data.name || "", phone: data.phone || "", email: data.email || "" };
    const orders = data.orders || [];
    myOrdersCache = orders;
    if (!orders.length) {
      emptyEl.classList.remove("hidden");
      return;
    }

    const paidOrders = orders.filter((o) => o.status === "paid");
    if (paidOrders.length) {
      const totalSpent = paidOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      summaryEl.textContent = `🎉 Has hecho ${paidOrders.length} pedido${paidOrders.length === 1 ? "" : "s"} con nosotros por un total de ${formatPrice(totalSpent)}.`;
      summaryEl.classList.remove("hidden");
    }

    renderAccountOrdersStats(orders);
    renderAccountOrdersRangeChips();
    applyAccountOrdersFilter();
  } catch (err) {
    loadingEl.classList.add("hidden");
    emptyEl.textContent = "No se pudieron cargar tus pedidos. Intenta de nuevo.";
    emptyEl.classList.remove("hidden");
  }
}

/* Abre "Editar mis datos" precargado con lo que ya se cargó en
   loadMyOrders() (myAccountCache) -- no hace falta otra llamada. */
function openAccountSettings() {
  document.getElementById("settings-email").value = myAccountCache.email;
  document.getElementById("settings-name").value = myAccountCache.name;
  document.getElementById("settings-phone").value = myAccountCache.phone;
  document.getElementById("settings-current-password").value = "";
  document.getElementById("settings-new-password").value = "";
  document.getElementById("settings-error").classList.add("hidden");
  document.getElementById("settings-success").classList.add("hidden");
  showAccountView("settings");
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const token = getCustomerToken();
  const name = document.getElementById("settings-name").value.trim();
  const phone = document.getElementById("settings-phone").value.trim();
  const currentPassword = document.getElementById("settings-current-password").value;
  const newPassword = document.getElementById("settings-new-password").value;
  const errorEl = document.getElementById("settings-error");
  const successEl = document.getElementById("settings-success");
  const btn = document.getElementById("settings-submit");
  errorEl.classList.add("hidden");
  successEl.classList.add("hidden");
  btn.disabled = true;
  try {
    const res = await fetch("/.netlify/functions/customer-update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, phone, currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.status === 401 && !currentPassword) {
      clearCustomerToken();
      showAccountView("login");
      return;
    }
    if (!res.ok) throw new Error(data.error || "No se pudieron guardar tus datos.");
    myAccountCache = { ...myAccountCache, name: data.name, phone: data.phone };
    document.getElementById("settings-current-password").value = "";
    document.getElementById("settings-new-password").value = "";
    document.getElementById("account-name").textContent = data.name || "";
    successEl.textContent = "✅ Tus datos se guardaron.";
    successEl.classList.remove("hidden");
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

function initAccountPanel() {
  document.getElementById("account-toggle").addEventListener("click", openAccountPanelDefault);
  document.getElementById("account-close").addEventListener("click", closeAccountPanel);
  document.getElementById("account-overlay").addEventListener("click", closeAccountPanel);

  document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
  document.getElementById("signup-form").addEventListener("submit", handleSignupSubmit);
  document.getElementById("forgot-form").addEventListener("submit", handleForgotSubmit);
  document.getElementById("reset-form").addEventListener("submit", handleResetSubmit);
  document.getElementById("settings-form").addEventListener("submit", handleSettingsSubmit);
  document.getElementById("account-logout").addEventListener("click", logoutCustomer);
  document.getElementById("account-settings-toggle").addEventListener("click", openAccountSettings);
  document.getElementById("account-settings-back").addEventListener("click", () => showAccountView("orders"));

  document.getElementById("show-signup").addEventListener("click", () => showAccountView("signup"));
  document.getElementById("show-login-from-signup").addEventListener("click", () => showAccountView("login"));
  document.getElementById("show-forgot").addEventListener("click", () => showAccountView("forgot"));
  document.getElementById("show-login-from-forgot").addEventListener("click", () => showAccountView("login"));

  // Si llegó desde el link del correo de recuperación (?reset=...&email=...),
  // abre el panel directo en la pantalla de "nueva contraseña".
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") && params.get("email")) {
    openAccountPanel();
    showAccountView("reset");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  document.getElementById("year").textContent = new Date().getFullYear();

  document.getElementById("cart-toggle").addEventListener("click", () => {
    if (activeCartIsAmericano()) openAmericanoCart();
    else openCart();
  });
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-overlay").addEventListener("click", closeCart);
  document.getElementById("cart-login-cta").addEventListener("click", () => {
    closeCart();
    openAccountPanelDefault();
  });

  document.getElementById("currency-toggle").addEventListener("click", () => {
    localStorage.setItem("displayCurrency", displayCurrency === "USD" ? "MXN" : "USD");
    location.reload();
  });
  updateCurrencyToggleButton();

  document.getElementById("americano-cart-close").addEventListener("click", closeAmericanoCart);
  document.getElementById("americano-cart-overlay").addEventListener("click", closeAmericanoCart);
  document.getElementById("americano-quote-form").addEventListener("submit", sendAmericanoQuote);
  document.getElementById("americano-close").addEventListener("click", () => showHomeView("home"));

  document.getElementById("menu-toggle").addEventListener("click", openMobileMenu);
  document.getElementById("menu-close").addEventListener("click", closeMobileMenu);
  document.getElementById("menu-overlay").addEventListener("click", closeMobileMenu);
  document.getElementById("quote-form").addEventListener("submit", sendQuote);
  document.getElementById("pay-mercadopago").addEventListener("click", payWithMercadoPago);
  document.getElementById("customer-cp").addEventListener("input", updateNacionalShippingUI);
  document.getElementById("quote-success-close").addEventListener("click", closeQuoteSuccess);

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

  document.getElementById("concern-products-clear").addEventListener("click", () => {
    showHomeView("home");
  });

  document.getElementById("footer-shipping-link").addEventListener("click", openCart);

  renderFaqMinOrder();

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
      showHomeView("americano");
      return;
    }
    if (href === "stock-section") {
      openStockSection();
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
  document.getElementById("search-results-clear").addEventListener("click", () => {
    searchInput.value = "";
    showHomeView("home");
  });
  document.getElementById("catalog-clear").addEventListener("click", () => showHomeView("home"));
  document.getElementById("stock-clear").addEventListener("click", () => showHomeView("home"));

  renderTopBar();
  renderHeroSlide();
  restartHeroTimer();
  renderTicker();
  renderPromoBanner();
  renderBenefits();
  initWhatsAppFloat();
  initAccountPanel();
  initWishlist();
  initRestock();
  initReviews();

  // Por si alguien traía carritos de ambas colecciones guardados de antes
  // de que el carrito fuera uno solo: se queda el de Skincare Coreano.
  if (Object.keys(cart).length && Object.keys(americanoCart).length) {
    americanoCart = {};
    saveAmericanoCart();
  }

  loadProducts();
  loadShippingSettings();
  loadShippingKoreaRates();
  loadShippingNacionalRates();
  loadStockData();
  loadReviewSummaries();
  renderCart();

  loadAmericanoProducts();
  renderAmericanoCart();
});
