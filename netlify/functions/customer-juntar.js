// "Mándame todo junto": la clienta le pide a Mae que junte todo lo que
// tiene (pedidos de la tienda o de Corea, paquetes de su casillero,
// compras de personal shopper) en una sola caja. Mae lo ve en la pantalla
// "Por mandar" del admin.
//
// Requiere "Authorization: Bearer <token>" (el de customer-login).
//   GET                  -> { pedida: { at, status } | null }
//   POST { accion: "pedir" }    -> la registra
//   POST { accion: "cancelar" } -> la quita

const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { getCustomerByEmail } = require("./lib/customer-store.js");
const { checkRateLimit } = require("./lib/rate-limit.js");
const { getRecord, saveRecord, mutateRecord } = require("./lib/swm-store.js");

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) return { statusCode: 405, body: "Method Not Allowed" };
  const email = verifyCustomerToken(event);
  if (!email) return json(401, { error: "Inicia sesión para continuar." });
  const me = String(email).toLowerCase();

  try {
    const rec = await getRecord("juntar", me);
    if (event.httpMethod === "GET") return json(200, { pedida: rec && rec.status === "pendiente" ? { at: rec.createdAt, status: rec.status } : null });

    let b;
    try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
    const limit = await checkRateLimit(`juntar:${me}`, { max: 20, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return json(429, { error: "Intenta de nuevo en un rato." });

    if (b.accion === "cancelar") {
      if (rec) await mutateRecord("juntar", me, (j) => { j.status = "cancelada"; return j; });
      return json(200, { pedida: null });
    }
    if (b.accion !== "pedir") return json(400, { error: "No entendí." });
    const customer = await getCustomerByEmail(me).catch(() => null);
    const now = new Date().toISOString();
    if (rec && rec.status === "pendiente") return json(200, { pedida: { at: rec.createdAt, status: "pendiente" } });
    await saveRecord("juntar", {
      id: me, email: me, name: (customer && customer.name) || "", phone: (customer && customer.phone) || "",
      status: "pendiente", createdAt: now, updatedAt: now,
    });
    return json(200, { pedida: { at: now, status: "pendiente" } });
  } catch (err) {
    console.error("customer-juntar:", err);
    return json(500, { error: "No se pudo guardar. Intenta de nuevo." });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
