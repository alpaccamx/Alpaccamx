// Agrega un producto nuevo a tu pestaña de Stock directo desde
// /admin.html -- sin tener que abrir ni editar tu Google Sheet a mano.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON):
//   { sku (opcional), nombre, marca, categoria, descripcion,
//     piezas, precio, precioTarjeta (opcional), peso (opcional), imagen (opcional) }
//
// Si no mandas "sku", se genera uno solo (tipo "STOCK-A1B2C3D4") y se
// regresa en la respuesta para que sepas cuál quedó.
//
// Requiere que ya hayas configurado Google Sheets (ver README sección 6)
// -- sin eso, esta función regresa un error claro pidiendo que lo
// configures, en vez de fallar en silencio como el resto de los avisos
// automáticos (aquí SÍ hace falta, porque es la única forma de agregar
// el producto).

const { appendStockProduct } = require("./lib/google-sheets.js");

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

  const nombre = String(body.nombre || "").trim();
  const piezas = Number(body.piezas);
  const precio = Number(body.precio);

  if (!nombre) return jsonResponse(400, { error: "Falta el nombre del producto." });
  if (!piezas || piezas <= 0) return jsonResponse(400, { error: "Las piezas deben ser un número mayor a 0." });
  if (!precio || precio <= 0) return jsonResponse(400, { error: "El precio debe ser un número mayor a 0." });

  const fields = {
    sku: String(body.sku || "").trim(),
    nombre,
    piezas,
    precio,
    precioTarjeta: body.precioTarjeta ? Number(body.precioTarjeta) : "",
    marca: String(body.marca || "").trim(),
    categoria: String(body.categoria || "").trim(),
    descripcion: String(body.descripcion || "").trim(),
    peso: body.peso ? Number(body.peso) : "",
    imagen: String(body.imagen || "").trim(),
  };

  const result = await appendStockProduct(fields);
  if (!result.ok) {
    return jsonResponse(502, { error: result.error });
  }
  return jsonResponse(200, { ok: true, sku: result.sku });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
