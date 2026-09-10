// Cliente para la API de Skydropx (https://pro.skydropx.com/es-MX/api-docs)
// -- se cotiza junto con Envíos Perros en /admin.html para comparar
// precios y ofrecer primero la paquetería más barata.
//
// Variables de entorno necesarias (Netlify → Site settings → Environment
// variables):
//   SKYDROPX_CLIENT_ID
//   SKYDROPX_CLIENT_SECRET
//   SKYDROPX_ORIGIN -> JSON con los datos de origen (remitente), ej:
//     {"zip":"32668","state":"Chihuahua","city":"Ciudad Juárez"}

const BASE_URL = "https://pro.skydropx.com";

// El token dura 2 horas (según su documentación) -- se cachea en memoria
// mientras la función siga "caliente" para no pedir uno nuevo en cada
// cotización.
let cachedToken = null; // { value, expiresAt }

async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken.value;
  }
  const clientId = process.env.SKYDROPX_CLIENT_ID;
  const clientSecret = process.env.SKYDROPX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Falta configurar SKYDROPX_CLIENT_ID / SKYDROPX_CLIENT_SECRET en Netlify.");
  }

  const res = await fetch(`${BASE_URL}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "default",
    }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo autenticar con Skydropx (HTTP ${res.status}).`);
  }
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 7200) * 1000 };
  return cachedToken.value;
}

function getOrigin() {
  const raw = process.env.SKYDROPX_ORIGIN;
  if (!raw) throw new Error("Falta configurar SKYDROPX_ORIGIN en Netlify.");
  return JSON.parse(raw);
}

async function apiRequest(path, options) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
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
    const err = new Error("Error en la API de Skydropx");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function createQuotation({ weight, destination }) {
  const origin = getOrigin();
  return apiRequest("/api/v2/quotations", {
    method: "POST",
    body: JSON.stringify({
      quotation: {
        address_from: {
          country_code: "MX",
          postal_code: origin.zip,
          area_level1: origin.state,
          area_level2: origin.city,
        },
        address_to: {
          country_code: "MX",
          postal_code: destination.zipCode,
          area_level1: destination.state,
          area_level2: destination.city,
          area_level3: destination.neighborhood,
        },
        parcel: { weight, height: 2, width: 2, length: 2 },
      },
    }),
  });
}

/* Las cotizaciones de Skydropx se calculan de forma asíncrona (se crean
   con is_completed=false y las tarifas llegan "pending" una por una) --
   hay que volver a consultarla hasta que is_completed sea true. */
async function pollQuotation(id, { attempts = 6, delayMs = 1500 } = {}) {
  let data = await apiRequest(`/api/v1/quotations/${id}`, { method: "GET" });
  for (let i = 0; i < attempts && !data.is_completed; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    data = await apiRequest(`/api/v1/quotations/${id}`, { method: "GET" });
  }
  return data;
}

async function quoteRates({ weight, destination }) {
  const created = await createQuotation({ weight, destination });
  const final = await pollQuotation(created.id);
  return (final.rates || [])
    .filter((r) => r.success && r.total)
    .map((r) => ({
      provider: "skydropx",
      quotationId: final.id,
      rateId: r.id,
      carrierSlug: r.provider_name,
      serviceCode: r.provider_service_code,
      carrier: r.provider_display_name,
      service: r.provider_service_name,
      total: Number(r.total),
      days: r.days,
    }));
}

async function createShipment({ quotationId, rateId, carrierSlug, serviceCode }) {
  return apiRequest("/api/v1/shipments", {
    method: "POST",
    body: JSON.stringify({
      quotation_id: quotationId,
      rate_id: rateId,
      carrier_name: carrierSlug,
      service_level_code: serviceCode,
    }),
  });
}

async function getOrderLabels(orderId) {
  return apiRequest(`/api/v1/orders/${orderId}/labels`, { method: "GET" });
}

module.exports = { quoteRates, createShipment, getOrderLabels };
