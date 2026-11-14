// Cambia un precio de la pestaña de tarifas de envío nacional del Sheet
// (la que publica CONFIG.SHIPPING_NACIONAL_CSV_URL, gid 291380963) en
// todas las filas donde está, ej. 250 → 260. Solo por API (no se ve en
// /admin.html). La columna de tarjeta solo se toca si es un número
// escrito a mano (si es fórmula se recalcula sola).
//
// Requiere "x-admin-key". Body:
//   { de: 250, a: 260, tarjetaDe?: 265, tarjetaA?: 276, esperado?: 160, probar?: true }
// "esperado": si el número de filas encontradas no coincide, no cambia nada.
// "probar": solo cuenta, no escribe.

const { checkAdminKey } = require("./lib/admin-auth.js");
const { getAccessToken } = require("./lib/google-sheets.js");

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const NACIONAL_GID = 291380963;

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

function columnLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) { letter = String.fromCharCode((n % 26) + 65) + letter; n = Math.floor(n / 26) - 1; }
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
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (err) { return json(400, { error: "JSON inválido." }); }
  const de = Number(body.de), a = Number(body.a);
  if (!(de > 0) || !(a > 0)) return json(400, { error: "Faltan de / a." });
  const tDe = Number(body.tarjetaDe) || 0, tA = Number(body.tarjetaA) || 0;

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const token = await getAccessToken();
  if (!token || !spreadsheetId) return json(500, { error: "No se pudo autenticar con Google Sheets." });

  try {
    const meta = await api(token, `${spreadsheetId}?fields=sheets.properties`);
    const sheet = (meta.sheets || []).find((s) => s.properties.sheetId === NACIONAL_GID);
    if (!sheet) return json(500, { error: "No encontré la pestaña de tarifas nacionales." });
    const quoted = `'${sheet.properties.title.replace(/'/g, "''")}'`;
    const data = await api(token, `${spreadsheetId}/values/${encodeURIComponent(`${quoted}!A1:Z2000`)}?valueRenderOption=FORMULA`);
    const rows = data.values || [];
    const header = (rows[0] || []).map((h) => String(h).trim().toLowerCase());
    const iCosto = header.findIndex((h) => h.startsWith("costo") && !h.includes("tarjeta"));
    const iTarjeta = header.findIndex((h) => h.startsWith("costo") && h.includes("tarjeta"));
    if (iCosto < 0) return json(500, { error: "No encontré la columna de costo." });

    const cambios = [];
    let tarjetaFormula = 0;
    for (let r = 1; r < rows.length; r++) {
      const fila = rows[r] || [];
      if (Number(fila[iCosto]) !== de || String(fila[iCosto]).startsWith("=")) continue;
      cambios.push({ range: `${quoted}!${columnLetter(iCosto)}${r + 1}`, values: [[a]] });
      if (iTarjeta >= 0 && tDe && tA) {
        const v = fila[iTarjeta];
        if (typeof v === "string" && v.startsWith("=")) tarjetaFormula++;
        else if (Number(v) === tDe) cambios.push({ range: `${quoted}!${columnLetter(iTarjeta)}${r + 1}`, values: [[tA]] });
      }
    }
    const filas = cambios.filter((c) => c.range.includes(`!${columnLetter(iCosto)}`)).length;
    const resumen = { pestana: sheet.properties.title, filas, celdasTarjeta: cambios.length - filas, tarjetaFormula };
    if (body.esperado && Number(body.esperado) !== filas) return json(409, { error: "El número de filas no coincide; no se cambió nada.", ...resumen });
    if (body.probar || !cambios.length) return json(200, { probado: true, ...resumen });

    await api(token, `${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: cambios }),
    });
    console.log(`Tarifas nacionales: ${filas} filas ${de} → ${a}`);
    return json(200, { cambiado: true, ...resumen });
  } catch (err) {
    return json(502, { error: err.message });
  }
};
