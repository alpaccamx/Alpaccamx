// Cotiza el envío de un pedido en Envíos Perros y Skydropx al mismo
// tiempo, y regresa las dos listas juntas ordenadas de la más barata a
// la más cara (para elegir paquetería antes de generar la guía desde
// /admin.html).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON): { orderId | envioId | apartadoId, weight, destinationZipCode? }
// (envioId: un envío de Dirección americana; se usa su dirección.)
//
// Cotizador libre (envíos que no son de un pedido, ni salen de la dirección
// de Mae): { libre: { origen: {cp, estado, ciudad, colonia},
//   destino: {cp, estado, ciudad, colonia}, largo, ancho, alto }, weight }

const { getApartado } = require("./lib/preventa-store.js");
const { getOrder } = require("./lib/blob-store.js");
const { quoteRates: quoteEnviosPerros } = require("./lib/enviosperros.js");
const { quoteRates: quoteSkydropx } = require("./lib/skydropx.js");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { getRecord } = require("./lib/swm-store.js");
const { envioEstimado } = require("./lib/preventa-core.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const auth = checkAdminKey(event);
  if (!auth.configured) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  if (!auth.valid) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const { orderId, envioId, apartadoId, weight } = body;
  const libre = body.libre && typeof body.libre === "object" ? body.libre : null;
  const weightNum = Number(weight);
  if ((!orderId && !envioId && !apartadoId && !libre) || !weightNum || weightNum <= 0) {
    return jsonResponse(400, { error: "Faltan el pedido o un peso válido." });
  }

  let c;
  let origen = null;
  let dims = null;
  if (libre) {
    const o = libre.origen || {};
    const d = libre.destino || {};
    const cp5 = (x) => String(x || "").replace(/\D/g, "");
    if (cp5(o.cp).length !== 5 || cp5(d.cp).length !== 5) {
      return jsonResponse(400, { error: "Faltan los códigos postales de origen y destino (5 dígitos)." });
    }
    const t = (x) => String(x || "").trim().slice(0, 80);
    origen = { zip: cp5(o.cp), state: t(o.estado), city: t(o.ciudad), neighborhood: t(o.colonia) || t(o.ciudad) };
    c = { cp: cp5(d.cp), estado: t(d.estado), municipio: t(d.ciudad), colonia: t(d.colonia) };
    const n = (x) => Math.min(300, Math.max(0, Number(x) || 0));
    if (n(libre.largo) && n(libre.ancho) && n(libre.alto)) {
      dims = { largo: Math.ceil(n(libre.largo)), ancho: Math.ceil(n(libre.ancho)), alto: Math.ceil(n(libre.alto)) };
    }
  } else if (envioId) {
    const envio = await getRecord("envio", String(envioId));
    if (!envio) return jsonResponse(404, { error: "Envío no encontrado." });
    const d = envio.direccion || {};
    c = { cp: d.cp, estado: d.estado, municipio: d.ciudad, colonia: d.colonia };
  } else if (apartadoId && !orderId) {
    const ap = await getApartado(String(apartadoId));
    if (!ap) return jsonResponse(404, { error: "Apartado no encontrado." });
    const d = ap.direccion || {};
    c = { cp: d.cp, estado: d.estado, municipio: d.ciudad, colonia: d.colonia };
  } else {
    const order = await getOrder(orderId);
    if (!order) return jsonResponse(404, { error: "Pedido no encontrado." });
    c = order.customer || {};
  }
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
    quoteEnviosPerros({ weight: weightNum, destinationZipCode, originZipCode: origen && origen.zip, dims }),
    quoteSkydropx({ weight: weightNum, destination, origin: origen, dims }),
  ]);

  const rates = [];

  if (epResult.status === "fulfilled") {
    (epResult.value || [])
      .filter((r) => r.available)
      .forEach((r) => {
        rates.push({
          provider: "enviosperros",
          ...zonaExtendida(r),
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
        ...zonaExtendida(r.raw),
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

  // Solo los NOMBRES de los campos que mandan las paqueterías (sin datos de
  // la clienta), para ver en los logs cómo marcan la zona extendida.
  try {
    const campos = (lista) => [...new Set((lista || []).flatMap((x) => clavesDe(x)))].sort();
    console.log("cotizacion-campos", JSON.stringify({
      cp: destinationZipCode.slice(0, 2) + "xxx",
      enviosperros: epResult.status === "fulfilled" ? campos(epResult.value) : null,
      skydropx: sdResult.status === "fulfilled" ? campos((sdResult.value || []).map((r) => r.raw)) : null,
      extendida: rates.filter((r) => r.zonaExtendida).map((r) => `${r.label}${r.zonaExtendidaCargo ? ` +${r.zonaExtendidaCargo}` : ""} [${r.zonaExtendidaPor}]`),
    }));
  } catch (err) { /* solo es diagnóstico */ }

  // Motivo corto de por qué falló cada paquetería, para mostrarlo en el
  // panel (solo lo ve la admin) y saber si es la cuenta, el origen o el CP.
  const providerErrorDetail = {};
  if (epResult.status === "rejected") providerErrorDetail.enviosperros = errorDetail(epResult.reason);
  if (sdResult.status === "rejected") providerErrorDetail.skydropx = errorDetail(sdResult.reason);

  if (!rates.length) {
    return jsonResponse(502, {
      error: "No se pudo cotizar con ninguna paquetería. Revisa el código postal o intenta de nuevo.",
      providerErrorDetail,
    });
  }

  // Dirección americana: a la clienta se le cobra el envío de la tabla de
  // Mae (la misma de la tienda), no lo que cuesta la guía.
  const tabla = envioId ? await envioEstimado(destinationZipCode, weightNum) : null;

  return jsonResponse(200, {
    rates,
    tabla,
    zonaExtendida: rates.some((r) => r.zonaExtendida),
    providerErrors: {
      enviosperros: epResult.status === "rejected",
      skydropx: sdResult.status === "rejected",
    },
    providerErrorDetail,
  });
};

/* ¿La paquetería marca este destino como zona extendida (cobra de más)?
   Envíos Perros y Skydropx no documentan el nombre exacto del campo, así
   que se revisa toda la tarifa: campos cuyo nombre habla de zona
   extendida / reexpedición / área remota con valor verdadero o un monto, y
   textos que lo digan (ej. "Zona extendida" en el resumen). */
const RX_CLAVE = /extend|reexped|re_exped|out_?of_?area|remote_?area|zona_?ext|ext_?zone/i;
const RX_TEXTO = /zona\s+extendida|extended\s+(zone|area)|reexpedici[oó]n|re-expedici[oó]n|out of (delivery )?area|área remota|area remota/i;
const RX_MONTO = /amount|cost|price|precio|fee|cargo|monto|importe|total|valor|value/i;

function zonaExtendida(rate) {
  let si = false;
  let cargo = 0;
  const por = [];
  const visto = new Set();
  const walk = (v, clave, padre, depth) => {
    if (v == null || depth > 5) return;
    if (typeof v === "object") {
      if (visto.has(v)) return;
      visto.add(v);
      // Objeto tipo cargo extra: { name|concept|type: "extended_zone", amount: 85 }
      const nombre = ["name", "concept", "concepto", "type", "tipo", "code", "codigo", "description", "descripcion", "label"]
        .map((k) => v[k]).find((x) => typeof x === "string" && (RX_CLAVE.test(x) || RX_TEXTO.test(x)));
      if (nombre) {
        si = true; por.push(nombre);
        const m = Object.entries(v).find(([k, x]) => RX_MONTO.test(k) && Number(x) > 0);
        if (m) cargo += Number(m[1]);
      }
      for (const [k, x] of Object.entries(v)) walk(x, k, v, depth + 1);
      return;
    }
    if (clave && RX_CLAVE.test(clave)) {
      if (v === true || /^(true|si|sí|yes|1)$/i.test(String(v))) { si = true; por.push(clave); }
      else if (typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v))) {
        if (Number(v) > 0) { si = true; por.push(clave); if (RX_MONTO.test(clave) || typeof v === "number") cargo += Number(v); }
      } else if (typeof v === "string" && RX_TEXTO.test(v)) { si = true; por.push(clave); }
      return;
    }
    if (typeof v === "string" && RX_TEXTO.test(v)) { si = true; por.push(clave || "texto"); }
  };
  try { walk(rate, "", null, 0); } catch (err) { /* nada */ }
  return si ? { zonaExtendida: true, zonaExtendidaCargo: cargo > 0 ? Math.round(cargo * 100) / 100 : null, zonaExtendidaPor: [...new Set(por)].join(", ").slice(0, 80) } : {};
}

/* Nombres de campos (con su ruta) de una tarifa, para el diagnóstico. */
function clavesDe(obj, pre = "", depth = 0, out = []) {
  if (!obj || typeof obj !== "object" || depth > 3) return out;
  for (const [k, v] of Object.entries(obj)) {
    const ruta = Array.isArray(obj) ? `${pre}[]` : pre ? `${pre}.${k}` : k;
    if (v && typeof v === "object") clavesDe(Array.isArray(v) ? v[0] : v, Array.isArray(v) ? `${ruta}[]` : ruta, depth + 1, out);
    else out.push(ruta);
  }
  return out;
}

function errorDetail(err) {
  if (!err) return "Error desconocido";
  let msg = err.message || String(err);
  if (err.status) msg += ` (HTTP ${err.status})`;
  if (err.body) {
    const b = typeof err.body === "string" ? err.body : JSON.stringify(err.body);
    msg += `: ${b.slice(0, 300)}`;
  }
  return msg;
}

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
