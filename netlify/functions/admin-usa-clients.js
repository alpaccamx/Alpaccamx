// CRUD de los perfiles de clientas de "Encargos USA" (ver
// lib/usa-clients-store.js) -- para el panel privado de /admin.html donde
// Mae lleva el control de lo que sus clientas le encargan comprar en
// tiendas de Estados Unidos. Cada clienta trae su propia lista de
// pedidos (ver admin-usa-pedidos.js para agregar/editar/borrar uno).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// GET: regresa { clients: [...] } (cada uno con su lista "pedidos").
// POST: body { nombre, telefono?, notas? } -- crea una clienta nueva.
// PATCH: body { id, nombre?, telefono?, notas? } -- edita los datos del
//   perfil (no toca sus pedidos).
// DELETE: body { id } -- borra a la clienta y todo su historial.

const { randomUUID } = require("crypto");
const { saveUsaClient, listUsaClients, mutateUsaClient, deleteUsaClient } = require("./lib/usa-clients-store.js");

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
      const clients = await listUsaClients();
      return jsonResponse(200, { clients });
    } catch (err) {
      console.error("Error listando clientas USA:", err);
      return jsonResponse(500, { error: "No se pudieron cargar las clientas." });
    }
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return jsonResponse(400, { error: "JSON inválido." });
    }
    const nombre = String(body.nombre || "").trim();
    if (!nombre) return jsonResponse(400, { error: "Falta el nombre de la clienta." });

    const now = new Date().toISOString();
    const client = {
      id: randomUUID(),
      nombre,
      telefono: String(body.telefono || "").trim(),
      notas: String(body.notas || "").trim(),
      pedidos: [],
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveUsaClient(client);
      return jsonResponse(200, { client });
    } catch (err) {
      console.error("Error guardando clienta USA:", err);
      return jsonResponse(500, { error: "No se pudo guardar la clienta." });
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
    if (body.nombre !== undefined && !String(body.nombre).trim()) {
      return jsonResponse(400, { error: "Falta el nombre de la clienta." });
    }

    try {
      const updated = await mutateUsaClient(id, (client) => {
        const next = { ...client };
        if (body.nombre !== undefined) next.nombre = String(body.nombre).trim();
        if (body.telefono !== undefined) next.telefono = String(body.telefono || "").trim();
        if (body.notas !== undefined) next.notas = String(body.notas || "").trim();
        return next;
      });
      if (!updated) return jsonResponse(404, { error: "Clienta no encontrada." });
      return jsonResponse(200, { client: updated });
    } catch (err) {
      console.error("Error actualizando clienta USA:", err);
      return jsonResponse(500, { error: "No se pudo actualizar la clienta." });
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
      await deleteUsaClient(id);
      return jsonResponse(200, { ok: true });
    } catch (err) {
      console.error("Error borrando clienta USA:", err);
      return jsonResponse(500, { error: "No se pudo borrar la clienta." });
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
