// Solicitudes de "Shop with Mae" de la clienta que inició sesión.
//
// Requiere el header "Authorization: Bearer <token>" (el de
// customer-login / customer-signup).
//
// GET: regresa { requests, name } -- sus solicitudes (sin las notas
//   privadas de Mae).
// POST: body { tipo, cobro, paquetes?, links?, valorUSD?, notas,
//   aceptaRestricciones, consolidar? } -- crea una solicitud nueva. Cada
//   paquete cruza por separado; "consolidar" pide juntarlos en un solo
//   envío nacional ($100 por grupo hasta 12 kg). Mae la ve en
//   /admin.html → Encargos USA.

const { randomUUID } = require("crypto");
const { getCustomerByEmail } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { checkRateLimit } = require("./lib/rate-limit.js");
const { nextFolio, saveSwmRequest, listSwmRequests } = require("./lib/swm-store.js");

const TIPOS = ["yo_compro", "compra_mae"];
const COBROS = ["comision", "peso"];
const PRIVATE_FIELDS = ["notaPrivada", "history"];

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

exports.handler = async (event) => {
  const email = verifyCustomerToken(event);
  if (!email) return jsonResponse(401, { error: "Inicia sesión para usar Shop with Mae." });
  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return jsonResponse(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  if (event.httpMethod === "GET") {
    try {
      const requests = await listSwmRequests({ email: customer.email });
      return jsonResponse(200, { requests: requests.map(publicRequest), name: customer.name });
    } catch (err) {
      console.error("swm-requests GET:", err);
      return jsonResponse(500, { error: "No se pudieron cargar tus solicitudes." });
    }
  }

  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const limit = await checkRateLimit(`swm-request:${customer.email}`, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return jsonResponse(429, { error: "Demasiadas solicitudes en poco tiempo. Espera un poco e intenta de nuevo." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "JSON inválido." });
  }
  const tipo = TIPOS.includes(body.tipo) ? body.tipo : null;
  const cobro = COBROS.includes(body.cobro) ? body.cobro : null;
  if (!tipo) return jsonResponse(400, { error: "Elige si tú compras o si quieres que Mae compre por ti." });
  if (!cobro) return jsonResponse(400, { error: "Elige cómo quieres pagar el cruce." });
  if (!body.aceptaRestricciones) return jsonResponse(400, { error: "Confirma que tu pedido no trae artículos de cristal, muebles ni pallets." });

  const paquetes = (Array.isArray(body.paquetes) ? body.paquetes : [])
    .slice(0, 20)
    .map((p) => ({ tienda: clip(p.tienda, 80), rastreo: clip(p.rastreo, 80), contenido: clip(p.contenido, 300) }))
    .filter((p) => p.tienda || p.rastreo || p.contenido);
  const links = clip(body.links, 4000);
  if (tipo === "yo_compro" && !paquetes.length) return jsonResponse(400, { error: "Agrega al menos un paquete (tienda y número de rastreo)." });
  if (tipo === "compra_mae" && !links) return jsonResponse(400, { error: "Pega los links de los productos que quieres." });
  const valorUSD = Math.max(0, Math.min(100000, parseFloat(body.valorUSD) || 0));

  const now = new Date().toISOString();
  const request = {
    id: randomUUID(),
    folio: await nextFolio(),
    email: customer.email,
    name: customer.name || "",
    phone: customer.phone || "",
    tipo,
    cobro,
    paquetes,
    links,
    valorUSD,
    notas: clip(body.notas, 1000),
    consolidar: !!body.consolidar,
    stage: "solicitud",
    montos: { productos: 0, cruce: 0, consolidacion: 0, envio: 0 },
    pagos: { productos: false, cruce: false, consolidacion: false, envio: false },
    peso: { kg: 0, alto: 0, ancho: 0, largo: 0, cobrable: 0 },
    notaClienta: "",
    guia: "",
    paqueteria: "",
    notaPrivada: "",
    history: [{ at: now, stage: "solicitud" }],
    createdAt: now,
    updatedAt: now,
  };
  try {
    await saveSwmRequest(request);
    return jsonResponse(200, { request: publicRequest(request) });
  } catch (err) {
    console.error("swm-requests POST:", err);
    return jsonResponse(500, { error: "No se pudo guardar tu solicitud. Intenta de nuevo." });
  }
};

function publicRequest(r) {
  const out = { ...r };
  PRIVATE_FIELDS.forEach((k) => delete out[k]);
  return out;
}

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(obj),
  };
}
