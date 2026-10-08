// Registra un pedido nuevo (transferencia o Mercado Pago).
//
// Body esperado (JSON):
//   {
//     source: "transferencia" | "mercadopago",
//     customer: { name, phone, cp, street, colonia, municipio, estado, referencias, notes },
//     items: [{ sku, nombre, marca, qty, precio, precioBase, enStock }],
//     subtotal, shippingMXN, subtotalBase, shippingMXNBase, grandTotal
//   }
//
// "whatsapp" también se acepta como source por compatibilidad con pedidos
// de versiones anteriores del sitio (antes de quitar el paso de WhatsApp
// del checkout) -- se trata igual que "transferencia" en todo lo demás.
//
// En items[].precio el frontend ya manda el precio correcto según el
// método de pago: el de la columna "Precio" (transferencia) para
// source="transferencia", o el de la columna "Precio Tarjeta" para
// source="mercadopago" (ver CONFIG en app.js y la sección 4 del README).
// Aquí NO se calcula ningún cargo ni porcentaje sobre esos dos precios --
// son fijos y ya anunciados de antemano en el catálogo, cada uno se cobra
// tal cual.
//
// items[].precioBase / subtotalBase / shippingMXNBase son, en cambio, el
// precio de transferencia (sin comisión) de cada producto y envío, SIEMPRE
// -- en transferencia son iguales a precio/subtotal/shippingMXN, y en
// Mercado Pago quedan por debajo. Solo se guardan para que /admin.html
// pueda mostrar cuánto de lo cobrado con tarjeta es comisión (ver
// cardFeeMXN más abajo), sin depender de que el catálogo no haya
// cambiado desde entonces.
//
// Para "mercadopago" además crea una preferencia de pago (Checkout Pro) y
// regresa la URL a la que hay que redirigir al cliente.
//
// Variable de entorno necesaria para Mercado Pago (Netlify → Site
// settings → Environment variables): MP_ACCESS_TOKEN

