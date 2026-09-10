// Cotiza el envío de un pedido en Envíos Perros y Skydropx al mismo
// tiempo, y regresa las dos listas juntas ordenadas de la más barata a
// la más cara (para elegir paquetería antes de generar la guía desde
// /admin.html).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { orderId, weight, destinationZipCode? }

const { getOrder } = require("./lib/blob-store.js");
const { quoteRates: quoteEnviosPerros } = require("./lib/enviosperros.js");
const { quoteRates: quoteSkydropx } = require("./lib/skydropx.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }

  const providedKey = event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"]);
  if (providedKey !== adminKey) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const { orderId, weight } = body;
  const weightNum = Number(weight);
  if (!orderId || !weightNum || weightNum <= 0) {
    return jsonResponse(400, { error: "Faltan el pedido o un peso válido." });
  }

  const order = await getOrder(orderId);
  if (!order) return jsonResponse(404, { error: "Pedido no encontrado." });

  const c = order.customer || {};
  const destinationZipCode = String(body.destinationZipCode || c.cp || "").trim();
  if (!destinationZipCode) {
    return jsonResponse(400, { error: "Falta el código postal del destinatario." });
  }
  const destination = {
    zipCode: destinationZipCode,
    state: body.destinationState || c.estado || "",
    city: body.destinationCity || c.municipio || "",
    neighborhood: body.destinationNeighborhood || c.colonia || "",
  };

  const [epResult, sdResult] = await Promise.allSettled([
    quoteEnviosPerros({ weight: weightNum, destinationZipCode }),
    quoteSkydropx({ weight: weightNum, destination }),
  ]);

  const rates = [];

  if (epResult.status === "fulfilled") {
    (epResult.value || [])
      .filter((r) => r.available)
      .forEach((r) => {
        rates.push({
          provider: "enviosperros",
          label: r.summary,
          carrier: r.details && r.details.courier,
          service: r.details && r.details.service,
          total: r.details && r.details.total,
          days: r.details && r.details.deliveryCommitment,
        });
      });
  } else {
    console.error("Error cotizando con Envíos Perros:", epResult.reason && (epResult.reason.body || epResult.reason.message));
  }

  if (sdResult.status === "fulfilled") {
    (sdResult.value || []).forEach((r) => {
      rates.push({
        provider: "skydropx",
        label: `${r.carrier} ${r.service}`,
        carrier: r.carrier,
        service: r.service,
        total: r.total,
        days: r.days ? `${r.days} día${r.days === 1 ? "" : "s"} hábil${r.days === 1 ? "" : "es"}` : "",
        quotationId: r.quotationId,
        rateId: r.rateId,
        carrierSlug: r.carrierSlug,
        serviceCode: r.serviceCode,
      });
    });
  } else {
    console.error("Error cotizando con Skydropx:", sdResult.reason && (sdResult.reason.body || sdResult.reason.message));
  }

  rates.sort((a, b) => (Number(a.total) || Infinity) - (Number(b.total) || Infinity));

  if (!rates.length) {
    return jsonResponse(502, { error: "No se pudo cotizar con ninguna paquetería. Revisa el código postal o intenta de nuevo." });
  }

  return jsonResponse(200, {
    rates,
    providerErrors: {
      enviosperros: epResult.status === "rejected",
      skydropx: sdResult.status === "rejected",
    },
  });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
