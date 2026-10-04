// Lista todo tu inventario de la pestaña de Stock para mostrarlo en una
// tabla editable en /admin.html -- así puedes ver, modificar, sumar/restar
// piezas y quitar productos ya publicados sin tener que abrir el Excel.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// GET /.netlify/functions/admin-list-stock

const { listStockProducts } = require("./lib/google-sheets.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
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

  const result = await listStockProducts();
  if (!result.ok) {
    return jsonResponse(502, { error: result.error });
  }
  return jsonResponse(200, { products: result.products });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(obj),
  };
}
