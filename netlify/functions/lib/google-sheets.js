// Escribe en tu Google Sheet de Stock (columna "Piezas Disponibles") cada
// vez que se confirma un pago o se edita un pedido -- para que el número
// que ves en tu Sheet sea siempre el que de verdad queda disponible, en
// vez de tener que restarlo tú a mano.
//
// Es "mejor esfuerzo": si algo falla (credenciales, Sheet no compartido,
// columna no encontrada, etc.) solo se ve en los logs de esta función --
// nunca rompe el flujo de pago ni el resto de los avisos (WhatsApp,
// correo). El número mostrado en el sitio SIEMPRE es correcto aunque este
// escrito falle, porque ese cálculo (Piezas Disponibles - vendidas) sigue
// pasando en vivo en app.js -- esto solo mantiene tu Sheet al día para
// que no te confunda.
//
// Variables de entorno necesarias (Netlify → Site settings → Environment
// variables), ver README:
//   GOOGLE_SHEETS_CLIENT_EMAIL   -> "client_email" del JSON de tu cuenta
//                                   de servicio de Google Cloud
//   GOOGLE_SHEETS_PRIVATE_KEY    -> "private_key" de ese mismo JSON
//   GOOGLE_SHEETS_SPREADSHEET_ID -> el ID de tu Sheet -- de la URL
//                                   cuando lo tienes abierto para EDITAR
//                                   (docs.google.com/spreadsheets/d/ESTE
//                                   ID/edit), NO el link de "Publicar en
//                                   la web" que usa el sitio para leer
//   GOOGLE_SHEETS_STOCK_TAB      -> nombre EXACTO de la pestaña de Stock
//                                   (ej. "Stock")
//
// Además, tienes que compartir tu Sheet (botón "Compartir") con el
// correo de la cuenta de servicio (GOOGLE_SHEETS_CLIENT_EMAIL) dándole
// permiso de Editor -- si no, Google rechaza la escritura aunque las
// credenciales estén bien.

const { randomBytes } = require("crypto");
const jwt = require("jsonwebtoken");

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SKU_ALIASES = ["sku", "codigo", "código"];
const PIEZAS_ALIASES = ["piezas disponibles", "piezas", "cantidad", "stock"];
const PRECIO_ALIASES = ["precio mxn", "precio", "price"];
const PRECIO_TARJETA_ALIASES = ["precio tarjeta mxn", "precio tarjeta", "preciotarjeta"];
const NOMBRE_ALIASES = ["nombre", "producto", "name"];
const MARCA_ALIASES = ["marca", "brand"];
const IMAGEN_ALIASES = ["imagen", "image", "foto", "imagen url"];
const DESCRIPCION_ALIASES = ["descripcion", "descripción", "description"];
const CATEGORIA_ALIASES = ["categoria", "categoría", "category"];
const PESO_ALIASES = ["peso", "peso (kg)", "peso kg", "weight", "pesokg"];
const LOGO_MARCA_ALIASES = ["logo", "logo marca", "logo de marca", "logomarca", "brand logo"];
const MARCA_HEADER = "Marca"; // se escribe así si hay que crear la columna
const LOGO_MARCA_HEADER = "Logo"; // se escribe así si hay que crear la columna

let cachedToken = null; // { token, expiresAt } -- se reusa mientras no venza

async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  if (!clientEmail || !privateKeyRaw) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.token;

  // Al pegar una llave privada en una variable de entorno de una sola
  // línea, los saltos de línea reales se vuelven "\n" literales -- hay
  // que regresarlos a saltos de línea de verdad para que RS256 los pueda
  // usar.
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  let assertion;
  try {
    assertion = jwt.sign(
      {
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      },
      privateKey,
      { algorithm: "RS256" }
    );
  } catch (err) {
    console.error("Error firmando el token de Google Sheets (revisa GOOGLE_SHEETS_PRIVATE_KEY):", err.message);
    return null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Error obteniendo token de Google Sheets:", data);
      return null;
    }
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
    return cachedToken.token;
  } catch (err) {
    console.error("Error de red obteniendo token de Google Sheets:", err);
    return null;
  }
}

function columnIndexToLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function findColumnIndex(headers, aliases) {
  const normalized = headers.map((h) => String(h || "").trim().toLowerCase());
  return normalized.findIndex((h) => aliases.includes(h));
}

/* Lee cualquier pestaña del Sheet (encabezados + filas) por nombre.
   Regresa null si falta configuración, credenciales, o la lectura falla
   (ya logueado el motivo); nunca truena. */
