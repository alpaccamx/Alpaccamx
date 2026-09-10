// Cliente para la API de Envíos Perros (https://enviosperros.readme.io) --
// se usa para cotizar y generar guías de envío desde /admin.html.
//
// Variables de entorno necesarias (Netlify → Site settings → Environment
// variables):
//   ENVIOS_PERROS_API_KEY -> token de la sección "Conexión API Rest"
//   ENVIOS_PERROS_ORIGIN  -> JSON con los datos del remitente (tú), ej:
//     {"company":"Alpacca","name":"Maelyn Arias","phone":"6571920559",
//      "email":"alpacca.mx@gmail.com","street":"Via Somero",
//      "exteriorNumber":"8503","interiorNumber":"17","neighborhood":"Harmoni",
//      "zipCode":"32668","references":"Porton blanco"}

const BASE_URL = "https://app.enviosperros.com/api/v3";

function getOrigin() {
  const raw = process.env.ENVIOS_PERROS_ORIGIN;
  if (!raw) throw new Error("Falta configurar ENVIOS_PERROS_ORIGIN en Netlify.");
  return JSON.parse(raw);
}

async function apiRequest(path, options) {
  const apiKey = process.env.ENVIOS_PERROS_API_KEY;
  if (!apiKey) throw new Error("Falta configurar ENVIOS_PERROS_API_KEY en Netlify.");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options && options.headers),
    },
  });

  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (err) {
      body = text;
    }
  }

  if (!res.ok) {
    const err = new Error("Error en la API de Envíos Perros");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/* Caja fija de 2x2x2 cm -- solo el peso varía, lo captura el admin a mano. */
function buildPackage(weight, description) {
  return {
    type: "Box",
    description: (description || "Productos de skincare").slice(0, 25),
    depth: 2,
    width: 2,
    height: 2,
    weight,
  };
}

async function quoteRates({ weight, destinationZipCode }) {
  const origin = getOrigin();
  return apiRequest("/rates", {
    method: "POST",
    body: JSON.stringify({
      package: buildPackage(weight),
      originZipCode: origin.zipCode,
      destinationZipCode,
    }),
  });
}

async function createLabel({ weight, courier, service, destination }) {
  const origin = getOrigin();
  return apiRequest("/labels", {
    method: "POST",
    body: JSON.stringify({
      courier,
      service,
      origin,
      destination,
      package: buildPackage(weight),
    }),
  });
}

module.exports = { quoteRates, createLabel };
