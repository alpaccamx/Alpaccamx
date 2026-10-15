// Casillero "Shop with Mae" de la clienta que inició sesión.
//
// Requiere "Authorization: Bearer <token>" (el de customer-login).
//
// GET  → { paquetes, compras, envios, name, almacenajeDias, casillero }
// POST { accion, ... }:
//   registrar_paquete { tienda, rastreo, contenido, valorUSD, cobro, aceptaRestricciones }
//   solicitar_compra  { links, notas, cobro, aceptaRestricciones }
//   solicitar_envio   { paqueteIds[], consolidar, direccion{...} }
//   pagar             { kind: "compra"|"envio", id, metodo: "mercadopago"|"transferencia" }
//                     → con Mercado Pago regresa { redirectUrl }
//   comprobante       { kind, id, filename, contentType, dataBase64 }
//   completar_paquete { id, contenido, valorUSD, cobro }  (paquete que llegó sin registrar)
//   cancelar          { kind, id }

const { randomUUID } = require("crypto");
const { getCustomerByEmail } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { checkRateLimit } = require("./lib/rate-limit.js");
const { detectFileType } = require("./lib/file-signature.js");
const { nextFolio, saveRecord, getRecord, mutateRecord, saveFile, casilleroDe } = require("./lib/swm-store.js");
const { ALMACENAJE_DIAS, cotizacionSugerida, crearPreferenciaMP, publico, todoDe } = require("./lib/swm-core.js");

const COBROS = ["peso", "comision"];
const MAX_BYTES = 5 * 1024 * 1024;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const now = () => new Date().toISOString();

