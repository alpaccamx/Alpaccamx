// Genera una guía de envío (con Envíos Perros o Skydropx, según lo que
// haya elegido el admin de la lista de cotizaciones) para un pedido, y
// guarda el número de guía y la paquetería usada en el pedido.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// Body esperado (JSON):
//   {
//     orderId, weight, provider: "enviosperros" | "skydropx",
//     destination,                          -- datos del destinatario
//     // solo si provider === "enviosperros":
//     courier, service,
//     // solo si provider === "skydropx":
//     quotationId, rateId, carrierSlug, serviceCode
//   }
//
// "destination" lo arma /admin.html a partir de los datos del cliente,
// pero el admin puede corregirlo antes de mandarlo (ej. número exterior
// que no venía en el pedido).

const { getOrder, updateOrderFields } = require("./lib/blob-store.js");
const enviosPerros = require("./lib/enviosperros.js");
const skydropx = require("./lib/skydropx.js");
const { notifyCustomerOrderShipped } = require("./lib/whatsapp.js");
const { getCustomerByPhone } = require("./lib/customer-store.js");
const { sendEmail, orderShippedEmailHTML } = require("./lib/email.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

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

  const { orderId, weight, provider, destination } = body;
  const weightNum = Number(weight);
  if (!orderId || !weightNum || weightNum <= 0 || !provider || !destination) {
    return jsonResponse(400, { error: "Faltan datos para generar la guía." });
  }

  const existing = await getOrder(orderId);
  if (!existing) return jsonResponse(404, { error: "Pedido no encontrado." });

  try {
    let trackingNumber;
    let carrierLabel;

    if (provider === "enviosperros") {
      const { courier, service } = body;
      if (!courier || !service) return jsonResponse(400, { error: "Falta la paquetería elegida." });

      const label = await enviosPerros.createLabel({
        weight: weightNum,
        courier,
        service,
        destination: {
          company: destination.name || "Cliente",
          name: destination.name || "Cliente",
          phone: destination.phone,
          street: destination.street,
          exteriorNumber: destination.exteriorNumber || "S/N",
          interiorNumber: destination.interiorNumber || undefined,
          neighborhood: destination.neighborhood,
          zipCode: destination.zipCode,
          references: destination.references || "Sin referencias",
        },
      });
      trackingNumber = label.trackingNumber;
      carrierLabel = `${courier} ${service}`;
    } else if (provider === "skydropx") {
      const { quotationId, rateId, carrierSlug, serviceCode } = body;
      if (!quotationId || !rateId) return jsonResponse(400, { error: "Falta la paquetería elegida." });

      const shipment = await skydropx.createShipment({ quotationId, rateId, carrierSlug, serviceCode });
      // La documentación pública de Skydropx no muestra el formato
      // completo de esta respuesta -- se registra completa en los logs
      // para poder ajustar rápido si el número de guía no sale de aquí.
      console.log("Respuesta de Skydropx al crear el envío:", JSON.stringify(shipment));

      trackingNumber =
        (shipment && (shipment.tracking_number || shipment.master_tracking_number)) ||
        (shipment && shipment.data && shipment.data.tracking_number) ||
        "Revisa el número de guía en tu panel de Skydropx";
      carrierLabel = `${carrierSlug || "Skydropx"} ${serviceCode || ""}`.trim();
    } else {
      return jsonResponse(400, { error: "Paquetería no reconocida." });
    }

    const order = await updateOrderFields(orderId, {
      trackingNumber,
      carrier: carrierLabel,
      shippedAt: new Date().toISOString(),
    });

    // Igual que en admin-add-tracking.js: solo se manda si la clienta
    // tiene cuenta con ese teléfono (los pedidos no guardan correo).
    const customer = await getCustomerByPhone(order.customer?.phone).catch(() => null);
    if (customer?.email) {
      await sendEmail({
        to: customer.email,
        subject: "Tu pedido de Alpacca ya va en camino 📦",
        html: orderShippedEmailHTML(order),
      });
    }
    await notifyCustomerOrderShipped(order);

    return jsonResponse(200, { order });
  } catch (err) {
    console.error(`Error generando guía con ${provider}:`, err.status, err.body || err.message);
    const detail = err.body && (err.body.message || err.body.error);
    return jsonResponse(502, { error: detail || "No se pudo generar la guía." });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
