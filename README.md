# Catálogo Alpacca — cotización por WhatsApp

Sitio (HTML + Tailwind CSS + JavaScript) que lee productos desde un Google
Sheet publicado como CSV y permite al cliente armar un carrito y enviarlo
como cotización estructurada por WhatsApp. No procesa pagos.

El diseño está inspirado en la estructura de sitios de e-commerce de
skincare coreano (tipo KKUL) pero con marca, copys y datos propios — no
reutiliza contenido, marcas ni fotografía de ningún negocio real.

## Archivos

- `index.html` — estructura de la página.
- `app.js` — lógica: carga de CSV, secciones, carrito, envío a WhatsApp.
- `styles.css` — CSS de Tailwind ya compilado (no requiere CDN en producción).
- `input.css` / `tailwind.config.js` / `package.json` — solo se usan para
  recompilar `styles.css` si cambias clases (`npm install && npm run build:css`).
- `assets/logo-wordmark.png` — logotipo de Alpacca (header).
- `assets/logo-full.png` — logotipo completo con la mascota (footer).
- `assets/favicon-32.png` / `assets/apple-touch-icon.png` — ícono de pestaña/celular.
- `assets/mascot.png` — mascota sola, cuadrada y transparente, por si la quieres usar en otro lado.
- `fonts/ReadyToParty.ttf` — la tipografía de marca ("Ready to Party" de Misti's Fonts),
  cargada vía `@font-face` en `input.css` para los encabezados (`font-logo`).

## 1. Configurar el Google Sheet

Crea una hoja con estas columnas en la primera fila (los nombres pueden
variar ligeramente, el sitio los reconoce en español o inglés):

| Nombre | Categoria | Marca | Precio | Imagen | Descripcion | SKU | Disponible | Destacado | TipoPiel |
|--------|-----------|-------|--------|--------|-------------|-----|------------|-----------|----------|

- **Imagen**: URL pública de la foto del producto.
- **Disponible**: `SI` / `NO` (si se deja vacío, se asume disponible).
- **SKU**: opcional, identificador único de la fila.
- **Destacado**: opcional. Marca los productos que quieres en la sección
  "Best Seller" con la etiqueta `Best Seller`. Se muestran hasta 6,
  numerados del 1 al 6 en el orden en que aparecen en tu Sheet. Sin
  productos con esa etiqueta → la sección se oculta.
- **TipoPiel**: opcional. Una o varias etiquetas separadas por coma (ej.
  `Grasa, Mixta`) que le dicen al quiz de "¿Cuál es tu tipo de piel?" qué
  productos recomendar según el resultado. Los emojis de cada etiqueta se
  configuran en `CONFIG.SKIN_TYPE_EMOJI`, y deben coincidir con los
  "type" que uses en las preguntas de `CONFIG.SKIN_QUIZ` (ver abajo).
- **Categoria**: además de agrupar productos, cada categoría distinta
  también se usa para armar el grid de "Marcas" (a través de la columna
  Marca) — no necesitas configurarla aparte.

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
  SKIN_TYPE_EMOJI: {...},      // emoji por etiqueta de TipoPiel
  SKIN_QUIZ: [...],            // preguntas y opciones del quiz de tipo de piel
  PROMO_BANNER: {...},         // franja ancha promocional
  BENEFITS: [...],             // franja de 4 beneficios antes del footer
  MENU_COMING_SOON: [...],     // accesos del menú que aún no tienen función real
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

Header (logo + carrito + menú ☰ en móvil) → menú de secciones (barra en
escritorio / panel deslizante en móvil) → banner principal (rotativo) →
barra deslizante → Best Seller (top 6 numerado) → quiz de tipo de piel →
banner promocional → marcas → beneficios → footer.

Todas las secciones basadas en datos (Best Seller, tipo de piel, marcas)
se ocultan automáticamente si tu catálogo no tiene esa información — no
se muestra contenido inventado.

### Quiz "¿Cuál es tu tipo de piel?"

En vez de pestañas manuales, el cliente contesta unas preguntas de
opción múltiple y al final ve su tipo de piel (con su emoji) y los
productos de tu catálogo etiquetados con ese tipo (columna TipoPiel).

- Preguntas y opciones: `CONFIG.SKIN_QUIZ` en `app.js`. Cada opción tiene
  un `type` — debe ser exactamente el mismo texto que usas en la columna
  **TipoPiel** de tu Sheet (ej. `"Grasa"`, `"Seca"`) para que el
  resultado encuentre productos que recomendar. Puedes agregar, quitar o
  reescribir preguntas y opciones libremente; no necesitan ser 4.
- El resultado es el tipo con más respuestas; si hay empate, gana el que
  se repitió primero.
- El resultado se guarda en el navegador del cliente (no se vuelve a
  preguntar en su próxima visita) hasta que toque "Repetir el quiz".
- Si un tipo de piel no tiene productos etiquetados todavía, se muestra
  un aviso en vez de una sección vacía.
- Sección completa oculta si tu catálogo no usa la columna TipoPiel o si
  `CONFIG.SKIN_QUIZ` está vacío.

### Menú (barra de escritorio + ☰ en móvil)

El mismo listado de items se usa en dos formas, según el tamaño de
pantalla:

- **Escritorio**: barra horizontal siempre visible debajo del header, con
  flechas para desplazarse si no caben todos los items.
- **Móvil**: la barra se reemplaza por un botón ☰ que abre un panel vertical
  con los mismos items.

El listado (función `getMenuItems()` en `app.js`) combina:
- Links reales a las secciones que existen (Best Seller, tipo de piel, marcas).
- Accesos "próximamente" definidos en `CONFIG.MENU_COMING_SOON` (por
  defecto: Asesoría personalizada, Mayoreo, Rastrea tu pedido, Mi cuenta).
  Al tocarlos se muestra un aviso en vez de llevar a una página vacía —
  bórralos de la lista en `app.js` en cuanto conectes esa función de verdad
  (por ejemplo, un sistema de cuentas o de rastreo de pedidos).

### Qué se dejó fuera a propósito

- **Buscador, filtros de categoría y grid de "todos los productos"**: se
  quitaron a pedido — el catálogo hoy se navega por las secciones curadas
  (Best Seller, tipo de piel, marcas). Si más adelante quieres un grid
  completo con filtros otra vez, se puede reconstruir sobre el mismo
  `productCardHTML()` que ya usan esas secciones.
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
- Si el Google Sheet no carga (sin internet, URL incorrecta, hoja no
  publicada), el sitio cae automáticamente al catálogo de ejemplo en lugar
  de mostrar una página en blanco.
