// Cliente para la API de Skydropx (https://pro.skydropx.com/es-MX/api-docs)
// -- se cotiza junto con Envíos Perros en /admin.html para comparar
// precios y ofrecer primero la paquetería más barata.
//
// Variables de entorno necesarias (Netlify → Site settings → Environment
// variables):
//   SKYDROPX_CLIENT_ID
//   SKYDROPX_CLIENT_SECRET
//   SKYDROPX_ORIGIN -> JSON con los datos de origen (remitente), ej:
//     {"zip":"12345","state":"Tu estado","city":"Tu municipio o ciudad","neighborhood":"Tu colonia"}
//     (si falta "neighborhood" se usa la colonia de ENVIOS_PERROS_ORIGIN)

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
  const origin = JSON.parse(raw);
  // Skydropx ahora pide la colonia de origen (area_level3). Si no viene en
  // SKYDROPX_ORIGIN, se toma la de ENVIOS_PERROS_ORIGIN (es la misma dirección).
  if (!origin.neighborhood) {
    try {
      origin.neighborhood = JSON.parse(process.env.ENVIOS_PERROS_ORIGIN || "{}").neighborhood || "";
    } catch (err) {
      origin.neighborhood = "";
    }
  }
  return origin;
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
          area_level3: origin.neighborhood || origin.city,
        },
        address_to: {
          country_code: "MX",
          postal_code: destination.zipCode,
          area_level1: destination.state,
          area_level2: destination.city,
          area_level3: destination.neighborhood || destination.city,
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

/* Remitente: los datos completos (nombre, calle, teléfono, correo) están
   en ENVIOS_PERROS_ORIGIN; SKYDROPX_ORIGIN solo trae CP/estado/ciudad. */
function getSender() {
  let ep = {};
  try { ep = JSON.parse(process.env.ENVIOS_PERROS_ORIGIN || "{}"); } catch (err) { ep = {}; }
  return ep;
}

const recorta = (v, n) => String(v || "").trim().slice(0, n);

/* Crea la guía con la tarifa elegida. Skydropx pide remitente y
   destinatario completos y, por la carta porte, el código SAT del
   contenido (53131600: productos de cuidado personal y belleza) y el tipo
   de empaque (4G: caja de cartón). La guía se genera aparte: se consulta el
   envío hasta que trae número de guía (o se acaba el tiempo). */
async function createShipment({ rateId, destination, declaredValue }) {
  const s = getSender();
  const o = getOrigin();
  const d = destination || {};
  const correo = s.email || "contacto@alpacca.mx";
  const body = {
    shipment: {
      rate_id: rateId,
      printing_format: "standard",
      address_from: {
        name: recorta(s.name || s.company || "Alpacca", 30),
        company: recorta(s.company || "Alpacca", 30),
        street1: recorta(`${s.street || ""} ${s.exteriorNumber || ""}${s.interiorNumber ? ` Int ${s.interiorNumber}` : ""}`, 45),
        phone: recorta(String(s.phone || "").replace(/[^0-9]/g, ""), 10),
        email: correo,
        reference: recorta(s.references || o.neighborhood || "Sin referencias", 30),
      },
      address_to: {
        name: recorta(d.name || "Cliente", 30),
        company: recorta(d.name || "Cliente", 30),
        street1: recorta(`${d.street || ""} ${d.exteriorNumber || "S/N"}${d.interiorNumber ? ` Int ${d.interiorNumber}` : ""}`, 45),
        phone: recorta(String(d.phone || "").replace(/[^0-9]/g, ""), 10),
        email: d.email || correo,
        reference: recorta(`${d.neighborhood ? `Col. ${d.neighborhood}. ` : ""}${d.references || ""}`, 30) || "Sin referencias",
      },
      packages: [
        {
          package_number: "1",
          package_protected: false,
          declared_value: Math.max(1, Math.round(Number(declaredValue) || 500)),
          consignment_note: "53131600",
          package_type: "4G",
        },
      ],
    },
  };
  const created = await apiRequest("/api/v1/shipments", { method: "POST", body: JSON.stringify(body) });
  const id = created && ((created.data && created.data.id) || created.id);
  let info = shipmentInfo(created);
  for (let i = 0; id && !info.trackingNumber && i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    info = shipmentInfo(await apiRequest(`/api/v1/shipments/${id}`, { method: "GET" }));
    if (info.failed) break;
  }
  return { id, ...info };
}

/* Número de guía, etiqueta y estado de un envío de Skydropx (el número y
   la etiqueta vienen en el paquete, "included"). */
function shipmentInfo(resp) {
  const data = (resp && resp.data) || resp || {};
  const attrs = data.attributes || data;
  const pkgs = ((resp && resp.included) || []).filter((x) => x && x.attributes);
  const pkg = pkgs.find((x) => x.attributes.tracking_number) || pkgs[0];
  const status = String(attrs.workflow_status || "");
  return {
    trackingNumber: (pkg && pkg.attributes.tracking_number) || attrs.master_tracking_number || attrs.tracking_number || "",
    labelUrl: (pkg && pkg.attributes.label_url) || attrs.label_url || "",
    status,
    failed: /fail|cancel|error/i.test(status),
  };
}

async function getOrderLabels(orderId) {
  return apiRequest(`/api/v1/orders/${orderId}/labels`, { method: "GET" });
}

module.exports = { quoteRates, createShipment, getOrderLabels };
