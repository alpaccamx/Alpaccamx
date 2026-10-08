// Quita un producto de tu pestaña de Stock (deja sus columnas vacías,
// no borra ni recorre filas -- ver deleteStockProduct en
// lib/google-sheets.js) sin tener que abrir el Excel.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { sku }

const { deleteStockProduct } = require("./lib/google-sheets.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const auth = checkAdminKey(event);
  if (!auth.configured) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  if (!auth.valid) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID || !process.env.GOOGLE_SHEETS_STOCK_TAB) {
    return jsonResponse(500, {
      error: "Falta configurar Google Sheets en Netlify (GOOGLE_SHEETS_SPREADSHEET_ID / GOOGLE_SHEETS_STOCK_TAB) -- ver README sección 6.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const sku = String(body.sku || "").trim();
  if (!sku) return jsonResponse(400, { error: "Falta el SKU del producto a quitar." });

  const result = await deleteStockProduct(sku);
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
