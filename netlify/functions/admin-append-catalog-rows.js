// Agrega renglones nuevos al final de la pestaña del CATÁLOGO principal
// (la misma que publica CONFIG.GOOGLE_SHEET_CSV_URL en app.js), con la
// misma cuenta de servicio que ya escribe en la pestaña de Stock. Sirve
// para importar productos nuevos (ej. un catálogo de marca exportado de
// Asian Beauty Wholesale) sin tener que pegarlos a mano.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body (JSON):
//   { rows: [ { "Nombre": "...", "SKU": "...", "Precio": "=CEILING(...)", ... } ],
//     dryRun: true|false }
// Las llaves de cada renglón son los encabezados de la pestaña (sin
// importar mayúsculas). Columnas que no vengan se dejan vacías; llaves
// que no existan en la pestaña se reportan y se ignoran. Los valores que
// empiezan con "=" se guardan como fórmula (USER_ENTERED).
//
// Nunca duplica: los renglones cuyo SKU ya existe en la pestaña se
// saltan. Con dryRun: true solo reporta qué haría, sin escribir.
//
// Se escribe en columnas EXACTAS (A..última) justo debajo del último
// renglón, en vez de usar "append": el append de Google detecta "la
// tabla" por su cuenta y llegó a pegar los renglones corridos varias
// columnas a la derecha.
//
// Reparación: { rows, startRow: N, clearToColumn: "V" } reescribe esos
// renglones empezando en el renglón N (y borra hasta la columna indicada),
// solo si la columna A de esos renglones está vacía -- nunca pisa
// productos existentes.
// Después de escribir, vuelve a leer los renglones agregados y regresa
// sus valores calculados (para verificar que las fórmulas funcionaron).

const { checkAdminKey } = require("./lib/admin-auth.js");
const { getAccessToken } = require("./lib/google-sheets.js");

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
// gid de la pestaña del catálogo (el mismo de CONFIG.GOOGLE_SHEET_CSV_URL).
const CATALOG_GID = 114583060;
const MAX_ROWS = 500;

function jsonResponse(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function columnLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

async function api(token, path, options = {}) {
  const res = await fetch(`${SHEETS_API}/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || `HTTP ${res.status}`);
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const auth = checkAdminKey(event);
  if (!auth.configured) return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return jsonResponse(401, { error: "Clave de administrador incorrecta." });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return jsonResponse(500, { error: "Falta GOOGLE_SHEETS_SPREADSHEET_ID en Netlify." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "JSON inválido." });
  }
  const input = Array.isArray(body.rows) ? body.rows : [];
  if (!input.length) return jsonResponse(400, { error: "No hay renglones para agregar." });
  if (input.length > MAX_ROWS) return jsonResponse(400, { error: `Máximo ${MAX_ROWS} renglones por llamada.` });

  const token = await getAccessToken();
  if (!token) return jsonResponse(500, { error: "No se pudo autenticar con Google Sheets." });

  try {
    // Nombre de la pestaña del catálogo a partir de su gid.
    const meta = await api(token, `${spreadsheetId}?fields=sheets.properties`);
    const sheet = (meta.sheets || []).find((s) => s.properties.sheetId === CATALOG_GID);
    if (!sheet) return jsonResponse(500, { error: "No encontré la pestaña del catálogo en el Sheet." });
    const tab = sheet.properties.title;
    const quoted = `'${tab.replace(/'/g, "''")}'`;

    const current = await api(token, `${spreadsheetId}/values/${encodeURIComponent(`${quoted}!A:AZ`)}`);
    const rows = current.values || [];
    const headers = (rows[0] || []).map((h) => String(h || "").trim());
    const lower = headers.map((h) => h.toLowerCase());
    const iSku = lower.indexOf("sku");
    if (iSku < 0) return jsonResponse(500, { error: 'No encontré la columna "SKU" en el catálogo.' });

    const startRow = Number(body.startRow) || 0;
    const existing = startRow
      ? new Set()
      : new Set(rows.slice(1).map((r) => String(r[iSku] || "").trim()).filter(Boolean));
    const unknownKeys = new Set();
    const toAppend = [];
    const skipped = [];
    const seen = new Set();
    for (const obj of input) {
      const sku = String(obj.SKU ?? obj.sku ?? "").trim();
      if (!sku) {
        skipped.push({ sku: "", reason: "sin SKU" });
        continue;
      }
      if (existing.has(sku) || seen.has(sku)) {
        skipped.push({ sku, reason: "ya existe" });
        continue;
      }
      seen.add(sku);
      const row = new Array(headers.length).fill("");
      for (const [key, value] of Object.entries(obj)) {
        const i = lower.indexOf(String(key).trim().toLowerCase());
        if (i < 0) {
          unknownKeys.add(key);
          continue;
        }
        row[i] = value == null ? "" : value;
      }
      toAppend.push(row);
    }

    const summary = {
      tab,
      headers,
      existingRows: rows.length - 1,
      toAppend: toAppend.length,
      skipped,
      unknownKeys: [...unknownKeys],
    };
    if (body.dryRun || !toAppend.length) return jsonResponse(200, { dryRun: !!body.dryRun, ...summary });

    let firstRow;
    let width = headers.length;
    if (startRow) {
      if (startRow < 2) return jsonResponse(400, { error: "startRow inválido." });
      const endRow = startRow + toAppend.length - 1;
      const colA = await api(token, `${spreadsheetId}/values/${encodeURIComponent(`${quoted}!A${startRow}:A${endRow}`)}`);
      if ((colA.values || []).some((r) => String(r[0] || "").trim())) {
        return jsonResponse(409, { error: "Esos renglones ya tienen nombre en la columna A; no se sobrescriben." });
      }
      const clearTo = String(body.clearToColumn || "").toUpperCase();
      if (/^[A-Z]{1,2}$/.test(clearTo)) {
        const toIndex = clearTo.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
        width = Math.max(width, toIndex + 1);
      }
      firstRow = startRow;
    } else {
      // Debajo del último renglón con datos; si la hoja no tiene renglones
      // vacíos suficientes, se agregan.
      firstRow = rows.length + 1;
      const needed = firstRow + toAppend.length - 1 - sheet.properties.gridProperties.rowCount;
      if (needed > 0) {
        await api(token, `${spreadsheetId}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({
            requests: [{ appendDimension: { sheetId: CATALOG_GID, dimension: "ROWS", length: needed } }],
          }),
        });
      }
    }
    const values = toAppend.map((r) => [...r, ...new Array(Math.max(0, width - r.length)).fill("")]);
    const range = `${quoted}!A${firstRow}:${columnLetter(width - 1)}${firstRow + values.length - 1}`;
    const written = await api(
      token,
      `${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { method: "PUT", body: JSON.stringify({ values }) }
    );
    const updatedRange = written.updatedRange;

    // Vuelve a leer lo que se agregó, ya calculado, para verificar.
    let check = null;
    if (updatedRange) {
      const back = await api(
        token,
        `${spreadsheetId}/values/${encodeURIComponent(updatedRange)}?valueRenderOption=UNFORMATTED_VALUE`
      );
      check = (back.values || []).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
    }
    console.log(`Catálogo: ${toAppend.length} renglones agregados en ${updatedRange}`);
    return jsonResponse(200, { dryRun: false, ...summary, updatedRange, check });
  } catch (err) {
    console.error("Error agregando renglones al catálogo:", err);
    return jsonResponse(502, { error: `Google Sheets: ${err.message}` });
  }
};
