// Guías de Envíos Perros que NO salen de la dirección de Mae ni son de un
// pedido de la tienda (ej. una clienta le pide a Mae que le haga la guía
// de unas cajas que salen de otra ciudad). No se ve en /admin.html: solo
// se usa por API. Cada caja es una guía. Se guarda un registro en el store
// "guias-libres" (sin teléfonos completos).
//
// Requiere el header "x-admin-key".
// Body: { origen: {nombre, telefono, calle, numero, colonia, cp, referencias?},
//         destino: {igual}, cajas: [{largo, ancho, alto, peso}],
//         courier, service, nota? }

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./lib/blob-store.js");
const enviosPerros = require("./lib/enviosperros.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

const t = (x, n) => String(x == null ? "" : x).replace(/\s+/g, " ").trim().slice(0, n);
const dig = (x) => String(x || "").replace(/\D/g, "");

function persona(p, correo) {
  const tel = dig(p.telefono).slice(-10);
  return {
    company: t(p.nombre, 35),
    name: t(p.nombre, 35),
    phone: tel,
    email: correo || undefined,
    street: t(p.calle, 35),
    exteriorNumber: t(p.numero, 10) || "S/N",
    interiorNumber: t(p.interior, 10) || undefined,
    neighborhood: t(p.colonia, 25),
    zipCode: dig(p.cp).slice(0, 5),
    references: t(p.referencias, 25) || "Sin referencias",
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (err) { return json(400, { error: "JSON inválido." }); }

  const { courier, service } = body;
  const cajas = Array.isArray(body.cajas) ? body.cajas.slice(0, 5) : [];
  if (!courier || !service || !cajas.length || !body.origen || !body.destino) return json(400, { error: "Faltan datos." });

  let correo = "";
  try { correo = enviosPerros.defaultOrigin().email || ""; } catch (err) { /* sin correo */ }
  const origin = persona(body.origen, correo);
  const destination = persona(body.destino);
  for (const [k, p] of [["remitente", origin], ["destinatario", destination]]) {
    if (!p.name || !p.street || !p.neighborhood || p.zipCode.length !== 5) return json(400, { error: `Faltan datos del ${k}.` });
    if (p.phone.length !== 10) return json(400, { error: `Falta el teléfono (10 dígitos) del ${k}.` });
  }
  for (const c of cajas) {
    if (!(Number(c.peso) > 0) || !(Number(c.largo) > 0) || !(Number(c.ancho) > 0) || !(Number(c.alto) > 0)) {
      return json(400, { error: "Cada caja necesita largo, ancho, alto y peso." });
    }
  }

  const store = getStore({ name: "guias-libres", consistency: "strong", ...blobsClientOptions() });
  const guias = [];
  for (let i = 0; i < cajas.length; i++) {
    const c = cajas[i];
    const dims = { largo: Math.ceil(c.largo), ancho: Math.ceil(c.ancho), alto: Math.ceil(c.alto) };
    try {
      const label = await enviosPerros.createLabel({
        weight: Number(c.peso), courier, service, origin, destination, dims, description: t(body.descripcion, 25) || "Mercancia",
      });
      console.log("guia-libre", JSON.stringify({ caja: i + 1, keys: Object.keys(label || {}) }));
      guias.push({ caja: i + 1, ok: true, guia: label && label.trackingNumber, ...dims, kg: Number(c.peso), extra: pick(label) });
    } catch (err) {
      guias.push({ caja: i + 1, ok: false, error: err.message, detalle: err.body });
      break; // no seguir comprando guías si una falla
    }
  }

  const at = new Date().toISOString();
  const id = `GL-${at.replace(/\D/g, "").slice(0, 14)}`;
  try {
    await store.setJSON(id, {
      id, at, courier, service, nota: t(body.nota, 120),
      origen: { nombre: origin.name, cp: origin.zipCode, tel: `…${origin.phone.slice(-4)}` },
      destino: { nombre: destination.name, cp: destination.zipCode, tel: `…${destination.phone.slice(-4)}` },
      guias: guias.map(({ detalle, ...g }) => g),
    });
  } catch (err) { console.error("No se pudo guardar guia-libre:", err.message); }

  return json(guias.every((g) => g.ok) ? 200 : 502, { id, guias });
};

/* Lo útil de la respuesta de Envíos Perros (ligas de la guía, folio). */
function pick(label) {
  const out = {};
  if (!label || typeof label !== "object") return out;
  for (const [k, v] of Object.entries(label)) {
    if (/url|file|pdf|label|reference|folio|id$/i.test(k) && (typeof v === "string" || typeof v === "number")) out[k] = v;
  }
  return out;
}

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}
