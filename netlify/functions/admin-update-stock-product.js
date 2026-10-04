// Edita un producto que ya está en tu pestaña de Stock (nombre, marca,
// precio, piezas -- para sumar o restar inventario --, categoría, peso,
// foto, descripción), sin tener que abrir el Excel.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { sku, ...solo los campos que cambiaron }
//   piezas: el número NUEVO ya calculado (si quieres sumar 5, manda
//   piezas: piezasActuales + 5 -- /admin.html hace esta cuenta por ti).

const { updateStockProductFields } = require("./lib/google-sheets.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

const EDITABLE_FIELDS = ["piezas", "precio", "precioTarjeta", "nombre", "marca", "imagen", "descripcion", "categoria", "peso"];

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
  if (!sku) return jsonResponse(400, { error: "Falta el SKU del producto a editar." });

  const fields = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] === undefined || body[key] === null) continue;
    if (key === "piezas" || key === "precio" || key === "precioTarjeta" || key === "peso") {
      const num = Number(body[key]);
      if (Number.isNaN(num)) return jsonResponse(400, { error: `El campo "${key}" debe ser un número.` });
      if ((key === "piezas" || key === "precio") && num < 0) {
        return jsonResponse(400, { error: `El campo "${key}" no puede ser negativo.` });
      }
      fields[key] = num;
    } else {
      fields[key] = String(body[key]).trim();
    }
  }
  if (!Object.keys(fields).length) return jsonResponse(400, { error: "No mandaste ningún cambio." });

  const result = await updateStockProductFields(sku, fields);
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