const { randomUUID } = require("crypto");
const {
  saveNewOrder, transitionOrder, getEffectiveSoldMap,
  claimIdempotencyKey, completeIdempotencyKey, releaseIdempotencyKey,
} = require("./lib/blob-store.js");
const { priceOrder, matchesClientTotals } = require("./lib/pricing.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { notifySellerOrderCreated, notifyCustomerOrderPending } = require("./lib/whatsapp.js");
const { getCustomerByPhone } = require("./lib/customer-store.js");
const { sendEmail, orderPendingEmailHTML } = require("./lib/email.js");
const { checkRateLimit, getClientIp } = require("./lib/rate-limit.js");

const MP_API = "https://api.mercadopago.com";

// Aviso a la CLIENTA de que su pedido ya se recibió y está pendiente de
// confirmación -- el correo solo se manda si tiene cuenta con ese teléfono
// (los pedidos no guardan correo); el de WhatsApp (plantilla
// "pedido_recibido") se intenta de todos modos, sin depender de que tenga
// cuenta. Ninguno de los dos revienta si falla.
async function notifyCustomerOrderReceived(order) {
  const pendingCustomer = await getCustomerByPhone(order.customer?.phone).catch(() => null);
  if (pendingCustomer?.email) {
    await sendEmail({
      to: pendingCustomer.email,
      subject: "Recibimos tu pedido de Alpacca 📝",
      html: orderPendingEmailHTML(order),
    }).catch((err) => console.error("No se pudo mandar el correo de pedido recibido:", err));
  }
  await notifyCustomerOrderPending(order).catch((err) => console.error("No se pudo avisar por WhatsApp del pedido recibido:", err));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Máximo 15 pedidos por hora por IP -- de sobra para una clienta real
  // (incluso mayorista) haciendo varios pedidos, pero frena un envío
  // automatizado masivo de pedidos falsos.
  const rateLimit = await checkRateLimit(`create-order:${getClientIp(event)}`, { max: 15, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return jsonResponse(429, { error: "Demasiados pedidos en poco tiempo. Espera un poco e intenta de nuevo." }, rateLimit.retryAfterSeconds);
  }

  // Solo una cuenta con sesión puede registrar pedidos: así el comprobante
  // y el pedido quedan ligados a esa cuenta (ver upload-payment-proof.js).
  const customerEmail = verifyCustomerToken(event);
  if (!customerEmail) {
    return jsonResponse(401, { error: "Inicia sesión para continuar tu compra." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const {
    source, customer, items, subtotal, shippingMXN, subtotalBase, shippingMXNBase, grandTotal,
    shippingKoreaMXN, shippingNacionalMXN, shippingKoreaMXNTarjeta, shippingNacionalMXNTarjeta, weightKg,
  } = body;

  // Datos mínimos de contacto y envío: el servidor no confía en que el
  // formulario del navegador los haya validado.
  const phoneDigits = String((customer && customer.phone) || "").replace(/\D/g, "");
  if (phoneDigits.length !== 10) {
    return jsonResponse(400, { error: "El teléfono debe tener 10 dígitos." });
  }
  if (!/^\d{5}$/.test(String((customer && customer.cp) || "").trim())) {
    return jsonResponse(400, { error: "El código postal debe tener 5 dígitos." });
  }
  if (!String((customer && customer.name) || "").trim()) {
    return jsonResponse(400, { error: "Escribe tu nombre para registrar el pedido." });
  }


  if (source !== "transferencia" && source !== "whatsapp" && source !== "mercadopago") {
    return jsonResponse(400, { error: "source debe ser 'transferencia' o 'mercadopago'." });
  }
  if (!Array.isArray(items) || !items.length) {
    return jsonResponse(400, { error: "El pedido no tiene productos." });
  }

  // Los precios, el stock y el envío se recalculan AQUÍ a partir de las
  // hojas publicadas. Lo que manda el navegador solo sirve para comparar:
  // si no coincide, el pedido no se registra ni se cobra.
  const requested = items.map((it) => ({
    sku: String((it && it.sku) || ""),
    qty: Number(it && it.qty),
    enStock: !!(it && it.enStock),
  }));
  if (requested.some((it) => !it.sku || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 999)) {
    return jsonResponse(400, { error: "Hay una cantidad inválida en tu carrito." });
  }

  let soldMap;
  try {
    soldMap = new Map(Object.entries(await getEffectiveSoldMap()));
  } catch (err) {
    console.error("No se pudo leer el stock vendido:", err);
    return jsonResponse(503, { error: "No pudimos revisar el stock en este momento. Intenta de nuevo en un momento." });
  }

  let priced;
  try {
    priced = await priceOrder({ source, items: requested, customer, soldMap });
  } catch (err) {
    console.error("No se pudieron cargar precios y envíos:", err);
    return jsonResponse(503, { error: "No pudimos cargar los precios en este momento. Intenta de nuevo en un momento." });
  }
  if (!priced.ok) {
    return jsonResponse(priced.status, { error: priced.error });
  }

  if (!matchesClientTotals(priced, { subtotal, shippingMXN, grandTotal })) {
    return jsonResponse(409, {
      error: "Los precios o el envío cambiaron desde que armaste tu carrito. Recarga la página para ver los precios actuales.",
    });
  }

  // Idempotencia: si el navegador reenvía el mismo intento (recarga, red
  // lenta), se devuelve el pedido que ya se registró en vez de crear otro.
  const idemKey = typeof body.idempotencyKey === "string" && /^[A-Za-z0-9-]{16,64}$/.test(body.idempotencyKey)
    ? body.idempotencyKey
    : null;
  if (idemKey) {
    let claim;
    try {
      claim = await claimIdempotencyKey(idemKey);
    } catch (err) {
      console.error("No se pudo reservar la clave de idempotencia:", err);
      return jsonResponse(503, { error: "No pudimos registrar tu pedido en este momento. Intenta de nuevo." });
    }
    if (!claim.claimed) {
      const prev = claim.existing || {};
      if (prev.status === "done") {
        return jsonResponse(200, { orderId: prev.orderId, ...(prev.redirectUrl ? { redirectUrl: prev.redirectUrl } : {}) });
      }
      if (prev.status === "stale") {
        return jsonResponse(409, { error: "Tu pedido no se registró. Intenta de nuevo." });
      }
      return jsonResponse(409, { error: "Tu pedido se está registrando. Espera unos segundos e intenta de nuevo." });
    }
  }

  // Nombre y marca vienen del navegador solo para mostrarlos en /admin.html;
  // no afectan ningún monto.
  const order = {
    id: randomUUID(),
    source,
    status: "pending",
    customerEmail: String(customerEmail).toLowerCase(),
    createdAt: new Date().toISOString(),
    customer: {
      name: String((customer && customer.name) || ""),
      phone: String((customer && customer.phone) || ""),
      cp: String((customer && customer.cp) || ""),
      street: String((customer && customer.street) || ""),
      colonia: String((customer && customer.colonia) || ""),
      municipio: String((customer && customer.municipio) || ""),
      estado: String((customer && customer.estado) || ""),
      referencias: String((customer && customer.referencias) || ""),
      notes: String((customer && customer.notes) || ""),
    },
    // Todos los montos y el desglose de envío salen de priceOrder (ver
    // arriba): el navegador solo aporta nombre/marca para mostrar en
    // /admin.html, nunca precios ni totales.
    items: priced.items.map((line, i) => ({
      sku: line.sku,
      nombre: String((items[i] && items[i].nombre) || line.nombre).slice(0, 250),
      marca: String((items[i] && items[i].marca) || line.marca || "").slice(0, 120),
      qty: line.qty,
      precio: line.precio,
      precioBase: line.precioBase,
      enStock: line.enStock,
    })),
    subtotal: priced.subtotal,
    shippingMXN: priced.shippingMXN,
    subtotalBase: priced.subtotalBase,
    shippingMXNBase: priced.shippingMXNBase,
    cardFeeMXN: priced.cardFeeMXN,
    grandTotal: priced.grandTotal,
    shippingKoreaMXN: priced.shippingKoreaMXN,
    shippingNacionalMXN: priced.shippingNacionalMXN,
    shippingKoreaMXNTarjeta: priced.shippingKoreaMXNTarjeta,
    shippingNacionalMXNTarjeta: priced.shippingNacionalMXNTarjeta,
    weightKg: priced.weightKg,
  };

  try {
    await saveNewOrder(order);
  } catch (err) {
    console.error("Error guardando el pedido:", err);
    if (idemKey) await releaseIdempotencyKey(idemKey);
    return jsonResponse(500, { error: "No se pudo guardar el pedido." });
  }

  // Avisos de "pedido nuevo, aún sin confirmar": al dueño y a la clienta.
  // Van DESPUÉS de que el pedido ya existe de verdad (preferencia de
  // Mercado Pago creada, si aplica) -- si algo falla antes, nadie recibe
  // un aviso de un pedido que no se pudo completar. Ninguno de los dos
  // revienta si falla (WhatsApp/correo sin configurar, número inválido).
  if (source === "transferencia" || source === "whatsapp") {
    await notifySellerOrderCreated(order);
    await notifyCustomerOrderReceived(order);
    if (idemKey) await completeIdempotencyKey(idemKey, { orderId: order.id });
    return jsonResponse(200, { orderId: order.id });
  }

  // source === "mercadopago": crear la preferencia de pago.
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("Falta configurar MP_ACCESS_TOKEN en Netlify.");
    return jsonResponse(500, { error: "Mercado Pago no está configurado todavía en el sitio." });
  }

  // "URL" de Netlify SIEMPRE apunta al dominio de producción, incluso en una
  // Deploy Preview o un branch deploy -- y en las funciones (no Edge
  // Functions) de este sitio ni "DEPLOY_PRIME_URL" ni "DEPLOY_URL" llegan
  // configuradas en tiempo de ejecución (confirmado con un log de
  // diagnóstico). Así que el webhook y las páginas de regreso terminaban
  // avisándole a producción de un pago de otro ambiente. La forma confiable
  // de saber en qué ambiente estamos es leer el host de la propia petición.
  const requestHost = (event.headers["x-forwarded-host"] || event.headers.host || "").trim();
  const siteUrl = (requestHost ? `https://${requestHost}` : process.env.URL || "https://alpacca.mx").replace(/\/$/, "");
  const mpItems = order.items.map((it) => ({
    title: it.nombre.slice(0, 250),
    quantity: it.qty,
    unit_price: it.precio,
    currency_id: "MXN",
  }));
  if (order.shippingMXN > 0) {
    mpItems.push({
      title: "Envío",
      quantity: 1,
      unit_price: order.shippingMXN,
      currency_id: "MXN",
    });
  }

  const preferenceBody = {
    items: mpItems,
    external_reference: order.id,
    payer: order.customer.name ? { name: order.customer.name } : undefined,
    back_urls: {
      success: `${siteUrl}/?mp=success`,
      failure: `${siteUrl}/?mp=failure`,
      pending: `${siteUrl}/?mp=pending`,
    },
    auto_return: "approved",
    notification_url: `${siteUrl}/.netlify/functions/mp-webhook`,
  };

  try {
    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const pref = await res.json();
    if (!res.ok) {
      console.error("Error creando preferencia de Mercado Pago:", pref);
      await transitionOrder(order.id, "failed", { error: "mp_preference_error" });
      if (idemKey) await releaseIdempotencyKey(idemKey);
      return jsonResponse(502, { error: "Mercado Pago rechazó la solicitud de pago." });
    }

    const isTestToken = accessToken.startsWith("TEST-");
    const redirectUrl = isTestToken ? pref.sandbox_init_point : pref.init_point;

    await notifySellerOrderCreated(order);
    await notifyCustomerOrderReceived(order);
    if (idemKey) await completeIdempotencyKey(idemKey, { orderId: order.id, redirectUrl });
    return jsonResponse(200, { orderId: order.id, redirectUrl });
  } catch (err) {
    console.error("Error llamando a la API de Mercado Pago:", err);
    await transitionOrder(order.id, "failed", { error: "mp_request_failed" }).catch(() => {});
    if (idemKey) await releaseIdempotencyKey(idemKey);
    return jsonResponse(502, { error: "No se pudo conectar con Mercado Pago." });
  }
};

function jsonResponse(statusCode, obj, retryAfterSeconds) {
  const headers = { "Content-Type": "application/json" };
  if (retryAfterSeconds) headers["Retry-After"] = String(retryAfterSeconds);
  return { statusCode, headers, body: JSON.stringify(obj) };
}
