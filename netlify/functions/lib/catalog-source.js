// Lee el catálogo publicado (CSV de Google Sheets) desde el servidor, con
// una copia en memoria de unos minutos para no pedirlo a Google en cada
// visita. Lo usan el mapa del sitio, las páginas de producto y la versión
// ligera del catálogo que baja la tienda.

const { parseCSV } = require("./pricing.js");

const CATALOG_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=114583060&single=true&output=csv";
const STOCK_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=2144351337&single=true&output=csv";
const TTL_MS = 5 * 60 * 1000;

let cache = null; // { at, text, headers, rows }

async function loadCatalog({ maxAgeMs = TTL_MS } = {}) {
  if (cache && Date.now() - cache.at < maxAgeMs) return cache;
  const res = await fetch(CATALOG_CSV_URL, { redirect: "follow" });
  if (!res.ok) {
    if (cache) return cache; // mejor una copia de hace rato que nada
    throw new Error(`Google Sheets respondió ${res.status}`);
  }
  const text = await res.text();
  const table = parseCSV(text);
  const headers = (table[0] || []).map((h) => h.trim());
  const rows = table.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = (r[i] || "").trim(); });
    return o;
  });
  cache = { at: Date.now(), text, headers, table, rows };
  return cache;
}

/* Tabla de "Stock en México". Los productos que solo existen ahí (SKU
   STOCK-...) se regresan con las mismas columnas que el catálogo para que
   la ficha de producto (?p=SKU) también los encuentre. */
let stockCache = null; // { at, rows }

async function loadStock({ maxAgeMs = TTL_MS } = {}) {
  if (stockCache && Date.now() - stockCache.at < maxAgeMs) return stockCache;
  const res = await fetch(STOCK_CSV_URL, { redirect: "follow" });
  if (!res.ok) {
    if (stockCache) return stockCache;
    throw new Error(`Google Sheets (stock) respondió ${res.status}`);
  }
  const table = parseCSV(await res.text());
  const headers = (table[0] || []).map((h) => h.trim().toLowerCase());
  const col = (...names) => headers.findIndex((h) => names.some((n) => h.startsWith(n)));
  const iSku = col("sku"), iPiezas = col("piezas"), iPrecio = col("precio mxn"), iNombre = col("nombre"),
    iMarca = col("marca"), iImagen = col("imagen"), iDesc = col("descripcion", "descripción"), iCat = col("categoria", "categoría");
  const get = (r, i) => (i >= 0 ? (r[i] || "").trim() : "");
  const rows = table.slice(1).filter((r) => get(r, iSku)).map((r) => ({
    SKU: get(r, iSku),
    Nombre: get(r, iNombre),
    Marca: get(r, iMarca),
    Imagen: get(r, iImagen),
    Descripcion: get(r, iDesc),
    Categoria: get(r, iCat),
    Precio: get(r, iPrecio),
    Disponible: (parseInt(get(r, iPiezas).replace(/[^0-9]/g, ""), 10) || 0) > 0 ? "SI" : "NO",
  }));
  stockCache = { at: Date.now(), rows };
  return stockCache;
}

/* "SI"/vacío = disponible, igual que la tienda. */
function isAvailable(row) {
  const v = (row.Disponible || "").toLowerCase();
  return v === "" || ["si", "sí", "yes", "true", "1", "disponible", "preorden"].includes(v);
}

module.exports = { loadCatalog, loadStock, isAvailable, CATALOG_CSV_URL };
