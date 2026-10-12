// Versión ligera del catálogo para la tienda (alpacca.mx/catalogo.csv, ver
// netlify.toml): el mismo CSV del Sheet, pero sin las columnas que la
// tienda no usa al cargar (Descripcion, que se pide aparte al abrir la
// ficha de un producto) ni las del costo (Precio USD, Costo MXN). Se sirve
// desde alpacca.mx y se guarda un minuto en la CDN de Netlify, así carga
// más rápido que pedirlo directo a Google en cada visita.

const { loadCatalog } = require("./lib/catalog-source.js");

const DROP = new Set(["descripcion", "descripción", "precio usd", "costo mxn"]);

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

exports.handler = async () => {
  try {
    const { table } = await loadCatalog({ maxAgeMs: 30 * 1000 });
    const header = (table[0] || []).map((h) => h.trim());
    const keep = header.map((h, i) => (DROP.has(h.toLowerCase()) ? -1 : i)).filter((i) => i >= 0);
    const body = table.map((r) => keep.map((i) => csvCell(r[i])).join(",")).join("\n");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
      body,
    };
  } catch (err) {
    console.error("catalog-light: no se pudo leer el catálogo", err);
    return { statusCode: 502, headers: { "Cache-Control": "no-store" }, body: "" };
  }
};
