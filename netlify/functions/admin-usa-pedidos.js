// Agrega/edita/borra un pedido dentro del perfil de una clienta de
// "Encargos USA" (ver lib/usa-clients-store.js y admin-usa-clients.js) --
// cada clienta guarda su propia lista de pedidos, y este endpoint solo
// modifica esa lista (nunca los datos del perfil en sí).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// POST: body { clientId, producto, tienda?, link?, cantidad?,
//   precioEstimadoUSD?, notas?, estatus? } -- agrega un pedido nuevo.
// PATCH: body { clientId, pedidoId, ...campos a cambiar } -- edita un
//   pedido (incluye cambiar el estatus).
// DELETE: body { clientId, pedidoId } -- quita un pedido de la lista.
//
// Las tres regresan { client, ... } con la clienta ya actualizada
// completa, para que /admin.html no tenga que volver a pedirla.

const { randomUUID } = require("crypto");
const { mutateUsaClient } = require("./lib/usa-clients-store.js");

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

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }
  const clientId = String(body.clientId || "").trim();
  if (!clientId) return jsonResponse(400, { error: "Falta la clienta." });

  if (event.httpMethod === "POST") {
    const producto = String(body.producto || "").trim();
    if (!producto) return jsonResponse(400, { error: "Falta qué le vas a comprar." });
    const estatus = VALID_STATUSES.includes(body.estatus) ? body.estatus : "por_comprar";
    const now = new Date().toISOString();
    const pedido = {
      id: randomUUID(),
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
      const client = await mutateUsaClient(clientId, (c) => ({ ...c, pedidos: [...(c.pedidos || []), pedido] }));
      if (!client) return jsonResponse(404, { error: "Clienta no encontrada." });
      return jsonResponse(200, { client, pedido });
    } catch (err) {
      console.error("Error agregando pedido USA:", err);
      return jsonResponse(500, { error: "No se pudo agregar el pedido." });
    }
  }

  if (event.httpMethod === "PATCH") {
    const pedidoId = String(body.pedidoId || "").trim();
    if (!pedidoId) return jsonResponse(400, { error: "Falta el pedido." });
    if (body.estatus !== undefined && !VALID_STATUSES.includes(body.estatus)) {
      return jsonResponse(400, { error: "Estatus inválido." });
    }

    let found = false;
    try {
      const client = await mutateUsaClient(clientId, (c) => {
        const pedidos = (c.pedidos || []).map((p) => {
          if (p.id !== pedidoId) return p;
          found = true;
          const next = { ...p, updatedAt: new Date().toISOString() };
          if (body.producto !== undefined) next.producto = String(body.producto || "").trim();
          if (body.tienda !== undefined) next.tienda = String(body.tienda || "").trim();
          if (body.link !== undefined) next.link = String(body.link || "").trim();
          if (body.cantidad !== undefined) next.cantidad = Number(body.cantidad) > 0 ? Number(body.cantidad) : 1;
          if (body.precioEstimadoUSD !== undefined) {
            next.precioEstimadoUSD = Number(body.precioEstimadoUSD) >= 0 ? Number(body.precioEstimadoUSD) : null;
          }
          if (body.notas !== undefined) next.notas = String(body.notas || "").trim();
          if (body.estatus !== undefined) next.estatus = body.estatus;
          return next;
        });
        return { ...c, pedidos };
      });
      if (!client) return jsonResponse(404, { error: "Clienta no encontrada." });
      if (!found) return jsonResponse(404, { error: "Pedido no encontrado." });
      return jsonResponse(200, { client, pedido: client.pedidos.find((p) => p.id === pedidoId) });
    } catch (err) {
      console.error("Error actualizando pedido USA:", err);
      return jsonResponse(500, { error: "No se pudo actualizar el pedido." });
    }
  }

  if (event.httpMethod === "DELETE") {
    const pedidoId = String(body.pedidoId || "").trim();
    if (!pedidoId) return jsonResponse(400, { error: "Falta el pedido." });
    try {
      const client = await mutateUsaClient(clientId, (c) => ({
        ...c,
        pedidos: (c.pedidos || []).filter((p) => p.id !== pedidoId),
      }));
      if (!client) return jsonResponse(404, { error: "Clienta no encontrada." });
      return jsonResponse(200, { client });
    } catch (err) {
      console.error("Error borrando pedido USA:", err);
      return jsonResponse(500, { error: "No se pudo borrar el pedido." });
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
