// Solicitudes de "Shop with Mae" para /admin.html (Encargos USA).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
// GET: regresa { requests } -- todas, la más nueva primero.
// PATCH: body { id, stage?, montos?, pagos?, paquetes?, consolidar?,
//   notaClienta?, notaPrivada?, guia?, paqueteria? } -- edita la
//   solicitud. Cada paquete trae su peso y medidas y cruza por separado:
//   con cobro por peso, el cruce es la suma de los de cada paquete (si
//   Mae no escribe otro). Si la clienta pidió consolidar, se cobran $100
//   por grupo mientras pese hasta 12 kg. Al cambiar de etapa se le avisa
//   a la clienta por correo.

const { checkAdminKey } = require("./lib/admin-auth.js");
const { STAGES, listSwmRequests, mutateSwmRequest } = require("./lib/swm-store.js");
const { pesoCobrable, crucePorPeso, crucePorComision, CONSOLIDACION } = require("./lib/swm-pricing.js");
const { sendEmail, baseEmailHTML, formatPriceMXN } = require("./lib/email.js");

const STAGE_LABEL = {
  solicitud: "Solicitud recibida",
  cotizado: "Cotización lista",
  esperando_paquete: "Esperando tu paquete en EE.UU.",
  recibido: "Paquete recibido en EE.UU.",
  en_camino_mx: "En camino a México",
  enviado: "Enviado por paquetería",
  entregado: "Entregado",
  cancelado: "Cancelada",
};

const money = (v) => Math.max(0, Math.round((parseFloat(v) || 0) * 100) / 100);
const num = (v) => Math.max(0, parseFloat(v) || 0);
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

exports.handler = async (event) => {
  const auth = checkAdminKey(event);
  if (!auth.configured) return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return jsonResponse(401, { error: "Clave de administrador incorrecta." });

  if (event.httpMethod === "GET") {
    try {
      return jsonResponse(200, { requests: await listSwmRequests() });
    } catch (err) {
      console.error("admin-swm GET:", err);
      return jsonResponse(500, { error: "No se pudieron cargar las solicitudes." });
    }
  }
  if (event.httpMethod !== "PATCH") return { statusCode: 405, body: "Method Not Allowed" };

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "JSON inválido." });
  }
  const id = String(body.id || "").trim();
  if (!id) return jsonResponse(400, { error: "Falta la solicitud." });
  if (body.stage && !STAGES.includes(body.stage)) return jsonResponse(400, { error: "Etapa inválida." });

  let prevStage = null;
  try {
    const updated = await mutateSwmRequest(id, (r) => {
      prevStage = r.stage;
      if (Array.isArray(body.paquetes)) {
        r.paquetes = body.paquetes.slice(0, 30).map((x) => {
          const q = { tienda: clip(x.tienda, 80), rastreo: clip(x.rastreo, 80), contenido: clip(x.contenido, 300),
            kg: num(x.kg), alto: num(x.alto), ancho: num(x.ancho), largo: num(x.largo) };
          q.cobrable = pesoCobrable(q.kg, q.alto, q.ancho, q.largo);
          q.cruce = crucePorPeso(q.cobrable);
          return q;
        }).filter((q) => q.tienda || q.rastreo || q.contenido || q.cobrable);
        const total = r.paquetes.reduce((t, q) => t + q.cobrable, 0);
        r.peso = { cobrable: total };
        if (r.cobro === "peso" && !(body.montos && body.montos.cruce != null)) r.montos.cruce = r.paquetes.reduce((t, q) => t + q.cruce, 0);
      }
      if (body.consolidar != null) r.consolidar = !!body.consolidar;
      if (body.montos) {
        ["productos", "cruce", "consolidacion", "envio"].forEach((k) => {
          if (body.montos[k] != null) r.montos[k] = money(body.montos[k]);
        });
        // Por comisión, el cruce es el 15% de los productos si Mae no puso otro.
        if (r.cobro === "comision" && body.montos.productos != null && body.montos.cruce == null) {
          r.montos.cruce = crucePorComision(r.montos.productos);
        }
      }
      if (body.pagos) {
        ["productos", "cruce", "consolidacion", "envio"].forEach((k) => {
          if (body.pagos[k] != null) r.pagos[k] = !!body.pagos[k];
        });
      }
      // Consolidación: $100 por grupo hasta 12 kg (si Mae no puso otro monto).
      r.montos.consolidacion = r.montos.consolidacion || 0;
      if (!r.consolidar) r.montos.consolidacion = 0;
      else if (!(body.montos && body.montos.consolidacion != null) && (r.paquetes || []).length > 1) {
        // Arriba de 12 kg hay un cargo adicional: se pone la base y Mae le
        // suma el extra a mano en el admin.
        r.montos.consolidacion = CONSOLIDACION;
      }
      if (body.notaClienta != null) r.notaClienta = clip(body.notaClienta, 1000);
      if (body.notaPrivada != null) r.notaPrivada = clip(body.notaPrivada, 2000);
      if (body.guia != null) r.guia = clip(body.guia, 80);
      if (body.paqueteria != null) r.paqueteria = clip(body.paqueteria, 40);
      if (body.stage && body.stage !== r.stage) {
        r.stage = body.stage;
        r.history = [...(r.history || []), { at: new Date().toISOString(), stage: body.stage }];
      }
      return r;
    });
    if (!updated) return jsonResponse(404, { error: "No existe esa solicitud." });
    if (body.stage && body.stage !== prevStage) await notifyStage(updated);
    return jsonResponse(200, { request: updated });
  } catch (err) {
    console.error("admin-swm PATCH:", err);
    return jsonResponse(500, { error: "No se pudo guardar." });
  }
};

async function notifyStage(r) {
  const m = r.montos || {};
  const p = r.pagos || {};
  const pendientes = [
    ["Productos", m.productos, p.productos],
    ["Cruce a México", m.cruce, p.cruce],
    ["Consolidación de cajas", m.consolidacion, p.consolidacion],
    ["Envío nacional", m.envio, p.envio],
  ].filter(([, v, pagado]) => v > 0 && !pagado);
  const porPagar = pendientes.length
    ? `<p style="margin:14px 0 6px;font-weight:600;">Por pagar:</p>${pendientes
        .map(([k, v]) => `<div style="display:flex;justify-content:space-between;font-size:14px;"><span>${k}</span><span>${formatPriceMXN(v)}</span></div>`)
        .join("")}`
    : "";
  const guia = r.stage === "enviado" && r.guia ? `<p style="font-size:14px;">Guía${r.paqueteria ? ` ${esc(r.paqueteria)}` : ""}: <b>${esc(r.guia)}</b></p>` : "";
  const nota = r.notaClienta ? `<p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(r.notaClienta)}</p>` : "";
  await sendEmail({
    to: r.email,
    subject: `Shop with Mae ${r.folio}: ${STAGE_LABEL[r.stage] || r.stage}`,
    html: baseEmailHTML(`
      <h2 style="margin:0 0 6px;font-size:20px;">${STAGE_LABEL[r.stage] || r.stage}</h2>
      <p style="margin:0 0 10px;color:#666;font-size:14px;">Tu solicitud ${r.folio} de Shop with Mae se actualizó.</p>
      ${nota}${guia}${porPagar}
      <p style="margin-top:18px;"><a href="https://alpacca.mx/?ver=shopwithmae" style="background:#e8467c;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600;">Ver mi solicitud</a></p>`),
  }).catch((err) => console.error("Correo SWM:", err));
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(obj),
  };
}
