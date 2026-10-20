// Editor del catálogo y de los ajustes (pestaña Config) desde /admin.html,
// sin abrir el Google Sheet. Lee y escribe directo con la cuenta de
// servicio (lo publicado como CSV tarda unos minutos en actualizarse,
// esto no).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
//   GET ?sku=XXX     -> { row, fields: { Encabezado: { value, formula } } }
//                       el renglón actual de ese producto
//   GET ?config=1    -> { config: [{ key, value, formula }] }
//   POST { sku, fields: { "Precio USD": 17.5, Disponible: "NO", ... } }
//                    -> cambia solo esas celdas de ese producto
//   POST { config: [{ key: "Tipo de cambio", value: 19.8 }] }
//                    -> cambia el valor (columna B) de esas claves
//
// Por seguridad: solo se pueden tocar las columnas de EDITABLE, nunca una
// celda que tiene fórmula (ej. "Precio", que se calcula solo a partir de
// "Precio USD"), y los valores se guardan tal cual (RAW) -- un texto que
// empiece con "=" no se vuelve fórmula.

const { checkAdminKey } = require("./lib/admin-auth.js");
const { getAccessToken } = require("./lib/google-sheets.js");

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const CATALOG_GID = 114583060;
const CONFIG_GID = 442348645;

const EDITABLE = [
  "Nombre", "Categoria", "Marca", "Precio USD", "Costo MXN", "Precio", "Precio Tarjeta", "Peso",
  "Presentacion", "Imagen", "Descripcion", "Disponible", "Destacado", "TipoPiel", "País", "Capacidad",
];
const NUMERIC = ["precio usd", "costo mxn", "precio", "precio tarjeta", "peso"];

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

async function tabName(token, spreadsheetId, gid) {
  const meta = await api(token, `${spreadsheetId}?fields=sheets.properties`);
  const sheet = (meta.sheets || []).find((s) => s.properties.sheetId === gid);
  if (!sheet) return null;
  return `'${sheet.properties.title.replace(/'/g, "''")}'`;
}

const getRange = (token, id, range, render) =>
  api(token, `${id}/values/${encodeURIComponent(range)}?valueRenderOption=${render}`).then((d) => d.values || []);

/* Renglón (base 1) del SKU, o un error si no existe o está repetido. */
async function findSkuRow(token, id, quoted, sku) {
  const header = ((await getRange(token, id, `${quoted}!1:1`, "FORMATTED_VALUE"))[0] || []).map((h) => String(h || "").trim());
  const iSku = header.findIndex((h) => h.toLowerCase() === "sku");
  if (iSku < 0) return { error: 'No encontré la columna "SKU".' };
  const col = columnLetter(iSku);
  const skus = (await getRange(token, id, `${quoted}!${col}:${col}`, "FORMATTED_VALUE")).map((r) => String(r[0] || "").trim());
  const rows = [];
  skus.forEach((s, i) => { if (i > 0 && s === sku) rows.push(i + 1); });
  if (!rows.length) return { error: "No encontré ese SKU en el catálogo." };
  if (rows.length > 1) return { error: "Ese SKU está repetido en el catálogo; edítalo en el Sheet." };
  return { header, row: rows[0] };
}

function cellValue(header, raw) {
  const isNum = NUMERIC.includes(header.toLowerCase());
  if (raw === "" || raw == null) return "";
  if (isNum) {
    const n = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) throw new Error(`"${header}" debe ser un número.`);
    return n;
  }
  const s = String(raw).slice(0, 5000);
  if (header === "Disponible" && !["SI", "NO", "PREORDEN"].includes(s.toUpperCase())) throw new Error('"Disponible" debe ser SI, NO o PREORDEN.');
  return header === "Disponible" ? s.toUpperCase() : s;
}

async function getProduct(token, id, sku) {
  const quoted = await tabName(token, id, CATALOG_GID);
  if (!quoted) return jsonResponse(500, { error: "No encontré la pestaña del catálogo." });
  const found = await findSkuRow(token, id, quoted, sku);
  if (found.error) return jsonResponse(404, { error: found.error });
  const range = `${quoted}!A${found.row}:${columnLetter(found.header.length - 1)}${found.row}`;
  const [vals, forms] = await Promise.all([
    getRange(token, id, range, "FORMATTED_VALUE"),
    getRange(token, id, range, "FORMULA"),
  ]);
  const fields = {};
  found.header.forEach((h, i) => {
    if (!h) return;
    const f = String((forms[0] || [])[i] ?? "");
    fields[h] = { value: (vals[0] || [])[i] ?? "", formula: f.startsWith("=") };
  });
  return jsonResponse(200, { row: found.row, fields, editable: EDITABLE });
}

