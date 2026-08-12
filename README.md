# Catálogo Alpacca — cotización por WhatsApp

Sitio de catálogo (HTML + Tailwind CSS + JavaScript) que lee productos desde
un Google Sheet publicado como CSV y permite al cliente armar un carrito y
enviarlo como cotización estructurada por WhatsApp. No procesa pagos.

El diseño está inspirado en la estructura de sitios de e-commerce de
skincare coreano (tipo KKUL) pero con marca, copys y datos propios — no
reutiliza contenido, marcas ni fotografía de ningún negocio real.

## Archivos

- `index.html` — estructura de la página.
- `app.js` — lógica: carga de CSV, catálogo, filtros, carrito, secciones, envío a WhatsApp.
- `styles.css` — CSS de Tailwind ya compilado (no requiere CDN en producción).
- `input.css` / `tailwind.config.js` / `package.json` — solo se usan para
  recompilar `styles.css` si cambias clases (`npm install && npm run build:css`).

## 1. Configurar el Google Sheet

Crea una hoja con estas columnas en la primera fila (los nombres pueden
variar ligeramente, el sitio los reconoce en español o inglés):

| Nombre | Categoria | Marca | Precio | Imagen | Descripcion | SKU | Disponible | Destacado | TipoPiel |
|--------|-----------|-------|--------|--------|-------------|-----|------------|-----------|----------|

- **Imagen**: URL pública de la foto del producto.
- **Disponible**: `SI` / `NO` (si se deja vacío, se asume disponible).
- **SKU**: opcional, identificador único de la fila.
- **Destacado**: opcional. Una o varias etiquetas separadas por coma
  (ej. `Nuevo, Best Seller`). Cada etiqueta genera una pestaña en
  "Colecciones destacadas". Vacía en todas las filas → la sección se oculta.
- **TipoPiel**: opcional. Igual que Destacado pero para la sección
  "Explora por tipo de piel" (ej. `Grasa, Mixta`). Los emojis de cada
  etiqueta se configuran en `CONFIG.SKIN_TYPE_EMOJI`.

Luego: `Archivo` → `Compartir` → `Publicar en la Web` → elige la hoja →
formato **"Valores separados por comas (.csv)"** → **Publicar**, y copia el
link.

## 2. Configurar el sitio

Abre `app.js` y edita el bloque `CONFIG` al inicio:

```js
const CONFIG = {
  GOOGLE_SHEET_CSV_URL: "PEGA_AQUI_TU_URL_CSV", // el link del paso anterior
  WHATSAPP_NUMBER: "52XXXXXXXXXX",              // tu número con código de país, sin "+" ni espacios
  BUSINESS_NAME: "Alpacca",
  SHIPPING_MESSAGE: "...",     // barra superior
  TICKER_MESSAGES: [...],      // frases de la barra deslizante
  SOCIAL_LINKS: [...],         // Facebook/Instagram/TikTok (deja href: "" para ocultar)
  HERO_SLIDES: [...],          // slides del banner principal (título, subtítulo, botón)
  ROUTINE_STEPS: [...],        // accesos rápidos de "Arma tu rutina" (emoji + categoría)
  SKIN_TYPE_EMOJI: {...},      // emoji por etiqueta de TipoPiel
  PROMO_BANNER: {...},         // franja ancha promocional
  BENEFITS: [...],             // franja de 4 beneficios antes del footer
};
```

Mientras `GOOGLE_SHEET_CSV_URL` / `WHATSAPP_NUMBER` tengan el texto de
ejemplo (`PEGA_AQUI` / `XXXX`), el sitio muestra un catálogo de
demostración y los botones de WhatsApp avisan que falta configurarlos en
vez de intentar abrir algo roto.

## 3. Publicar el sitio

Como es HTML/CSS/JS estático, puedes subir estos archivos a GitHub Pages,
Netlify, Vercel o cualquier hosting estático — no necesita servidor ni base
de datos.

## Secciones de la página

Header (buscador + carrito) → nav de categorías → banner principal
(rotativo) → barra deslizante → colecciones destacadas → arma tu rutina →
explora por tipo de piel → banner promocional → marcas → catálogo completo
con filtros → beneficios → newsletter → footer.

Todas las secciones basadas en datos (colecciones, tipo de piel, marcas,
categorías) se ocultan automáticamente si tu catálogo no tiene esa
información — no se muestra contenido inventado.

### Qué se dejó fuera a propósito

- **Testimonios de clientes con fotos**: no se fabrican reseñas falsas.
  Cuando tengas reseñas reales, es fácil agregar una sección similar a
  "Marcas" que las lea desde el Sheet o un array en `CONFIG`.
- **Íconos de métodos de pago**: el sitio no procesa pagos, así que
  mostrar íconos de tarjetas sería contradictorio.
- **Selector de moneda funcional / login de cuenta**: el sitio solo maneja
  MXN y no tiene sistema de usuarios, así que no se agregaron controles que
  no hacen nada.

## Notas

- El carrito se guarda en el navegador del cliente (`localStorage`), así que
  sobrevive si recarga la página.
- Al enviar la cotización se abre WhatsApp con un resumen del pedido; el
  cliente debe darle "Enviar" manualmente desde WhatsApp.
- El botón flotante "Contáctanos" y el link del footer son para preguntas
  generales; el botón "Enviar cotización por WhatsApp" del carrito es para
  el pedido armado.
- El formulario de newsletter no tiene backend propio: al enviarlo muestra
  un aviso para conectar un servicio de email marketing (Mailchimp,
  Klaviyo, etc.) en `initNewsletter()` dentro de `app.js`.
- Si el Google Sheet no carga (sin internet, URL incorrecta, hoja no
  publicada), el sitio cae automáticamente al catálogo de ejemplo en lugar
  de mostrar una página en blanco.
