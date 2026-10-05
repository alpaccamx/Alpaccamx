// Consulta el estatus de una guía de envío usando la API de Shippo --
// sirve para SABER si un pedido ya se entregó (ver
// check-deliveries-scheduled.js), sin importar con qué paquetería o
// proveedor se haya generado la guía (Envíos Perros, Skydropx, o a mano
// en /admin.html). No se usa para generar guías, eso lo siguen haciendo
// lib/enviosperros.js y lib/skydropx.js.
//
// Variable de entorno necesaria: SHIPPO_API_KEY (Settings → API en tu
// cuenta de Shippo -- ver README sección 4).
//
// Si falta la variable, o no reconocemos la paquetería guardada en el
// pedido, getTrackingStatus() regresa null y quien llame simplemente se
// salta ese pedido -- nunca rompe el resto de la revisión diaria.

const SHIPPO_API = "https://api.goshippo.com";

// Traduce el texto libre que guardamos en order.carrier (lo que haya
// puesto el admin a mano, o lo que haya regresado Envíos Perros/Skydropx,
// ej. "Estafeta Terrestre") al identificador de paquetería que espera
// Shippo. Esta lista es la mejor aproximación con las paqueterías que de
// verdad se usan en el sitio -- si aparece una nueva combinación que no
// se reconoce, se agrega aquí.
const CARRIER_MAP = [
  [/estafeta/i, "estafeta"],
  [/fedex/i, "fedex"],
  [/\bdhl\b/i, "dhl_express"],
  [/\bups\b/i, "ups"],
  [/usps/i, "usps"],
  [/redpack/i, "redpack"],
  [/paquetexpress/i, "paquetexpress"],
  [/99\s*minutos/i, "noventaynueve_minutos"],
  [/j&?t\s*express/i, "jtexpress"],
];

function carrierTokenFor(carrierLabel) {
  const label = String(carrierLabel || "");
  for (const [re, token] of CARRIER_MAP) {
    if (re.test(label)) return token;
  }
  return null;
}

async function getTrackingStatus(carrierLabel, trackingNumber) {
  const apiKey = process.env.SHIPPO_API_KEY;
  const carrier = carrierTokenFor(carrierLabel);
  if (!apiKey || !carrier || !trackingNumber) return null;

  try {
    const res = await fetch(`${SHIPPO_API}/tracks/${carrier}/${encodeURIComponent(trackingNumber)}/`, {
      headers: { Authorization: `ShippoToken ${apiKey}` },
    });
    if (!res.ok) {
      console.error("Error consultando el estatus de envío en Shippo:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return (data.tracking_status && data.tracking_status.status) || null;
  } catch (err) {
    console.error("Error de red consultando Shippo:", err);
    return null;
  }
}

module.exports = { getTrackingStatus, carrierTokenFor };