async function updateProduct(token, id, sku, input) {
  const quoted = await tabName(token, id, CATALOG_GID);
  if (!quoted) return jsonResponse(500, { error: "No encontré la pestaña del catálogo." });
  const found = await findSkuRow(token, id, quoted, sku);
  if (found.error) return jsonResponse(404, { error: found.error });
  const range = `${quoted}!A${found.row}:${columnLetter(found.header.length - 1)}${found.row}`;
  const forms = (await getRange(token, id, range, "FORMULA"))[0] || [];
  const data = [];
  for (const [key, raw] of Object.entries(input || {})) {
    const header = EDITABLE.find((h) => h.toLowerCase() === String(key).trim().toLowerCase());
    if (!header) return jsonResponse(400, { error: `La columna "${key}" no se puede editar desde aquí.` });
    const col = found.header.findIndex((h) => h.toLowerCase() === header.toLowerCase());
    if (col < 0) return jsonResponse(400, { error: `El catálogo no tiene la columna "${header}".` });
    if (String(forms[col] ?? "").startsWith("=")) {
      return jsonResponse(400, { error: `"${header}" se calcula solo (tiene fórmula); cambia "Precio USD" en su lugar.` });
    }
    let value;
    try {
      value = cellValue(header, raw);
    } catch (err) {
      return jsonResponse(400, { error: err.message });
    }
    data.push({ range: `${quoted}!${columnLetter(col)}${found.row}`, values: [[value]] });
  }
  if (!data.length) return jsonResponse(400, { error: "No hay cambios." });
  await api(token, `${id}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
  console.log(`Catálogo: ${data.length} celdas de ${sku} editadas desde el admin`);
  return getProduct(token, id, sku);
}

async function readConfig(token, id) {
  const quoted = await tabName(token, id, CONFIG_GID);
  if (!quoted) return { error: "No encontré la pestaña Config." };
  const [vals, forms] = await Promise.all([
    getRange(token, id, `${quoted}!A:B`, "FORMATTED_VALUE"),
    getRange(token, id, `${quoted}!A:B`, "FORMULA"),
  ]);
  const config = [];
  vals.forEach((r, i) => {
    const key = String(r[0] || "").trim();
    if (!key || i === 0) return;
    config.push({ key, value: r[1] ?? "", formula: String((forms[i] || [])[1] ?? "").startsWith("="), row: i + 1 });
  });
  for (const key of CREATABLE_CONFIG) {
    if (!config.some((c) => c.key === key)) config.push({ key, value: "", formula: false, row: 0, nuevo: true });
  }
  return { quoted, config };
}

// Ajustes que el admin puede crear si todavía no están en Config (se
// agregan al final, así no se mueve ninguna fórmula que use celdas de arriba).
const CREATABLE_CONFIG = ["Dólar que pagas a ABW", "Pesos por 1 won", "Pesos por 1 euro", "Pesos por 1 yen", "Pesos por 1 yuan"];

async function updateConfig(token, id, changes) {
  const cur = await readConfig(token, id);
  if (cur.error) return jsonResponse(500, { error: cur.error });
  const data = [];
  let nextRow = Math.max(1, ...cur.config.map((c) => c.row)) + 1;
  for (const ch of changes) {
    let entry = cur.config.find((c) => c.key === String(ch.key || "").trim() && !c.nuevo);
    if (!entry && CREATABLE_CONFIG.includes(String(ch.key || "").trim())) {
      entry = { key: String(ch.key).trim(), row: nextRow++, formula: false };
      data.push({ range: `${cur.quoted}!A${entry.row}`, values: [[entry.key]] });
    }
    if (!entry) return jsonResponse(400, { error: `No existe el ajuste "${ch.key}".` });
    if (entry.formula) return jsonResponse(400, { error: `"${entry.key}" tiene fórmula; cámbialo en el Sheet.` });
    const n = Number(String(ch.value).replace(",", "."));
    if (String(ch.value).trim() === "" || !Number.isFinite(n) || n < 0 || n > 100000) {
      return jsonResponse(400, { error: `"${entry.key}" debe ser un número.` });
    }
    data.push({ range: `${cur.quoted}!B${entry.row}`, values: [[n]] });
  }
  if (!data.length) return jsonResponse(400, { error: "No hay cambios." });
  await api(token, `${id}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
  console.log(`Config: ${data.length} ajustes editados desde el admin`);
  const after = await readConfig(token, id);
  return jsonResponse(200, { config: after.config.map(({ row, ...c }) => c) });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const auth = checkAdminKey(event);
  if (!auth.configured) return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return jsonResponse(401, { error: "Clave de administrador incorrecta." });

  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) return jsonResponse(500, { error: "Falta GOOGLE_SHEETS_SPREADSHEET_ID en Netlify." });

  let body = {};
  if (event.httpMethod === "POST") {
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { error: "JSON inválido." });
    }
  }
  const q = event.queryStringParameters || {};

  const token = await getAccessToken();
  if (!token) return jsonResponse(500, { error: "No se pudo autenticar con Google Sheets." });

  try {
    if (event.httpMethod === "GET") {
      if (q.config) {
        const cur = await readConfig(token, id);
        if (cur.error) return jsonResponse(500, { error: cur.error });
        return jsonResponse(200, { config: cur.config.map(({ row, ...c }) => c) });
      }
      const sku = String(q.sku || "").trim();
      if (!sku) return jsonResponse(400, { error: "Falta sku." });
      return await getProduct(token, id, sku);
    }
    if (Array.isArray(body.config)) {
      if (!body.config.length || body.config.length > 30) return jsonResponse(400, { error: "Entre 1 y 30 ajustes." });
      return await updateConfig(token, id, body.config);
    }
    const sku = String(body.sku || "").trim();
    if (!sku) return jsonResponse(400, { error: "Falta sku." });
    return await updateProduct(token, id, sku, body.fields);
  } catch (err) {
    console.error("Error en el editor del catálogo:", err);
    return jsonResponse(502, { error: `Google Sheets: ${err.message}` });
  }
};
