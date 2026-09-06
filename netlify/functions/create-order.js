// Registra un pedido nuevo (WhatsApp/transferencia o Mercado Pago).
//
// Body esperado (JSON):
//   {
//     source: "whatsapp" | "mercadopago",
//     customer: { name, phone, cp, notes },
//     items: [{ sku, nombre, qty, precio, enStock }],  <- precio de catálogo (precio de transferencia, SIN cargo)
//     subtotal, shippingMXN, grandTotal
//   }
//
// Para "mercadopago" además crea una preferencia de pago (Checkout Pro):
// como el precio de catálogo es el precio "de transferencia" (sin cargo
// de terminal), aquí se le agrega el % de MP_SURCHARGE_PCT antes de
// mandarlo a cobrar. El pedido guardado en Blobs conserva el precio base
// de catálogo en "items" (para no afectar el descuento de stock ni los
// reportes), y guarda por separado mpSurchargePct + el grandTotal real
// que se le cobró al cliente.
//
// Variable de entorno necesaria para Mercado Pago (Netlify → Site
// settings → Environment variables): MP_ACCESS_TOKEN

const { randomUUID } = require("crypto");
const { saveNewOrder, transitionOrder } = require("./lib/blob-store.js");

const MP_API = "https://api.mercadopago.com";

// Debe coincidir con CONFIG.MP_SURCHARGE_PCT en app.js.
const MP_SURCHARGE_PCT = 6;

function roundMXN(n) {
  return Math.round(n * 100) / 100;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const { source, customer, items, subtotal, shippingMXN, grandTotal } = body;

  if (source !== "whatsapp" && source !== "mercadopago") {
    return jsonResponse(400, { error: "source debe ser 'whatsapp' o 'mercadopago'." });
  }
  if (!Array.isArray(items) || !items.length) {
    return jsonResponse(400, { error: "El pedido no tiene productos." });
  }

  const cleanItems = items
    .map((it) => ({
      sku: String(it.sku || ""),
      nombre: String(it.nombre || ""),
      qty: Number(it.qty) || 0,
      precio: Number(it.precio) || 0,
      enStock: !!it.enStock,
    }))
    .filter((it) => it.sku && it.qty > 0);

  if (!cleanItems.length) {
    return jsonResponse(400, { error: "El pedido no tiene productos válidos." });
  }

  const order = {
    id: randomUUID(),
    source,
    status: "pending",
    createdAt: new Date().toISOString(),
    customer: {
      name: String((customer && customer.name) || ""),
      phone: String((customer && customer.phone) || ""),
      cp: String((customer && customer.cp) || ""),
      notes: String((customer && customer.notes) || ""),
    },
    items: cleanItems,
    subtotal: Number(subtotal) || 0,
    shippingMXN: Number(shippingMXN) || 0,
    grandTotal: Number(grandTotal) || 0,
  };

  if (source === "mercadopago") {
    // El precio de catálogo (items[].precio) es el precio de transferencia,
    // sin cargo de terminal: para Mercado Pago hay que sumarle el %.
    order.mpSurchargePct = MP_SURCHARGE_PCT;
    const subtotalConCargo = cleanItems.reduce(
      (sum, it) => sum + roundMXN(it.precio * (1 + MP_SURCHARGE_PCT / 100)) * it.qty,
      0
    );
    order.grandTotal = roundMXN(subtotalConCargo + order.shippingMXN);
  }

  try {
    await saveNewOrder(order);
  } catch (err) {
    console.error("Error guardando el pedido:", err);
    return jsonResponse(500, { error: "No se pudo guardar el pedido." });
  }

  if (source === "whatsapp") {
    return jsonResponse(200, { orderId: order.id });
  }

  // source === "mercadopago": crear la preferencia de pago.
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("Falta configurar MP_ACCESS_TOKEN en Netlify.");
    return jsonResponse(500, { error: "Mercado Pago no está configurado todavía en el sitio." });
  }

  const siteUrl = (process.env.URL || "https://alpacca.mx").replace(/\/$/, "");
  const mpItems = cleanItems.map((it) => ({
    title: it.nombre.slice(0, 250),
    quantity: it.qty,
    unit_price: roundMXN(it.precio * (1 + MP_SURCHARGE_PCT / 100)),
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
      return jsonResponse(502, { error: "Mercado Pago rechazó la solicitud de pago." });
    }

    const isTestToken = accessToken.startsWith("TEST-");
    const redirectUrl = isTestToken ? pref.sandbox_init_point : pref.init_point;

    return jsonResponse(200, { orderId: order.id, redirectUrl });
  } catch (err) {
    console.error("Error llamando a la API de Mercado Pago:", err);
    await transitionOrder(order.id, "failed", { error: "mp_request_failed" }).catch(() => {});
    return jsonResponse(502, { error: "No se pudo conectar con Mercado Pago." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
