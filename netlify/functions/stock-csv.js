// La hoja "Stock en México" servida desde alpacca.mx/stock.csv (ver
// netlify.toml), igual que catalogo.csv: así la tienda no depende de que
// el celular de la clienta alcance a bajar el CSV de Google Sheets (a veces
// tarda o falla y la sección de Stock no aparecía). Se guarda 30 segundos
// en la CDN de Netlify; si falla, la tienda cae al CSV de Google directo.

const STOCK_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKHS0v5DGhx8RjW3XOcBxJL4RzNtVof_psSTBs6fZrScYofhRU5nTcEYYBS3u0V-EzMJXR2L5SZcyE/pub?gid=2144351337&single=true&output=csv";

let cache = null; // { at, text }

exports.handler = async () => {
  try {
    if (!cache || Date.now() - cache.at > 20 * 1000) {
      const res = await fetch(STOCK_CSV_URL, { redirect: "follow" });
      if (!res.ok) throw new Error(`Google Sheets respondió ${res.status}`);
      cache = { at: Date.now(), text: await res.text() };
    }
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
      body: cache.text,
    };
  } catch (err) {
    console.error("stock-csv:", err);
    if (cache) return { statusCode: 200, headers: { "Content-Type": "text/csv; charset=utf-8" }, body: cache.text };
    return { statusCode: 502, body: "No se pudo leer el stock." };
  }
};
