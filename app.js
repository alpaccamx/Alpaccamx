"use strict";

/* ======================================================================
   CONFIG — edita estos valores con los datos de tu negocio
   ====================================================================== */
const CONFIG = {
  // Pon en "false" para quitar el botón "MXN $ / USD $" de la barra de
  // arriba -- los precios se muestran siempre en pesos (que es como se
  // cobra de verdad) sin que el cliente pueda cambiar a dólares de
  // referencia. Vuelve a ponerlo en "true" para reactivarlo.
  CURRENCY_TOGGLE_ENABLED: false,

  // Google Sheets: Archivo > Compartir > Publicar en la Web > elige la
  // hoja > formato "Valores separados por comas (.csv)" > Publicar.
  // Pega aquí el link que te da Google.
  // Versión ligera del mismo catálogo (ver netlify/functions/catalog-light.js).
  CATALOG_LIGHT_URL: "/catalogo.csv",
  GOOGLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=114583060&single=true&output=csv",

  // Opcional: URL CSV publicada de una pestaña "Config" con dos columnas
  // (Clave | Valor) para el tipo de cambio USD→MXN y tu comisión. Ver
  // README para el formato exacto.
  SHIPPING_CONFIG_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=442348645&single=true&output=csv",

  // Opcional: URL CSV publicada de una pestaña con la tabla de tarifas de
  // envío Corea → EE.UU. por peso (columnas: Peso Total de la Unidad |
  // Costo (USD), más una fila "Cada 1 kg adicional" al final). Ver README.
  // Si se deja el placeholder, el envío Corea-EE.UU. no aparece.
  SHIPPING_KOREA_RATES_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=680436823&single=true&output=csv",

  // Opcional: URL CSV publicada de una pestaña con la tabla de envío
  // nacional (Estafeta Terrestre) por zona de código postal y peso
  // (columnas: Estado | CP Destino | Peso (kg) | Costo Estafeta
  // Terrestre (MXN)). Ver README. Si se deja el placeholder, el envío
  // nacional simplemente no aparece en la cotización.
  SHIPPING_NACIONAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=291380963&single=true&output=csv",

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
  STOCK_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=2144351337&single=true&output=csv",

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

  // Íconos de redes sociales en la barra superior. Pon "" en href para ocultar uno.
  SOCIAL_LINKS: [
    { name: "Instagram", href: "https://www.instagram.com/alpaccamx", icon: "instagram" },
    { name: "TikTok", href: "https://www.tiktok.com/@alpaccamx", icon: "tiktok" },
    { name: "Facebook", href: "https://www.facebook.com/alpacca.alpacca.2025", icon: "facebook" },
  ],

  // Slides del banner principal (tarjetas verticales, como StyleKorean).
  // "imageCard" es la imagen vertical 4:5 de 972 × 1215 px. Agrega o quita
  // objetos para más o menos tarjetas.
  // Cada banner lleva a sus productos (ctaHref). Las imágenes de los que
  // se quitaron siguen en assets/hero por si quieres regresarlos.
  HERO_SLIDES: [
    {
      imageCard: "assets/hero/hero-anua-oferta-30-card.webp",
      imageAlt: "Oferta: hasta 30% de descuento en tus productos Anua favoritos -- ampolla 80+, sérum 10+, tónico 77+ y crema 100+.",
      ctaHref: "?marca=ANUA",
    },
    {
      imageCard: "assets/hero/hero-anua-100-serum-card.webp",
      imageAlt: "Anua 100+ PDRN: el sérum No.1 de Corea -- rutina con sérum, crema y discos iluminadores para una piel más firme e hidratada.",
      ctaHref: "?q=anua+pdrn",
    },
    {
      imageCard: "assets/hero/hero-medicube-card.webp",
      imageAlt: "Medicube -- Trata. Cuida. Transforma. Limpiador en gel PDRN, sérum TXA Niacinamide 15 y sérum Deep Vita C.",
      ctaHref: "?marca=Medicube",
    },
    {
      imageCard: "assets/hero/hero-anua-txa-card.webp",
      imageAlt: "Anua TXA: kit para una piel más luminosa y radiante -- mascarilla, sérum, tónico y almohadillas.",
      ctaHref: "?q=anua+txa",
    },
    {
      imageCard: "assets/hero/hero-nida-skincare-card.webp",
      imageAlt: "El mejor skincare coreano: cremas, sérums y contorno de ojos NIDA.",
      ctaHref: "?marca=NIDA",
    },
    {
      imageCard: "assets/hero/hero-cuida-tu-piel-card.webp",
      imageAlt: "Cuida tu piel en cualquier momento y lugar: base Clio, sérum y crema solar Goodal, labial Ink Velvet.",
      ctaHref: "?marca=CLIO",
    },
    {
      imageCard: "assets/hero/hero-girl-dinner-card.webp",
      imageAlt: "Girl Dinner: contorno de ojos Dr.Melaxin, sérum Medicube EGF Peptide y bruma Anua servidos en un plato de corazón.",
      ctaHref: "?marca=Dr.Melaxin",
    },
    {
      imageCard: "assets/hero/hero-regalo-labios-card.webp",
      imageAlt: "Un regalo para ti, para consentirte: tinta Rom&nd Glasting Color, esencia de labios Torriden Solid In y tinta Amuse.",
      ctaHref: "?marca=rom%26nd",
    },
    {
      imageCard: "assets/hero/hero-medicube-toner-card.webp",
      imageAlt: "Elige tu tónico Medicube: luminosidad, calma o ilumina. ¿Cuál es para ti?",
      ctaHref: "?q=medicube+toner",
    },
    {
      imageCard: "assets/hero/hero-pdrn-card.webp",
      imageAlt: "PDRN: estimula la regeneración celular, repara la piel y mejora la elasticidad -- crema, sérum, mascarilla y esencia.",
      ctaHref: "?q=pdrn",
    },
    {
      imageCard: "assets/hero/hero-numbuzin-70-card.webp",
      imageAlt: "Grandes ahorros para una piel más sana: hasta 70% de descuento en numbuzin.",
      ctaHref: "?marca=numbuzin",
    },
    {
      imageCard: "assets/hero/hero-torriden-cellmazing-card.webp",
      imageAlt: "Torriden Cellmazing: rutina reafirmante con crema, contorno de ojos, ampolleta y mascarilla de gel.",
      ctaHref: "?q=torriden+cellmazing",
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
    { icon: "lock", title: "Paga como prefieras", text: "Tarjeta o transferencia con descuento" },
    { icon: "badgeCheck", title: "Catálogo verificado", text: "Disponibilidad real" },
  ],

  // ------------------------------------------------------------------
  // Cosmético Americano — colección aparte con su propio catálogo, carrito y
  // reglas de compra (precios en pesos, MOQ por color/tono, pedido mínimo
  // propio). No comparte carrito ni pedido mínimo con el resto del sitio.
  // ------------------------------------------------------------------
  AMERICANO: {
    // Pon en "false" para apagar por completo la colección (la pestaña
    // del menú deja de aparecer y la sección no se puede abrir) sin
    // borrar nada de tu Google Sheet -- en cuanto lo vuelvas a poner en
    // "true" todo tu catálogo de Cosmético Americano regresa tal cual
    // estaba.
    ENABLED: false,

    // Google Sheet publicado como CSV (mismo procedimiento que el catálogo
    // principal, ver README) con columnas: Nombre, Marca, Precio USD,
    // PrecioOriginal USD, Precio, PrecioOriginal, MOQ (mínimo de unidades
    // por color/tono), Imagen, Descripcion, Disponible, Presentacion
    // (opcional), SKU (opcional). Igual que el catálogo principal, las
    // columnas Precio/PrecioOriginal ya vienen en pesos (fórmula en el
    // Sheet que convierte Precio USD con el tipo de cambio de Config y le
    // suma SU PROPIA comisión — no la misma que la del catálogo coreano).
    SHEET_CSV_URL:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=1986930023&single=true&output=csv",

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
   Movimiento reducido -- si la clienta pidió "reducir movimiento" en su
   celular o computadora, el banner no avanza solo, los desplazamientos
   son instantáneos y los paneles aparecen sin deslizarse (ver input.css).
   ====================================================================== */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function scrollBehavior() {
  return prefersReducedMotion.matches ? "auto" : "smooth";
}

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
// true en cuanto llega el catálogo principal (o el de ejemplo). El stock
// puede llegar antes y agregar sus propias tarjetas a "products", así que
// "products.length" no basta para saber si ya se puede pintar la página.
let catalogLoaded = false;
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
let displayCurrency =
  CONFIG.CURRENCY_TOGGLE_ENABLED && localStorage.getItem("displayCurrency") === "USD" ? "USD" : "MXN";

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
  const available = CONFIG.CURRENCY_TOGGLE_ENABLED && shippingSettings.exchangeRate > 0;
  btn.classList.toggle("hidden", !available);
  btn.textContent = displayCurrency === "USD" ? "USD $" : "MXN $";
  btn.setAttribute("aria-label", `${btn.textContent}, cambiar moneda`);
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
  document.getElementById("wishlist-toggle").setAttribute(
    "aria-label",
    `Mis favoritos, ${wishlist.size} ${wishlist.size === 1 ? "guardado" : "guardados"}`
  );
}

function wishlistButtonHTML(id) {
  const active = isWishlisted(id);
  return `
    <button type="button" data-wishlist="${escapeAttr(id)}" aria-label="${active ? "Quitar de favoritos" : "Guardar en favoritos"}"
      class="tap absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow transition ${active ? "text-rose" : "text-ink/75 hover:text-rose"}">
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
    btn.classList.toggle("text-ink/75", !active);
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
  if (!routeRestoring) document.getElementById("wishlist-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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
    errorEl.textContent = friendlyError(err, "No pudimos guardar tu aviso. Intenta de nuevo en un momento.");
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

/* Pop-up con la infografía de tiempos de entrega, junto a "Catálogo
   completo" -- mismo patrón de ventana accesible que "Avísame cuando
   vuelva" (ver DIALOGS arriba), pero sin formulario, solo la imagen. */
function wireShippingTimesModal() {
  const openBtn = document.getElementById("shipping-times-open");
  const overlay = document.getElementById("shipping-times-overlay");
  const closeBtn = document.getElementById("shipping-times-close");
  if (!openBtn || !overlay || !closeBtn) return;
  const close = () => overlay.classList.add("opacity-0", "pointer-events-none");
  openBtn.addEventListener("click", () => overlay.classList.remove("opacity-0", "pointer-events-none"));
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "shipping-times-overlay") close();
  });
}

/* ======================================================================
   Calificaciones de producto -- solo clientas con cuenta que ya tienen
   un pedido PAGADO con ese SKU pueden calificar (lo valida el servidor,
   ver customer-submit-review.js). Guardar de nuevo actualiza tu propia
   reseña en vez de crear otra.
   ====================================================================== */
const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function starIconHTML(filled, sizeClass = "w-3.5 h-3.5") {
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="${sizeClass} ${filled ? "text-amber-400" : "text-ink/20"}" viewBox="0 0 24 24" fill="currentColor"><path d="${STAR_PATH}"/></svg>`;
}

/* Mapa sku -> { avg, count }, para las estrellas de las tarjetas de
   producto -- se carga una vez al inicio (product-reviews.js sin
   parámetro "sku" regresa el resumen de TODOS los productos con alguna
   reseña). */
let reviewSummaries = new Map();
let recentReviews = [];

/* "Lo que dicen nuestras clientas" en la portada: reseñas recientes de 4
   o 5 estrellas con comentario. Se oculta si todavía no hay. */
function renderHomeReviews() {
  const section = document.getElementById("home-reviews");
  if (!section) return;
  const items = recentReviews
    .map((r) => ({ r, p: products.find((x) => x.id === r.sku) || products.find((x) => x.stockSku === r.sku) }))
    .filter((x) => x.p);
  section.classList.toggle("hidden", !items.length);
  if (!items.length) return;
  document.getElementById("home-reviews-row").innerHTML = items
    .map(({ r, p }) => `<figure class="snap-start shrink-0 w-[80%] sm:w-[calc((100%_-_1.5rem)/3)] rounded-2xl border border-ink/10 bg-white p-4 flex flex-col gap-3">
      <div class="flex items-center gap-0.5" aria-label="${r.rating} de 5 estrellas">${[1, 2, 3, 4, 5].map((n) => starIconHTML(n <= r.rating, "w-4 h-4")).join("")}</div>
      <blockquote class="text-sm text-ink/85 leading-relaxed line-clamp-5">${escapeHtml(r.comment)}</blockquote>
      <figcaption class="mt-auto flex items-center gap-3">
        <button type="button" data-open-product="${escapeAttr(p.id)}" class="shrink-0 w-12 h-12 rounded-md bg-pill overflow-hidden"><img src="${escapeAttr(p.imagen || "")}" alt="" class="w-full h-full object-contain" loading="lazy" /></button>
        <span class="min-w-0 text-xs"><b class="block text-ink">${escapeHtml(r.customerName)}</b>
          <button type="button" data-open-product="${escapeAttr(p.id)}" class="block text-left text-ink/70 hover:underline truncate max-w-full">${escapeHtml(p.marca)} ${escapeHtml(splitBaseName(p).base)}</button></span>
      </figcaption></figure>`)
    .join("");
}

/* Dos entradas en la portada: comprar para revender (cajas, precio por
   pieza, pedido mínimo) o para ti (Stock en México sin mínimo, quiz). */
function renderShopPaths() {
  const el = document.getElementById("shop-paths");
  if (!el) return;
  const hasStock = products.some((p) => p.enStock && p.disponible);
  const min = CONFIG.MIN_ORDER_MXN ? formatPrice(CONFIG.MIN_ORDER_MXN) : "";
  const card = (href, emoji, title, text, cls) => `<a href="${href}" class="group flex items-center gap-4 rounded-2xl ${cls} p-4 sm:p-5 hover:-translate-y-0.5 transition">
      <span class="text-3xl sm:text-4xl" aria-hidden="true">${emoji}</span>
      <span class="min-w-0 flex-1"><span class="block font-display text-lg text-ink">${title}</span><span class="block text-sm text-ink/75 mt-0.5">${text}</span></span>
      <span class="text-ink/60 group-hover:text-ink text-xl" aria-hidden="true">›</span></a>`;
  el.innerHTML = `<div class="grid gap-3 sm:grid-cols-2">
      ${card("?ver=catalogo&pres=caja", "📦", "Compro para revender", `Cajas con precio por pieza para tu negocio.${min ? ` Pedido mínimo de ${min} en productos de Corea.` : ""}`, "bg-lilac/15 border border-lilac/40")}
      ${hasStock
        ? card("?ver=stock", "💗", "Compro para mí", "Stock en México: sin pedido mínimo y entrega inmediata.", "bg-blush/30 border border-rose/30")
        : card("#skintype-section", "💗", "Compro para mí", "Descubre tu tipo de piel y los productos para ti.", "bg-blush/30 border border-rose/30")}
    </div>
    <p class="mt-3 text-xs text-ink/70">Los precios que ves son por transferencia. Con tarjeta (Mercado Pago) cuestan un poco más; los dos precios aparecen en la ficha de cada producto y en tu carrito.</p>`;
}

async function loadReviewSummaries() {
  try {
    const res = await fetch("/.netlify/functions/product-reviews", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    reviewSummaries = new Map(Object.entries(data.summaries || {}));
    recentReviews = Array.isArray(data.recent) ? data.recent : [];
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
      class="flex items-center gap-1 text-xs text-ink/75 hover:text-ink mt-0.5">
      ${starIconHTML(true, "w-3 h-3")}
      <span class="font-semibold">${summary.avg}</span>
      <span class="text-ink/75">(${summary.count})</span>
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
          ${r.comment ? `<p class="text-sm text-ink/75 mt-0.5">${escapeHtml(r.comment)}</p>` : ""}
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
      // Se vuelve a pintar el grupo, así que el foco regresa a la estrella elegida.
      const again = document.querySelector(`#review-stars [data-star="${reviewRating}"]`);
      if (again) again.focus();
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
    errorEl.textContent = friendlyError(err, "No pudimos guardar tu calificación. Intenta de nuevo en un momento.");
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

/* Convierte cualquier error en un mensaje para la clienta: sin inglés
   del navegador ("Failed to fetch"), sin códigos internos
   ("mp_request_failed") y sin avisos de configuración pensados para la
   dueña. Los mensajes del servidor que ya están escritos para la
   clienta ("El teléfono debe tener 10 dígitos.") se muestran tal cual. */
function friendlyError(err, fallback) {
  const msg = err && err.message ? String(err.message) : "";
  const offline =
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    (err instanceof TypeError && /fetch|network|load failed/i.test(msg));
  if (offline) return "No hay conexión a internet. Revísala e intenta de nuevo.";
  const technical =
    !msg ||
    err instanceof SyntaxError ||
    /^[a-z0-9_]+$/.test(msg) ||
    /JSON|CONFIG|CUSTOMER_JWT|source debe|configurad|HTTP \d|Unexpected token/i.test(msg);
  return technical ? fallback : msg;
}

/* Errores del carrito: se muestran dentro del carrito, junto a los
   botones de pago (antes caían en el aviso de la página, detrás del
   carrito abierto, y la clienta nunca los veía). */
function showCartError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
  el.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
}

function clearCartError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function setStatus(text) {
  const banner = document.getElementById("status-banner");
  const el = document.getElementById("status-text");
  el.textContent = text;
  banner.classList.remove("hidden");
  announce(text);
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

/* Convierte la celda de precio a texto numérico. El último separador (punto
   o coma) es el decimal; los demás son de miles. Así "1,234.50" -> 1234.50 y
   "1.234,50" -> 1234.50, y "56,32" -> 56.32 como antes. */
function normalizeMoneyCell(raw) {
  const cleaned = String(raw || "").replace(/[^0-9.,]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastDot === -1 && lastComma === -1) return cleaned;
  if (lastComma > lastDot) return cleaned.replace(/\./g, "").replace(",", ".");
  return cleaned.replace(/,/g, "");
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
  const iCapacidad = findCol(headers, ["capacidad", "contenido", "tamaño", "tamano", "capacity"]);

  return rows
    .slice(1)
    .map((r, n) => {
      const get = (i) => (i >= 0 && r[i] != null ? r[i].trim() : "");
      const disponibleRaw = get(iDisponible).toLowerCase();
      const disponible =
        disponibleRaw === ""
          ? true
          : ["si", "sí", "yes", "true", "1", "disponible"].includes(disponibleRaw);
      const precioRaw = normalizeMoneyCell(get(iPrecio));
      const precioTarjetaRaw = normalizeMoneyCell(get(iPrecioTarjeta));
      const pesoRaw = get(iPeso).replace(/[^0-9.,]/g, "").replace(",", ".");
      const splitTags = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);
      const precio = parseFloat(precioRaw) || 0;
      const precioTarjeta = parseFloat(precioTarjetaRaw) || precio;
      return {
        id: get(iSku) || `row${n}`,
        nombre: get(iNombre) || "Producto sin nombre",
        categoria: normalizeCategoria(get(iCategoria)) || "General",
        marca: get(iMarca),
        precio,
        precioTarjeta,
        peso: parseFloat(pesoRaw) || 0,
        presentacion: get(iPresentacion),
        capacidad: get(iCapacidad),
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
      const precioRaw = normalizeMoneyCell(get(iPrecio));
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

function csvToShippingSettings(text) {
  const rows = parseCSV(text);
  const settings = { exchangeRate: 0, transferDiscountPct: 0 };
  rows.forEach((r) => {
    const key = normalizeKey(r[0]);
    const rawValue = (r[1] || "").trim();
    const numValue = parseFloat(rawValue.replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
    for (const field in SHIPPING_SETTING_ALIASES) {
      if (SHIPPING_SETTING_ALIASES[field].includes(key)) settings[field] = numValue;
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

/* Envío Corea→México por paquetes: cada caja ("Caja con N piezas") viaja
   en su propio envío, y todas las piezas individuales juntas en otro.
   Recibe los productos que SÍ vienen de Corea ({ peso, qty, presentacion })
   y regresa la lista de pesos, uno por envío (piezas sueltas primero). */
function koreaParcelWeights(lines) {
  const parcels = [];
  let loose = 0;
  for (const l of lines) {
    const peso = l.peso || 0;
    if (/^caja/i.test(l.presentacion || "")) {
      for (let i = 0; i < l.qty; i++) if (peso > 0) parcels.push(peso);
    } else {
      loose += peso * l.qty;
    }
  }
  if (loose > 0) parcels.unshift(loose);
  return parcels;
}

/* Suma la tarifa de cada envío desde Corea (cada uno con su propio tramo
   de la tabla de tarifas). */
function koreaParcelsUSD(parcels, useTarjeta = false) {
  return parcels.reduce((sum, kg) => sum + koreaShippingUSD(kg, useTarjeta), 0);
}

/* korea: lista de pesos de los envíos desde Corea (ver
   koreaParcelWeights; los productos "en stock" ya están en México y no
   pagan este tramo). Un número se toma como un solo envío. Si no se
   pasa, se asume un solo envío con pesoKg (compatibilidad). El envío
   nacional se sigue cotizando una sola vez con el peso total. */
function shippingEstimate(pesoKg, cp, korea = pesoKg) {
  if (pesoKg <= 0) return null;
  const parcels = (Array.isArray(korea) ? korea : [korea]).filter((kg) => kg > 0);
  const hasKorea = parcels.length > 0 && shippingKoreaRates.tiers.length > 0 && shippingSettings.exchangeRate > 0;
  const nacionalMXN = nacionalShippingMXN(cp, pesoKg);
  const hasNacional = nacionalMXN !== null;
  if (!hasKorea && !hasNacional) return null;

  const coreaUSD = hasKorea ? koreaParcelsUSD(parcels) : 0;
  const coreaMXN = coreaUSD * (shippingSettings.exchangeRate || 0);
  const totalMXN = coreaMXN + (nacionalMXN || 0);

  // Precio de envío de referencia al pagar con tarjeta (Mercado Pago):
  // usa la columna "Costo Tarjeta" de tus tablas de tarifas si la
  // agregaste (ver README sección 1.1), y si no, cae al mismo % de
  // "Descuento por transferencia" que usan los productos -- el envío
  // también se cobra a través de la terminal, así que le aplica la misma
  // diferencia entre ambos métodos de pago.
  const nacionalMXNTarjeta = hasNacional ? nacionalShippingMXN(cp, pesoKg, true) || 0 : 0;
  const coreaUSDTarjeta = hasKorea ? koreaParcelsUSD(parcels, true) : 0;
  const coreaMXNTarjeta = coreaUSDTarjeta * (shippingSettings.exchangeRate || 0);
  const totalMXNTarjeta = coreaMXNTarjeta + nacionalMXNTarjeta;

  return {
    hasKorea, hasNacional, coreaUSD,
    coreaMXN, nacionalMXN: nacionalMXN || 0, totalMXN,
    coreaMXNTarjeta, nacionalMXNTarjeta, totalMXNTarjeta,
    coreaEnvios: hasKorea ? parcels.length : 0,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Descarga el texto de una URL con reintentos -- Google a veces regresa
   "400 Bad Request" cuando varias pestañas PUBLICADAS del mismo Google
   Sheet se piden casi al mismo tiempo, que es justo lo que hace esta
   página al cargar (catálogo, stock, tarifas de envío, config, Cosmético
   Americano -- todas del mismo archivo). Sin este reintento, cualquiera
   de esas hojas se podía quedar sin datos toda la visita aunque los
   datos y los permisos estuvieran perfectamente bien. */
async function fetchTextWithRetry(url, { retries = 2, delayMs = 700 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastErr;
}

async function loadShippingSettings() {
  const isPlaceholder = !CONFIG.SHIPPING_CONFIG_CSV_URL || CONFIG.SHIPPING_CONFIG_CSV_URL.includes("PEGA_AQUI");
  if (isPlaceholder) return;
  try {
    const text = await fetchTextWithRetry(CONFIG.SHIPPING_CONFIG_CSV_URL);
    // Object.assign en vez de reasignar "shippingSettings" completo -- así
    // no se pisan los datos bancarios si loadBankDetails() (que llega por
    // otro camino, ver más abajo) ya había resuelto primero.
    Object.assign(shippingSettings, csvToShippingSettings(text));
    updateCurrencyToggleButton();
    renderFaqMinOrder();
    renderCart();
    renderBrands();
  } catch (err) {
    console.warn("No se pudo cargar la configuración de envíos:", err);
  }
}

/* Datos de depósito/transferencia -- a diferencia del resto de la
   configuración, estos YA NO se leen del CSV público de "Config" (ver
   README sección 4): se piden a una función de Netlify que los lee de
   una pestaña privada con la cuenta de servicio, para que tu CLABE/
   cuenta no queden como un link abierto que cualquiera puede ver sin
   pasar por tu carrito. Si no configuraste esa función, simplemente no
   se muestra el bloque de transferencia, igual que antes cuando no
   llenabas esas filas. */
async function loadBankDetails() {
  try {
    const res = await fetch("/.netlify/functions/bank-details", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    Object.assign(shippingSettings, BANK_DETAILS_DEFAULTS, data);
    renderCart();
  } catch (err) {
    console.warn("No se pudieron cargar los datos de depósito:", err);
  }
}

async function loadShippingKoreaRates() {
  const isPlaceholder = !CONFIG.SHIPPING_KOREA_RATES_CSV_URL || CONFIG.SHIPPING_KOREA_RATES_CSV_URL.includes("PEGA_AQUI");
  if (isPlaceholder) return;
  try {
    const text = await fetchTextWithRetry(CONFIG.SHIPPING_KOREA_RATES_CSV_URL);
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
    const text = await fetchTextWithRetry(CONFIG.SHIPPING_NACIONAL_CSV_URL);
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
    const precioMXN = parseFloat(normalizeMoneyCell(get(iPrecio))) || 0;
    const precioTarjetaMXN = parseFloat(normalizeMoneyCell(get(iPrecioTarjeta))) || precioMXN;
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
        categoria: normalizeCategoria(get(iCategoria)),
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
    const text = await fetchTextWithRetry(CONFIG.STOCK_CSV_URL);
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
const PRODUCTS_CSV_CACHE_KEY = "alpacca_products_csv_cache_v2";

function loadCachedProductsCsv() {
  try {
    return localStorage.getItem(PRODUCTS_CSV_CACHE_KEY) || "";
  } catch {
    return "";
  }
}

function saveCachedProductsCsv(text) {
  try {
    // La copia vieja (catálogo completo, mucho más pesada) ya no se usa.
    localStorage.removeItem("alpacca_products_csv_cache_v1");
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
    catalogLoaded = true;
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
        catalogLoaded = true;
        renderAll();
        refreshCurrentView();
        applyInitialRoute();
      }
    } catch (err) {
      // Copia guardada corrupta -- se ignora, sigue con el fetch normal.
    }
  }

  try {
    // Primero la versión ligera servida desde alpacca.mx (sin descripción
    // ni costos, en la CDN); si fallara, directo del Google Sheet.
    let text;
    try {
      text = await fetchTextWithRetry(CONFIG.CATALOG_LIGHT_URL, { retries: 1 });
      if (!csvToProducts(text).length) throw new Error("catálogo ligero vacío");
    } catch (lightErr) {
      text = await fetchTextWithRetry(CONFIG.GOOGLE_SHEET_CSV_URL);
    }
    const parsed = csvToProducts(text);
    if (!parsed.length) throw new Error("CSV vacío o encabezados no reconocidos");
    products = parsed;
    saveCachedProductsCsv(text);
    hideStatus();
  } catch (err) {
    console.warn("No se pudo cargar el catálogo:", err);
    // Si ya había una copia guardada, se deja lo que ya se pintó (es el
    // catálogo real, aunque sea de hace rato). Si no, NUNCA se muestran
    // productos de ejemplo: se avisa y se vuelve a intentar solo.
    if (!cachedCsv && !products.length) {
      products = [];
      setStatus("No pudimos cargar el catálogo. Revisa tu conexión; lo volvemos a intentar en unos segundos.");
      if (productsRetries < 4) {
        productsRetries++;
        setTimeout(loadProducts, 6000 * productsRetries);
      }
    }
  }
  applyStockData();
  syncCartWithProducts();
  catalogLoaded = true;
  renderAll();
  refreshCurrentView();
  if (products.length) applyInitialRoute();
}
let productsRetries = 0;

/* ======================================================================
   Carga de productos — Cosmético Americano (Sheet aparte, opcional). Si no se
   configuró CONFIG.AMERICANO.SHEET_CSV_URL, la sección completa se oculta.
   ====================================================================== */
async function loadAmericanoProducts() {
  if (!CONFIG.AMERICANO.ENABLED) return;
  const url = CONFIG.AMERICANO.SHEET_CSV_URL;
  const isPlaceholder = !url || url.includes("PEGA_AQUI");
  if (isPlaceholder) return;

  try {
    const text = await fetchTextWithRetry(url);
    americanoProducts = csvToAmericanoProducts(text);
  } catch (err) {
    console.warn("No se pudo cargar el catálogo de Cosmético Americano:", err);
    americanoProducts = [];
  }
  syncAmericanoCartWithProducts();
  renderAmericanoSection();
  renderAmericanoCart();
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
// El banner avanza solo cada 6 s, salvo que: la clienta lo pausó con el
// botón, tiene el mouse o el foco del teclado encima, no está en
// pantalla, o la pestaña está oculta. Si pidió menos movimiento en su
// sistema, arranca en pausa (puede darle "play" si quiere).
const heroHold = { user: prefersReducedMotion.matches, hover: false, focus: false, offscreen: false };

/* Banner estilo StyleKorean: tarjetas verticales 4:5 redondeadas lado a
   lado. La del centro es la principal: un poco más abajo, más grande y
   con sombra; las de los lados más chicas y tenues (ver .hero-card en
   input.css). Al deslizar, la que queda al centro toma ese lugar. */
function heroSlides() {
  return (CONFIG.HERO_SLIDES || []).filter((s) => s.imageCard);
}

function heroSlideHTML(slide, i, clone) {
  const href = slide.ctaHref || "";
  const tag = href ? "a" : "div";
  return `<${tag} ${href ? `href="${escapeAttr(href)}"` : ""} data-hero-card ${clone ? 'aria-hidden="true" inert' : ""}
    class="hero-card snap-center shrink-0 aspect-[4/5] rounded-2xl overflow-hidden bg-pill block">
    <img src="${escapeAttr(slide.imageCard)}" alt="${clone ? "" : escapeAttr(slide.imageAlt || "")}" ${i === 0 && !clone ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}
      class="w-full h-full object-cover" />
  </${tag}>`;
}

function heroCards() {
  return [...document.querySelectorAll("#hero-slides [data-hero-card]")];
}

/* Para que la tarjeta principal siempre tenga una a cada lado, la fila
   lleva 3 copias de los slides (las de los extremos son solo de
   adorno: inert y ocultas a lectores de pantalla). heroPos es la
   posición en esa fila; al terminar de moverse a una copia, se salta sin
   animación a la tarjeta igual de en medio. heroIndex = heroPos % n. */
let heroPos = 0;
let heroScrollingTo = null;

function heroCenterLeft(stage, card) {
  return card.offsetLeft + card.offsetWidth / 2 - stage.clientWidth / 2;
}

function markHeroCenter(pos) {
  heroCards().forEach((c, i) => c.classList.toggle("is-center", i === pos));
}

function scrollHeroTo(pos, smooth) {
  const stage = document.getElementById("hero-slides");
  const card = heroCards()[pos];
  if (!card) return;
  heroPos = pos;
  heroIndex = pos % heroSlides().length;
  heroScrollingTo = smooth ? pos : null;
  stage.scrollTo({ left: heroCenterLeft(stage, card), behavior: smooth ? scrollBehavior() : "auto" });
  markHeroCenter(pos);
  renderHeroDots();
}

/* Si quedó en una copia, salta a la misma tarjeta de en medio sin que se
   note (se apagan las transiciones un instante). */
function normalizeHeroPos() {
  const n = heroSlides().length;
  if (heroPos >= n && heroPos < 2 * n) return;
  const stage = document.getElementById("hero-slides");
  stage.classList.add("hero-no-anim");
  scrollHeroTo(n + (heroPos % n), false);
  void stage.offsetWidth;
  stage.classList.remove("hero-no-anim");
}

function renderHeroSlide() {
  const slides = heroSlides();
  if (!slides.length) {
    document.getElementById("top").classList.add("hidden");
    return;
  }
  const stage = document.getElementById("hero-slides");
  const loop = slides.length > 1;
  stage.innerHTML = loop
    ? [...slides.map((s, i) => heroSlideHTML(s, i, true)), ...slides.map((s, i) => heroSlideHTML(s, i, false)), ...slides.map((s, i) => heroSlideHTML(s, i, true))].join("")
    : heroSlideHTML(slides[0], 0, false);
  // Arranca con el primer slide al centro (es el que se precarga en
  // index.html); gracias a las copias, igual tiene una tarjeta a cada lado.
  const start = 0;
  stage.classList.add("hero-no-anim");
  scrollHeroTo(loop ? slides.length + start : 0, false);
  void stage.offsetWidth;
  stage.classList.remove("hero-no-anim");
}

/* Contador "1 | 6" como el de StyleKorean. */
function renderHeroDots() {
  const slides = heroSlides();
  const counter = document.getElementById("hero-dots");
  const controls = document.getElementById("hero-controls");
  if (controls) controls.classList.toggle("hidden", slides.length < 2);
  counter.innerHTML = `<span class="text-cream">${heroIndex + 1}</span><span class="mx-1.5 text-cream/50">|</span><span class="text-cream/70">${slides.length}</span>`;
}

function stepHero(delta) {
  if (heroSlides().length < 2) return;
  normalizeHeroPos();
  scrollHeroTo(heroPos + delta, true);
}

function heroShouldRun() {
  const slides = heroSlides();
  return slides.length > 1 && !document.hidden && !Object.values(heroHold).some(Boolean);
}

function restartHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = null;
  updateHeroPauseButton();
  if (!heroShouldRun()) return;
  heroTimer = setInterval(() => stepHero(1), 5000);
}

const HERO_PAUSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
const HERO_PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`;

function updateHeroPauseButton() {
  const btn = document.getElementById("hero-pause");
  if (!btn) return;
  const multiple = heroSlides().length > 1;
  btn.classList.toggle("hidden", !multiple);
  btn.classList.toggle("flex", multiple);
  const paused = heroHold.user;
  // Solo se redibuja el ícono si cambió: si se reemplazara a media
  // pulsación (el foco que entra al banner llama a esta función), el
  // navegador perdía el clic del botón.
  if (btn.dataset.state === String(paused)) return;
  btn.dataset.state = String(paused);
  btn.setAttribute("aria-label", paused ? "Reanudar el banner" : "Pausar el banner");
  btn.querySelector("span").innerHTML = paused ? HERO_PLAY_ICON : HERO_PAUSE_ICON;
}

function wireHeroControls() {
  const hero = document.getElementById("top");
  const stage = document.getElementById("hero-slides");
  document.getElementById("hero-prev").addEventListener("click", () => {
    stepHero(-1);
    restartHeroTimer();
  });
  document.getElementById("hero-next").addEventListener("click", () => {
    stepHero(1);
    restartHeroTimer();
  });
  // Al deslizar con el dedo, la tarjeta que queda más cerca del centro
  // se vuelve la principal (se resalta en vivo; el contador al final).
  let scrollIdle = null;
  const nearestToCenter = () => {
    const mid = stage.scrollLeft + stage.clientWidth / 2;
    let nearest = 0;
    heroCards().forEach((c, i, cards) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      const best = cards[nearest];
      if (d < Math.abs(best.offsetLeft + best.offsetWidth / 2 - mid)) nearest = i;
    });
    return nearest;
  };
  stage.addEventListener("scroll", () => {
    if (heroScrollingTo === null) markHeroCenter(nearestToCenter());
    clearTimeout(scrollIdle);
    scrollIdle = setTimeout(() => {
      heroScrollingTo = null;
      const nearest = nearestToCenter();
      if (nearest !== heroPos) {
        heroPos = nearest;
        heroIndex = nearest % heroSlides().length;
        markHeroCenter(nearest);
        renderHeroDots();
      }
      normalizeHeroPos();
    }, 150);
  }, { passive: true });
  // Al cambiar el tamaño de la ventana, se vuelve a centrar.
  window.addEventListener("resize", () => scrollHeroTo(heroPos, false));
  document.getElementById("hero-pause").addEventListener("click", () => {
    heroHold.user = !heroHold.user;
    restartHeroTimer();
  });
  // Se decide con el elemento sobre el que está el mouse (en vez de
  // entrar/salir del banner), así nunca se queda "pausado por hover"
  // aunque cambie algo debajo del cursor.
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const over = hero.contains(e.target);
    if (over === heroHold.hover) return;
    heroHold.hover = over;
    restartHeroTimer();
  });
  document.documentElement.addEventListener("pointerleave", () => {
    if (!heroHold.hover) return;
    heroHold.hover = false;
    restartHeroTimer();
  });
  // Solo el foco del teclado pausa (si pausara también al hacer clic en
  // un punto, el banner se quedaba detenido sin que se notara por qué).
  hero.addEventListener("focusin", (e) => {
    heroHold.focus = e.target.matches(":focus-visible");
    restartHeroTimer();
  });
  hero.addEventListener("focusout", (e) => {
    if (hero.contains(e.relatedTarget)) return;
    heroHold.focus = false;
    restartHeroTimer();
  });
  document.addEventListener("visibilitychange", restartHeroTimer);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      heroHold.offscreen = !entry.isIntersecting;
      restartHeroTimer();
    }).observe(hero);
  }
}

/* ======================================================================
   Ítems del menú ☰ (en celular y en escritorio; los accesos principales
   también están en los íconos redondos del inicio).
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
    items.push({ type: "link", label: "✅ Stock en México 🇲🇽", href: "#stock-section" });
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

function menuItemHTML(item) {
  const base = "block px-5 py-4 border-b border-ink/10 font-semibold uppercase text-sm tracking-wide";

  if (item.type === "brands" || item.type === "categories" || item.type === "country") {
    const key = item.type;
    const optionAttr =
      item.type === "brands" ? "data-menu-brand" : item.type === "categories" ? "data-menu-category" : "data-menu-country";
    const dropdownOptions = item.options
      .map(
        (v) =>
          `<button type="button" ${optionAttr}="${escapeAttr(v)}"
            class="block w-full text-left px-4 py-2 coarse:py-3 text-sm text-ink/75 hover:bg-blush/40 hover:text-ink transition">${escapeHtml(v)}</button>`
      )
      .join("");
    return `<div data-${key}-dropdown>
      <button type="button" data-${key}-toggle aria-expanded="false"
        class="${base} w-full text-left text-ink/80 hover:text-ink transition inline-flex items-center justify-between">
        ${escapeHtml(item.label)}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div data-${key}-panel class="menu-panel hidden bg-blush/10">${dropdownOptions}</div>
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
      toggle.setAttribute("aria-expanded", String(!panel.classList.contains("hidden")));
    });
    panel.__toggle = toggle;
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
    if (!panel.contains(e.target) && !owner.contains(e.target)) {
      panel.classList.add("hidden");
      if (panel.__toggle) panel.__toggle.setAttribute("aria-expanded", "false");
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll("[data-brands-panel], [data-categories-panel], [data-country-panel]").forEach((panel) => {
    if (panel.classList.contains("hidden")) return;
    panel.classList.add("hidden");
    if (panel.__toggle) {
      panel.__toggle.setAttribute("aria-expanded", "false");
      panel.__toggle.focus();
    }
  });
});

/* ======================================================================
   Menú móvil (☰)
   ====================================================================== */
function renderMobileMenu() {
  const nav = document.getElementById("mobile-menu-items");
  const items = getMenuItems();
  nav.innerHTML = items.map((item) => menuItemHTML(item)).join("");
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
/* Badge "Entrega inmediata · N piezas" / "Agotado" para productos que
   vienen de la pestaña Stock (p.enStock). Se separa en su propia función
   porque, cuando el producto tiene varios tonos (hasVariants), el stock
   es distinto para cada tono -- no se puede mostrar hasta que el
   cliente elija uno (ver wireVariantSelectors). */
function stockBadgeHTML(p) {
  if (!p.enStock) return "";
  return p.stockPiezas > 0
    ? `<span class="inline-block w-fit text-xs font-medium px-1.5 py-px rounded border border-green-700/40 text-green-700">${p.stockPiezas} ${p.stockPiezas === 1 ? "pieza disponible" : "piezas disponibles"}</span>`
    : `<span class="inline-block w-fit text-xs font-medium px-1.5 py-px rounded border border-sale/40 text-sale">Agotado</span>`;
}

/* Las cajas se distinguen a primera vista de la pieza individual:
   etiqueta morada rellena con 📦 y marco lila en la foto (ver
   productCardHTML); la pieza individual va en gris discreto. */
function isCajaPresentacion(p) {
  return /^caja/i.test(p.presentacion || "");
}

function presentacionTagHTML(p) {
  if (!p.presentacion) return "";
  return isCajaPresentacion(p)
    ? `<span class="inline-flex items-center gap-1 w-fit text-xs font-semibold px-2 py-0.5 rounded bg-lilac-band text-cream">📦 ${escapeHtml(p.presentacion)}</span>`
    : `<span class="inline-block w-fit text-xs font-medium px-2 py-0.5 rounded bg-ink/[0.06] text-ink/75">${escapeHtml(p.presentacion)}</span>`;
}

function productCardHTML(p, { rank } = {}) {
  const img = p.imagen || placeholderImg(p.categoria || "Alpacca", "#e9c3be");
  const hasVariants = p.variants && p.variants.length > 1;
  // Solo se ofrece "Avísame" cuando de verdad está agotado -- no cuando
  // el botón está deshabilitado nada más porque falta elegir un tono
  // (hasVariants), que es una razón distinta.
  const outOfStock = !hasVariants && (!p.disponible || (p.enStock && p.stockPiezas <= 0));
  // Estilo StyleKorean: sin caja alrededor, foto sobre gris claro, marca
  // en negrita, nombre en 2 líneas, precio fuerte y etiquetas chicas con
  // borde. Los data-* son los que usan el carrito, los tonos
  // (wireVariantSelectors busca ".group") y "Avísame" -- no quitarlos.
  const presKeyAttr = p.presKey && (presClusters.get(p.presKey) || []).length > 1 ? ` data-pres-card="${escapeAttr(p.presKey)}"` : "";
  return `
    <div class="group flex flex-col h-full"${presKeyAttr}${rank ? ` data-rank="${rank}"` : ""}>
      <div data-open-product="${escapeAttr(hasVariants ? p.variants[0].product.id : p.id)}" class="cursor-pointer aspect-square ${isCajaPresentacion(p) ? "bg-lilac/15 border-2 border-lilac/70" : "bg-pill"} overflow-hidden relative rounded-md">
        ${rank ? `<span class="absolute top-0 left-0 z-10 min-w-[1.5rem] h-6 px-1.5 bg-ink text-cream text-xs font-semibold flex items-center justify-center rounded-br-md tabular-nums">${rank}</span>` : ""}
        <img data-card-img src="${escapeAttr(img)}" alt="${escapeAttr(p.nombre)}" loading="lazy"
          class="w-full h-full object-contain group-hover:scale-[1.03] transition duration-300" />
        <div data-card-badge class="absolute top-2 ${rank ? "right-2" : "left-2"}">${!p.disponible ? agotadoBadgeHTML() : ""}</div>
        ${wishlistButtonHTML(p.id)}
      </div>
      <div class="pt-2.5 flex flex-col flex-1">
        <span class="text-[13px] font-bold text-ink leading-tight truncate">${escapeHtml(p.marca || p.categoria)}</span>
        <h3 class="text-[13px] text-ink/80 leading-snug mt-0.5 line-clamp-2 min-h-[2.4em]" title="${escapeAttr(p.nombre)}"><button type="button" data-open-product="${escapeAttr(hasVariants ? p.variants[0].product.id : p.id)}" class="text-left hover:underline underline-offset-2">${escapeHtml(p.nombre)}</button></h3>
        ${p.capacidad ? `<span class="text-xs text-ink/60">${escapeHtml(p.capacidad)}</span>` : ""}
        ${
          hasVariants
            ? `<select data-variant-select aria-label="Elige la versión de ${escapeHtml(p.nombre)}"
                class="mt-1.5 w-full truncate text-xs border border-ink/15 rounded-md pl-1.5 pr-5 py-1 bg-white text-ink/80 focus:outline-none focus:ring-2 focus:ring-rose/30">
                <option value="" selected disabled>Selecciona una versión</option>
                ${p.variants
                  .map((v) => `<option value="${escapeAttr(v.product.id)}">${escapeHtml(v.label)}</option>`)
                  .join("")}
              </select>`
            : ""
        }
        ${presChipsHTML(p)}
        <div class="mt-auto pt-1.5">
          <div class="leading-tight tabular-nums">
            <span data-card-price class="font-bold text-[15px] text-ink block">${formatPrice(p.precio)}</span>
            <span data-card-unit>${boxUnitPriceHTML(p)}</span>
            <span data-card-tarjeta></span>
          </div>
          ${productReviewSummaryHTML(p)}
          <div class="flex flex-wrap gap-1 mt-1.5 empty:hidden">
            <span data-card-stock-badge class="empty:hidden">${hasVariants ? "" : stockBadgeHTML(p)}</span>
            ${presentacionTagHTML(p)}
          </div>
          ${
            outOfStock
              ? `<button type="button" data-restock="${escapeAttr(p.id)}" aria-label="Avísame cuando vuelva ${escapeHtml(p.nombre)}" title="Avísame cuando vuelva" data-restock-name="${escapeAttr((p.marca ? p.marca + " -- " : "") + p.nombre)}" data-restock-sku="${escapeAttr(p.sku || p.id)}" data-restock-marca="${escapeAttr(p.marca || "")}"
                  class="tap mt-2.5 w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-full border border-rose/60 text-rose-ink text-[13px] font-semibold hover:bg-rose/10 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  Avísame
                </button>`
              : `<button data-add="${hasVariants ? "" : escapeAttr(p.id)}" ${hasVariants ? "disabled" : ""} aria-label="Agregar ${escapeHtml(p.nombre)} al carrito" title="${hasVariants ? "Elige una versión" : "Agregar al carrito"}"
                  class="tap mt-2.5 w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-full border border-ink text-ink text-[13px] font-semibold hover:bg-ink hover:text-cream transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.8 1.8 0 0 0 1.8 1.4h8.4a1.8 1.8 0 0 0 1.8-1.4L21 7H6"/></svg>
                  Agregar
                </button>`
          }
        </div>
      </div>
    </div>`;
}

function agotadoBadgeHTML() {
  return `<span class="bg-ink/85 text-cream text-xs font-semibold px-2 py-0.5 rounded-sm">Agotado</span>`;
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
      // Si el primero de la familia llegó sin tono (se guardó tal cual) y
      // ahora aparece otro con tono, se convierte en familia con selector
      // incluyendo al primero; si no, "variants" no existe y truena.
      if (!entry.variants) {
        const plain = entry;
        entry = { ...plain, nombre: baseName, variants: [{ label: plain.nombre || baseName, product: plain }] };
        order[order.indexOf(plain)] = entry;
        groups.set(key, entry);
      }
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

      const tarjetaEl = card.querySelector("[data-card-tarjeta]");
      if (tarjetaEl) tarjetaEl.innerHTML = "";

      const badgeEl = card.querySelector("[data-card-badge]");
      if (badgeEl) badgeEl.innerHTML = variant.disponible ? "" : agotadoBadgeHTML();

      const stockBadgeEl = card.querySelector("[data-card-stock-badge]");
      if (stockBadgeEl) stockBadgeEl.innerHTML = stockBadgeHTML(variant);

      const imgEl = card.querySelector("[data-card-img]");
      if (imgEl && variant.imagen) imgEl.src = variant.imagen;
    });
  });
}

/* Debajo del precio (que es el de transferencia): cuánto cuesta con
   tarjeta, en una sola línea discreta como en StyleKorean. */
function cardPriceNoteHTML(p) {
  if (!(p.precioTarjeta && p.precioTarjeta > p.precio + 0.5)) return "";
  return `<span class="block text-xs text-ink/60 mt-0.5">Con tarjeta: ${formatPrice(p.precioTarjeta)}</span>`;
}

/* Para presentaciones "Caja con N piezas", muestra el costo por pieza
   individual para que el cliente no tenga que dividir el total. */
function boxUnitPriceHTML(p) {
  const match = /Caja con (\d+) piezas/i.exec(p.presentacion || "");
  if (!match) return "";
  const qty = Number(match[1]);
  if (!qty) return "";
  return `<span class="block text-xs text-ink/60 mt-0.5">${formatPrice(p.precio / qty)} c/u</span>`;
}

function wireAddButtons(container) {
  container.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

/* ======================================================================
   Pieza y caja en una sola tarjeta. Antes la pieza individual y cada
   caja del mismo producto salían como tarjetas separadas, una junto a
   otra (la fila parecía repetida). Ahora es una tarjeta con botones
   "Pieza / Caja 40" que cambian precio, foto y botón de agregar.
   ====================================================================== */
const presClusters = new Map(); // clave -> [tarjetas de cada presentación]
let presIndex = null;
let presIndexFor = null;
let presIndexLen = 0;

function presOrder(p) {
  if (!isCajaPresentacion(p)) return 0;
  const m = /(\d+)/.exec(p.presentacion || "");
  return m ? Number(m[1]) : 99999;
}

function presClusterKey(p) {
  return `${p.enStock ? "s" : "k"}||${p.marca || ""}||${normalizeForSearch(p.nombre).trim()}`;
}

function presLabels(list) {
  const base = list.map((p) => {
    if (!isCajaPresentacion(p)) return "Pieza";
    const m = /(\d+)/.exec(p.presentacion || "");
    return m ? `Caja ${m[1]}` : p.presentacion;
  });
  // Si dos se llaman igual (ej. dos tamaños de pieza), se agrega el tamaño.
  return base.map((l, i) => (base.indexOf(l) !== base.lastIndexOf(l) && list[i].capacidad ? `${l} ${list[i].capacidad}` : l));
}

/* Todas las presentaciones de cada producto del catálogo, para que una
   fila (ej. Best Seller) muestre "Pieza / Caja" aunque solo la pieza esté
   marcada como Best Seller. Se arma una vez por cada carga del catálogo. */
function presentationIndex() {
  if (presIndex && presIndexFor === products && presIndexLen === products.length) return presIndex;
  presIndex = new Map();
  presIndexFor = products;
  presIndexLen = products.length;
  [...groupVariants(products.filter((p) => p.enStock)), ...groupVariants(products.filter((p) => !p.enStock))].forEach((e) => {
    const k = presClusterKey(e);
    if (!presIndex.has(k)) presIndex.set(k, []);
    presIndex.get(k).push(e);
  });
  presIndex.forEach((list) => list.sort((a, b) => presOrder(a) - presOrder(b)));
  return presIndex;
}

/* expand=false: solo junta lo que ya viene en la lista (para respetar
   filtros como "Solo cajas"). expand=true: busca las demás presentaciones
   en todo el catálogo. */
function clusterPresentations(items, { expand = false } = {}) {
  const order = [];
  const groups = new Map();
  for (const it of items) {
    const k = presClusterKey(it);
    if (!groups.has(k)) {
      groups.set(k, []);
      order.push(k);
    }
    groups.get(k).push(it);
  }
  const index = expand ? presentationIndex() : null;
  return order.map((k) => {
    const own = groups.get(k);
    let list = own;
    if (index && index.has(k)) {
      list = index.get(k).slice();
      own.forEach((it) => { if (!list.some((x) => x.id === it.id)) list.push(it); });
      list.sort((a, b) => presOrder(a) - presOrder(b));
    } else {
      list = own.slice().sort((a, b) => presOrder(a) - presOrder(b));
    }
    if (list.length < 2) return own[0];
    const tagged = list.map((x) => ({ ...x, presKey: k }));
    presClusters.set(k, tagged);
    // Se muestra la presentación que venía primero en la lista original.
    return tagged.find((x) => x.id === own[0].id) || tagged[0];
  });
}

function presChipsHTML(p) {
  const list = p.presKey ? presClusters.get(p.presKey) : null;
  if (!list || list.length < 2) return "";
  const labels = presLabels(list);
  return `<div class="flex flex-wrap gap-1 mt-1.5" role="group" aria-label="Presentación">${list
    .map((e, i) => {
      const on = e.id === p.id;
      return `<button type="button" data-pres-swap="${i}" aria-pressed="${on}"
        class="tap h-7 px-2.5 rounded-full text-xs font-semibold border transition ${on ? "border-ink bg-ink text-cream" : "border-ink/20 text-ink/80 hover:border-ink"}">${escapeHtml(labels[i])}</button>`;
    })
    .join("")}</div>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pres-swap]");
  if (!b) return;
  const card = b.closest("[data-pres-card]");
  const list = card && presClusters.get(card.dataset.presCard);
  const entry = list && list[Number(b.dataset.presSwap)];
  if (!entry) return;
  const tmp = document.createElement("div");
  tmp.innerHTML = productCardHTML(entry, card.dataset.rank ? { rank: Number(card.dataset.rank) } : {}).trim();
  const fresh = tmp.firstElementChild;
  wireAddButtons(fresh);
  wireVariantSelectors(fresh);
  card.replaceWith(fresh);
  const again = fresh.querySelector(`[data-pres-swap="${b.dataset.presSwap}"]`);
  if (again) again.focus({ preventScroll: true });
});

/* ======================================================================
   Ficha de producto: se abre al tocar la foto o el nombre de cualquier
   tarjeta. Foto grande, descripción, tipo de piel, pieza vs caja, tonos,
   reseñas, agregar y compartir. Su dirección es alpacca.mx/?p=SKU (la
   misma que se comparte por WhatsApp; ver netlify/functions/product-page.js).
   ====================================================================== */
const productInfoCache = new Map();
let sheetProductId = null;

function splitBaseName(p) {
  const m = SHADE_VARIANT_RE.exec(p.nombre || "") || TYPE_VARIANT_RE.exec(p.nombre || "");
  return { base: m ? m[1] : p.nombre || "", shade: m ? m[2] : null };
}

function productFamily(p) {
  const { base, shade } = splitBaseName(p);
  const same = products.filter((x) => x.marca === p.marca && Boolean(x.enStock) === Boolean(p.enStock) && splitBaseName(x).base === base);
  const variants = same.filter((x) => (x.presentacion || "") === (p.presentacion || ""));
  const byPres = new Map();
  same.forEach((x) => {
    const k = x.presentacion || "";
    if (!byPres.has(k)) byPres.set(k, []);
    byPres.get(k).push(x);
  });
  const presentations = [...byPres.values()]
    .map((list) => list.find((x) => splitBaseName(x).shade === shade) || list.find((x) => x.disponible) || list[0])
    .sort((a, b) => presOrder(a) - presOrder(b));
  return { base, shade, variants: variants.length > 1 ? variants : [], presentations: presentations.length > 1 ? presentations : [] };
}

async function loadProductInfo(p) {
  const sku = p.stockSku || p.id;
  if (productInfoCache.has(sku) || p.descripcion) return;
  productInfoCache.set(sku, null);
  let info = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`/.netlify/functions/product-page?sku=${encodeURIComponent(sku)}&format=json`);
      if (res.status === 404) break;
      if (res.ok) { info = await res.json(); break; }
    } catch (err) { /* se reintenta una vez */ }
    await sleep(1200);
  }
  productInfoCache.set(sku, info);
  if (sheetProductId === p.id) renderProductSheet(p);
}

function productShareUrl(p) {
  return `https://alpacca.mx/?p=${encodeURIComponent(p.stockSku || p.id)}`;
}

function renderProductSheet(p) {
  const fam = productFamily(p);
  const sku = p.stockSku || p.id;
  const info = productInfoCache.get(sku);
  const desc = p.descripcion || (info && info.descripcion) || "";
  const tipo = p.tipoPiel && p.tipoPiel.length
    ? p.tipoPiel
    : info && info.tipoPiel ? info.tipoPiel.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const out = !p.disponible || (p.enStock && p.stockPiezas <= 0);
  const summary = reviewSummaries.get(sku);
  const url = productShareUrl(p);
  const shareText = `${p.marca ? `${p.marca} ` : ""}${fam.base} en Alpacca: ${url}`;
  const img = p.imagen || placeholderImg(p.categoria || "Alpacca", "#e9c3be");
  const presLabelsList = fam.presentations.length ? presLabels(fam.presentations) : [];
  document.getElementById("product-crumb").textContent = [p.categoria, p.marca].filter(Boolean).join(" · ");
  document.getElementById("product-body").innerHTML = `
    <div class="grid gap-5 sm:grid-cols-2 sm:gap-8">
      <div class="relative aspect-square w-full max-w-[min(100%,34vh)] mx-auto sm:max-w-full rounded-xl overflow-hidden ${isCajaPresentacion(p) ? "bg-lilac/15 border-2 border-lilac/70" : "bg-pill"}">
        <img src="${escapeAttr(img)}" alt="${escapeAttr(p.nombre)}" class="w-full h-full object-contain" />
        <div class="absolute top-2 left-2">${!p.disponible ? agotadoBadgeHTML() : ""}</div>
        ${wishlistButtonHTML(p.id)}
      </div>
      <div class="flex flex-col gap-4 min-w-0">
        <div>
          ${p.marca ? `<button type="button" data-sheet-brand="${escapeAttr(p.marca)}" class="text-sm font-bold text-ink hover:underline underline-offset-2">${escapeHtml(p.marca)}</button>` : ""}
          <h2 id="product-title" class="font-display text-xl sm:text-2xl text-ink leading-snug mt-0.5 [text-wrap:balance]">${escapeHtml(p.nombre)}</h2>
          ${p.capacidad ? `<p class="text-sm text-ink/70 mt-1">${escapeHtml(p.capacidad)}</p>` : ""}
          ${summary && summary.count ? `<button type="button" data-view-reviews="${escapeAttr(sku)}" data-view-reviews-name="${escapeAttr(p.nombre)}" class="mt-1.5 inline-flex items-center gap-1 text-sm text-ink/80 hover:text-ink">${starIconHTML(true, "w-4 h-4")}<b>${summary.avg}</b> · ${summary.count} reseña${summary.count === 1 ? "" : "s"}</button>` : ""}
        </div>
        ${fam.presentations.length ? `<div>
          <p class="text-xs font-semibold text-ink/75 mb-1.5">Presentación</p>
          <div class="grid grid-cols-2 gap-2">${fam.presentations.map((x, i) => {
            const on = x.id === p.id;
            const unit = /Caja con (\d+)/i.exec(x.presentacion || "");
            return `<button type="button" data-sheet-goto="${escapeAttr(x.id)}" aria-pressed="${on}"
              class="text-left rounded-xl border-2 px-3 py-2 transition ${on ? "border-rose-deep bg-blush/30" : "border-ink/15 hover:border-ink/40"}">
              <span class="block text-sm font-semibold text-ink">${escapeHtml(presLabelsList[i])}</span>
              <span class="block text-sm tabular-nums text-ink">${formatPrice(x.precio)}</span>
              ${unit ? `<span class="block text-xs text-ink/70 tabular-nums">${formatPrice(x.precio / Number(unit[1]))} c/u</span>` : ""}
            </button>`;
          }).join("")}</div></div>` : p.presentacion ? `<div>${presentacionTagHTML(p)}</div>` : ""}
        ${fam.variants.length ? `<div>
          <label for="sheet-variant" class="block text-xs font-semibold text-ink/75 mb-1.5">Tono o versión</label>
          <select id="sheet-variant" data-sheet-variant class="w-full rounded-lg border border-ink/20 bg-white px-3 py-2.5 text-base sm:text-sm text-ink focus:outline-none focus:ring-2 focus:ring-rose/30">
            ${fam.variants.map((v) => `<option value="${escapeAttr(v.id)}"${v.id === p.id ? " selected" : ""}${v.disponible ? "" : " disabled"}>${escapeHtml(splitBaseName(v).shade || v.nombre)}${v.disponible ? "" : " (agotado)"}</option>`).join("")}
          </select></div>` : ""}
        <div class="tabular-nums leading-tight">
          <p class="text-2xl font-bold text-ink">${formatPrice(p.precio)} <span class="text-sm font-medium text-ink/70">por transferencia</span></p>
          ${p.precioTarjeta && p.precioTarjeta > p.precio + 0.5 ? `<p class="text-sm text-ink/70 mt-1">Con tarjeta: ${formatPrice(p.precioTarjeta)}</p>` : ""}
          ${boxUnitPriceHTML(p).replace("text-xs", "text-sm")}
        </div>
        <p class="text-sm text-ink/80">${p.enStock
          ? `✅ <b>Stock en México</b>: entrega inmediata y sin pedido mínimo. ${stockBadgeHTML(p)}`
          : `🇰🇷 Se pide a Corea. Cuenta para el pedido mínimo de ${formatPrice(CONFIG.MIN_ORDER_MXN || 0)}.`}</p>
        <div class="flex flex-col gap-2 sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-cream/95 backdrop-blur border-t border-ink/10 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent sm:border-0">
          ${out
            ? `<button type="button" data-restock="${escapeAttr(p.id)}" data-restock-name="${escapeAttr((p.marca ? p.marca + " -- " : "") + p.nombre)}" data-restock-sku="${escapeAttr(p.sku || p.id)}" data-restock-marca="${escapeAttr(p.marca || "")}"
                class="h-12 rounded-full border border-rose/60 text-rose-ink font-semibold hover:bg-rose/10 transition">🔔 Avísame cuando vuelva</button>`
            : `<button type="button" data-sheet-add="${escapeAttr(p.id)}" class="h-12 rounded-full bg-ink text-cream font-semibold hover:bg-ink/85 transition">Agregar al carrito</button>`}
          <div class="flex gap-2">
            <a href="https://wa.me/?text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener"
              class="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#dcf8e8] text-[#17803d] text-sm font-semibold hover:brightness-95">Compartir por WhatsApp</a>
            <button type="button" data-sheet-copy="${escapeAttr(url)}" class="h-11 px-4 rounded-full border border-ink/20 text-sm font-semibold text-ink hover:bg-ink/5">Copiar link</button>
          </div>
        </div>
        <div class="border-t border-ink/10 pt-4 flex flex-col gap-3 text-sm">
          ${desc
            ? `<p class="text-ink/85 leading-relaxed max-w-prose">${escapeHtml(desc)}</p>`
            : info === undefined || info === null
              ? `<p class="text-ink/60">Cargando descripción…</p>`
              : ""}
          ${tipo.length ? `<div><p class="text-xs font-semibold text-ink/75 mb-1.5">Ideal para piel</p><div class="flex flex-wrap gap-1.5">${tipo.map((t) => `<span class="rounded-full bg-lilac/15 text-lilac-ink text-xs font-semibold px-2.5 py-1">${escapeHtml(t)}</span>`).join("")}</div></div>` : ""}
          <p class="text-xs text-ink/60">${escapeHtml(brandCountry(p.marca))} · SKU ${escapeHtml(sku)}</p>
          ${p.marca ? `<button type="button" data-sheet-brand="${escapeAttr(p.marca)}" class="self-start text-sm font-semibold text-rose-ink underline underline-offset-2">Ver todo de ${escapeHtml(p.marca)} →</button>` : ""}
        </div>
      </div>
    </div>`;
  loadProductInfo(p);
}

function openProductSheet(id, { fromRoute = false } = {}) {
  const p = products.find((x) => x.id === id) || products.find((x) => x.stockSku === id && x.enStock) || products.find((x) => x.id === `${id}${STOCK_CLONE_ID_SUFFIX}`);
  if (!p) return false;
  const wasOpen = sheetProductId != null;
  sheetProductId = p.id;
  renderProductSheet(p);
  document.getElementById("product-body").parentElement.scrollTop = 0;
  const overlay = document.getElementById("product-overlay");
  overlay.classList.remove("opacity-0", "pointer-events-none");
  document.title = `${p.marca ? `${p.marca} ` : ""}${p.nombre} — Alpacca`;
  if (!fromRoute) {
    try {
      const search = `?p=${encodeURIComponent(p.stockSku || p.id)}`;
      if (wasOpen) history.replaceState({ ...(history.state || {}), sheet: true }, "", search);
      else {
        history.replaceState({ ...(history.state || {}), scrollY: window.scrollY }, "");
        history.pushState({ sheet: true }, "", search);
      }
    } catch (err) { /* sin historial, la ficha igual funciona */ }
  }
  return true;
}

function hideProductSheet() {
  sheetProductId = null;
  document.getElementById("product-overlay").classList.add("opacity-0", "pointer-events-none");
  const params = new URLSearchParams(currentRouteKey);
  setRouteMeta(Object.fromEntries(params.entries()));
}

/* Cerrar con la ×, Escape o tocando afuera: si la ficha se abrió desde la
   tienda, se regresa en el historial (así "atrás" y la × hacen lo mismo);
   si se entró directo con el link, se deja la dirección de la vista. */
function closeProductSheet() {
  if (sheetProductId == null) return;
  if (history.state && history.state.sheet) {
    history.back();
    return;
  }
  hideProductSheet();
  try {
    history.replaceState({}, "", `${location.pathname}${currentRouteKey ? `?${currentRouteKey}` : ""}`);
  } catch (err) { /* nada */ }
}

function applyProductRoute(params) {
  const id = params.get("p");
  if (id && products.length) {
    if (!openProductSheet(id, { fromRoute: true })) hideProductSheet();
  } else if (sheetProductId != null) {
    hideProductSheet();
  }
}

function initProductSheet() {
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open-product]");
    if (!opener || opener.closest("#product-overlay")) return;
    // Si la tarjeta tiene tonos y ya eligieron uno, se abre ese.
    const card = opener.closest(".group");
    const chosen = card && card.querySelector("[data-add]") && card.querySelector("[data-add]").dataset.add;
    e.preventDefault();
    openProductSheet(chosen || opener.dataset.openProduct);
  });
  const overlay = document.getElementById("product-overlay");
  document.getElementById("product-close").addEventListener("click", closeProductSheet);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) { closeProductSheet(); return; }
    const go = e.target.closest("[data-sheet-goto]");
    if (go) { openProductSheet(go.dataset.sheetGoto); return; }
    const add = e.target.closest("[data-sheet-add]");
    if (add) {
      const id = add.dataset.sheetAdd;
      closeProductSheet();
      addToCart(id);
      return;
    }
    const brand = e.target.closest("[data-sheet-brand]");
    if (brand) {
      const marca = brand.dataset.sheetBrand;
      hideProductSheet();
      showBrandProducts(marca);
      return;
    }
    const copy = e.target.closest("[data-sheet-copy]");
    if (copy) {
      const done = () => { copy.textContent = "¡Copiado!"; setTimeout(() => { copy.textContent = "Copiar link"; }, 1600); };
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        navigator.share({ url: copy.dataset.sheetCopy, title: document.title }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(copy.dataset.sheetCopy).then(done).catch(() => {});
      }
    }
  });
  overlay.addEventListener("change", (e) => {
    if (e.target.matches("[data-sheet-variant]")) openProductSheet(e.target.value);
  });
}

/* ======================================================================
   Sugerencias mientras escribes en el buscador: marcas y productos, con
   foto y precio. Enter sigue mostrando todos los resultados.
   ====================================================================== */
let suggestTimer = null;
let suggestActive = -1;

function searchMatches(q) {
  const words = normalizeForSearch(q).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const exact = products.filter((p) => {
    const hay = normalizeForSearch(`${p.marca} ${p.nombre} ${p.categoria}`);
    return words.every((w) => hay.includes(w));
  });
  return exact;
}

/* Si no hubo nada, se intenta con faltas de ortografía comunes (una letra
   de más, de menos o cambiada): "anau" encuentra "anua". */
function editDistanceWithin(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  const d = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Dos letras volteadas ("anau" -> "anua") cuentan como un solo error.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return false;
  }
  return d[a.length][b.length] <= max;
}

function fuzzyMatches(q) {
  const words = normalizeForSearch(q).trim().split(/\s+/).filter((w) => w.length >= 3);
  if (!words.length) return [];
  const tokenCache = new Map();
  return products.filter((p) => {
    let toks = tokenCache.get(p.id);
    if (!toks) {
      toks = normalizeForSearch(`${p.marca} ${p.nombre} ${p.categoria}`).split(/[^a-z0-9]+/).filter(Boolean);
      tokenCache.set(p.id, toks);
    }
    return words.every((w) => {
      const max = w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0;
      return toks.some((t) => t.includes(w) || (max && editDistanceWithin(w, t.slice(0, w.length + max), max)));
    });
  });
}

function renderSuggestions() {
  const input = document.getElementById("search-input");
  const box = document.getElementById("search-suggest");
  const q = input.value.trim();
  if (q.length < 2 || !products.length) { hideSuggestions(); return; }
  const nq = normalizeForSearch(q);
  let matches = searchMatches(q);
  let fuzzy = false;
  if (!matches.length) { matches = fuzzyMatches(q); fuzzy = matches.length > 0; }
  const brandCounts = new Map();
  products.forEach((p) => { if (p.marca && normalizeForSearch(p.marca).includes(nq.split(/\s+/)[0])) brandCounts.set(p.marca, (brandCounts.get(p.marca) || 0) + 1); });
  const brands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const seen = new Set();
  const items = [];
  for (const p of matches) {
    const k = presClusterKey({ ...p, nombre: splitBaseName(p).base });
    if (seen.has(k)) continue;
    seen.add(k);
    items.push(p);
    if (items.length >= 6) break;
  }
  const rows = [];
  brands.forEach(([marca, n]) => rows.push({ type: "brand", marca, html: `<span class="w-10 h-10 shrink-0 rounded-full bg-blush/40 flex items-center justify-center text-xs font-bold text-rose-ink">${escapeHtml(marca.slice(0, 2).toUpperCase())}</span><span class="min-w-0"><span class="block text-sm font-semibold text-ink">${escapeHtml(marca)}</span><span class="block text-xs text-ink/70">Marca · ${n} productos</span></span>` }));
  items.forEach((p) => rows.push({ type: "product", id: p.id, html: `<img src="${escapeAttr(p.imagen || "")}" alt="" class="w-10 h-10 shrink-0 rounded-md object-contain bg-pill" loading="lazy" /><span class="min-w-0 flex-1"><span class="block text-xs font-bold text-ink truncate">${escapeHtml(p.marca)}</span><span class="block text-sm text-ink/85 truncate">${escapeHtml(splitBaseName(p).base)}</span></span><span class="text-sm font-semibold tabular-nums text-ink shrink-0">${formatPrice(p.precio)}</span>` }));
  if (!rows.length) {
    box.innerHTML = `<p class="px-4 py-3 text-sm text-ink/70">Sin resultados para "${escapeHtml(q)}".</p>`;
  } else {
    box.innerHTML = (fuzzy ? `<p class="px-4 pt-2 pb-1 text-xs text-ink/60">Quizá quisiste decir…</p>` : "") +
      rows.map((r, i) => `<button type="button" role="option" id="sg-${i}" aria-selected="false" data-sg="${i}" data-sg-type="${r.type}" data-sg-val="${escapeAttr(r.type === "brand" ? r.marca : r.id)}"
        class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-ink/5 aria-selected:bg-ink/5">${r.html}</button>`).join("") +
      `<button type="button" role="option" id="sg-${rows.length}" aria-selected="false" data-sg="${rows.length}" data-sg-type="all"
        class="w-full px-4 py-2.5 text-left text-sm font-semibold text-rose-ink hover:bg-ink/5 aria-selected:bg-ink/5 border-t border-ink/10">Ver todos los resultados (${matches.length.toLocaleString("es-MX")})</button>`;
  }
  suggestActive = -1;
  box.classList.remove("hidden");
  input.setAttribute("aria-expanded", "true");
}

function hideSuggestions() {
  const box = document.getElementById("search-suggest");
  box.classList.add("hidden");
  box.innerHTML = "";
  suggestActive = -1;
  const input = document.getElementById("search-input");
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function chooseSuggestion(btn) {
  const input = document.getElementById("search-input");
  const type = btn.dataset.sgType;
  hideSuggestions();
  if (type === "brand") { input.value = ""; showBrandProducts(btn.dataset.sgVal); }
  else if (type === "product") openProductSheet(btn.dataset.sgVal);
  else {
    renderSearchResults(input.value);
    document.getElementById("search-results-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }
  input.blur();
}

function initSearchSuggest() {
  const input = document.getElementById("search-input");
  const box = document.getElementById("search-suggest");
  input.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(renderSuggestions, 120);
  });
  input.addEventListener("focus", () => { if (input.value.trim().length >= 2) renderSuggestions(); });
  input.addEventListener("keydown", (e) => {
    const opts = [...box.querySelectorAll("[data-sg]")];
    if (box.classList.contains("hidden") || !opts.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      suggestActive = (suggestActive + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
      opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === suggestActive)));
      input.setAttribute("aria-activedescendant", opts[suggestActive].id);
      opts[suggestActive].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && suggestActive >= 0) {
      e.preventDefault();
      chooseSuggestion(opts[suggestActive]);
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });
  // mousedown para que el clic gane antes de que el input pierda el foco.
  box.addEventListener("mousedown", (e) => e.preventDefault());
  box.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sg]");
    if (btn) chooseSuggestion(btn);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#search-form")) hideSuggestions();
  });
}

/* ======================================================================
   Cosmético Americano — tarjeta de producto propia (precio en pesos, precio
   original tachado si aplica, y MOQ por color/tono en vez de la etiqueta
   de presentación normal).
   ====================================================================== */
/* "Mínimo 5 piezas" -- corto para que quepa en una línea en tarjetas
   angostas (antes "Mínimo de compra: 5" se partía en dos). */
function moqLabel(moq) {
  const n = Number(moq) || 1;
  return `Mínimo ${n} ${n === 1 ? "pieza" : "piezas"}`;
}

function americanoProductCardHTML(p) {
  const img = p.imagen || "./assets/americano-coming-soon.jpg";
  const hasVariants = p.variants && p.variants.length > 1;
  const hasDiscount = p.precioOriginal > p.precio;
  return `
    <div class="group rounded-2xl bg-white/60 border border-ink/10 overflow-hidden flex flex-col h-full transition duration-200 hover:shadow-lg hover:border-rose/30">
      <div class="aspect-square bg-blush/20 overflow-hidden relative">
        <img data-card-img src="${escapeAttr(img)}" alt="${escapeAttr(p.nombre)}" loading="lazy"
          class="w-full h-full object-contain group-hover:scale-105 transition duration-200" />
        <div data-card-badge class="absolute top-2 left-2">${!p.disponible ? agotadoBadgeHTML() : ""}</div>
      </div>
      <div class="p-3 flex flex-col flex-1">
        <span class="inline-block w-fit whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-full mb-1 bg-ink/10 text-ink/75" data-card-moq>${moqLabel(p.moq)}</span>
        <span class="text-xs uppercase tracking-wider text-ink/75">${escapeHtml(p.marca)}</span>
        <h3 class="font-semibold ${productNameSizeClass(p.nombre)} text-ink leading-snug mt-0.5" title="${escapeAttr(p.nombre)}">${escapeHtml(p.nombre)}</h3>
        ${
          hasVariants
            ? `<select data-variant-select aria-label="Elige la versión de ${escapeHtml(p.nombre)}"
                class="mt-1 w-full truncate text-xs border border-ink/15 rounded-md pl-1.5 pr-5 py-1 bg-white/70 text-ink/80 focus:outline-none focus:ring-2 focus:ring-lilac">
                <option value="" selected disabled>Selecciona una versión</option>
                ${p.variants
                  .map((v) => `<option value="${escapeAttr(v.product.id)}">${escapeHtml(v.label)}</option>`)
                  .join("")}
              </select>`
            : ""
        }
        <div class="mt-auto pt-3">
          <div class="leading-tight tabular-nums">
            <span data-card-price class="font-display font-semibold text-lg text-ink block">${formatPrice(p.precio)}</span>
            ${hasDiscount ? `<span data-card-original class="flex flex-wrap items-baseline gap-x-1 text-xs mt-0.5"><span class="text-ink/75 whitespace-nowrap">Precio Sephora</span><span class="text-red-700 line-through">${formatPrice(p.precioOriginal)}</span></span>` : `<span data-card-original class="hidden"></span>`}
          </div>
          <button data-americano-add="${hasVariants ? "" : escapeAttr(p.id)}" ${!p.disponible || hasVariants ? "disabled" : ""}
            class="tap mt-2 w-full rounded-full bg-ink text-cream text-sm font-semibold px-3 py-2 hover:bg-ink/90 transition disabled:opacity-30 disabled:cursor-not-allowed">
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
        originalEl.className = hasDiscount ? "flex flex-wrap items-baseline gap-x-1 text-xs mt-0.5" : "hidden";
        originalEl.innerHTML = hasDiscount
          ? `<span class="text-ink/75 whitespace-nowrap">Precio Sephora</span><span class="text-red-700 line-through">${formatPrice(variant.precioOriginal)}</span>`
          : "";
      }

      const moqEl = card.querySelector("[data-card-moq]");
      if (moqEl) moqEl.textContent = moqLabel(variant.moq);

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
  mountProductRow(document.getElementById("time-deal-row"), items);

  // "D-2 11:15:31" en rosa junto al título, como en StyleKorean.
  const updateCountdown = () => {
    const diffMs = endsAt - new Date();
    if (diffMs <= 0) {
      section.classList.add("hidden");
      clearInterval(timeDealTimer);
      return;
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const pad = (n) => String(n).padStart(2, "0");
    const clock = `${pad(Math.floor((totalSeconds % 86400) / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
    document.getElementById("time-deal-countdown").textContent = days > 0 ? `D-${days} ${clock}` : clock;
  };

  updateCountdown();
  timeDealTimer = setInterval(updateCountdown, 1000);
  section.classList.remove("hidden");
}

/* ======================================================================
   Filas de productos que se deslizan (estilo StyleKorean). Cada fila va
   dentro de un [data-row-wrap] con flechas [data-row-prev]/[data-row-next]
   (solo en escritorio) y pestañas tipo pastilla arriba.
   ====================================================================== */
const ROW_CARD_CLASS = "snap-start shrink-0 w-[44%] sm:w-[30%] lg:w-[calc((100%_-_5rem)/6)]";

function mountProductRow(container, items, { ranked = false } = {}) {
  items = clusterPresentations(items, { expand: true });
  container.innerHTML = items
    .map((p, i) => `<div class="${ROW_CARD_CLASS}">${productCardHTML(p, ranked ? { rank: i + 1 } : {})}</div>`)
    .join("");
  container.scrollLeft = 0;
  wireAddButtons(container);
  wireVariantSelectors(container);
}

function tabPillsHTML(tabs, activeKey, attr) {
  return tabs
    .map((t) => {
      const active = t.key === activeKey;
      return `<button type="button" ${attr}="${escapeAttr(t.key)}" aria-pressed="${active}"
        class="tap inline-flex items-center h-9 px-4 rounded-full text-[13px] font-medium whitespace-nowrap transition ${
          active ? "bg-ink text-cream" : "bg-pill text-ink/80 hover:bg-ink/[0.08]"
        }">${escapeHtml(t.label)}</button>`;
    })
    .join("");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-row-prev], [data-row-next]");
  if (!btn) return;
  const row = btn.closest("[data-row-wrap]").querySelector("[data-row]");
  const dir = btn.hasAttribute("data-row-next") ? 1 : -1;
  row.scrollBy({ left: dir * row.clientWidth * 0.85, behavior: scrollBehavior() });
});

/* ======================================================================
   Best Seller -- productos cuya columna "Destacado" incluye "Best
   Seller" (en el orden del Google Sheet), numerados, en una fila con
   pestañas por categoría. Si no hay ninguno, la sección se oculta.
   ====================================================================== */
let bestSellerTab = "all";

function renderBestSellers() {
  const section = document.getElementById("featured-section");
  const all = groupVariants(products.filter((p) => !p.enStock && (p.destacado || []).includes("Best Seller")));

  if (!all.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const cats = [...new Set(all.map((p) => p.categoria).filter(Boolean))];
  const tabs = cats.length >= 2 ? [{ key: "all", label: "Todo" }, ...cats.map((c) => ({ key: c, label: c }))] : [];
  if (!tabs.some((t) => t.key === bestSellerTab)) bestSellerTab = "all";

  const tabsEl = document.getElementById("featured-tabs");
  tabsEl.innerHTML = tabPillsHTML(tabs, bestSellerTab, "data-bs-tab");
  tabsEl.classList.toggle("hidden", !tabs.length);
  tabsEl.onclick = (e) => {
    const btn = e.target.closest("[data-bs-tab]");
    if (!btn) return;
    bestSellerTab = btn.dataset.bsTab;
    renderBestSellers();
  };

  const items = bestSellerTab === "all" ? all : all.filter((p) => p.categoria === bestSellerTab);
  mountProductRow(document.getElementById("featured-top"), items.slice(0, 20), { ranked: true });
}

/* ======================================================================
   Íconos redondos de accesos rápidos (debajo del banner), como los de
   StyleKorean. Cada uno lleva la foto de un producto de esa sección.
   ====================================================================== */
/* Íconos ilustrados (assets/icons/, 240×240 sobre fondo rosita). Las
   categorías se buscan sin acentos ni mayúsculas; si una no tiene ícono,
   se usa la foto de uno de sus productos. */
const QUICK_ICON_DIR = "./assets/icons/";
const CATEGORY_ICONS = {
  skincare: "skincare",
  maquillaje: "maquillaje",
  suplementos: "suplementos",
  "cuidado capilar": "capilar",
  "cuidado corporal": "corporal",
};

/* Categorías con distinto nombre en el Sheet que son la misma: se
   juntan en una sola (así no salen dos círculos ni dos filtros iguales).
   La llave va sin acentos ni mayúsculas. */
const CATEGORY_ALIASES = {
  "cuidado del cabello": "Cuidado Capilar",
  "cuidado capilar": "Cuidado Capilar",
};

function normalizeCategoria(cat) {
  const clean = (cat || "").trim();
  return CATEGORY_ALIASES[normalizeForSearch(clean)] || clean;
}

function renderQuickIcons() {
  const el = document.getElementById("quick-icons");
  if (!el) return;
  const icon = (name) => `${QUICK_ICON_DIR}${name}.webp`;
  const used = new Set();
  const pickImg = (list) => {
    const p = list.find((x) => x.imagen && !used.has(x.imagen));
    if (!p) return "";
    used.add(p.imagen);
    return p.imagen;
  };
  const avail = products.filter((p) => !p.enStock);
  const icons = [];

  if (avail.some((p) => (p.destacado || []).includes("Best Seller"))) {
    icons.push({ key: "best", label: "Best Seller", img: icon("best") });
  }
  if (products.some((p) => p.enStock)) {
    icons.push({ key: "stock", label: "Stock en México", img: icon("stock") });
  }
  icons.push({ key: "catalog", label: "Catálogo completo", img: icon("catalogo") });

  const counts = new Map();
  avail.forEach((p) => p.categoria && counts.set(p.categoria, (counts.get(p.categoria) || 0) + 1));
  [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 6)
    .forEach(([cat]) => {
      const named = CATEGORY_ICONS[normalizeForSearch(cat).trim()];
      icons.push({
        key: `cat:${cat}`,
        label: cat,
        img: named ? icon(named) : pickImg(avail.filter((p) => p.categoria === cat)),
      });
    });

  if (!document.getElementById("brands-section").classList.contains("hidden")) {
    icons.push({ key: "brands", label: "Marcas", img: icon("marcas") });
  }
  icons.push({ key: "shipping", label: "Tiempos de entrega", img: icon("envio") });

  el.innerHTML = icons
    .map(
      (ic) => `<button type="button" data-quick="${escapeAttr(ic.key)}"
        class="group shrink-0 w-[4.75rem] sm:w-24 flex flex-col items-center gap-2 text-center">
        <span class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#fdecf2] overflow-hidden flex items-center justify-center ring-1 ring-rose/10 group-hover:ring-rose/50 group-hover:-translate-y-0.5 transition">
          ${
            ic.img
              ? `<img src="${escapeAttr(ic.img)}" alt="" loading="lazy" decoding="async" class="w-full h-full object-cover" />`
              : ""
          }
        </span>
        <span class="text-xs font-medium text-ink leading-tight">${escapeHtml(ic.label)}</span>
      </button>`
    )
    .join("");

  el.onclick = (e) => {
    const btn = e.target.closest("[data-quick]");
    if (!btn) return;
    const key = btn.dataset.quick;
    // Best Seller y Marcas viven en el inicio: si está abierta otra vista
    // (catálogo, una categoría, etc.) primero se regresa al inicio, si no
    // la sección está oculta y el botón no hace nada.
    const goHomeTo = (id) => {
      if (currentHomeView !== "home") showHomeView("home");
      document.getElementById(id).scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    };
    if (key === "best") goHomeTo("featured-section");
    else if (key === "stock") openStockSection();
    else if (key === "catalog") openFullCatalog();
    else if (key === "brands") goHomeTo("brands-section");
    else if (key === "shipping") document.getElementById("shipping-times-open").click();
    else if (key.startsWith("cat:")) showCategoryProducts(key.slice(4));
  };
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

  const questionEl = document.getElementById("quiz-question");
  questionEl.textContent = q.question;
  // Tras responder, el foco regresa a la pregunta nueva; el primero no se mueve.
  if (quizIndex > 0) questionEl.focus();

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
  if (!promo || !document.getElementById("promo-title")) return;
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

let brandTab = null;

function renderBrands(showAll = false) {
  const section = document.getElementById("brands-section");
  const allBrands = [...new Set(products.filter((p) => !p.enStock).map((p) => p.marca).filter(Boolean))].sort();
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
  if (!brandTab || !brands.includes(brandTab)) brandTab = brands[0];

  const hasMore = !showAll && brands.length > previewCount;
  const visibleBrands = hasMore ? brands.slice(0, previewCount) : brands;
  if (!visibleBrands.includes(brandTab)) visibleBrands.push(brandTab);

  const tabsEl = document.getElementById("brands-grid");
  tabsEl.innerHTML =
    tabPillsHTML(visibleBrands.map((b) => ({ key: b, label: b })), brandTab, "data-brand-tab") +
    (hasMore
      ? `<button type="button" id="brands-show-more"
          class="tap inline-flex items-center h-9 px-4 rounded-full border border-ink/15 text-[13px] font-medium whitespace-nowrap text-ink/80 hover:border-ink/40 transition">Todas las marcas +</button>`
      : "");
  tabsEl.onclick = (e) => {
    if (e.target.closest("#brands-show-more")) {
      renderBrands(true);
      return;
    }
    const btn = e.target.closest("[data-brand-tab]");
    if (!btn) return;
    brandTab = btn.dataset.brandTab;
    renderBrands(showAll || !hasMore);
  };

  const items = groupVariants(products.filter((p) => !p.enStock && p.marca === brandTab));
  mountProductRow(document.getElementById("brands-row"), items.slice(0, 20));
  const more = document.getElementById("brands-more");
  more.textContent = `Ver todo ${brandTab}`;
  more.onclick = () => showBrandProducts(brandTab);
}

function showBrandProducts(marca, { restore = false } = {}) {
  document.getElementById("brand-products-title").textContent = `Productos de ${marca}`;
  mountListing("brands", products.filter((p) => !p.enStock && p.marca === marca), { restore, id: marca });
  showHomeView("brands", { marca });
  if (!restore) document.getElementById("brand-products-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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

function showCountryProducts(pais, { restore = false } = {}) {
  document.getElementById("country-products-title").textContent = `Marcas de ${pais}`;
  mountListing("country", products.filter((p) => !p.enStock && brandCountry(p.marca) === pais), { restore, id: pais });
  showHomeView("country", { pais });
  if (!restore) document.getElementById("country-products-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

function showCategoryProducts(categoria, { restore = false } = {}) {
  document.getElementById("category-products-title").textContent = `Categoría: ${categoria}`;
  mountListing("categories", products.filter((p) => !p.enStock && p.categoria === categoria), { restore, id: categoria });
  showHomeView("categories", { categoria });
  if (!restore) document.getElementById("category-products-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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

let concernTab = null;

function renderConcernTiles() {
  const section = document.getElementById("concerns-section");
  const concerns = CONFIG.SKIN_CONCERNS || [];
  const withItems = concerns
    .map((c) => ({ ...c, items: groupVariants(products.filter((p) => !p.enStock && productMatchesConcern(p, c))) }))
    .filter((c) => c.items.length > 0);

  if (!withItems.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  if (!withItems.some((c) => c.key === concernTab)) concernTab = withItems[0].key;
  const current = withItems.find((c) => c.key === concernTab);

  const tabsEl = document.getElementById("concerns-grid");
  tabsEl.innerHTML = tabPillsHTML(
    withItems.map((c) => ({ key: c.key, label: `${c.emoji} ${c.label}` })),
    concernTab,
    "data-concern-tab"
  );
  tabsEl.onclick = (e) => {
    const btn = e.target.closest("[data-concern-tab]");
    if (!btn) return;
    concernTab = btn.dataset.concernTab;
    renderConcernTiles();
  };

  mountProductRow(document.getElementById("concerns-row"), current.items.slice(0, 20));
  const more = document.getElementById("concerns-more");
  more.onclick = () => showConcernProducts(concernTab);
}

function showConcernProducts(key, { restore = false } = {}) {
  const concern = (CONFIG.SKIN_CONCERNS || []).find((c) => c.key === key);
  if (!concern) return;
  document.getElementById("concern-products-title").textContent = `${concern.emoji} ${concern.label}`;
  mountListing("concerns", products.filter((p) => !p.enStock && productMatchesConcern(p, concern)), { restore, id: key });
  showHomeView("concerns", { preocupacion: key });
  if (!restore) document.getElementById("concern-products-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

/* ======================================================================
   Búsqueda — cada palabra debe estar en la marca, el nombre o la
   categoría (en cualquier orden). Solo busca al enviar
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

const DEFAULT_VIEW_ROUTES = {
  home: {},
  catalog: { ver: "catalogo" },
  stock: { ver: "stock" },
  wishlist: { ver: "favoritos" },
  americano: { ver: "americano" },
};

function showHomeView(view, route) {
  currentHomeView = view;
  const r = route || DEFAULT_VIEW_ROUTES[view];
  if (r) {
    pushRoute(r);
    setRouteMeta(r);
  }
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

function renderSearchResults(query, { restore = false } = {}) {
  const q = normalizeForSearch(query).trim();

  if (!q) {
    showHomeView("home");
    return;
  }

  // Cada palabra se busca por separado en marca + nombre + categoría
  // juntos, así "shiseido oil" encuentra los aceites de Shiseido aunque
  // la marca y el nombre estén en columnas distintas.
  // Los de Stock en México (entrega inmediata) salen primero; se agrupan
  // aparte de los de Corea para no mezclar sus tonos en un mismo selector.
  let matches = searchMatches(q);
  let fuzzy = false;
  if (!matches.length) {
    matches = fuzzyMatches(q);
    fuzzy = matches.length > 0;
  }
  document.getElementById("search-results-title").textContent = fuzzy
    ? `No encontramos "${query.trim()}"; estos se parecen`
    : `Resultados para "${query.trim()}"`;
  hideSuggestions();
  const count = mountListing("search", matches, { restore, id: q });
  showHomeView("search", { q: query.trim() });

  announce(
    count
      ? `${count} ${count === 1 ? "producto" : "productos"} para "${query.trim()}"`
      : `Sin resultados para "${query.trim()}"`
  );
}

/* ======================================================================
   Catálogo completo -- todos los productos del Sheet, sin filtrar.
   ====================================================================== */
function renderCatalogGrid(restore = true) {
  mountListing("catalog", products.filter((p) => !p.enStock), { restore, id: "all" });
}

function openFullCatalog({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  renderCatalogGrid(restore);
  showHomeView("catalog");
  if (!restore) document.getElementById("catalog-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

/* ======================================================================
   En stock -- solo los productos marcados como entrega inmediata. Esta es
   la sección que más rápido se espera ver (es la promesa de "entrega
   inmediata"), pero sus tarjetas dependen de que el catálogo principal
   ya haya cargado (ver applyStockData) -- si alguien la abre antes de
   que termine, refreshCurrentView() la vuelve a pintar en cuanto llegan
   más datos, sin que tenga que salir y volver a entrar.
   ====================================================================== */
/* Marca (alfabético, sin distinguir mayúsculas/acentos) y, dentro de la
   misma marca, nombre -- los productos sin marca capturada se van hasta
   el final en vez de mezclarse al principio. */
function compareByMarcaThenNombre(a, b) {
  const marcaA = a.marca || "";
  const marcaB = b.marca || "";
  if (!marcaA && marcaB) return 1;
  if (marcaA && !marcaB) return -1;
  const marcaCompare = marcaA.localeCompare(marcaB, "es", { sensitivity: "base" });
  if (marcaCompare !== 0) return marcaCompare;
  return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
}

function renderStockGrid(restore = true) {
  mountListing("stock", products.filter((p) => p.enStock), { restore, id: "stock" });
}

function openStockSection({ restore = false } = {}) {
  document.getElementById("search-input").value = "";
  renderStockGrid(restore);
  showHomeView("stock");
  if (!restore) document.getElementById("stock-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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
   Listados con filtros, orden y "Ver más" (catálogo, búsqueda, marca,
   categoría, país, preocupación y Stock en México). Antes se pintaban
   TODOS los productos de golpe -- el catálogo completo eran ~7,000
   tarjetas y en celular tardaba o se trababa. Ahora se pintan de 24 en
   24 y se cargan más al bajar.
   ====================================================================== */
const LISTING_PAGE = 24;
const LISTINGS = {
  search: { grid: "search-results-grid", empty: "search-results-empty", filters: ["categoria", "marca", "pres", "precio", "disp"] },
  catalog: { grid: "catalog-grid", empty: "catalog-empty", filters: ["categoria", "marca", "pres", "precio", "disp"] },
  stock: { grid: "stock-grid", empty: "stock-empty", filters: ["categoria", "marca", "precio"], defaultSort: "marca" },
  brands: { grid: "brand-products-grid", empty: "brand-products-empty", filters: ["categoria", "pres", "precio", "disp"] },
  categories: { grid: "category-products-grid", empty: "category-products-empty", filters: ["marca", "pres", "precio", "disp"] },
  country: { grid: "country-products-grid", empty: "country-products-empty", filters: ["categoria", "marca", "pres", "precio", "disp"] },
  concerns: { grid: "concern-products-grid", empty: "concern-products-empty", filters: ["categoria", "marca", "pres", "precio", "disp"] },
};
const PRICE_RANGES = [
  { key: "0-300", label: "Hasta $300", min: 0, max: 300 },
  { key: "300-600", label: "$300 a $600", min: 300, max: 600 },
  { key: "600-1500", label: "$600 a $1,500", min: 600, max: 1500 },
  { key: "1500-", label: "Más de $1,500", min: 1500, max: Infinity },
];
const SORTS = [
  { key: "", label: "Recomendados" },
  { key: "precio-asc", label: "Precio: menor a mayor" },
  { key: "precio-desc", label: "Precio: mayor a menor" },
  { key: "nombre", label: "Nombre (A-Z)" },
  { key: "marca", label: "Marca (A-Z)" },
];
const listingState = {};

function emptyListingFilters() {
  return { categoria: "", marca: "", pres: "", precio: "", disp: false };
}

function entryAvailable(p) {
  return p.variants ? p.variants.some((v) => v.product.disponible) : p.disponible;
}

/* Prepara (o reutiliza, si se regresa con "atrás") el listado y lo pinta.
   Regresa cuántos productos hay sin filtros, para el aviso de búsqueda. */
function mountListing(key, raw, { restore = false, id = "" } = {}) {
  const prev = listingState[key];
  const keep = restore && prev && prev.id === id;
  listingState[key] = {
    id,
    raw,
    filters: keep ? prev.filters : emptyListingFilters(),
    sort: keep ? prev.sort : LISTINGS[key].defaultSort || "",
    shown: keep ? prev.shown : LISTING_PAGE,
  };
  renderListing(key);
  return listingItems(key, { ignoreFilters: true }).length;
}

function listingItems(key, { ignoreFilters = false } = {}) {
  const st = listingState[key];
  const f = ignoreFilters ? emptyListingFilters() : st.filters;
  const range = PRICE_RANGES.find((r) => r.key === f.precio);
  const raw = st.raw.filter((p) => {
    if (f.categoria && p.categoria !== f.categoria) return false;
    if (f.marca && p.marca !== f.marca) return false;
    if (f.pres === "pieza" && isCajaPresentacion(p)) return false;
    if (f.pres === "caja" && !isCajaPresentacion(p)) return false;
    if (range && !(p.precio >= range.min && p.precio < range.max)) return false;
    return true;
  });
  // Los de Stock en México salen primero y se agrupan aparte, para no
  // mezclar sus tonos con los de Corea en un mismo selector.
  let items = [...groupVariants(raw.filter((p) => p.enStock)), ...groupVariants(raw.filter((p) => !p.enStock))];
  if (f.disp) items = items.filter(entryAvailable);
  items = clusterPresentations(items);
  const byName = (a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  if (st.sort === "precio-asc") items.sort((a, b) => a.precio - b.precio);
  else if (st.sort === "precio-desc") items.sort((a, b) => b.precio - a.precio);
  else if (st.sort === "nombre") items.sort(byName);
  else if (st.sort === "marca") items.sort(compareByMarcaThenNombre);
  return items;
}

function listingSelectHTML(name, label, options, value) {
  return `<select data-lf="${name}" aria-label="${escapeHtml(label)}"
      class="h-9 max-w-[11rem] truncate rounded-full !text-[13px] border ${value ? "border-ink bg-ink text-cream" : "border-ink/15 bg-white text-ink"} pl-3 pr-7 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose/30">
      ${options.map((o) => `<option value="${escapeHtml(o.value)}"${o.value === value ? " selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
    </select>`;
}

function listingControlsHTML(key, total) {
  const st = listingState[key];
  const cfg = LISTINGS[key];
  const f = st.filters;
  const uniq = (fn) => [...new Set(st.raw.map(fn).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  const parts = [];
  if (cfg.filters.includes("categoria")) {
    const cats = uniq((p) => p.categoria);
    if (cats.length > 1) parts.push(listingSelectHTML("categoria", "Categoría", [{ value: "", label: "Categoría" }, ...cats.map((c) => ({ value: c, label: c }))], f.categoria));
  }
  if (cfg.filters.includes("marca")) {
    const marcas = uniq((p) => p.marca);
    if (marcas.length > 1) parts.push(listingSelectHTML("marca", "Marca", [{ value: "", label: "Marca" }, ...marcas.map((m) => ({ value: m, label: m }))], f.marca));
  }
  if (cfg.filters.includes("pres") && st.raw.some(isCajaPresentacion) && st.raw.some((p) => !isCajaPresentacion(p))) {
    parts.push(listingSelectHTML("pres", "Presentación", [{ value: "", label: "Pieza o caja" }, { value: "pieza", label: "Solo piezas" }, { value: "caja", label: "Solo cajas" }], f.pres));
  }
  if (cfg.filters.includes("precio")) {
    parts.push(listingSelectHTML("precio", "Precio", [{ value: "", label: "Precio" }, ...PRICE_RANGES.map((r) => ({ value: r.key, label: r.label }))], f.precio));
  }
  parts.push(listingSelectHTML("sort", "Ordenar por", SORTS.map((o) => ({ value: o.key, label: o.key ? o.label : "Ordenar: recomendados" })), st.sort));
  if (cfg.filters.includes("disp")) {
    parts.push(`<label class="tap inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-ink/15 bg-white text-[13px] text-ink cursor-pointer">
      <input type="checkbox" data-lf="disp" class="accent-rose-deep w-4 h-4"${f.disp ? " checked" : ""} /> Solo disponibles</label>`);
  }
  const active = f.categoria || f.marca || f.pres || f.precio || f.disp;
  // En celular, una sola fila que se desliza de lado (como las pestañas
  // de Best Seller) en vez de 4 renglones de filtros.
  return `<div class="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">${parts.join("")}
      ${active ? `<button type="button" data-lf-clear class="tap h-9 px-3 text-[13px] text-ink/75 underline">Quitar filtros</button>` : ""}
      <button type="button" data-lf-download class="tap h-9 px-3 rounded-full border border-ink/15 bg-white text-[13px] text-ink hover:bg-ink/5" title="Descarga esta lista (con los filtros que elegiste) para abrirla en Excel">⬇️ Lista de precios</button>
    </div>
    <p class="mt-2 text-[13px] text-ink/70 tabular-nums" data-lcount>${total.toLocaleString("es-MX")} ${total === 1 ? "producto" : "productos"} · Precios por transferencia</p>`;
}

function listingContainers(key) {
  const grid = document.getElementById(LISTINGS[key].grid);
  let controls = document.getElementById(`${key}-listing-controls`);
  if (!controls) {
    controls = document.createElement("div");
    controls.id = `${key}-listing-controls`;
    controls.className = "mb-5";
    grid.before(controls);
    controls.addEventListener("change", (e) => {
      const el = e.target.closest("[data-lf]");
      if (!el) return;
      const st = listingState[key];
      if (el.dataset.lf === "sort") st.sort = el.value;
      else if (el.dataset.lf === "disp") st.filters.disp = el.checked;
      else st.filters[el.dataset.lf] = el.value;
      st.shown = LISTING_PAGE;
      renderListing(key);
    });
    controls.addEventListener("click", (e) => {
      if (e.target.closest("[data-lf-download]")) {
        downloadPriceList(key);
        return;
      }
      if (!e.target.closest("[data-lf-clear]")) return;
      listingState[key].filters = emptyListingFilters();
      listingState[key].shown = LISTING_PAGE;
      renderListing(key);
    });
  }
  let more = document.getElementById(`${key}-listing-more`);
  if (!more) {
    more = document.createElement("div");
    more.id = `${key}-listing-more`;
    more.className = "mt-8 flex flex-col items-center gap-2";
    // Sin esto, al llegar al final el navegador "sigue" al pie de página
    // mientras se agregan tarjetas arriba y carga página tras página solo.
    more.style.overflowAnchor = "none";
    grid.after(more);
    more.addEventListener("click", (e) => {
      if (e.target.closest("[data-lmore]")) appendListingPage(key);
    });
  }
  return { grid, controls, more };
}

/* Lista de precios en CSV (abre en Excel) con lo que se ve en ese
   listado, cada tono y presentación en su propio renglón -- para que las
   revendedoras la compartan con sus clientas. */
function downloadPriceList(key) {
  const st = listingState[key];
  if (!st || !st.items) return;
  const cell = (v) => {
    const t = String(v ?? "");
    return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const rows = [["Marca", "Producto", "Presentación", "Capacidad", "Precio transferencia (MXN)", "Precio tarjeta (MXN)", "Precio por pieza (MXN)", "Disponible", "Link"]];
  const seen = new Set();
  st.items.forEach((item) => {
    const entries = (item.presKey && presClusters.get(item.presKey)) || [item];
    entries.forEach((entry) => {
      const prods = entry.variants ? entry.variants.map((v) => v.product) : [entry];
      prods.forEach((p) => {
        if (seen.has(p.id)) return;
        seen.add(p.id);
        const n = /Caja con (\d+)/i.exec(p.presentacion || "");
        rows.push([
          p.marca || "",
          p.nombre || "",
          p.presentacion || "Pieza individual",
          p.capacidad || "",
          (p.precio || 0).toFixed(2),
          (p.precioTarjeta || p.precio || 0).toFixed(2),
          n ? (p.precio / Number(n[1])).toFixed(2) : (p.precio || 0).toFixed(2),
          p.disponible && !(p.enStock && p.stockPiezas <= 0) ? "Sí" : "No",
          productShareUrl(p),
        ]);
      });
    });
  });
  const csv = "\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const name = normalizeForSearch(st.id === "all" ? "catalogo" : st.id || key).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || key;
  a.href = URL.createObjectURL(blob);
  a.download = `alpacca-precios-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  announce(`Se descargó la lista de precios con ${rows.length - 1} productos.`);
}

let listingObserver = null;

function renderListing(key) {
  const { grid, controls, more } = listingContainers(key);
  const empty = document.getElementById(LISTINGS[key].empty);
  const items = listingItems(key);
  const st = listingState[key];
  st.items = items;
  controls.innerHTML = st.raw.length ? listingControlsHTML(key, items.length) : "";
  grid.innerHTML = items.slice(0, st.shown).map((p) => productCardHTML(p)).join("");
  wireAddButtons(grid);
  wireVariantSelectors(grid);
  if (empty) {
    empty.classList.toggle("hidden", items.length > 0);
    if (!items.length && st.raw.length) empty.textContent = "No hay productos con esos filtros.";
  }
  renderListingMore(key);
}

function renderListingMore(key) {
  const { more } = listingContainers(key);
  const st = listingState[key];
  const left = st.items.length - Math.min(st.shown, st.items.length);
  more.innerHTML = left > 0
    ? `<p class="text-[13px] text-ink/70 tabular-nums">Viendo ${Math.min(st.shown, st.items.length).toLocaleString("es-MX")} de ${st.items.length.toLocaleString("es-MX")}</p>
       <button type="button" data-lmore class="tap h-11 px-6 rounded-full border border-ink text-ink text-sm font-semibold hover:bg-ink hover:text-cream transition">Ver más productos</button>`
    : "";
  // Carga sola la siguiente página al acercarse al final (el botón queda
  // por si el navegador no soporta IntersectionObserver).
  const btn = more.querySelector("[data-lmore]");
  if (!btn || !("IntersectionObserver" in window)) return;
  if (!listingObserver) {
    listingObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && en.target.isConnected && en.target.offsetParent !== null) {
          listingObserver.unobserve(en.target);
          appendListingPage(en.target.dataset.lkey);
        }
      });
    }, { rootMargin: "800px 0px" });
  }
  btn.dataset.lkey = key;
  listingObserver.observe(btn);
}

function appendListingPage(key) {
  const st = listingState[key];
  if (!st || !st.items) return;
  const { grid } = listingContainers(key);
  const from = st.shown;
  st.shown += LISTING_PAGE;
  const tmp = document.createElement("div");
  tmp.innerHTML = st.items.slice(from, st.shown).map((p) => productCardHTML(p)).join("");
  wireAddButtons(tmp);
  wireVariantSelectors(tmp);
  grid.append(...tmp.children);
  renderListingMore(key);
}

/* ======================================================================
   Historial: cada vista (búsqueda, catálogo, marca, categoría...) queda
   en la dirección (ej. alpacca.mx/?ver=catalogo, ?q=anua, ?marca=ANUA),
   así el botón "atrás" del celular regresa a la vista anterior DENTRO
   de la tienda en vez de sacar a la clienta del sitio, y esas
   direcciones se pueden compartir.
   ====================================================================== */
let routeRestoring = false;
let currentRouteKey = "";

function routeKeyFromParams(params) {
  const c = new URLSearchParams(params);
  c.delete("p");
  c.sort();
  return c.toString();
}

function pushRoute(params) {
  const key = routeKeyFromParams(params);
  if (routeRestoring) {
    currentRouteKey = key;
    return;
  }
  const here = new URLSearchParams(location.search);
  if (key === currentRouteKey && !here.get("p")) return;
  try {
    history.replaceState({ ...(history.state || {}), scrollY: window.scrollY }, "");
    const search = new URLSearchParams(params).toString();
    history.pushState({ scrollY: 0 }, "", `${location.pathname}${search ? `?${search}` : ""}`);
  } catch (err) {
    // Algunos navegadores limitan pushState muy seguido; no es grave.
  }
  currentRouteKey = key;
}

/* Título de la pestaña y dirección "oficial" (canonical) de cada vista,
   para Google y para cuando comparten el link. */
const BASE_TITLE = document.title;
function setRouteMeta(r) {
  let title = BASE_TITLE;
  let canonical = "https://alpacca.mx/";
  if (r.marca) { title = `${r.marca} en México — Alpacca`; canonical += `?marca=${encodeURIComponent(r.marca)}`; }
  else if (r.categoria) { title = `${r.categoria} coreano — Alpacca`; canonical += `?categoria=${encodeURIComponent(r.categoria)}`; }
  else if (r.ver === "catalogo") { title = "Catálogo completo — Alpacca"; canonical += "?ver=catalogo"; }
  else if (r.ver === "stock") { title = "Stock en México, entrega inmediata — Alpacca"; canonical += "?ver=stock"; }
  else if (r.q) title = `Resultados para "${r.q}" — Alpacca`;
  document.title = title;
  const link = document.querySelector('link[rel="canonical"]');
  if (link) link.href = canonical;
}

function openRouteView(params, restore) {
  const q = params.get("q");
  const ver = params.get("ver");
  if (q) {
    document.getElementById("search-input").value = q;
    renderSearchResults(q, { restore });
  } else if (params.get("marca")) showBrandProducts(params.get("marca"), { restore });
  else if (params.get("categoria")) showCategoryProducts(params.get("categoria"), { restore });
  else if (params.get("pais")) showCountryProducts(params.get("pais"), { restore });
  else if (params.get("preocupacion")) showConcernProducts(params.get("preocupacion"), { restore });
  else if (ver === "catalogo") {
    openFullCatalog({ restore });
    const pres = params.get("pres");
    if (pres && listingState.catalog && listingState.catalog.filters.pres !== pres) {
      listingState.catalog.filters.pres = pres === "caja" || pres === "pieza" ? pres : "";
      renderListing("catalog");
    }
  }
  else if (ver === "stock") openStockSection({ restore });
  else if (ver === "favoritos") openWishlistSection();
  else if (ver === "americano" && americanoProducts.length) showHomeView("americano");
  else showHomeView("home");
}

function applyRoute({ restore, scrollY } = {}) {
  const params = new URLSearchParams(location.search);
  const key = routeKeyFromParams(params);
  routeRestoring = true;
  try {
    if (key !== currentRouteKey) openRouteView(params, restore);
    currentRouteKey = key;
    if (typeof applyProductRoute === "function") applyProductRoute(params);
  } finally {
    routeRestoring = false;
  }
  if (scrollY != null) requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

let initialRouteApplied = false;
function applyInitialRoute() {
  if (initialRouteApplied) return;
  initialRouteApplied = true;
  const params = new URLSearchParams(location.search);
  if ([...params.keys()].length) applyRoute({ restore: false });
}

/* Links internos tipo "?marca=ANUA" (banners, entradas de la portada):
   se abren dentro de la tienda, sin recargar la página. */
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="?"]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  if (!products.length) return;
  e.preventDefault();
  const params = new URLSearchParams(a.getAttribute("href").slice(1));
  openRouteView(params, false);
  // La vista ya agregó su dirección; si traía filtros (ej. &pres=caja) se
  // dejan en la dirección para que "atrás" y compartir los conserven.
  try {
    history.replaceState(history.state, "", `${location.pathname}?${params.toString()}`);
    currentRouteKey = routeKeyFromParams(params);
  } catch (err) { /* nada */ }
});

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.addEventListener("popstate", (e) => {
  applyRoute({ restore: true, scrollY: e.state && e.state.scrollY != null ? e.state.scrollY : null });
});

/* ======================================================================
   Beneficios
   ====================================================================== */
function renderFaqMinOrder() {
  const faqMinOrder = document.getElementById("faq-min-order");
  if (faqMinOrder && CONFIG.MIN_ORDER_MXN) {
    faqMinOrder.textContent = `Es de ${formatPrice(CONFIG.MIN_ORDER_MXN)} en productos que encargamos desde Corea. Los productos ✅ Stock en México 🇲🇽 no tienen mínimo.`;
  }
}

function renderBenefits() {
  // La franja de 4 íconos se juntó con "¿Por qué elegir Alpacca?".
  const grid = document.getElementById("benefits-grid");
  if (!grid) return;
  const items = CONFIG.BENEFITS || [];
  grid.innerHTML = items
    .map(
      (b) => `<div class="text-center flex flex-col items-center">
        <div class="mb-2">${benefitIconHTML(b.icon)}</div>
        <p class="font-semibold text-sm text-ink">${escapeHtml(b.title)}</p>
        <p class="text-xs text-ink/75 mt-0.5">${escapeHtml(b.text)}</p>
      </div>`
    )
    .join("");
}

function renderAll() {
  // El stock y las reseñas suelen llegar ANTES que el catálogo y también
  // llaman a renderAll(). Sin el catálogo todavía no hay qué pintar:
  // si aquí se quitaba el esqueleto, la página se encogía y luego volvía
  // a crecer al llegar el catálogo (el mayor salto de contenido de la
  // página). Se deja el esqueleto hasta que haya productos.
  if (!catalogLoaded) {
    renderCart();
    return;
  }

  // Ya hay productos reales (o de ejemplo) que pintar -- se acabó la
  // espera, se quita el esqueleto de carga.
  document.getElementById("catalog-loading-skeleton").classList.add("hidden");

  // El orden importa: renderQuickIcons/renderMobileMenu leen qué secciones
  // quedaron visibles, así que corren después de decidir esa visibilidad.
  renderTimeDeal();
  renderBestSellers();
  renderConcernTiles();
  renderSkinTypeSection();
  renderBrands();
  renderShopPaths();
  renderHomeReviews();
  renderQuickIcons();
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
  acknowledgeCartChange("americano-cart-items", id);
  const qty = americanoCart[id].qty;
  const switched = switchNotice.classList.contains("hidden") ? "" : `${switchNotice.textContent} `;
  announce(`${switched}Agregaste ${product.nombre} a tu pedido. Llevas ${qty} ${qty === 1 ? "pieza" : "piezas"}.`);
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
  if (americanoCart[id]) acknowledgeCartChange("americano-cart-items", id);
  announce(
    americanoCart[id]
      ? `${item.product.nombre}: ${item.qty} ${item.qty === 1 ? "pieza" : "piezas"}.`
      : `Quitaste ${item.product.nombre} de tu pedido (el mínimo por tono es ${moq}).`
  );
}

function removeFromAmericanoCart(id) {
  const product = americanoCart[id] && americanoCart[id].product;
  delete americanoCart[id];
  saveAmericanoCart();
  renderAmericanoCart();
  if (product) announce(`Quitaste ${product.nombre} de tu pedido.`);
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
  const count = useAmericano ? americanoCartCount() : cartCount();
  const totalText = formatPrice(useAmericano ? americanoCartTotal() : cartTotal());
  document.getElementById("cart-count").textContent = count;
  document.getElementById("cart-total-header").textContent = totalText;
  document.getElementById("cart-toggle").setAttribute(
    "aria-label",
    `Abrir carrito, ${count} ${count === 1 ? "producto" : "productos"}, ${totalText}`
  );
}

function renderAmericanoCart() {
  clearCartError("americano-cart-error");
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

  const focusBefore = captureCartFocus(wrap);

  if (!items.length) {
    wrap.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    restoreCartFocus(wrap, focusBefore, document.getElementById("americano-cart-drawer"));
    return;
  }
  emptyMsg.classList.add("hidden");

  wrap.innerHTML = items
    .map(([id, it]) => {
      const img = it.product.imagen || "./assets/americano-coming-soon.jpg";
      const moq = Math.max(1, it.product.moq || 1);
      const name = escapeAttr(it.product.nombre);
      return `
      <div class="flex gap-3 items-center rounded-xl -mx-2 px-2 py-1" data-line="${escapeAttr(id)}">
        <img src="${escapeAttr(img)}" alt="${name}" class="w-16 h-16 rounded-lg object-cover border border-ink/10" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ink truncate">${escapeHtml(it.product.nombre)}</p>
          <p class="text-xs text-ink/75">${formatPrice(it.product.precio)} c/u · MOQ ${moq}</p>
          <div class="mt-1 flex items-center gap-2" role="group" aria-label="Cantidad de ${name}">
            <button type="button" data-americano-dec="${escapeAttr(id)}" aria-label="Quitar una pieza de ${name}" class="tap w-7 h-7 coarse:w-9 coarse:h-9 rounded-full border border-ink/20 text-ink text-base leading-none hover:bg-ink/5">−</button>
            <span class="text-sm w-5 text-center">${it.qty}</span>
            <button type="button" data-americano-inc="${escapeAttr(id)}" aria-label="Agregar una pieza de ${name}" class="tap w-7 h-7 coarse:w-9 coarse:h-9 rounded-full border border-ink/20 text-ink text-base leading-none hover:bg-ink/5">+</button>
            <button type="button" data-americano-remove="${escapeAttr(id)}" aria-label="Quitar ${name} de tu pedido" class="tap ml-3 text-xs text-ink/75 hover:text-ink underline">Quitar</button>
          </div>
        </div>
        <span class="text-sm font-semibold text-ink whitespace-nowrap tabular-nums">${formatPrice(it.product.precio * it.qty)}</span>
      </div>`;
    })
    .join("");

  wrap.querySelectorAll("[data-americano-inc]").forEach((b) => b.addEventListener("click", () => changeAmericanoQty(b.dataset.americanoInc, 1)));
  wrap.querySelectorAll("[data-americano-dec]").forEach((b) => b.addEventListener("click", () => changeAmericanoQty(b.dataset.americanoDec, -1)));
  wrap.querySelectorAll("[data-americano-remove]").forEach((b) => b.addEventListener("click", () => removeFromAmericanoCart(b.dataset.americanoRemove)));
  restoreCartFocus(wrap, focusBefore, document.getElementById("americano-cart-drawer"));
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
    showCartError("americano-cart-error", `Tu pedido todavía no llega al mínimo de ${formatPrice(minMXN)}.`);
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
  if (product.enStock && currentQty + 1 > product.stockPiezas) {
    announce(stockLimitMessage(product));
    return;
  }

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
  acknowledgeCartChange("cart-items", id);
  const switched = switchNotice.classList.contains("hidden") ? "" : `${switchNotice.textContent} `;
  announce(`${switched}Agregaste ${product.nombre} a tu carrito. Llevas ${cart[id].qty} ${cart[id].qty === 1 ? "pieza" : "piezas"}.`);
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  const product = cart[id].product;
  const nextQty = cart[id].qty + delta;
  if (product.enStock && delta > 0 && nextQty > product.stockPiezas) {
    announce(stockLimitMessage(product));
    return;
  }
  cart[id].qty = nextQty;
  if (cart[id].qty <= 0) delete cart[id];
  saveCart();
  renderCart();
  if (cart[id]) acknowledgeCartChange("cart-items", id);
  announce(
    cart[id]
      ? `${product.nombre}: ${cart[id].qty} ${cart[id].qty === 1 ? "pieza" : "piezas"}.`
      : `Quitaste ${product.nombre} de tu carrito.`
  );
}

function removeFromCart(id) {
  const product = cart[id] && cart[id].product;
  delete cart[id];
  saveCart();
  renderCart();
  if (product) announce(`Quitaste ${product.nombre} de tu carrito.`);
}

/* Acuse de "sí se agregó": la línea que cambió en el carrito se ilumina
   en blush y se desvanece, para que se vea de un vistazo cuál producto
   subió o bajó; y el globito del carrito del header da un pequeño salto.
   El color se conserva aunque se pida menos movimiento (es información,
   no adorno); el salto no. */
function acknowledgeCartChange(wrapId, id) {
  const row = [...document.querySelectorAll(`#${wrapId} [data-line]`)].find((r) => r.dataset.line === id);
  if (row && row.animate) {
    row.animate(
      [{ backgroundColor: "rgba(246, 202, 219, 0.75)" }, { backgroundColor: "rgba(246, 202, 219, 0)" }],
      { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  }
  const badge = document.getElementById("cart-count");
  if (badge && badge.animate && !prefersReducedMotion.matches) {
    badge.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }],
      { duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  }
}

function stockLimitMessage(product) {
  const n = product.stockPiezas;
  return `Solo ${n === 1 ? "hay 1 pieza disponible" : `hay ${n} piezas disponibles`} de ${product.nombre} en stock.`;
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

/* Envíos desde Corea del carrito: solo los productos que NO están en
   stock; cada caja en su propio envío (ver koreaParcelWeights). */
function cartKoreaParcels() {
  return koreaParcelWeights(
    Object.values(cart)
      .filter((it) => !it.product.enStock)
      .map((it) => ({ peso: it.product.peso, qty: it.qty, presentacion: it.product.presentacion }))
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
    updateTransferNote();
    return;
  }

  const shipping = shippingEstimate(cartWeight(), cp, cartKoreaParcels());
  if (shipping && shipping.hasNacional) {
    label.textContent = `🚚 Envío nacional (estimado) a CP ${cp}`;
    amount.textContent = formatPrice(shipping.nacionalMXN);
  } else {
    label.textContent = "🚚 Envío nacional";
    amount.textContent = "Te contactaremos para confirmarlo";
  }
  row.classList.remove("hidden");
  renderGrandTotal();
  updateTransferNote();
}

/* Nota de "ahorras $X por transferencia" debajo del total -- aparte de
   renderGrandTotal() porque también depende del CP (envío nacional), pero
   con los precios de TARJETA para comparar. Es su propia función (no solo
   código suelto dentro de renderCart()) para que updateNacionalShippingUI()
   -- que corre cada vez que la clienta escribe su CP, sin volver a llamar
   a renderCart() completo -- también la mantenga al día; si no, esta nota
   se quedaba con el envío de antes de escribir el CP (p.ej. $0 si el
   carrito se abrió sin CP todavía), sin cuadrar con el total real de
   arriba, que sí se actualiza con cada CP nuevo. */
function updateTransferNote() {
  const transferNote = document.getElementById("cart-mp-surcharge-note");
  if (!transferNote) return;
  const items = Object.entries(cart);
  const total = cartTotal();
  const cp = document.getElementById("customer-cp").value.trim();
  const shippingForNote = shippingEstimate(cartWeight(), cp, cartKoreaParcels());
  const totalConEnvio = total + (shippingForNote ? shippingForNote.totalMXN : 0);
  const tarjetaTotalConEnvio = cartTotalTarjeta() + (shippingForNote ? shippingForNote.totalMXNTarjeta : 0);
  if (items.length && tarjetaTotalConEnvio > totalConEnvio + 0.5) {
    transferNote.textContent = `🏦 Pagando por transferencia ahorras ${formatPrice(tarjetaTotalConEnvio - totalConEnvio)} (precio con tarjeta, incluyendo envío: ${formatPrice(tarjetaTotalConEnvio)})`;
    transferNote.classList.remove("hidden");
  } else {
    transferNote.classList.add("hidden");
  }
}

function renderGrandTotal() {
  const cp = document.getElementById("customer-cp").value.trim();
  const shipping = shippingEstimate(cartWeight(), cp, cartKoreaParcels());

  let grandTotal = cartTotal();
  if (shipping && shipping.hasKorea) grandTotal += shipping.coreaMXN;
  if (shipping && shipping.hasNacional) grandTotal += shipping.nacionalMXN;

  document.getElementById("cart-grand-total").textContent = formatPrice(grandTotal);
}

function renderCart() {
  clearCartError("cart-error");
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
  const shipping = shippingEstimate(cartWeight(), "", cartKoreaParcels());
  if (items.length && shipping && shipping.hasKorea) {
    document.getElementById("cart-shipping-korea").textContent = formatPrice(shipping.coreaMXN);
    // Cada caja viaja en su propio envío: se avisa cuántos son.
    document.getElementById("cart-shipping-korea-label").textContent =
      shipping.coreaEnvios > 1 ? `✈️ Envío Corea→México (${shipping.coreaEnvios} envíos)` : "✈️ Envío Corea→México";
    koreaRow.classList.remove("hidden");
  } else {
    koreaRow.classList.add("hidden");
  }
  updateNacionalShippingUI();

  const sendBtn = document.getElementById("send-quote");
  const payBtn = document.getElementById("pay-mercadopago");
  sendBtn.disabled = items.length === 0 || belowMin;
  if (payBtn) payBtn.disabled = items.length === 0 || belowMin;

  const focusBefore = captureCartFocus(wrap);

  if (!items.length) {
    wrap.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    restoreCartFocus(wrap, focusBefore, document.getElementById("cart-drawer"));
    return;
  }
  emptyMsg.classList.add("hidden");

  wrap.innerHTML = items
    .map(([id, it]) => {
      const img = it.product.imagen || placeholderImg(it.product.categoria || "Alpacca", "#e9c3be");
      const name = escapeAttr(it.product.nombre);
      const atStockLimit = it.product.enStock && it.qty >= it.product.stockPiezas;
      return `
      <div class="flex gap-3 items-center rounded-xl -mx-2 px-2 py-1" data-line="${escapeAttr(id)}">
        <img src="${escapeAttr(img)}" alt="${name}" class="w-16 h-16 rounded-lg object-cover border border-ink/10" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ink truncate">${escapeHtml(it.product.nombre)}</p>
          ${it.product.presentacion ? `<p class="text-xs text-ink/75">${escapeHtml(it.product.presentacion)}</p>` : ""}
          <p class="text-xs text-ink/75">${formatPrice(it.product.precio)} c/u</p>
          <div class="mt-1 flex items-center gap-2" role="group" aria-label="Cantidad de ${name}">
            <button type="button" data-dec="${escapeAttr(id)}" aria-label="Quitar una pieza de ${name}" class="tap w-7 h-7 coarse:w-9 coarse:h-9 rounded-full border border-ink/20 text-ink text-base leading-none hover:bg-ink/5">−</button>
            <span class="text-sm w-5 text-center">${it.qty}</span>
            <button type="button" data-inc="${escapeAttr(id)}" aria-label="Agregar una pieza de ${name}" ${atStockLimit ? "disabled" : ""}
              class="tap w-7 h-7 coarse:w-9 coarse:h-9 rounded-full border border-ink/20 text-ink text-base leading-none hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed">+</button>
            <button type="button" data-remove="${escapeAttr(id)}" aria-label="Quitar ${name} de tu carrito" class="tap ml-3 text-xs text-ink/75 hover:text-ink underline">Quitar</button>
          </div>
        </div>
        <span class="text-sm font-semibold text-ink whitespace-nowrap tabular-nums">${formatPrice(it.product.precio * it.qty)}</span>
      </div>`;
    })
    .join("");

  wrap.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.inc, 1)));
  wrap.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.dec, -1)));
  wrap.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => removeFromCart(b.dataset.remove)));
  restoreCartFocus(wrap, focusBefore, document.getElementById("cart-drawer"));
}

/* Cada cambio de cantidad vuelve a pintar las líneas del carrito, y eso
   reemplazaba el botón que tenía el foco -- con teclado, el foco se iba
   al inicio de la página. Esto recuerda qué botón de qué línea tenía el
   foco y lo regresa ahí (o a la línea siguiente si esa se quitó). */
function captureCartFocus(wrap) {
  const el = document.activeElement;
  if (!el || !wrap.contains(el)) return null;
  const attr = el.getAttributeNames().find((n) => n.startsWith("data-"));
  if (!attr) return null;
  const line = [...wrap.children].findIndex((row) => row.contains(el));
  return { attr, value: el.getAttribute(attr), line };
}

function restoreCartFocus(wrap, saved, fallback) {
  if (!saved) return;
  const same = [...wrap.querySelectorAll(`[${saved.attr}]`)].find(
    (b) => b.getAttribute(saved.attr) === saved.value && !b.disabled
  );
  const row = wrap.children[Math.min(saved.line, wrap.children.length - 1)];
  const target = same || (row && row.querySelector("button:not([disabled])")) || fallback;
  if (target) target.focus({ preventScroll: true });
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
   Paneles y ventanas accesibles (carritos, Mi cuenta, menú móvil,
   Avísame, calificar y reseñas).
   Cada panel se abre y se cierra en su propia función (openCart,
   closeCart, openMobileMenu...) poniendo o quitando una clase. En vez de
   tocar cada una, aquí se observa esa clase y se hace lo que necesita
   quien navega con teclado o lector de pantalla:
     - Cerrado: el panel queda "inert" -- no se puede tabular hacia él ni
       se lee, aunque siga en la página (fuera de pantalla o transparente).
     - Abierto: el resto de la página queda inert, el foco entra al panel,
       Escape lo cierra con su propio botón "×", y al cerrarlo el foco
       regresa al botón que lo abrió.
   ====================================================================== */
const DIALOGS = [
  { panel: "cart-drawer", overlay: "cart-overlay", close: "cart-close", closedClass: "translate-x-full" },
  { panel: "americano-cart-drawer", overlay: "americano-cart-overlay", close: "americano-cart-close", closedClass: "translate-x-full" },
  { panel: "account-drawer", overlay: "account-overlay", close: "account-close", closedClass: "translate-x-full" },
  { panel: "mobile-menu", overlay: "menu-overlay", close: "menu-close", closedClass: "-translate-x-full" },
  { panel: "product-overlay", close: "product-close", closedClass: "opacity-0" },
  { panel: "restock-overlay", close: "restock-close", closedClass: "opacity-0" },
  { panel: "review-overlay", close: "review-close", closedClass: "opacity-0" },
  { panel: "reviews-list-overlay", close: "reviews-list-close", closedClass: "opacity-0" },
  { panel: "shipping-times-overlay", close: "shipping-times-close", closedClass: "opacity-0" },
];

// Pila de paneles abiertos; el último es el que está hasta arriba.
const openDialogs = [];

function isDialogOpen(d) {
  return !d.panelEl.classList.contains(d.closedClass);
}

// Elementos de la página que se desactivaron por tener un panel abierto
// (para reactivar exactamente esos al cerrarlo).
const inertedByDialogs = new Set();

function syncPageInert() {
  const top = openDialogs[openDialogs.length - 1];
  inertedByDialogs.forEach((el) => (el.inert = false));
  inertedByDialogs.clear();

  // Un panel (o su fondo oscuro, que cierra al tocarlo) solo es
  // interactivo si es el de hasta arriba.
  DIALOGS.forEach((d) => {
    d.panelEl.inert = d !== top;
    if (d.overlayEl) d.overlayEl.inert = d !== top;
  });
  if (!top) return;

  // Todo lo demás se desactiva. Algunos paneles viven dentro de otro
  // elemento (el menú móvil está dentro de <main>), así que en vez de
  // desactivar a su contenedor se entra en él y se desactivan solo sus
  // hermanos.
  const keep = [top.panelEl, top.overlayEl, document.getElementById("live-region")].filter(Boolean);
  const isDialogPart = (el) => DIALOGS.some((d) => d.panelEl === el || d.overlayEl === el);
  const walk = (parent) => {
    for (const el of parent.children) {
      if (el.tagName === "SCRIPT" || keep.includes(el) || isDialogPart(el)) continue;
      if (keep.some((k) => el.contains(k))) {
        walk(el);
        continue;
      }
      el.inert = true;
      inertedByDialogs.add(el);
    }
  };
  walk(document.body);
}

/* Elementos a los que se puede llegar con Tab dentro de un panel. */
function dialogFocusables(panel) {
  return [
    ...panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((el) => el.getClientRects().length > 0 && !el.closest("[inert]"));
}

function onDialogChange(d) {
  const open = isDialogOpen(d);
  const idx = openDialogs.indexOf(d);
  if (open && idx === -1) {
    const active = document.activeElement;
    d.returnFocus = active && active !== document.body ? active : null;
    openDialogs.push(d);
    syncPageInert();
    // Se enfoca el panel completo (no el primer campo) para que en
    // celular no se abra el teclado solo, y el lector anuncie su título.
    requestAnimationFrame(() => {
      if (openDialogs.includes(d)) d.panelEl.focus({ preventScroll: true });
    });
  } else if (!open && idx !== -1) {
    openDialogs.splice(idx, 1);
    syncPageInert();
    const target = d.returnFocus;
    d.returnFocus = null;
    if (target && target.isConnected && !target.closest("[inert]")) {
      target.focus({ preventScroll: true });
    } else {
      // El disparador se volvió a pintar mientras el diálogo estaba abierto:
      // el foco va a un punto estable en vez de caer en el body.
      const main = document.getElementById("main");
      if (main) {
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    }
  }
}

function initDialogs() {
  for (let i = DIALOGS.length - 1; i >= 0; i--) {
    const d = DIALOGS[i];
    d.panelEl = document.getElementById(d.panel);
    d.overlayEl = d.overlay ? document.getElementById(d.overlay) : null;
    if (!d.panelEl) {
      DIALOGS.splice(i, 1);
      continue;
    }
    new MutationObserver(() => onDialogChange(d)).observe(d.panelEl, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  DIALOGS.forEach((d) => {
    if (isDialogOpen(d)) onDialogChange(d);
  });
  syncPageInert();
}

document.addEventListener("keydown", (e) => {
  if (!openDialogs.length) return;
  const top = openDialogs[openDialogs.length - 1];

  if (e.key === "Escape") {
    const closeBtn = document.getElementById(top.close);
    if (!closeBtn) return;
    e.preventDefault();
    closeBtn.click();
    return;
  }

  // Tab da la vuelta dentro del panel: del último control regresa al
  // primero (y al revés con Shift+Tab), en vez de salirse a la barra
  // del navegador.
  if (e.key === "Tab") {
    const items = dialogFocusables(top.panelEl);
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (!first) {
      e.preventDefault();
      top.panelEl.focus();
    } else if (e.shiftKey && (current === first || current === top.panelEl)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

initDialogs();

/* Avisos para lectores de pantalla (región "live-region" en index.html).
   Se vacía y se vuelve a llenar para que un mensaje repetido -- por
   ejemplo, agregar dos veces el mismo producto -- se lea otra vez. */
let announceTimer = null;
const MP_CART_BACKUP_KEY = "alpacca_mp_cart_backup";

/* Mercado Pago regresa a la página con ?mp=success | failure | pending. Si
   el pago no se completó, se restaura el carrito que se guardó antes de
   redirigir; si sí se completó o está pendiente, el carrito queda vacío y el
   pedido se sigue en "Mi cuenta". Después se quita el parámetro de la URL
   para que recargar no vuelva a mostrar el aviso. */
function handleMercadoPagoReturn() {
  const mp = new URLSearchParams(window.location.search).get("mp");
  if (!mp) return;

  let backup = null;
  try {
    backup = localStorage.getItem(MP_CART_BACKUP_KEY);
    localStorage.removeItem(MP_CART_BACKUP_KEY);
  } catch (storageErr) {
    backup = null;
  }

  if (mp === "failure" && backup) {
    try {
      cart = JSON.parse(backup) || {};
    } catch (parseErr) {
      cart = {};
    }
    saveCart();
    renderCart();
    openCart();
    showCartError("cart-error", "El pago no se completó. Tu carrito está de vuelta; puedes intentar de nuevo.");
  } else if (mp === "success" || mp === "pending") {
    announce("Recibimos tu pago. Revisa el estado de tu pedido en Mi cuenta; te avisamos por WhatsApp cuando esté confirmado.");
  }

  history.replaceState(null, "", window.location.pathname);
}

function announce(message) {
  const region = document.getElementById("live-region");
  if (!region || !message) return;
  region.textContent = "";
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    region.textContent = message;
  }, 60);
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
  clearCartError("cart-error");
  // El formulario está oculto sin sesión (ver updateCartLoginGate), esto
  // es nomás por si acaso -- nunca debería llegar hasta aquí sin token.
  if (!getCustomerToken()) {
    showCartError("cart-error", "Inicia sesión para continuar tu compra.");
    return;
  }

  const hasNonStockItems = Object.values(cart).some((it) => !it.product.enStock);
  if (hasNonStockItems && cartTotalNonStock() < minOrderMXN()) {
    showCartError("cart-error", `Tu pedido todavía no llega al mínimo de ${formatPrice(minOrderMXN())} en productos de Corea.`);
    return;
  }

  // El comprobante de transferencia es obligatorio -- no se registra el
  // pedido sin él (el input ya tiene "required", esto es por si acaso).
  const fileInput = document.getElementById("proof-file-input");
  const file = fileInput.files && fileInput.files[0];
  const proofMessage = !file ? "Sube tu comprobante de transferencia para confirmar el pedido." : validateProofFile(file);
  if (proofMessage) {
    showCartError("cart-error", proofMessage);
    fileInput.setAttribute("aria-invalid", "true");
    fileInput.setAttribute("aria-describedby", "cart-error");
    fileInput.focus();
    return;
  }
  fileInput.removeAttribute("aria-invalid");
  fileInput.removeAttribute("aria-describedby");

  const sendBtn = document.getElementById("send-quote");
  const originalLabel = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = "<span>Enviando…</span>";

  const { orderId, error } = await recordTransferOrder();

  if (!orderId) {
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalLabel;
    showCartError("cart-error", error || ORDER_FAILED_MESSAGE);
    return;
  }

  // El pedido ya existe: el carrito se vacía ya, no al terminar la subida,
  // para que una recarga durante la subida no registre el mismo pedido otra vez.
  cart = {};
  saveCart();
  renderCart();

  sendBtn.innerHTML = "<span>Subiendo comprobante…</span>";
  let proofFailed = false;
  try {
    await uploadProofFile(orderId, file);
  } catch (err) {
    proofFailed = true;
  }

  sendBtn.disabled = false;
  sendBtn.innerHTML = originalLabel;

  document.getElementById("quote-form").reset();
  // No se cierra el carrito aquí -- se queda abierto mostrando el panel
  // de "pedido enviado" (ver showQuoteSuccess).
  showQuoteSuccess(orderId, proofFailed);
}

const ORDER_IDEM_STORAGE_KEY = "alpacca_order_idem";

/* Clave de idempotencia para el intento de pedido actual. Se reutiliza si el
   carrito y los datos no cambiaron (así un reenvío tras una recarga devuelve
   el mismo pedido), y se genera una nueva si cambiaron. */
function orderIdempotencyKey(fingerprint) {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_IDEM_STORAGE_KEY) || "null");
    if (saved && saved.fp === fingerprint && saved.key) return saved.key;
    const key = crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(ORDER_IDEM_STORAGE_KEY, JSON.stringify({ key, fp: fingerprint }));
    return key;
  } catch (storageErr) {
    return crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
}

function clearOrderIdempotencyKey() {
  try {
    localStorage.removeItem(ORDER_IDEM_STORAGE_KEY);
  } catch (storageErr) {
    // Sin almacenamiento no hay nada que limpiar.
  }
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
    const shipping = shippingEstimate(weight, c.cp, cartKoreaParcels());
    const shippingMXN = shipping ? shipping.totalMXN : 0;

    const fingerprint = JSON.stringify({ source: "transferencia", c, items, subtotal, shippingMXN, weight });
    return fetch("/.netlify/functions/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCustomerToken()}` },
      body: JSON.stringify({
        source: "transferencia",
        idempotencyKey: orderIdempotencyKey(fingerprint),
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
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.orderId) throw new Error(data.error || "");
        clearOrderIdempotencyKey();
        return { orderId: data.orderId };
      })
      .catch((err) => {
        console.warn("No se pudo registrar el pedido:", err);
        // Se conserva el motivo que da el servidor (ej. "El teléfono debe
        // tener 10 dígitos.") para que la clienta sepa qué corregir.
        return { error: friendlyError(err, ORDER_FAILED_MESSAGE) };
      });
  } catch (err) {
    console.warn("No se pudo registrar el pedido:", err);
    return Promise.resolve({ error: ORDER_FAILED_MESSAGE });
  }
}

const ORDER_FAILED_MESSAGE =
  "No pudimos registrar tu pedido. Intenta de nuevo en un momento; si sigue fallando, escríbenos por WhatsApp. Tu carrito sigue guardado.";

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
    retryStatus.className = "text-xs text-ink/75 mt-1";

    const retryBtn = document.getElementById("proof-retry-btn");
    retryBtn.disabled = false;
    retryBtn.innerHTML = "<span>📤 Reintentar subir comprobante</span>";
    retryBtn.onclick = () => {
      const file = retryInput.files && retryInput.files[0];
      const showError = (msg) => {
        retryStatus.textContent = msg;
        retryStatus.className = "text-xs text-rose-ink mt-1";
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
          retryStatus.className = "text-xs text-ink/75 mt-1";
          retryBtn.innerHTML = "<span>✅ Comprobante enviado</span>";
        })
        .catch((err) => {
          showError(friendlyError(err, "No pudimos subir tu comprobante. Intenta de nuevo en un momento."));
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCustomerToken()}` },
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
  clearCartError("cart-error");
  // El formulario está oculto sin sesión (ver updateCartLoginGate), esto
  // es nomás por si acaso -- nunca debería llegar hasta aquí sin token.
  if (!getCustomerToken()) {
    showCartError("cart-error", "Inicia sesión para continuar tu compra.");
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
    showCartError("cart-error", `Tu pedido todavía no llega al mínimo de ${formatPrice(minOrderMXN())} en productos de Corea.`);
    return;
  }

  const payBtn = document.getElementById("pay-mercadopago");
  const originalLabel = payBtn.innerHTML;
  payBtn.disabled = true;
  payBtn.innerHTML = "<span>Redirigiendo…</span>";

  try {
    const weight = cartWeight();
    const shipping = shippingEstimate(weight, c.cp, cartKoreaParcels());
    const shippingMXN = shipping ? shipping.totalMXNTarjeta : 0;
    const subtotal = cartTotalTarjeta();
    // Precios/envío sin la comisión de tarjeta, solo para que
    // /admin.html pueda mostrar cuánto de lo cobrado es comisión (ver
    // create-order.js).
    const shippingMXNBase = shipping ? shipping.totalMXN : 0;
    const subtotalBase = cartTotal();

    const mpFingerprint = JSON.stringify({ source: "mercadopago", c, items: cartItemsForOrder({ useTarjetaPrice: true }), subtotal, shippingMXN, weight });
    const res = await fetch("/.netlify/functions/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCustomerToken()}` },
      body: JSON.stringify({
        source: "mercadopago",
        idempotencyKey: orderIdempotencyKey(mpFingerprint),
        customer: c,
        items: cartItemsForOrder({ useTarjetaPrice: true }),
        subtotal,
        shippingMXN,
        subtotalBase,
        shippingMXNBase,
        grandTotal: subtotal + shippingMXN,
        // Desglose de envío a precio de transferencia (igual que
        // shippingMXNBase), para que /admin.html pueda mostrarlo tal cual
        // siempre cobra Mae internamente, y también a precio de tarjeta
        // (lo que realmente se cobró aquí), para que el correo a la
        // clienta pueda desglosarlo renglón por renglón con el precio que
        // de verdad pagó. Más el peso, para que /admin.html lo muestre.
        shippingKoreaMXN: shipping ? shipping.coreaMXN : 0,
        shippingNacionalMXN: shipping ? shipping.nacionalMXN : 0,
        shippingKoreaMXNTarjeta: shipping ? shipping.coreaMXNTarjeta : 0,
        shippingNacionalMXNTarjeta: shipping ? shipping.nacionalMXNTarjeta : 0,
        weightKg: weight,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.redirectUrl) {
      throw new Error(data.error || "");
    }
    clearOrderIdempotencyKey();

    // El pedido ya existe en el servidor. Se vacía el carrito para que
    // volver atrás o recargar no permita pagar dos veces; una copia queda
    // guardada por si el pago no se completa (ver handleMercadoPagoReturn).
    try {
      localStorage.setItem(MP_CART_BACKUP_KEY, JSON.stringify(cart));
    } catch (storageErr) {
      // Sin almacenamiento, se pierde solo la copia de respaldo.
    }
    cart = {};
    saveCart();
    renderCart();
    window.location.href = data.redirectUrl;
  } catch (err) {
    console.error(err);
    showCartError(
      "cart-error",
      friendlyError(err, "No pudimos abrir Mercado Pago. Intenta de nuevo en un momento o paga por transferencia (con descuento).")
    );
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
/* Nombre del producto: siempre 14 px. Antes los nombres largos bajaban
   a 11-12 px, justo cuando traen el dato que importa (tono, tipo, "6
   Types (Aqua Fit)"). Se recortan a 3 líneas; el nombre completo queda
   en el atributo title. */
function productNameSizeClass() {
  return "text-sm line-clamp-3";
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

  // En celular se esconde mientras bajas (para no tapar "Agregar" de las
  // tarjetas) y vuelve a salir en cuanto subes o te detienes arriba.
  const float = document.getElementById("whatsapp-float");
  if (float) {
    let lastY = window.scrollY;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      const away = window.innerWidth < 640 && y > lastY + 4 && y > 300;
      if (away) float.classList.add("wa-away");
      else if (y < lastY - 4 || y < 300) float.classList.remove("wa-away");
      lastY = y;
    }, { passive: true });
  }
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
  const welcome = document.getElementById("account-welcome");
  if (welcome) {
    welcome.classList.toggle("hidden", view !== "login" && view !== "signup");
    welcome.querySelectorAll("[data-acct-tab]").forEach((t) => {
      const on = t.dataset.acctTab === view;
      t.setAttribute("aria-selected", String(on));
      t.classList.toggle("bg-white", on);
      t.classList.toggle("shadow-sm", on);
      t.classList.toggle("text-ink", on);
      t.classList.toggle("text-ink/60", !on);
    });
  }
  const heading = document.querySelector(`#account-view-${view} h2, #account-view-${view} h3`);
  // Solo si el encabezado está visible (el panel está abierto): si no, el
  // foco se movería a algo oculto.
  if (heading && heading.offsetParent !== null) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }
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
    errorEl.textContent = friendlyError(err, "No pudimos iniciar tu sesión. Intenta de nuevo en un momento.");
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
    errorEl.textContent = friendlyError(err, "No pudimos crear tu cuenta. Intenta de nuevo en un momento.");
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
    announce(successEl.textContent);
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
    // Se avisa dentro del panel de Mi cuenta (el aviso de la página
    // quedaba detrás del panel abierto).
    const notice = document.getElementById("login-notice");
    notice.textContent = "✅ Tu contraseña se cambió. Ya puedes iniciar sesión.";
    notice.classList.remove("hidden");
  } catch (err) {
    errorEl.textContent = friendlyError(err, "No pudimos cambiar tu contraseña. Intenta de nuevo en un momento.");
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
  pending: "bg-lilac/20 text-ink/75",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-ink/10 text-ink/75",
  failed: "bg-red-100 text-red-700",
};

/* Mismo número corto que ya se manda por WhatsApp y se ve en el panel
   de éxito al pagar -- así la clienta puede usarlo para preguntar por
   su pedido y Mae lo ubica al toque en /admin.html. */
function orderNumber(o) {
  return (o.id || "").slice(0, 8).toUpperCase();
}

function orderItemsDetailHTML(o) {
  // Solo se puede calificar lo que ya se pagó de verdad -- lo revalida
  // también el servidor en customer-submit-review.js.
  const canReview = o.status === "paid";
  return (o.items || [])
    .map(
      (it) => `
      <li class="flex items-center gap-3 text-sm">
        ${myItemThumbHTML(it, "w-10 h-10")}
        <span class="text-ink/80 flex-1 min-w-0">
          ${escapeHtml(it.nombre)} <span class="text-ink/75">x${it.qty}</span>
          ${
            canReview && it.sku
              ? `<button type="button" data-review="${escapeAttr(it.sku)}" data-review-name="${escapeAttr(it.nombre)}"
                  class="block text-xs text-rose-ink font-semibold hover:underline mt-0.5">⭐ Calificar</button>`
              : ""
          }
        </span>
        <span class="text-ink/75 shrink-0">${formatPrice((it.precio || 0) * it.qty)}</span>
      </li>`
    )
    .join("");
}

function orderAddressHTML(o) {
  const c = o.customer || {};
  const parts = [c.street, c.colonia, c.municipio, c.estado, c.cp].filter(Boolean).join(", ");
  if (!parts) return "";
  return `<p class="text-xs text-ink/75">📍 Enviado a: ${escapeHtml(parts)}</p>`;
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
      <span class="text-xs text-lilac-ink font-semibold">🚚 Guía: ${escapeHtml(o.trackingNumber)}${o.carrier ? " · " + escapeHtml(o.carrier) : ""}</span>
      <span class="text-xs font-bold text-lilac-ink shrink-0">Rastrear ›</span>
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

/* ======================================================================
   Mi cuenta: panel de la clienta. Saludo con sus números, el pedido que
   va en camino con su avance, accesos rápidos, lo que más compra (para
   volver a pedirlo), sus favoritos y sus pedidos con fotos.
   ====================================================================== */
/* Etapa del pedido para la clienta. "stage" lo marca Mae en el admin
   (pagado -> pedido_abw -> llego -> enviado -> entregado); la guía y la
   entrega confirmada también la adelantan. */
const MY_STAGE_ORDER = ["pagado", "pedido_abw", "llego", "enviado", "entregado"];

function myOrderStage(o) {
  if (o.status !== "paid") return null;
  let i = Math.max(0, MY_STAGE_ORDER.indexOf(o.stage || "pagado"));
  if (o.trackingNumber) i = Math.max(i, 3);
  if (o.deliveredAt) i = 4;
  return MY_STAGE_ORDER[i];
}

function isStockOnlyOrder(o) {
  return (o.items || []).length > 0 && (o.items || []).every((it) => it.enStock);
}

function myOrderSteps(o) {
  const steps = [
    { key: "pagado", label: "Pagado" },
    { key: "pedido_abw", label: "Pedido a Corea" },
    { key: "llego", label: "Llegó a México" },
    { key: "enviado", label: "En camino" },
    { key: "entregado", label: "Entregado" },
  ];
  return isStockOnlyOrder(o) ? steps.filter((s) => s.key !== "pedido_abw" && s.key !== "llego") : steps;
}

const MY_STAGE_TEXT = {
  pagado: { title: "¡Pago confirmado!", text: "Ya estamos preparando tu pedido.", emoji: "💗" },
  pedido_abw: { title: "Tu pedido ya se pidió a Corea", text: "En cuanto llegue a México lo preparamos para enviártelo.", emoji: "🇰🇷" },
  llego: { title: "¡Tu pedido ya llegó a México!", text: "Lo estamos empacando para mandártelo.", emoji: "🇲🇽" },
  enviado: { title: "Tu pedido va en camino", text: "Ya tiene guía; puedes rastrearlo.", emoji: "🚚" },
  entregado: { title: "¡Tu pedido llegó!", text: "Esperamos que lo disfrutes.", emoji: "🎁" },
};

function myOrderChip(o) {
  if (o.status === "pending") return { label: "Esperando pago", cls: "bg-[#fff1d8] text-[#8a5a00]" };
  if (o.status === "cancelled") return { label: "Cancelado", cls: "bg-ink/10 text-ink/70" };
  if (o.status === "failed") return { label: "No se procesó", cls: "bg-red-100 text-red-700" };
  const st = myOrderStage(o);
  const map = {
    pagado: { label: "Pagado", cls: "bg-green-100 text-green-800" },
    pedido_abw: { label: "Pedido a Corea", cls: "bg-lilac/20 text-lilac-ink" },
    llego: { label: "En México", cls: "bg-lilac/20 text-lilac-ink" },
    enviado: { label: "En camino", cls: "bg-[#e2f0fb] text-[#0b6bc2]" },
    entregado: { label: "Entregado", cls: "bg-green-100 text-green-800" },
  };
  return map[st] || { label: "Pagado", cls: "bg-green-100 text-green-800" };
}

function myItemProduct(it) {
  return it.enStock
    ? products.find((p) => p.stockSku === it.sku && p.enStock) || products.find((p) => p.id === it.sku)
    : products.find((p) => p.id === it.sku);
}

function myItemThumbHTML(it, size = "w-11 h-11") {
  const p = myItemProduct(it);
  const img = (p && p.imagen) || "";
  return img
    ? `<img src="${escapeAttr(img)}" alt="" loading="lazy" class="${size} shrink-0 rounded-lg bg-pill object-contain ring-2 ring-white" />`
    : `<span class="${size} shrink-0 rounded-lg bg-blush/40 ring-2 ring-white flex items-center justify-center text-base" aria-hidden="true">🧴</span>`;
}

function myThumbStackHTML(o, max = 3) {
  const items = o.items || [];
  const extra = items.length - max;
  return `<div class="flex -space-x-3 shrink-0">${items.slice(0, max).map((it) => myItemThumbHTML(it)).join("")}${extra > 0 ? `<span class="w-11 h-11 rounded-lg bg-ink text-cream text-xs font-bold flex items-center justify-center ring-2 ring-white">+${extra}</span>` : ""}</div>`;
}

function myStepperHTML(o) {
  const steps = myOrderSteps(o);
  const cur = myOrderStage(o);
  const curIdx = steps.findIndex((s) => s.key === cur);
  return `<ol class="flex items-start" aria-label="Avance del pedido">${steps
    .map((s, i) => {
      const done = i <= curIdx;
      const now = i === curIdx;
      return `<li class="flex-1 flex flex-col items-center text-center relative" ${now ? 'aria-current="step"' : ""}>
        ${i > 0 ? `<span class="absolute top-[11px] right-1/2 w-full h-1 -z-0 rounded ${i <= curIdx ? "bg-rose" : "bg-ink/10"}"></span>` : ""}
        <span class="relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${done ? "bg-rose text-cream" : "bg-white border-2 border-ink/15 text-ink/40"} ${now ? "ring-4 ring-rose/25" : ""}">${done ? "✓" : i + 1}</span>
        <span class="mt-1 text-[11px] leading-tight ${now ? "font-bold text-ink" : done ? "text-ink/80" : "text-ink/50"}">${s.label}</span>
      </li>`;
    })
    .join("")}</ol>`;
}

/* Línea de tiempo dentro de cada pedido (reemplaza la de 3 pasos). */
function orderTimelineHTML(o) {
  if (o.status === "cancelled") {
    return `<p class="text-xs font-semibold text-ink/75 bg-ink/5 rounded-lg px-3 py-2">✕ Este pedido fue cancelado.</p>`;
  }
  if (o.status === "failed") {
    return `<p class="text-xs font-semibold text-rose-ink bg-rose/10 rounded-lg px-3 py-2">⚠️ No se pudo procesar el pago de este pedido. Si crees que es un error, contáctanos.</p>`;
  }
  if (o.status === "pending") {
    return `<p class="text-xs font-semibold text-[#8a5a00] bg-[#fff1d8] rounded-lg px-3 py-2">⏳ Recibimos tu pedido. En cuanto confirmemos tu pago empieza a avanzar.</p>`;
  }
  return myStepperHTML(o);
}

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function renderAccountDashboard(orders) {
  const paid = orders.filter((o) => o.status === "paid");
  const name = myAccountCache.name || "";
  document.getElementById("account-name").textContent = name.split(/\s+/)[0] || name;
  document.getElementById("account-avatar").textContent = initialsOf(name);
  const first = orders.map((o) => o.createdAt).filter(Boolean).sort()[0];
  const since = first ? new Date(first).toLocaleDateString("es-MX", { month: "long", year: "numeric" }) : "";
  document.getElementById("account-member").innerHTML = [
    since ? `Clienta Alpacca desde ${escapeHtml(since)}` : "Bienvenida a Alpacca",
    paid.length >= 3 ? `<span class="inline-block ml-1 align-middle rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-rose-deep">⭐ Clienta frecuente</span>` : "",
  ].join(" ");

  const pieces = paid.reduce((s, o) => s + (o.items || []).reduce((t, it) => t + (it.qty || 0), 0), 0);
  const spent = paid.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const kpi = (n, label) => `<div class="rounded-2xl bg-white/85 px-2 py-2.5 text-center shadow-sm"><b class="block text-base font-bold text-ink tabular-nums">${n}</b><span class="text-[11px] text-ink/70">${label}</span></div>`;
  document.getElementById("account-kpis").innerHTML =
    kpi(paid.length, paid.length === 1 ? "pedido" : "pedidos") + kpi(pieces.toLocaleString("es-MX"), "piezas") + kpi(formatPrice(spent).replace(/\.00$/, ""), "en compras");

  renderAccountCurrent(orders);
  renderAccountQuick(orders);
  renderAccountTop(paid);
  renderAccountFavs();
  renderAccountProfile();
}

/* El pedido más reciente que sigue en proceso, grande y con su avance. */
function renderAccountCurrent(orders) {
  const el = document.getElementById("account-current");
  const active = orders
    .filter((o) => o.status === "pending" || (o.status === "paid" && myOrderStage(o) !== "entregado"))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (!active.length) { el.innerHTML = ""; return; }
  const o = active[0];
  const st = myOrderStage(o);
  const info = o.status === "pending"
    ? { title: "Esperando tu pago", text: o.hasPaymentProof ? "Ya recibimos tu comprobante; lo estamos revisando." : "Si pagaste por transferencia, sube tu comprobante en el pedido de abajo.", emoji: "⏳" }
    : MY_STAGE_TEXT[st] || MY_STAGE_TEXT.pagado;
  const url = orderTrackingUrl(o);
  const pcs = (o.items || []).reduce((t, it) => t + (it.qty || 0), 0);
  el.innerHTML = `<div class="rounded-3xl border border-rose/25 bg-white p-4 shadow-[0_6px_20px_-12px_rgba(196,70,110,.45)]">
      <div class="flex items-start gap-3">
        <span class="text-3xl leading-none" aria-hidden="true">${info.emoji}</span>
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold uppercase tracking-wider text-rose-deep">Tu pedido #${orderNumber(o)}</p>
          <p class="font-display text-lg text-ink leading-snug">${info.title}</p>
          <p class="text-xs text-ink/70 mt-0.5">${info.text}</p>
        </div>
      </div>
      <div class="mt-3 flex items-center gap-3">${myThumbStackHTML(o, 4)}<span class="text-xs text-ink/70">${pcs} pieza${pcs === 1 ? "" : "s"} · ${formatPrice(o.grandTotal)}</span></div>
      ${o.status === "paid" ? `<div class="mt-4">${myStepperHTML(o)}</div>` : ""}
      <div class="mt-4 flex gap-2">
        ${url ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="flex-1 text-center rounded-full bg-ink text-cream text-xs font-semibold py-2.5">🚚 Rastrear</a>` : ""}
        <button type="button" data-acct-open-order="${escapeAttr(o.id)}" class="flex-1 rounded-full border border-ink/15 text-ink text-xs font-semibold py-2.5 hover:bg-ink/5">Ver detalle</button>
      </div>
      ${active.length > 1 ? `<p class="mt-3 text-xs text-ink/60 text-center">y ${active.length - 1} pedido${active.length - 1 === 1 ? "" : "s"} más en proceso</p>` : ""}
    </div>`;
}

function renderAccountQuick(orders) {
  const el = document.getElementById("account-quick");
  const lastPaid = orders.filter((o) => o.status === "paid" && (o.items || []).length).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  let skin = "";
  try { skin = localStorage.getItem(SKIN_QUIZ_KEY) || ""; } catch (err) { skin = ""; }
  const tile = (attrs, emoji, title, sub, cls) => `<button type="button" ${attrs} class="text-left rounded-2xl ${cls} p-3 flex flex-col gap-1 hover:-translate-y-0.5 transition">
      <span class="text-xl" aria-hidden="true">${emoji}</span><span class="text-sm font-semibold text-ink leading-tight">${title}</span><span class="text-[11px] text-ink/65 leading-tight">${sub}</span></button>`;
  const tiles = [];
  if (lastPaid) tiles.push(tile(`data-reorder="${escapeAttr(lastPaid.id)}"`, "🔁", "Repetir mi último pedido", `#${orderNumber(lastPaid)} · ${(lastPaid.items || []).length} productos`, "bg-blush/30"));
  tiles.push(tile('data-acct-action="favs"', "💗", "Mis favoritos", wishlist.size ? `${wishlist.size} guardado${wishlist.size === 1 ? "" : "s"}` : "Toca el ♡ en un producto", "bg-lilac/15"));
  tiles.push(tile('data-acct-action="skin"', "🧴", skin ? `Mi piel: ${escapeHtml(skin)}` : "¿Cuál es mi tipo de piel?", skin ? "Ver productos para mí" : "Haz el quiz en 1 minuto", "bg-[#eef8f2]"));
  tiles.push(tile('data-acct-action="whatsapp"', "💬", "Hablar con Mae", "Dudas de tus pedidos por WhatsApp", "bg-[#fff6e5]"));
  el.innerHTML = tiles.slice(0, 4).join("");
}

/* "Lo que más compras": lo que más piezas ha pedido (pagado), con su
   precio de hoy y botón para agregar otra vez. Útil para revendedoras. */
function renderAccountTop(paid) {
  const el = document.getElementById("account-top");
  const agg = new Map();
  paid.forEach((o) => (o.items || []).forEach((it) => {
    const k = `${it.enStock ? "s" : "k"}|${it.sku}`;
    const cur = agg.get(k) || { it, qty: 0, orders: 0 };
    cur.qty += it.qty || 0;
    cur.orders++;
    agg.set(k, cur);
  }));
  const list = [...agg.values()]
    .map((x) => ({ ...x, p: myItemProduct(x.it) }))
    .filter((x) => x.p)
    .sort((a, b) => b.orders - a.orders || b.qty - a.qty)
    .slice(0, 10);
  if (!list.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="flex items-baseline justify-between mb-2"><h4 class="font-display text-lg text-ink">Lo que más compras</h4><span class="text-[11px] text-ink/60">precio de hoy</span></div>
    <div class="flex gap-3 overflow-x-auto snap-x scroll-px-5 -mx-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">${list.map(({ p, qty, it }) => {
      const out = !p.disponible || (p.enStock && p.stockPiezas <= 0);
      return `<div class="snap-start shrink-0 w-[8.5rem] flex flex-col gap-1.5">
        <button type="button" data-open-product="${escapeAttr(p.id)}" class="aspect-square rounded-2xl bg-pill overflow-hidden"><img src="${escapeAttr(p.imagen || "")}" alt="" loading="lazy" class="w-full h-full object-contain" /></button>
        <p class="text-[11px] font-bold text-ink truncate">${escapeHtml(p.marca || "")}</p>
        <p class="text-xs text-ink/80 leading-snug line-clamp-2 min-h-[2.4em]">${escapeHtml(p.nombre)}</p>
        <p class="text-[11px] text-ink/60">Has pedido ${qty} pz${qty === 1 ? "" : "s"}</p>
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-bold text-ink tabular-nums flex-1">${formatPrice(p.precio)}</span>
          ${out ? `<span class="text-[11px] font-semibold text-ink/50">Agotado</span>` : `<button type="button" data-acct-add="${escapeAttr(p.id)}" aria-label="Agregar ${escapeAttr(p.nombre)} al carrito" class="w-8 h-8 rounded-full bg-ink text-cream text-lg leading-none flex items-center justify-center hover:bg-rose-deep">+</button>`}
        </div>
        <button type="button" data-review="${escapeAttr(it.sku)}" data-review-name="${escapeAttr(p.nombre)}" class="self-start text-[11px] font-semibold text-rose-ink hover:underline">⭐ Calificar</button>
      </div>`;
    }).join("")}</div>`;
}

function renderAccountFavs() {
  const el = document.getElementById("account-favs");
  const favs = products.filter((p) => wishlist.has(p.id)).slice(0, 10);
  if (!favs.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="flex items-baseline justify-between mb-2"><h4 class="font-display text-lg text-ink">Mis favoritos</h4>
      <button type="button" data-acct-action="favs" class="text-xs font-semibold text-rose-ink underline">Ver todos</button></div>
    <div class="flex gap-2.5 overflow-x-auto snap-x scroll-px-5 -mx-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">${favs.map((p) => `
      <button type="button" data-open-product="${escapeAttr(p.id)}" class="snap-start shrink-0 w-24 text-left">
        <span class="block aspect-square rounded-2xl bg-pill overflow-hidden"><img src="${escapeAttr(p.imagen || "")}" alt="" loading="lazy" class="w-full h-full object-contain" /></span>
        <span class="block mt-1 text-[11px] text-ink/80 leading-tight line-clamp-2">${escapeHtml(p.nombre)}</span>
        <span class="block text-xs font-bold text-ink tabular-nums">${formatPrice(p.precio)}</span>
      </button>`).join("")}</div>`;
}

function renderAccountProfile() {
  const el = document.getElementById("account-profile");
  const row = (label, value) => value ? `<div class="flex justify-between gap-3 py-2 border-b border-ink/5 last:border-0"><span class="text-ink/60">${label}</span><span class="text-ink font-medium text-right truncate">${escapeHtml(value)}</span></div>` : "";
  el.innerHTML = `<div class="rounded-2xl bg-ink/[0.03] p-4">
      <div class="flex items-center justify-between mb-1"><h4 class="font-display text-base text-ink">Mis datos</h4>
        <button type="button" data-acct-action="settings" class="text-xs font-semibold text-rose-ink underline">Editar</button></div>
      <div class="text-sm">${row("Nombre", myAccountCache.name)}${row("Teléfono", myAccountCache.phone)}${row("Correo", myAccountCache.email)}</div>
    </div>`;
}

function initAccountDashboard() {
  const view = document.getElementById("account-view-orders");
  view.addEventListener("click", (e) => {
    const add = e.target.closest("[data-acct-add]");
    if (add) {
      closeAccountPanel();
      addToCart(add.dataset.acctAdd);
      return;
    }
    const open = e.target.closest("[data-acct-open-order]");
    if (open) {
      const det = view.querySelector(`details[data-order-id="${CSS.escape(open.dataset.acctOpenOrder)}"]`);
      if (det) { det.open = true; det.scrollIntoView({ behavior: scrollBehavior(), block: "start" }); }
      return;
    }
    const prod = e.target.closest("[data-open-product]");
    if (prod) { closeAccountPanel(); return; } // la ficha la abre el listener general
    const reorder = e.target.closest("#account-quick [data-reorder]");
    if (reorder) { reorderFromOrder(reorder.dataset.reorder); return; }
    const act = e.target.closest("[data-acct-action]");
    if (!act) return;
    const a = act.dataset.acctAction;
    if (a === "settings") { openAccountSettings(); return; }
    if (a === "whatsapp") {
      const href = whatsappHref(`Hola ${CONFIG.BUSINESS_NAME}! Tengo una duda sobre mis pedidos.`);
      if (href) window.open(href, "_blank", "noopener");
      return;
    }
    closeAccountPanel();
    if (a === "favs") openWishlistSection();
    if (a === "skin") {
      showHomeView("home");
      const sec = document.getElementById("skintype-section");
      if (sec) sec.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }
  });
  // Foto que no carga (producto que ya no está en el catálogo): se cambia
  // por un recuadro rosa en vez del ícono de imagen rota.
  document.getElementById("account-drawer").addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
    img.dataset.fallback = "1";
    const span = document.createElement("span");
    span.className = `${img.className} flex items-center justify-center text-base bg-blush/40`;
    span.setAttribute("aria-hidden", "true");
    span.textContent = "🧴";
    img.replaceWith(span);
  }, true);
  // Links dentro del panel (ej. "Ver el catálogo") cierran el panel.
  document.getElementById("account-drawer").addEventListener("click", (e) => {
    if (e.target.closest("[data-acct-close]")) closeAccountPanel();
    const tab = e.target.closest("[data-acct-tab]");
    if (tab) showAccountView(tab.dataset.acctTab);
  });
}

function myOrderCardHTML(o) {
  const fecha = o.createdAt
    ? new Date(o.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const itemsSummary = (o.items || []).map((it) => it.nombre).join(", ");
  const subtotal = o.subtotal != null ? o.subtotal : o.grandTotal;
  const shippingMXN = o.shippingMXN || 0;
  const canReorder = (o.items || []).length > 0;

  // Pedido por transferencia sin comprobante: se puede subir desde aquí si
  // la página se recargó durante la subida o si falló (ver sendQuote).
  const needsProof = o.status === "pending" && !o.hasPaymentProof && (o.source === "transferencia" || o.source === "whatsapp");
  const proofBlock = needsProof
    ? `<div class="pt-2 border-t border-ink/10 space-y-2">
        <p class="text-xs text-ink/75">Este pedido todavía no tiene comprobante de transferencia.</p>
        <input type="file" accept="image/*,application/pdf" data-my-proof-file="${escapeAttr(o.id)}"
          aria-label="Comprobante de transferencia de este pedido" class="text-xs w-full" />
        <button type="button" data-my-proof-btn="${escapeAttr(o.id)}"
          class="tap w-full rounded-full bg-rose text-cream text-xs font-semibold py-2 hover:bg-rose/90 transition">📤 Subir comprobante</button>
        <p data-my-proof-status="${escapeAttr(o.id)}" class="text-xs"></p>
      </div>`
    : "";
  const chip = myOrderChip(o);
  const pcs = (o.items || []).reduce((t, it) => t + (it.qty || 0), 0);
  return `
    <details data-order-id="${escapeAttr(o.id)}" class="group/order rounded-2xl border border-ink/10 overflow-hidden bg-white shadow-sm">
      <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-3 p-3 hover:bg-ink/[0.03] transition">
        ${myThumbStackHTML(o)}
        <div class="min-w-0 flex-1">
          <span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${chip.cls}">${chip.label}</span>
          <p class="text-xs text-ink/70 mt-1">#${orderNumber(o)} · ${fecha}</p>
          <p class="text-xs text-ink/60 truncate" title="${escapeAttr(itemsSummary)}">${pcs} pieza${pcs === 1 ? "" : "s"} · ${(o.items || []).length} producto${(o.items || []).length === 1 ? "" : "s"}</p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <span class="text-sm font-bold text-ink tabular-nums">${formatPrice(o.grandTotal)}</span>
          <span class="text-ink/40 text-xs transition group-open/order:rotate-180" aria-hidden="true">▾</span>
        </div>
      </summary>
      <div class="border-t border-ink/10 p-3 space-y-3">
        ${orderTimelineHTML(o)}
        <ul class="space-y-2">${orderItemsDetailHTML(o)}</ul>
        <div class="text-xs text-ink/75 space-y-0.5 pt-2 border-t border-ink/10">
          <div class="flex justify-between"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
          ${shippingMXN > 0 ? `<div class="flex justify-between"><span>Envío</span><span>${formatPrice(shippingMXN)}</span></div>` : ""}
          <div class="flex justify-between text-ink font-bold text-sm pt-1"><span>Total</span><span>${formatPrice(o.grandTotal)}</span></div>
        </div>
        ${orderAddressHTML(o)}
        ${orderTrackingDetailHTML(o)}
        <div class="flex gap-2 pt-1">
          ${canReorder ? `<button type="button" data-reorder="${escapeAttr(o.id)}"
              class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-rose/10 text-rose-ink text-xs font-semibold py-2 hover:bg-rose/20 transition">
              🔁 Volver a pedir
            </button>` : ""}
          ${orderWhatsAppButtonHTML(o)}
        </div>
        ${proofBlock}
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
  if (o.status === "paid" && (o.trackingNumber || ["enviado", "entregado"].includes(myOrderStage(o)))) return "shipped";
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
      <button type="button" data-stat-filter="${s.key}" aria-pressed="${active}"
        class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-rose-deep text-cream" : "bg-ink/5 text-ink hover:bg-ink/10"}">
        ${s.icon} ${s.label} <span class="tabular-nums ${active ? "text-cream/90" : "text-ink/60"}">${counts[s.key]}</span>
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
      <button type="button" data-range-filter="${r.key}" aria-pressed="${active}"
        class="rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-ink text-cream" : "bg-ink/5 text-ink/75 hover:bg-ink/10"}">
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
  listEl.querySelectorAll("[data-my-proof-btn]").forEach((btn) => {
    btn.addEventListener("click", () => uploadMyOrderProof(btn.dataset.myProofBtn));
  });

  filteredEmptyEl.classList.toggle("hidden", sorted.length > 0 || myOrdersCache.length === 0);
}

/* Sube el comprobante de un pedido desde Mi cuenta (ver myOrderCardHTML). */
async function uploadMyOrderProof(orderId) {
  const input = document.querySelector(`[data-my-proof-file="${orderId}"]`);
  const btn = document.querySelector(`[data-my-proof-btn="${orderId}"]`);
  const statusEl = document.querySelector(`[data-my-proof-status="${orderId}"]`);
  if (!input || !btn || !statusEl) return;
  const show = (msg, ok) => {
    statusEl.textContent = msg;
    statusEl.className = `text-xs ${ok ? "text-ink/75" : "text-rose-ink"}`;
  };
  const file = input.files && input.files[0];
  if (!file) return show("Selecciona una imagen o PDF primero.", false);
  const proofError = validateProofFile(file);
  if (proofError) return show(proofError, false);

  btn.disabled = true;
  btn.textContent = "Subiendo…";
  try {
    await uploadProofFile(orderId, file);
    show("✅ ¡Comprobante recibido! Te confirmaremos tu pedido pronto.", true);
    btn.textContent = "✅ Comprobante enviado";
    const order = myOrdersCache.find((o) => o.id === orderId);
    if (order) order.hasPaymentProof = true;
  } catch (err) {
    show(friendlyError(err, "No pudimos subir tu comprobante. Intenta de nuevo en un momento."), false);
    btn.disabled = false;
    btn.textContent = "📤 Subir comprobante";
  }
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
      renderAccountDashboard(orders);
      emptyEl.classList.remove("hidden");
      return;
    }

    renderAccountDashboard(orders);

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
    errorEl.textContent = friendlyError(err, "No pudimos guardar tus datos. Intenta de nuevo en un momento.");
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

function initAccountPanel() {
  initAccountDashboard();
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
  handleMercadoPagoReturn();
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
  // En cuanto la clienta corrige algo, el aviso de error del carrito se quita.
  document.getElementById("quote-form").addEventListener("input", () => clearCartError("cart-error"));
  document.getElementById("americano-quote-form").addEventListener("input", () => clearCartError("americano-cart-error"));
  document.getElementById("login-form").addEventListener("input", () => document.getElementById("login-notice").classList.add("hidden"));
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
    document.getElementById("brands-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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
    document.getElementById("search-results-section").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  });
  document.getElementById("search-results-clear").addEventListener("click", () => {
    searchInput.value = "";
    showHomeView("home");
  });
  document.getElementById("catalog-clear").addEventListener("click", () => showHomeView("home"));
  document.getElementById("stock-clear").addEventListener("click", () => showHomeView("home"));

  renderTopBar();
  renderHeroSlide();
  wireHeroControls();
  restartHeroTimer();
  renderPromoBanner();
  renderBenefits();
  initWhatsAppFloat();
  initAccountPanel();
  initWishlist();
  initRestock();
  initReviews();
  initProductSheet();
  initSearchSuggest();
  wireShippingTimesModal();

  // Por si alguien traía carritos de ambas colecciones guardados de antes
  // de que el carrito fuera uno solo: se queda el de Skincare Coreano.
  if (Object.keys(cart).length && Object.keys(americanoCart).length) {
    americanoCart = {};
    saveAmericanoCart();
  }

  loadProducts();
  loadShippingSettings();
  loadBankDetails();
  loadShippingKoreaRates();
  loadShippingNacionalRates();
  loadStockData();
  loadReviewSummaries();
  renderCart();

  loadAmericanoProducts();
  renderAmericanoCart();
});
