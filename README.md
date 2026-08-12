# Catálogo KKUL — cotización por WhatsApp

Sitio de catálogo (HTML + Tailwind CSS + JavaScript) que lee productos desde
un Google Sheet publicado como CSV y permite al cliente armar un carrito y
enviarlo como cotización estructurada por WhatsApp. No procesa pagos.

## Archivos

- `index.html` — estructura de la página.
- `app.js` — lógica: carga de CSV, catálogo, filtros, carrito, envío a WhatsApp.
- `styles.css` — CSS de Tailwind ya compilado (no requiere CDN en producción).
- `input.css` / `tailwind.config.js` / `package.json` — solo se usan para
  recompilar `styles.css` si cambias clases (`npm install && npm run build:css`).

## 1. Configurar el Google Sheet

1. Crea una hoja con estas columnas en la primera fila (los nombres pueden
   variar ligeramente, el sitio los reconoce en español o inglés):

   | Nombre | Categoria | Marca | Precio | Imagen | Descripcion | SKU | Disponible | Destacado |
   |--------|-----------|-------|--------|--------|-------------|-----|------------|-----------|

   - **Imagen**: URL pública de la foto del producto.
   - **Disponible**: `SI` / `NO` (si se deja vacío, se asume disponible).
   - **SKU**: opcional, sirve como identificador único de la fila.
   - **Destacado**: opcional. Una o varias etiquetas separadas por coma
     (ej. `Nuevo, Best Seller`). Cada etiqueta distinta genera una pestaña
     de colección arriba del catálogo (como "Lo más nuevo" o "Best Sellers"
     en el sitio original de KKUL). Si dejas la columna vacía en todas las
     filas, esa sección de pestañas no se muestra.

2. En Google Sheets: `Archivo` → `Compartir` → `Publicar en la Web`.
3. Elige la hoja correspondiente y el formato **"Valores separados por comas (.csv)"**.
4. Clic en **Publicar** y copia el link que te da Google.

## 2. Configurar el sitio

Abre `app.js` y edita las primeras líneas:

```js
const CONFIG = {
  GOOGLE_SHEET_CSV_URL: "PEGA_AQUI_TU_URL_CSV", // el link del paso anterior
  WHATSAPP_NUMBER: "52XXXXXXXXXX",              // tu número con código de país, sin "+" ni espacios
  BUSINESS_NAME: "KKUL",
  SHIPPING_MESSAGE: "Envíos a todo México desde $189 MXN 🚚💨", // barra superior
  TICKER_MESSAGES: [...],   // frases de la barra deslizante
  SOCIAL_LINKS: [...],      // links de Facebook/Instagram/TikTok (deja href: "" para ocultar)
  HERO_SLIDES: [...],       // slides del banner principal (título, subtítulo, botón)
};
```

Mientras `GOOGLE_SHEET_CSV_URL`/`WHATSAPP_NUMBER` tengan el texto de ejemplo
(`PEGA_AQUI` / `XXXX`), el sitio muestra un catálogo de demostración y el
botón de WhatsApp no intenta abrir nada (avisa que falta configurarlo).

## 3. Publicar el sitio

Como es HTML/CSS/JS estático, puedes subir estos archivos a GitHub Pages,
Netlify, Vercel o cualquier hosting estático — no necesita servidor ni base
de datos.

## Notas

- El carrito se guarda en el navegador del cliente (`localStorage`), así que
  sobrevive si recarga la página.
- Al enviar la cotización se abre WhatsApp con un resumen del pedido; el
  cliente debe darle "Enviar" manualmente desde WhatsApp.
- Si el Google Sheet no carga (sin internet, URL incorrecta, hoja no
  publicada), el sitio cae automáticamente al catálogo de ejemplo en lugar
  de mostrar una página en blanco.
- La navegación de categorías (barra debajo del header) y los filtros se
  generan automáticamente a partir de la columna **Categoria** de tu Sheet.
- El botón flotante "Contáctanos" (WhatsApp) es para preguntas generales;
  el botón "Enviar cotización por WhatsApp" del carrito es para el pedido.
