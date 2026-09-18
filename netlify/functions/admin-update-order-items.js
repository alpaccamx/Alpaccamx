// Agrega, quita o cambia la cantidad de los productos de un pedido ya
// registrado -- para cuando el cliente pide un cambio después de haber
// hecho el pedido (antes o incluso después de que ya pagó).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON):
//   {
//     orderId,
//     items: [{ sku, nombre, marca, qty, precio, enStock }],
//     shippingMXN, grandTotal
//   }
//
// "items[].precio" aquí SIEMPRE es el precio de TRANSFERENCIA (el mismo
// que /admin.html ya muestra por artículo desde este cambio) -- no hay
// columna aparte de "precio con tarjeta": la comisión de Mercado Pago se
// sigue viendo como una sola línea al final, calculada como la diferencia
// entre "grandTotal" (lo que tú digas que se cobró/debe cobrarse) y la
// suma de productos + envío a precio de transferencia.
//
// Solo se puede editar un pedido "pending" o "paid" -- no tiene sentido
// editar uno cancelado o fallido.
//
// Si el pedido ya estaba "paid", además ajusta las piezas vendidas de tu
// hoja de Stock (solo para los artículos marcados "enStock"): compara los
// artículos de antes contra los nuevos por SKU y suma/resta la
// diferencia, para que el stock disponible no quede descuadrado.
//
// IMPORTANTE: esto NO cobra ni reembolsa nada por sí solo. Si el pedido
// se pagó con Mercado Pago, ese cobro ya quedó fijo ahí -- cualquier
// diferencia (agregaste o quitaste algo) la tienes que cobrar o
// reembolsar tú misma desde tu cuenta de Mercado Pago, y luego ajustar
// aquí el campo "Total cobrado" para que quede el registro correcto.

const { getOrder, updateOrderFields, adjustStockSold } = require("./lib/blob-store.js");
const { applySheetStockDelta } = require("./lib/google-sheets.js");

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

  const { orderId, items, shippingMXN, grandTotal } = body;
  if (!orderId) return jsonResponse(400, { error: "Falta orderId." });
  if (!Array.isArray(items) || !items.length) {
    return jsonResponse(400, { error: "El pedido debe tener al menos un producto." });
  }

  const cleanItems = items
    .map((it) => ({
      sku: String(it.sku || ""),
      nombre: String(it.nombre || ""),
      marca: String(it.marca || ""),
      qty: Number(it.qty) || 0,
      precio: Number(it.precio) || 0,
      precioBase: Number(it.precio) || 0,
      enStock: !!it.enStock,
    }))
    .filter((it) => it.nombre && it.qty > 0);

  if (!cleanItems.length) {
    return jsonResponse(400, { error: "El pedido debe tener al menos un producto válido." });
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch (err) {
    console.error("Error buscando el pedido:", err);
    return jsonResponse(500, { error: "No se pudo buscar el pedido." });
  }
  if (!order) return jsonResponse(404, { error: "Pedido no encontrado." });
  if (order.status !== "pending" && order.status !== "paid") {
    return jsonResponse(400, { error: "Solo se pueden modificar pedidos pendientes o pagados." });
  }

  const subtotal = cleanItems.reduce((sum, it) => sum + it.precio * it.qty, 0);
  const shippingMXNNum = Number(shippingMXN) || 0;
  const grandTotalNum = grandTotal != null && grandTotal !== "" ? Number(grandTotal) || 0 : subtotal + shippingMXNNum;
  const cardFeeMXN = order.source === "mercadopago" ? Math.max(0, grandTotalNum - subtotal - shippingMXNNum) : 0;

  // Si el pedido ya estaba pagado, ajusta el stock vendido con la
  // diferencia entre lo que ya se había descontado y lo nuevo (solo
  // artículos "en stock" con SKU, igual que applyStockDecrement).
  if (order.status === "paid") {
    const delta = {};
    for (const it of order.items || []) {
      if (it.enStock && it.sku && it.qty > 0) delta[it.sku] = (delta[it.sku] || 0) - it.qty;
    }
    for (const it of cleanItems) {
      if (it.enStock && it.sku && it.qty > 0) delta[it.sku] = (delta[it.sku] || 0) + it.qty;
    }
    try {
      await adjustStockSold(delta);
    } catch (err) {
      console.error("Error ajustando el stock vendido:", err);
      return jsonResponse(500, { error: "No se pudo ajustar el stock. Intenta de nuevo." });
    }
    await applySheetStockDelta(delta);
  }

  try {
    const updated = await updateOrderFields(orderId, {
      items: cleanItems,
      subtotal,
      subtotalBase: subtotal,
      shippingMXN: shippingMXNNum,
      shippingMXNBase: shippingMXNNum,
      cardFeeMXN,
      grandTotal: grandTotalNum,
      editedAt: new Date().toISOString(),
    });
    if (!updated) return jsonResponse(404, { error: "Pedido no encontrado." });
    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error("Error guardando los cambios del pedido:", err);
    return jsonResponse(500, { error: "No se pudieron guardar los cambios." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
