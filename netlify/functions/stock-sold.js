// Devuelve cuántas piezas ya se vendieron de cada SKU en stock (pagos ya
// confirmados), para que el sitio le reste ese número a "Piezas
// Disponibles" de la hoja de Stock y no se sobrevenda.

const { getEffectiveSoldMap, getReservedTotals } = require("./lib/blob-store.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Vendido + apartado por pedidos que Mae todavía no confirma: la tienda
    // le resta las dos cosas a las piezas de la hoja.
    const sold = await getEffectiveSoldMap();
    const apartado = await getReservedTotals().catch(() => ({}));
    for (const [sku, qty] of Object.entries(apartado)) sold[sku] = (sold[sku] || 0) + qty;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ sold }),
    };
  } catch (err) {
    console.error("Error leyendo el stock vendido:", err);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ sold: {} }),
    };
  }
};
