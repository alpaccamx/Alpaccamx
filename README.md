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

   | Nombre | Categoria | Marca | Precio | Imagen | Descripcion | SKU | Disponible |
   |--------|-----------|-------|--------|--------|-------------|-----|------------|

   - **Imagen**: URL pública de la foto del producto.
   - **Disponible**: `SI` / `NO` (si se deja vacío, se asume disponible).
   - **SKU**: opcional, sirve como identificador único de la fila.

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
};
```

Mientras estos valores tengan el texto de ejemplo (`PEGA_AQUI` / `XXXX`), el
sitio muestra un catálogo de demostración para que puedas ver cómo se ve.

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
