// Lee el catálogo publicado (CSV de Google Sheets) desde el servidor, con
// una copia en memoria de unos minutos para no pedirlo a Google en cada
// visita. Lo usan el mapa del sitio, las páginas de producto y la versión
// ligera del catálogo que baja la tienda.

const { parseCSV } = require("./pricing.js");

const CATALOG_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=114583060&single=true&output=csv";
const TTL_MS = 5 * 60 * 1000;

let cache = null; // { at, text, headers, rows }

async function loadCatalog() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
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

/* "SI"/vacío = disponible, igual que la tienda. */
function isAvailable(row) {
  const v = (row.Disponible || "").toLowerCase();
  return v === "" || ["si", "sí", "yes", "true", "1", "disponible"].includes(v);
}

module.exports = { loadCatalog, isAvailable, CATALOG_CSV_URL };
