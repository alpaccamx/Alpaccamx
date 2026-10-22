// "Mis direcciones": las direcciones de envío guardadas en la cuenta de la
// clienta, para no volver a escribirlas en el carrito ni en "Pedir mi
// envío" de la dirección americana.
//
// Requiere el header "Authorization: Bearer <token>".
//   GET                                      -> { direcciones }
//   POST { accion: "guardar", direccion }    -> agrega o actualiza (con id)
//   POST { accion: "principal", id }         -> la marca como principal
//   POST { accion: "borrar", id }
// Todas regresan la lista actualizada. Una dirección que ya existe (misma
// calle y CP) no se duplica: se actualiza.

const crypto = require("crypto");
const { getCustomerByEmail, updateCustomerFields } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { listRecords } = require("./lib/swm-store.js");
const { envioAutomatico } = require("./lib/swm-core.js");

const MAX_DIRECCIONES = 8;
const CAMPOS = { alias: 30, nombre: 100, telefono: 20, calle: 150, colonia: 100, ciudad: 80, estado: 60, cp: 5, referencias: 200 };

const llave = (d) => `${String(d.calle || "").normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "")}|${d.cp}`;

function limpiar(raw) {
  const d = {};
  for (const [k, max] of Object.entries(CAMPOS)) d[k] = String((raw && raw[k]) || "").trim().slice(0, max);
  d.telefono = d.telefono.replace(/[^0-9]/g, "");
  return d;
}

// Siempre hay exactamente una principal (si hay direcciones).
function conPrincipal(list, id) {
  const pid = id || (list.find((d) => d.principal) || list[0] || {}).id;
  return list.map((d) => ({ ...d, principal: d.id === pid }));
}

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) return { statusCode: 405, body: "Method Not Allowed" };
  const email = verifyCustomerToken(event);
  if (!email) return json(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });
  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return json(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  let list = Array.isArray(customer.direcciones) ? customer.direcciones : [];
  if (event.httpMethod === "GET") return json(200, { direcciones: list });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: "JSON inválido." });
  }

  if (body.accion === "guardar") {
    const d = limpiar(body.direccion);
    if (!d.nombre || !d.calle || !d.ciudad || !/^\d{5}$/.test(d.cp)) {
      return json(400, { error: "Completa la dirección: nombre, calle y número, ciudad y código postal de 5 dígitos." });
    }
    const actual = list.find((x) => (body.direccion.id && x.id === body.direccion.id) || llave(x) === llave(d));
    if (actual) {
      list = list.map((x) => (x === actual ? { ...x, ...d, alias: d.alias || x.alias, updatedAt: new Date().toISOString() } : x));
    } else {
      if (list.length >= MAX_DIRECCIONES) return json(400, { error: `Puedes guardar hasta ${MAX_DIRECCIONES} direcciones. Borra alguna para agregar otra.` });
      list = [...list, { id: crypto.randomBytes(6).toString("hex"), ...d, createdAt: new Date().toISOString() }];
    }
    const id = (actual || list[list.length - 1]).id;
    list = conPrincipal(list, body.direccion.principal ? id : null);
  } else if (body.accion === "principal") {
    if (!list.some((x) => x.id === body.id)) return json(404, { error: "No encontramos esa dirección." });
    list = conPrincipal(list, body.id);
  } else if (body.accion === "borrar") {
    list = conPrincipal(list.filter((x) => x.id !== body.id));
  } else {
    return json(400, { error: "Acción no válida." });
  }

  try {
    await updateCustomerFields(email, { direcciones: list });
  } catch (err) {
    console.error("Error guardando las direcciones de la clienta:", err);
    return json(500, { error: "No se pudo guardar. Intenta de nuevo." });
  }
  // Dirección americana: si ya tenía paquetes en México esperando su
  // dirección, su envío a casa se arma solo.
  if (body.accion === "guardar") {
    try {
      const listos = (await listRecords("paquete", { email })).filter((p) => p.status === "recibido" && p.enMexicoAt);
      for (const p of listos) await envioAutomatico(p.id);
    } catch (err) { console.error("swm envío automático:", err); }
  }
  return json(200, { direcciones: list });
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