async function readTab(tab, { label = tab } = {}) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId || !tab) return null;

  const token = await getAccessToken();
  if (!token) return null;

  try {
    const range = `${tab}!A:Z`;
    const res = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Error leyendo la pestaña de ${label}:`, data);
      return null;
    }
    const rows = data.values || [];
    if (!rows.length) return null;
    return { spreadsheetId, tab, token, headers: rows[0], rows };
  } catch (err) {
    console.error(`Error de red leyendo la pestaña de ${label}:`, err);
    return null;
  }
}

/* Lee toda la pestaña de Stock (encabezados + filas) -- usado tanto para
   restar piezas vendidas como para agregar productos nuevos. */
async function readStockTab() {
  return readTab(process.env.GOOGLE_SHEETS_STOCK_TAB, { label: "Stock" });
}

/* Genera un SKU corto y legible que no choque con ninguno ya existente
   en la pestaña de Stock -- para cuando Mae agrega un producto nuevo sin
   escribir uno ella misma. */
function generateStockSku(existingSkus) {
  const used = new Set(existingSkus);
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomBytes(4).toString("hex").toUpperCase(); // ej. "A1B2C3D4"
    const sku = `STOCK-${code}`;
    if (!used.has(sku)) return sku;
  }
  // Prácticamente imposible de alcanzar (colisión 20 veces seguidas),
  // pero por si acaso, se agrega la hora para garantizar que sea único.
  return `STOCK-${Date.now().toString(36).toUpperCase()}`;
}

/* Agrega un producto nuevo como fila al final de la pestaña de Stock --
   ver admin-add-stock-product.js. "fields" trae las mismas columnas que
   ya lee csvToStockData en app.js (sku, piezas, precio, precioTarjeta,
   nombre, marca, imagen, descripcion, categoria, peso); cualquiera que
   falte en la pestaña real de Mae simplemente se deja vacía en esa
   columna, no truena. Si fields.sku viene vacío, se genera uno solo y se
   regresa en el resultado.
   Regresa { ok: true, sku } o { ok: false, error } -- nunca truena. */
async function appendStockProduct(fields) {
  const sheet = await readStockTab();
  if (!sheet) {
    return { ok: false, error: "No se pudo conectar con tu Google Sheet (revisa la configuración de Google Sheets)." };
  }
  const { spreadsheetId, tab, token, headers, rows } = sheet;

  const iSku = findColumnIndex(headers, SKU_ALIASES);
  if (iSku < 0) {
    return { ok: false, error: 'No se encontró la columna "SKU" en la pestaña de Stock.' };
  }

  let sku = String(fields.sku || "").trim();
  if (!sku) {
    const existingSkus = rows.slice(1).map((r) => String(r[iSku] || "").trim()).filter(Boolean);
    sku = generateStockSku(existingSkus);
  } else {
    const collision = rows.slice(1).some((r) => String(r[iSku] || "").trim() === sku);
    if (collision) {
      return { ok: false, error: `Ya existe un producto con el SKU "${sku}" en tu Stock.` };
    }
  }

  const columnValues = {
    [iSku]: sku,
    [findColumnIndex(headers, PIEZAS_ALIASES)]: fields.piezas,
    [findColumnIndex(headers, PRECIO_ALIASES)]: fields.precio,
    [findColumnIndex(headers, PRECIO_TARJETA_ALIASES)]: fields.precioTarjeta || "",
    [findColumnIndex(headers, NOMBRE_ALIASES)]: fields.nombre || "",
    [findColumnIndex(headers, MARCA_ALIASES)]: fields.marca || "",
    [findColumnIndex(headers, IMAGEN_ALIASES)]: fields.imagen || "",
    [findColumnIndex(headers, DESCRIPCION_ALIASES)]: fields.descripcion || "",
    [findColumnIndex(headers, CATEGORIA_ALIASES)]: fields.categoria || "",
    [findColumnIndex(headers, PESO_ALIASES)]: fields.peso || "",
  };
  delete columnValues["-1"]; // columnas que no existen en esta pestaña -- se ignoran

  const newRow = new Array(headers.length).fill("");
  for (const [index, value] of Object.entries(columnValues)) {
    newRow[Number(index)] = value;
  }

  try {
    const range = `${tab}!A:Z`;
    const res = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ values: [newRow] }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("Error agregando el producto a la pestaña de Stock:", data);
      return { ok: false, error: "Google rechazó la escritura -- revisa que el Sheet esté compartido con la cuenta de servicio." };
    }
    console.log("Producto agregado a Stock:", JSON.stringify(newRow));
    return { ok: true, sku };
  } catch (err) {
    console.error("Error de red agregando el producto a la pestaña de Stock:", err);
    return { ok: false, error: "No se pudo conectar con Google Sheets. Intenta de nuevo." };
  }
}

/* Construye { sku: qty } a partir de items de un pedido, con el mismo
   filtro que applyStockDecrement en blob-store.js (solo artículos "en
   stock" con SKU y cantidad > 0) -- para llamar applySheetStockDelta con
   el mismo criterio. */
function deltaFromItems(items) {
  const delta = {};
  (items || []).forEach((it) => {
    if (it.enStock && it.sku && it.qty > 0) {
      delta[it.sku] = (delta[it.sku] || 0) + it.qty;
    }
  });
  return delta;
}

/* Resta (o suma, si el delta es negativo -- ver admin-update-order-items.js)
   piezas vendidas en cada fila del Sheet de Stock que coincida por SKU.
   deltaBySku: { sku: qty }, positivo = se vendieron más piezas. Nunca
   deja el número en negativo. */
async function applySheetStockDelta(deltaBySku) {
  const entries = Object.entries(deltaBySku || {}).filter(([, delta]) => delta);
  if (!entries.length) return;

  const sheet = await readStockTab();
  if (!sheet) return;
  const { spreadsheetId, tab, token, headers, rows } = sheet;

  const iSku = findColumnIndex(headers, SKU_ALIASES);
  const iPiezas = findColumnIndex(headers, PIEZAS_ALIASES);
  if (iSku < 0 || iPiezas < 0) {
    console.error('No se encontraron las columnas "SKU" / "Piezas Disponibles" en la pestaña de Stock.');
    return;
  }

  try {
    const deltaMap = new Map(entries);
    const colLetter = columnIndexToLetter(iPiezas);
    const updates = [];
    rows.forEach((row, rowIndex) => {
      if (rowIndex === 0) return; // encabezado
      const sku = String(row[iSku] || "").trim();
      if (!sku || !deltaMap.has(sku)) return;
      const current = parseInt(String(row[iPiezas] || "").replace(/[^0-9]/g, ""), 10) || 0;
      const next = Math.max(0, current - deltaMap.get(sku));
      updates.push({ range: `${tab}!${colLetter}${rowIndex + 1}`, values: [[next]] });
    });

    if (!updates.length) return;

    const batchRes = await fetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ valueInputOption: "RAW", data: updates }),
    });
    const batchData = await batchRes.json();
    if (!batchRes.ok) {
      console.error("Error actualizando la pestaña de Stock:", batchData);
    } else {
      console.log("Pestaña de Stock actualizada:", JSON.stringify(updates));
    }
  } catch (err) {
    console.error("Error de red actualizando la pestaña de Stock:", err);
  }
}

/* Guarda el link del logo de una marca en una mini tabla "Marca"/"Logo"
   dentro de la pestaña Config (la misma que ya lee csvToBrandLogos en
   app.js) -- una fila por marca, no por producto. Si esas columnas no
   existen todavía, se crean solas (encabezados en las siguientes
   columnas vacías, sin tocar tu lista de Clave/Valor). Si la marca ya
   tenía fila, se actualiza; si no, se agrega una nueva.
   Regresa { ok: true } o { ok: false, error } -- nunca truena. */
async function updateBrandLogo(marca, logoUrl) {
  const tabName = process.env.GOOGLE_SHEETS_CONFIG_TAB || "Config";
  const sheet = await readTab(tabName, { label: "Config" });
  if (!sheet) {
    return { ok: false, error: "No se pudo conectar con tu Google Sheet (revisa la configuración de Google Sheets)." };
  }
  const { spreadsheetId, tab, token, headers, rows } = sheet;

  let iMarca = findColumnIndex(headers, MARCA_ALIASES);
  let iLogo = findColumnIndex(headers, LOGO_MARCA_ALIASES);

  const updates = [];
  let nextFreeCol = headers.length;
  if (iMarca < 0) {
    iMarca = nextFreeCol++;
    updates.push({ range: `${tab}!${columnIndexToLetter(iMarca)}1`, values: [[MARCA_HEADER]] });
  }
  if (iLogo < 0) {
    iLogo = nextFreeCol++;
    updates.push({ range: `${tab}!${columnIndexToLetter(iLogo)}1`, values: [[LOGO_MARCA_HEADER]] });
  }

  const targetMarca = String(marca || "").trim().toLowerCase();
  const rowIndex = rows.findIndex((row, i) => i > 0 && String(row[iMarca] || "").trim().toLowerCase() === targetMarca);
  // Si la marca ya tiene fila en la tabla, se actualiza ahí; si no, se
  // agrega una fila nueva después de la última fila usada del Sheet
  // (así nunca choca con tu lista de Clave/Valor, aunque esté en otras
  // columnas).
  const targetRow = rowIndex >= 0 ? rowIndex + 1 : rows.length + 1;
  updates.push({ range: `${tab}!${columnIndexToLetter(iMarca)}${targetRow}`, values: [[marca]] });
  updates.push({ range: `${tab}!${columnIndexToLetter(iLogo)}${targetRow}`, values: [[logoUrl]] });

  try {
    const batchRes = await fetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ valueInputOption: "RAW", data: updates }),
    });
    const batchData = await batchRes.json();
    if (!batchRes.ok) {
      console.error("Error guardando el logo de marca:", batchData);
      return { ok: false, error: "Google rechazó la escritura -- revisa que el Sheet esté compartido con la cuenta de servicio." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Error de red guardando el logo de marca:", err);
    return { ok: false, error: "No se pudo conectar con Google Sheets. Intenta de nuevo." };
  }
}

module.exports = { applySheetStockDelta, deltaFromItems, appendStockProduct, updateBrandLogo };
