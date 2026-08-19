# Catálogo Alpacca — cotización por WhatsApp

Sitio (HTML + Tailwind CSS + JavaScript) que lee productos desde un Google
Sheet publicado como CSV y permite al cliente armar un carrito y enviarlo
como cotización estructurada por WhatsApp. No procesa pagos.

El diseño está inspirado en la estructura general de sitios de e-commerce
de skincare coreano, pero con marca, copys y datos propios — no reutiliza
contenido, marcas ni fotografía de ningún negocio real.

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
- `assets/products/` — fotos de producto, nombradas por SKU o agrupadas en subcarpetas por
  marca (ej. `assets/products/tocobo/`). Al desplegar el sitio, estos archivos quedan disponibles
  en esa misma ruta; usa esa ruta relativa en la columna **Imagen** de tu Google Sheet para esos
  productos.
- `fonts/ReadyToParty.ttf` — la tipografía de marca ("Ready to Party" de Misti's Fonts),
  cargada vía `@font-face` en `input.css` para los encabezados (`font-logo`).

## 1. Configurar el Google Sheet

Crea una hoja con estas columnas en la primera fila (los nombres pueden
variar ligeramente, el sitio los reconoce en español o inglés):

| Nombre | Categoria | Marca | Precio USD | Costo MXN | Precio | Peso | Presentacion | Imagen | Descripcion | SKU | Disponible | Destacado | TipoPiel |
|--------|-----------|-------|------------|-----------|--------|------|--------------|--------|-------------|-----|------------|-----------|----------|

- **Precio USD** / **Costo MXN** / **Precio**: el sitio siempre lee la
  columna **Precio** (en pesos, ya con tu comisión incluida) — es la que
  importa, no cambies su nombre. Las otras dos son tu costo, en la moneda
  que te quede más fácil por producto (llena solo una de las dos por
  fila, deja la otra vacía):
  - **Precio USD**: tu costo en dólares (ej. productos de Corea).
  - **Costo MXN**: tu costo ya en pesos (productos que no compras en dólares).

  En **Precio** pon la fórmula:

  ```
  =CEILING(IF(PrecioUSD<>"", PrecioUSD*Config!$B$2, CostoMXN) * (1+Config!$B$3/100) * (1+Config!$B$4/100), 1)
  ```

  Eso toma tu costo (convertido de dólares si aplica), le suma tu
  **comisión** (celda `Config!B3`) y tu **arancel EE.UU.** (celda
  `Config!B4`, ver sección 1.1) para llegar al precio de venta, y
  redondea **hacia arriba** al siguiente peso entero (ej. $56.32 → $57 —
  nunca hacia abajo). Cambia el tipo de cambio, la comisión o el arancel
  en un solo lugar (la pestaña Config) y **todos** los precios se
  recalculan solos — ninguno de los dos afecta las tarifas de envío,
  solo el precio de los productos. La plantilla que te compartí ya trae
  esta fórmula armada, solo cópiala por fila.
- **Peso**: opcional. Peso del producto en kilogramos (ej. `0.25`). Se
  usa para calcular el peso total del carrito, que se incluye en el
  mensaje de WhatsApp de la cotización (`📦 Peso total estimado: X kg`)
  para que puedas cotizar el envío. Si lo dejas vacío se toma como 0.
- **Presentacion**: opcional. Texto libre para distinguir cómo se vende
  ese renglón, por ejemplo `Pieza individual` o `Caja con 30 piezas`. Se
  muestra como una etiqueta sobre el nombre del producto en su tarjeta, y
  se incluye entre paréntesis junto al nombre en el mensaje de WhatsApp
  para que sepas exactamente cuál variante pidió el cliente. Si un
  producto tiene versión individual y versión caja, agrégalos como dos
  filas distintas (con su propio SKU, precio y peso), no como una sola.
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
- **Marca**: cada marca distinta aparece como una tarjeta en la sección
  "Marcas". Al hacer click en una, se muestran debajo todos los
  productos de esa marca (disponibles y agotados, estos últimos con su
  etiqueta "Agotado"), con su propio botón "Agregar" al carrito.

Luego: `Archivo` → `Compartir` → `Publicar en la Web` → elige la hoja →
formato **"Valores separados por comas (.csv)"** → **Publicar**, y copia el
link.

## 1.1 Pestaña "Config" (tipo de cambio, comisión, envíos)

Crea una pestaña **"Config"** con dos columnas, `Clave` y `Valor`, y
publícala como CSV aparte (mismos pasos de arriba, eligiendo esa pestaña):

| Clave | Valor |
|-------|-------|
| Tipo de cambio | 18.00 |
| Comisión (%) | 15 |
| Arancel EE.UU. (%) | 15 |

- **Tipo de cambio** (celda `B2`): cuántos pesos vale 1 dólar. La usa la
  fórmula de la columna Precio en Productos (sección 1 arriba) para
  convertir tus costos en dólares, y también la cotización de envío
  Corea-EE.UU. más abajo.
- **Comisión (%)** (celda `B3`) y **Arancel EE.UU. (%)** (celda `B4`): tu
  comisión y el arancel de importación a EE.UU., en porcentaje. Las usa
  esa misma fórmula de Precio para llegar al precio de venta final —
  **no se aplican a los envíos**, solo a los productos. También se usan
  para calcular el pedido mínimo real (ver `MIN_ORDER_USD` abajo): si tu
  proveedor pide $250 USD *antes* de estos cargos, el sitio calcula
  cuánto es eso en pesos ya con comisión y arancel incluidos, para que
  el mínimo que se le pide al cliente sí cubra los $250 reales del
  proveedor.

Si además quieres que el mensaje de WhatsApp incluya una **referencia de
costo de envío** (Corea→EE.UU. y/o nacional en México) junto al peso,
agrega también estas pestañas:

**Pestaña "TarifasCorea"** — tabla de tarifas por peso, igual a la que
maneja tu proveedor, con dos columnas: `Peso Total de la Unidad` y
`Costo (USD)`:

| Peso Total de la Unidad | Costo (USD) |
|--------------------------|--------------|
| <= 1 kg | 33.50 |
| <= 1.5 kg | 39.00 |
| <= 2 kg | 43.00 |
| ... | ... |
| <= 10 kg | 129.00 |
| Cada 1 kg adicional | 12.50 |

- Copia tus filas tal cual las tengas (puedes tener tantas como quieras,
  no tienen que ser cada 0.5 kg). El sitio busca la primera fila cuyo
  peso alcance el del carrito (redondeando hacia arriba al siguiente
  escalón, como hace el paquetero).
- La última fila, **"Cada 1 kg adicional"**, es el costo por cada kg que
  se pase del último escalón de la tabla (ej. arriba de 10 kg).

**Pestaña "TarifasNacional"** — tabla de envío nacional en México por
**zona (estado + rango de código postal) y peso**, con cuatro columnas:
`Estado` | `CP Destino` | `Peso (kg)` | `Costo Estafeta Terrestre (MXN)`:

| Estado | CP Destino | Peso (kg) | Costo Estafeta Terrestre (MXN) |
|--------|------------|-----------|----------------------------------|
| Aguascalientes | 20000-27997 | 1 | 250 |
| Aguascalientes | 20000-27997 | 2 | 250 |
| ... | ... | ... | ... |
| Aguascalientes | 20000-27997 | 15 | 644 |
| Baja California | 21000-22997 | 1 | 250 |
| ... | ... | ... | ... |

- `CP Destino` es un rango tipo `20000-27997` (mismo formato que te dio
  tu paquetería). El sitio toma el código postal que el cliente escribe
  en el formulario, encuentra en qué rango cae, y busca ahí el primer
  peso que alcance el del carrito (redondeando hacia arriba, igual que
  con Corea). Si el peso del pedido se pasa del último escalón que
  tengas cargado (ej. arriba de 15 kg), no se muestra estimado — te toca
  cotizarlo manualmente.
- Solo se usa **una paquetería a la vez** (actualmente Estafeta
  Terrestre) — no hace falta cargar más columnas de otras paqueterías
  aunque tu tabla original las traiga.
- Si dos rangos de CP se traslapan en tu tabla, el sitio usa el rango
  más angosto (más específico) de los dos.

Pega los links CSV en `app.js`:

```js
SHIPPING_CONFIG_CSV_URL: "...",         // pestaña "Config"
SHIPPING_KOREA_RATES_CSV_URL: "...",    // pestaña "TarifasCorea"
SHIPPING_NACIONAL_CSV_URL: "...",       // pestaña "TarifasNacional"
```

Si dejas alguno como el placeholder de ejemplo, esa parte del envío
simplemente no aparece en la cotización (puedes tener solo el nacional,
solo el de Corea, ninguno, o ambos). El envío nacional también necesita
que el cliente escriba su **código postal** en el formulario del
carrito (campo opcional "Código postal") — si lo deja vacío, esa parte
del estimado no aparece. Cuando todo está configurado, el mensaje de
WhatsApp se ve así:

```
*Total estimado: $320.00*
📦 Peso total estimado: 0.8 kg
🚚 Envío estimado (referencia, sujeto a confirmación): $853.00
   • Corea→EE.UU.: $603.00 (≈ $33.50 USD)
   • Nacional MX (Estafeta, CP 06700): $250.00
```

Es una **referencia para ti** (no se suma al "Total estimado" que ve el
cliente) — tú confirmas el costo real de envío antes de cerrar el pedido.

## 2. Configurar el sitio

Abre `app.js` y edita el bloque `CONFIG` al inicio:

```js
const CONFIG = {
  GOOGLE_SHEET_CSV_URL: "PEGA_AQUI_TU_URL_CSV", // el link del paso anterior
  SHIPPING_CONFIG_CSV_URL: "...",      // opcional — pestaña "Config" (ver sección 1.1)
  SHIPPING_KOREA_RATES_CSV_URL: "...", // opcional — pestaña "TarifasCorea" (ver sección 1.1)
  SHIPPING_NACIONAL_CSV_URL: "...",    // opcional — pestaña "TarifasNacional" (ver sección 1.1)
  WHATSAPP_NUMBER: "52XXXXXXXXXX",              // tu número con código de país, sin "+" ni espacios
  BUSINESS_NAME: "Alpacca",
  SHIPPING_MESSAGE: "...",     // barra superior
  MIN_ORDER_USD: 250,          // pedido mínimo que pide tu proveedor, en dólares, ANTES de comisión/arancel
  MIN_ORDER_EXCHANGE_RATE_FALLBACK: 18, // tipo de cambio de respaldo si no cargó el de Config
  MIN_ORDER_COMISION_FALLBACK: 15,      // comisión (%) de respaldo si no cargó el de Config
  MIN_ORDER_ARANCEL_FALLBACK: 15,       // arancel EE.UU. (%) de respaldo si no cargó el de Config
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

Header (logo + buscador + carrito + menú ☰ en móvil) → menú de secciones
(barra en escritorio / panel deslizante en móvil) → banner principal
(rotativo) → barra deslizante → Best Seller (top 6 numerado) → quiz de
tipo de piel → banner promocional → marcas → beneficios → footer.

Todas las secciones basadas en datos (Best Seller, tipo de piel, marcas)
se ocultan automáticamente si tu catálogo no tiene esa información — no
se muestra contenido inventado.

### Buscador

El campo de búsqueda del header filtra por nombre, marca y categoría
(sin distinguir mayúsculas/minúsculas ni acentos) mientras el cliente
escribe, y muestra los resultados en una sección debajo del header —
igual que al hacer click en una marca, cada resultado usa la misma
tarjeta de producto con su botón "Agregar". Se cierra con el botón
"Cerrar búsqueda" o vaciando el campo.

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

- **Filtros de categoría y grid de "todos los productos"**: se quitaron a
  pedido — el catálogo se navega por las secciones curadas (Best Seller,
  tipo de piel, marcas) más el buscador del header. Si más adelante
  quieres un grid completo con filtros, se puede reconstruir sobre el
  mismo `productCardHTML()` que ya usan esas secciones.
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
- **Pedido mínimo**: mientras el carrito no llegue a `CONFIG.MIN_ORDER_USD`
  (250 USD, convertidos a pesos con el tipo de cambio de la pestaña
  Config), el botón "Enviar cotización por WhatsApp" queda deshabilitado
  y se muestra cuánto le falta al cliente. Cambia `MIN_ORDER_USD` en
  `app.js` si el mínimo cambia.
