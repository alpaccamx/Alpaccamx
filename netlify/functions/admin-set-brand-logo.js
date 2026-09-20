// Guarda el link del logo de una marca directo en tu Google Sheet, en
// una mini tabla "Marca"/"Logo" dentro de la pestaña Config -- para no
// tener que abrir el Sheet a mano cada vez.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { marca, logoUrl }
//
// Requiere que ya hayas configurado Google Sheets (ver README sección 6)
// -- sin eso, esta función regresa un error claro pidiendo que lo
// configures.

const { updateBrandLogo } = require("./lib/google-sheets.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  const providedKey = event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"]);
  if (providedKey !== adminKey) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    return jsonResponse(500, {
      error: "Falta configurar Google Sheets en Netlify (GOOGLE_SHEETS_SPREADSHEET_ID) -- ver README sección 6.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const marca = String(body.marca || "").trim();
  const logoUrl = String(body.logoUrl || "").trim();
  if (!marca) return jsonResponse(400, { error: "Falta la marca." });
  if (!logoUrl) return jsonResponse(400, { error: "Falta el link del logo." });

  const result = await updateBrandLogo(marca, logoUrl);
  if (!result.ok) {
    return jsonResponse(502, { error: result.error });
  }
  return jsonResponse(200, { ok: true });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
