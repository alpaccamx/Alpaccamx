// Devuelve cuántas piezas ya se vendieron de cada SKU en stock (pagos ya
// confirmados), para que el sitio le reste ese número a "Piezas
// Disponibles" de la hoja de Stock y no se sobrevenda.

const { getSoldMap } = require("./lib/blob-store.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const sold = await getSoldMap();
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