exports.handler = async (event) => {
  const email = verifyCustomerToken(event);
  if (!email) return json(401, { error: "Inicia sesión para usar Shop with Mae." });
  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return json(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });
  const me = customer.email;

  if (event.httpMethod === "GET") {
    try {
      const [all, casillero] = await Promise.all([todoDe(me), casilleroDe(me, customer.name).catch((err) => { console.error("swm casillero:", err); return ""; })]);
      return json(200, {
        casillero,
        paquetes: all.paquetes.map(publico), compras: all.compras.map(publico), envios: all.envios.map(publico),
        name: customer.name || "", phone: customer.phone || "", almacenajeDias: ALMACENAJE_DIAS,
      });
    } catch (err) {
      console.error("swm-client GET:", err);
      return json(500, { error: "No se pudo cargar tu casillero." });
    }
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const limit = await checkRateLimit(`swm:${me}`, { max: 60, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return json(429, { error: "Demasiados intentos en poco tiempo. Espera un poco e intenta de nuevo." });

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
  const base = { email: me, name: customer.name || "", phone: customer.phone || "" };

  try {
    switch (b.accion) {
      case "registrar_paquete": {
        if (!b.aceptaRestricciones) return json(400, { error: "Confirma que tu paquete no trae nada ilegal ni artículos de cristal, muebles ni pallets." });
        const tienda = clip(b.tienda, 80); const rastreo = clip(b.rastreo, 80);
        if (!rastreo) return json(400, { error: "Pon el número de rastreo (guía) de tu paquete: sin él no podemos identificarlo cuando llegue." });
        const rec = {
          id: randomUUID(), folio: await nextFolio("paquete"), ...base, origen: "propio",
          tienda, rastreo, contenido: clip(b.contenido, 300), valorUSD: Math.max(0, Math.min(100000, parseFloat(b.valorUSD) || 0)),
          cobro: COBROS.includes(b.cobro) ? b.cobro : "peso", status: "registrado",
          kg: 0, alto: 0, ancho: 0, largo: 0, cobrable: 0, fotos: [], notaClienta: "", notaPrivada: "",
          history: [{ at: now(), status: "registrado" }], createdAt: now(), updatedAt: now(),
        };
        await saveRecord("paquete", rec);
        return json(200, { paquete: publico(rec) });
      }

      case "completar_paquete": {
        const rec = await getRecord("paquete", String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontramos ese paquete." });
        if (!rec.datosPendientes) return json(409, { error: "Ese paquete ya tiene sus datos." });
        const contenido = clip(b.contenido, 300);
        const valorUSD = Math.max(0, Math.min(100000, parseFloat(b.valorUSD) || 0));
        if (!contenido || !valorUSD) return json(400, { error: "Dime qué trae tu paquete y cuánto costó (USD)." });
        const updated = await mutateRecord("paquete", rec.id, (p) => {
          p.contenido = contenido; p.valorUSD = valorUSD;
          if (COBROS.includes(b.cobro)) p.cobro = b.cobro;
          p.datosPendientes = false;
          p.history = [...(p.history || []), { at: now(), status: "datos_completados" }];
          return p;
        });
        return json(200, { paquete: publico(updated) });
      }

      case "solicitar_compra": {
        if (!b.aceptaRestricciones) return json(400, { error: "Confirma que tu pedido no trae nada ilegal ni artículos de cristal, muebles ni pallets." });
        const links = clip(b.links, 4000);
        if (!links) return json(400, { error: "Pega los links de los productos que quieres." });
        const rec = {
          id: randomUUID(), folio: await nextFolio("compra"), ...base, links, notas: clip(b.notas, 1000),
          cobro: COBROS.includes(b.cobro) ? b.cobro : "peso", status: "solicitud",
          cotizacion: null, pago: null, paqueteIds: [], notaClienta: "", notaPrivada: "",
          history: [{ at: now(), status: "solicitud" }], createdAt: now(), updatedAt: now(),
        };
        await saveRecord("compra", rec);
        return json(200, { compra: publico(rec) });
      }

      case "solicitar_envio": {
        const ids = [...new Set((Array.isArray(b.paqueteIds) ? b.paqueteIds : []).map(String))].slice(0, 40);
        if (!ids.length) return json(400, { error: "Elige al menos un paquete para enviar." });
        const d = b.direccion || {};
        const direccion = {
          nombre: clip(d.nombre, 100), telefono: clip(d.telefono, 30), calle: clip(d.calle, 150), colonia: clip(d.colonia, 100),
          ciudad: clip(d.ciudad, 80), estado: clip(d.estado, 60), cp: clip(d.cp, 10), referencias: clip(d.referencias, 200),
        };
        if (!direccion.nombre || !direccion.calle || !direccion.ciudad || !/^\d{5}$/.test(direccion.cp) || !direccion.telefono) {
          return json(400, { error: "Completa tu dirección: nombre, teléfono, calle y número, ciudad y código postal de 5 dígitos." });
        }
        const paquetes = await Promise.all(ids.map((id) => getRecord("paquete", id)));
        if (paquetes.some((p) => !p || p.email !== me || p.status !== "recibido")) {
          return json(409, { error: "Solo puedes enviar paquetes tuyos que ya llegaron al almacén." });
        }
        const pendiente = paquetes.find((p) => p.datosPendientes);
        if (pendiente) return json(409, { error: `Antes de enviar, completa los datos de ${pendiente.folio} (qué trae y cuánto costó).` });
        const consolidar = !!b.consolidar && paquetes.length > 1;
        const sug = await cotizacionSugerida(paquetes, consolidar);
        const rec = {
          id: randomUUID(), folio: await nextFolio("envio"), ...base, paqueteIds: ids, consolidar, direccion,
          status: "solicitado", sugerido: { cruce: sug.cruce, consolidacion: sug.consolidacion, sinRegistro: sug.sinRegistro, kg: sug.kg },
          cotizacion: null, pago: null, paqueteria: "", guia: "", notaClienta: "", notaPrivada: "",
          history: [{ at: now(), status: "solicitado" }], createdAt: now(), updatedAt: now(),
        };
        await saveRecord("envio", rec);
        await Promise.all(ids.map((id) => mutateRecord("paquete", id, (p) => {
          if (p.status !== "recibido") return null;
          p.status = "en_envio"; p.envioId = rec.id; return p;
        })));
        return json(200, { envio: publico(rec) });
      }

      case "pagar": {
        const kind = b.kind === "compra" ? "compra" : b.kind === "envio" ? "envio" : null;
        if (!kind) return json(400, { error: "Pago inválido." });
        const metodo = b.metodo === "mercadopago" ? "mercadopago" : "transferencia";
        const rec = await getRecord(kind, String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontramos esa cotización." });
        if (rec.status !== "cotizado" || !rec.cotizacion) return json(409, { error: "Todavía no hay cotización para pagar." });
        if (rec.pago && rec.pago.status === "pagado") return json(409, { error: "Esto ya está pagado." });
        let redirectUrl = null;
        if (metodo === "mercadopago") redirectUrl = await crearPreferenciaMP(kind, rec, event);
        const updated = await mutateRecord(kind, rec.id, (r) => {
          if (r.pago && r.pago.status === "pagado") return null;
          r.pago = { ...(r.pago || {}), status: r.pago && r.pago.status === "revision" ? "revision" : "pendiente", metodo, monto: r.cotizacion.total, elegidoAt: now() };
          return r;
        });
        return json(200, { redirectUrl, [kind]: publico(updated) });
      }

      case "comprobante": {
        const kind = b.kind === "compra" ? "compra" : b.kind === "envio" ? "envio" : null;
        if (!kind || !b.dataBase64) return json(400, { error: "Falta el archivo." });
        const rec = await getRecord(kind, String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontramos esa cotización." });
        if (rec.status !== "cotizado") return json(409, { error: "Esto ya no acepta comprobantes." });
        let buf;
        try { buf = Buffer.from(String(b.dataBase64), "base64"); } catch { return json(400, { error: "El archivo no se pudo leer." }); }
        if (!buf.length || buf.length > MAX_BYTES) return json(400, { error: "El archivo debe pesar menos de 5 MB." });
        const real = detectFileType(buf);
        if (!real) return json(400, { error: "Solo se aceptan imágenes o archivos PDF." });
        const ct = real === "pdf" ? "application/pdf" : /^image\/[a-z0-9.+-]+$/i.test(b.contentType || "") ? b.contentType : "image/jpeg";
        await saveFile(`comprobante/${kind}/${rec.id}`, buf, ct);
        const updated = await mutateRecord(kind, rec.id, (r) => {
          r.pago = { ...(r.pago || {}), status: "revision", metodo: "transferencia", monto: r.cotizacion.total, comprobanteAt: now(), comprobanteTipo: ct };
          return r;
        });
        return json(200, { [kind]: publico(updated) });
      }

      case "cancelar": {
        const kind = ["paquete", "compra", "envio"].includes(b.kind) ? b.kind : null;
        if (!kind) return json(400, { error: "Inválido." });
        const rec = await getRecord(kind, String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontrado." });
        const cancelable = { paquete: ["registrado"], compra: ["solicitud", "cotizado"], envio: ["solicitado", "cotizado"] }[kind];
        if (!cancelable.includes(rec.status) || (rec.pago && rec.pago.status !== "pendiente")) return json(409, { error: "Esto ya no se puede cancelar desde aquí; escríbele a Mae." });
        const updated = await mutateRecord(kind, rec.id, (r) => {
          r.status = "cancelado"; r.history = [...(r.history || []), { at: now(), status: "cancelado", por: "clienta" }]; return r;
        });
        if (kind === "envio") {
          await Promise.all((rec.paqueteIds || []).map((id) => mutateRecord("paquete", id, (p) => {
            if (p.envioId !== rec.id) return null;
            p.status = "recibido"; p.envioId = null; return p;
          })));
        }
        return json(200, { [kind]: publico(updated) });
      }

      default:
        return json(400, { error: "Acción inválida." });
    }
  } catch (err) {
    console.error("swm-client POST:", b && b.accion, err);
    return json(500, { error: err.message && /Mercado Pago/.test(err.message) ? err.message : "Algo falló. Intenta de nuevo." });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
