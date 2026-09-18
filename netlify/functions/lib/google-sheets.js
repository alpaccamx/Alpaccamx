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

const jwt = require("jsonwebtoken");

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SKU_ALIASES = ["sku", "codigo", "código"];
const PIEZAS_ALIASES = ["piezas disponibles", "piezas", "cantidad", "stock"];

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

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tab = process.env.GOOGLE_SHEETS_STOCK_TAB;
  if (!spreadsheetId || !tab) return;

  const token = await getAccessToken();
  if (!token) return;

  try {
    const range = `${tab}!A:Z`;
    const res = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Error leyendo la pestaña de Stock:", data);
      return;
    }

    const rows = data.values || [];
    if (!rows.length) return;
    const headers = rows[0];
    const iSku = findColumnIndex(headers, SKU_ALIASES);
    const iPiezas = findColumnIndex(headers, PIEZAS_ALIASES);
    if (iSku < 0 || iPiezas < 0) {
      console.error('No se encontraron las columnas "SKU" / "Piezas Disponibles" en la pestaña de Stock.');
      return;
    }

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

module.exports = { applySheetStockDelta, deltaFromItems };
