// CRUD de los "encargos USA" (ver lib/usa-orders-store.js) -- para el
// panel privado de /admin.html donde Mae lleva el control de lo que sus
// clientas le encargan comprar en tiendas de Estados Unidos.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// GET: regresa { orders: [...] }
// POST: body { clienteNombre, producto, ... } -- crea un encargo nuevo.
// PATCH: body { id, ...campos a cambiar } -- edita un encargo (ej. su
//   estatus).
// DELETE: body { id } -- borra un encargo (ya entregado o dado de baja).

const { randomUUID } = require("crypto");
const { saveUsaOrder, listUsaOrders, updateUsaOrder, deleteUsaOrder } = require("./lib/usa-orders-store.js");

const VALID_STATUSES = ["por_comprar", "comprado", "en_camino", "entregado"];

exports.handler = async (event) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  }
  const providedKey = event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"]);
  if (providedKey !== adminKey) {
    return jsonResponse(401, { error: "Clave de administrador incorrecta." });
  }

  if (event.httpMethod === "GET") {
    try {
      const orders = await listUsaOrders();
      return jsonResponse(200, { orders });
    } catch (err) {
      console.error("Error listando los encargos USA:", err);
      return jsonResponse(500, { error: "No se pudieron cargar los encargos." });
    }
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return jsonResponse(400, { error: "JSON inválido." });
    }
    const clienteNombre = String(body.clienteNombre || "").trim();
    const producto = String(body.producto || "").trim();
    if (!clienteNombre) return jsonResponse(400, { error: "Falta el nombre de la clienta." });
    if (!producto) return jsonResponse(400, { error: "Falta qué le vas a comprar." });

    const estatus = VALID_STATUSES.includes(body.estatus) ? body.estatus : "por_comprar";
    const now = new Date().toISOString();
    const order = {
      id: randomUUID(),
      clienteNombre,
      clienteTelefono: String(body.clienteTelefono || "").trim(),
      producto,
      tienda: String(body.tienda || "").trim(),
      link: String(body.link || "").trim(),
      cantidad: Number(body.cantidad) > 0 ? Number(body.cantidad) : 1,
      precioEstimadoUSD: Number(body.precioEstimadoUSD) >= 0 ? Number(body.precioEstimadoUSD) : null,
      notas: String(body.notas || "").trim(),
      estatus,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveUsaOrder(order);
      return jsonResponse(200, { order });
    } catch (err) {
      console.error("Error guardando el encargo USA:", err);
      return jsonResponse(500, { error: "No se pudo guardar el encargo." });
    }
  }

  if (event.httpMethod === "PATCH") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return jsonResponse(400, { error: "JSON inválido." });
    }
    const id = String(body.id || "").trim();
    if (!id) return jsonResponse(400, { error: "Falta el id." });

    const patch = {};
    if (body.clienteNombre !== undefined) patch.clienteNombre = String(body.clienteNombre || "").trim();
    if (body.clienteTelefono !== undefined) patch.clienteTelefono = String(body.clienteTelefono || "").trim();
    if (body.producto !== undefined) patch.producto = String(body.producto || "").trim();
    if (body.tienda !== undefined) patch.tienda = String(body.tienda || "").trim();
    if (body.link !== undefined) patch.link = String(body.link || "").trim();
    if (body.cantidad !== undefined) patch.cantidad = Number(body.cantidad) > 0 ? Number(body.cantidad) : 1;
    if (body.precioEstimadoUSD !== undefined) {
      patch.precioEstimadoUSD = Number(body.precioEstimadoUSD) >= 0 ? Number(body.precioEstimadoUSD) : null;
    }
    if (body.notas !== undefined) patch.notas = String(body.notas || "").trim();
    if (body.estatus !== undefined) {
      if (!VALID_STATUSES.includes(body.estatus)) return jsonResponse(400, { error: "Estatus inválido." });
      patch.estatus = body.estatus;
    }

    try {
      const updated = await updateUsaOrder(id, patch);
      if (!updated) return jsonResponse(404, { error: "Encargo no encontrado." });
      return jsonResponse(200, { order: updated });
    } catch (err) {
      console.error("Error actualizando el encargo USA:", err);
      return jsonResponse(500, { error: "No se pudo actualizar el encargo." });
    }
  }

  if (event.httpMethod === "DELETE") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return jsonResponse(400, { error: "JSON inválido." });
    }
    const id = String(body.id || "").trim();
    if (!id) return jsonResponse(400, { error: "Falta el id." });
    try {
      await deleteUsaOrder(id);
      return jsonResponse(200, { ok: true });
    } catch (err) {
      console.error("Error borrando el encargo USA:", err);
      return jsonResponse(500, { error: "No se pudo borrar el encargo." });
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
