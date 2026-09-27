// Regresa tus datos de depósito/transferencia (Banco, Titular, CLABE,
// Cuenta, Referencia) para mostrarlos en el carrito -- ver
// lib/google-sheets.js (readBankDetailsTab) para por qué esto ya no se
// lee del CSV público de "Config": así tu CLABE/cuenta no quedan como un
// link abierto que cualquiera puede ver sin pasar por tu sitio.
//
// A propósito ES pública (sin "x-admin-key") -- cualquier clienta que
// llega al carrito y elige pagar por transferencia necesita ver estos
// datos, igual que antes cuando se leían del CSV público.
//
// Requiere GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY /
// GOOGLE_SHEETS_SPREADSHEET_ID / GOOGLE_SHEETS_BANK_TAB (ver README
// sección 6). Si falta cualquiera de esas, o falla la lectura, regresa
// un objeto vacío -- nunca truena, el carrito simplemente no muestra el
// bloque de transferencia.

const { readBankDetailsTab } = require("./lib/google-sheets.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let details = {};
  try {
    details = await readBankDetailsTab();
  } catch (err) {
    console.error("Error leyendo los datos de depósito:", err);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(details),
  };
};
