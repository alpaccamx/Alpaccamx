// Casillero "Shop with Mae" de la clienta que inició sesión.
//
// Requiere "Authorization: Bearer <token>" (el de customer-login).
//
// GET  → { paquetes, compras, envios, name, almacenajeDias, casillero }
// POST { accion, ... }:
//   registrar_paquete { tienda, paqueteria, rastreo, articulos[], valorTotal, moneda, facturas?, cobro, aceptaRestricciones }
//                     facturas = hasta 10 { filename, contentType, dataBase64 } (capturas o PDF)
//                     y/o articulos = [{ desc, cant, costo }] (obligatorio si no sube nada);
//                     valorTotal/moneda = lo que costaron los artículos con tax, sin envío
//                     (también es la base del 15% del cobro "comision", convertida a pesos).
//   solicitar_compra  { links, notas, cobro, aceptaRestricciones }
//   solicitar_envio   { paqueteIds[], consolidar, direccion{...} }
//   pagar             { kind: "compra"|"envio", id, metodo: "mercadopago"|"transferencia" }
//                     → con Mercado Pago regresa { redirectUrl }
//   comprobante       { kind, id, filename, contentType, dataBase64 }
//   completar_paquete { id, articulos[], valorTotal, moneda, facturas?, cobro }  (paquete que llegó sin registrar)
//   editar_paquete    { id, tienda?, paqueteria?, rastreo?, articulos[], valorTotal, moneda, facturas?, quitarArchivos?, cobro }
//                     (mientras va en camino, o cuando Mae le pidió corregir sus datos)
//   cancelar          { kind, id }
//   pedir_revision    { id }  (abrir el paquete y mandar fotos del contenido; cargo REVISION_FOTOS)
//   aplicar_cupon     { kind, id, code }  (descuento sobre una cotización sin pagar)
//   pedir_separar     { id, nota }  (mandar solo algunos artículos; cargo SEPARAR al separarlo)

const { randomUUID } = require("crypto");
const { getCustomerByEmail } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { checkRateLimit } = require("./lib/rate-limit.js");
const { detectFileType } = require("./lib/file-signature.js");
const { nextFolio, saveRecord, getRecord, listRecords, mutateRecord, saveFile, casilleroDe } = require("./lib/swm-store.js");
const { ALMACENAJE_DIAS, cotizacionSugerida, crearPreferenciaMP, publico, todoDe, tiposDeCambio, lealtadDe, codigoReferido, premiosDe } = require("./lib/swm-core.js");
const { REVISION_FOTOS, SEPARAR, COMISION_PCT, REFERIDO_MXN } = require("./lib/swm-pricing.js");
const { getCoupon, checkCoupon, discountFor, redeemCoupon } = require("./lib/coupons.js");

// "auto": se cobra lo más barato entre por peso y el 15% (lo de ahora).
const COBROS = ["auto", "peso", "comision"];
const MAX_BYTES = 5 * 1024 * 1024;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const now = () => new Date().toISOString();
const MONEDAS = ["USD", "MXN", "KRW", "EUR", "JPY", "CNY"];
const MAX_ARCHIVOS = 10;
const MAX_ARCHIVO = 1.6 * 1024 * 1024; // 1.5 MB en la página, con margen
const MAX_TOTAL = 4.2 * 1024 * 1024;

/* Lo que la clienta declara que trae su paquete: hasta 10 capturas o PDF
   de la factura/resumen de compra o, si no sube nada, la lista de
   artículos con su costo; más el valor total de los artículos (con tax, sin envío)
   en su moneda. Regresa { error } o { datos, facturas }. */
function leerDeclaracion(b, cobro, previos = 0) {
  const rows = (Array.isArray(b.articulos) ? b.articulos : []).slice(0, 60).map((a) => ({
    desc: clip(a && a.desc, 120),
    cant: Math.max(1, Math.min(999, parseInt(a && a.cant, 10) || 1)),
    costo: Math.max(0, Math.min(1e9, parseFloat(a && a.costo) || 0)),
  })).filter((a) => a.desc || a.costo);
  if (rows.some((a) => !a.desc || !(a.costo > 0))) return { error: "A cada artículo ponle qué es y cuánto costó." };
  const lista = Array.isArray(b.facturas) ? b.facturas : b.factura ? [b.factura] : [];
  if (lista.length + previos > MAX_ARCHIVOS) return { error: `Puedes tener hasta ${MAX_ARCHIVOS} capturas o archivos${previos ? ` (ya tienes ${previos})` : ""}.` };
  const facturas = [];
  let total = 0;
  for (const f of lista) {
    if (!f || !f.dataBase64) continue;
    let buf;
    try { buf = Buffer.from(String(f.dataBase64), "base64"); } catch { return { error: "Un archivo no se pudo leer." }; }
    if (!buf.length || buf.length > MAX_ARCHIVO) return { error: "Cada captura o archivo debe pesar menos de 1.5 MB." };
    total += buf.length;
    if (total > MAX_TOTAL) return { error: "Tus archivos juntos deben pesar menos de 4 MB." };
    const real = detectFileType(buf);
    if (!real) return { error: "Los archivos deben ser imágenes (capturas) o PDF." };
    const ct = real === "pdf" ? "application/pdf" : /^image\/[a-z0-9.+-]+$/i.test(f.contentType || "") ? f.contentType : "image/jpeg";
    facturas.push({ buf, ct, nombre: clip(f.filename, 120) });
  }
  if (!rows.length && !facturas.length && !previos) return { error: "Sube capturas o la factura de tu compra, o escribe cada artículo con lo que costó." };
  const valorTotal = Math.max(0, Math.min(1e9, parseFloat(b.valorTotal) || 0));
  const moneda = MONEDAS.includes(b.moneda) ? b.moneda : "";
  if (!(valorTotal > 0) || !moneda) return { error: "Escribe el valor total de los artículos (con tax, sin envío) y en qué moneda." };
  // El 15% se cobra sobre este mismo valor, convertido a pesos con el tipo
  // de cambio de su moneda (ver valorEnPesos en swm-core.js).
  const valorUSD = moneda === "USD" ? valorTotal : 0;
  const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const contenido = clip(rows.length
    ? rows.map((a) => `${a.cant > 1 ? `${a.cant}× ` : ""}${a.desc} (${fmt(a.costo)} ${moneda})`).join(", ")
    : `Ver ${facturas.length + previos === 1 ? "captura" : `${facturas.length + previos} capturas`}`, 300);
  return { datos: { articulos: rows, valorTotal, moneda, contenido, valorUSD }, facturas };
}

/* Guarda las capturas/PDF en factura/paquete/<id>/<n> y regresa su lista
   (vacía si no subió nada). */
async function guardarFacturas(id, facturas, desde = 0) {
  const at = now();
  const out = [];
  for (const [i, f] of facturas.entries()) {
    const n = desde + i;
    await saveFile(`factura/paquete/${id}/${n}`, f.buf, f.ct);
    out.push({ n, tipo: f.ct, nombre: f.nombre, at });
  }
  return out;
}

/* ¿Ya hay otro paquete (no cancelado) con esa guía? Se comparan sin
   espacios ni guiones y sin importar mayúsculas. */
const normGuia = (g) => String(g || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function guiaRepetida(rastreo, me, exceptId) {
  const g = normGuia(rastreo);
  if (g.length < 6) return null;
  const otro = (await listRecords("paquete")).find((p) => p.id !== exceptId && p.status !== "cancelado" && normGuia(p.rastreo) === g);
  if (!otro) return null;
  return otro.email === me
    ? `Ya registraste esta guía en ${otro.folio}. Si te equivocaste, edita ese paquete.`
    : "Esta guía ya está registrada en otro casillero. Revisa el número; si es tuya, escríbele a Mae.";
}

// Puede editar mientras va en camino, o si Mae le pidió corregir.
const puedeEditar = (p) => p.origen !== "compra" && !p.datosPendientes
  && (p.status === "registrado" || (p.correccion && p.correccion.estado === "pedida" && p.status === "recibido"));

exports.handler = async (event) => {
  const email = verifyCustomerToken(event);
  if (!email) return json(401, { error: "Inicia sesión para usar tu dirección americana." });
  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return json(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });
  const me = customer.email;

  if (event.httpMethod === "GET") {
    try {
      const [all, casillero] = await Promise.all([todoDe(me), casilleroDe(me, customer.name).catch((err) => { console.error("swm casillero:", err); return ""; })]);
      const [referido, premios] = await Promise.all([
        codigoReferido(me, casillero).catch((err) => { console.error("swm referido:", err); return ""; }),
        premiosDe(me).catch(() => []),
      ]);
      return json(200, {
        lealtad: lealtadDe(all.envios), referido: referido ? { code: referido, monto: REFERIDO_MXN } : null, premios,
        casillero,
        paquetes: all.paquetes.map(publico), compras: all.compras.map(publico), envios: all.envios.map(publico),
        name: customer.name || "", phone: customer.phone || "", almacenajeDias: ALMACENAJE_DIAS,
        tiposCambio: await tiposDeCambio(), comisionPct: COMISION_PCT,
        precios: { revision: REVISION_FOTOS, separar: SEPARAR },
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
        const paqueteria = clip(b.paqueteria, 40);
        if (!paqueteria) return json(400, { error: "Elige con qué paquetería viene tu paquete (UPS, USPS, FedEx, Amazon...)." });
        if (!rastreo) return json(400, { error: "Pon el número de rastreo (guía) de tu paquete: sin él no podemos identificarlo cuando llegue." });
        const cobro = COBROS.includes(b.cobro) ? b.cobro : "auto";
        const dec = leerDeclaracion(b, cobro);
        if (dec.error) return json(400, { error: dec.error });
        const repetida = await guiaRepetida(rastreo, me);
        if (repetida) return json(409, { error: repetida });
        const id = randomUUID();
        const facturas = await guardarFacturas(id, dec.facturas);
        const rec = {
          id, folio: await nextFolio("paquete"), ...base, origen: "propio",
          tienda, paqueteria, rastreo, ...dec.datos, facturas,
          cobro, status: "registrado",
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
        const cobro = COBROS.includes(b.cobro) ? b.cobro : rec.cobro;
        const dec = leerDeclaracion(b, cobro);
        if (dec.error) return json(400, { error: dec.error });
        const facturas = await guardarFacturas(rec.id, dec.facturas);
        const updated = await mutateRecord("paquete", rec.id, (p) => {
          Object.assign(p, dec.datos);
          if (facturas.length) { p.facturas = facturas; delete p.factura; }
          p.cobro = cobro;
          p.datosPendientes = false;
          p.history = [...(p.history || []), { at: now(), status: "datos_completados" }];
          return p;
        });
        return json(200, { paquete: publico(updated) });
      }

      case "editar_paquete": {
        const rec = await getRecord("paquete", String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontramos ese paquete." });
        if (!puedeEditar(rec)) return json(409, { error: "Este paquete ya no se puede editar desde aquí; escríbele a Mae." });
        const cobro = rec.crucePagado ? rec.cobro : COBROS.includes(b.cobro) ? b.cobro : rec.cobro;
        const anteriores = b.quitarArchivos ? [] : (rec.facturas || []);
        const dec = leerDeclaracion(b, cobro, anteriores.length + (!b.quitarArchivos && rec.factura ? 1 : 0));
        if (dec.error) return json(400, { error: dec.error });
        let rastreo = rec.rastreo;
        if (rec.status === "registrado" && b.rastreo != null) {
          rastreo = clip(b.rastreo, 80);
          if (!rastreo) return json(400, { error: "Pon el número de rastreo (guía) de tu paquete." });
          const repetida = await guiaRepetida(rastreo, me, rec.id);
          if (repetida) return json(409, { error: repetida });
        }
        const desde = Math.max(-1, ...anteriores.map((f) => Number(f.n) || 0)) + 1;
        const nuevas = await guardarFacturas(rec.id, dec.facturas, desde);
        const updated = await mutateRecord("paquete", rec.id, (p) => {
          Object.assign(p, dec.datos);
          if (b.tienda != null) p.tienda = clip(b.tienda, 80);
          p.rastreo = rastreo;
          if (rec.status === "registrado" && b.paqueteria) p.paqueteria = clip(b.paqueteria, 40);
          p.cobro = cobro;
          p.facturas = [...anteriores, ...nuevas];
          if (b.quitarArchivos) delete p.factura;
          if (p.correccion && p.correccion.estado === "pedida") p.correccion = { ...p.correccion, estado: "hecha", hechaAt: now() };
          p.history = [...(p.history || []), { at: now(), status: "datos_editados" }];
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
        // El envío a casa se pide cuando el paquete ya cruzó a México.
        const sinCruzar = paquetes.find((p) => !p.enMexicoAt);
        if (sinCruzar) return json(409, { error: `${sinCruzar.folio} todavía no cruza a México. Te avisamos en cuanto llegue y ahí pides tu envío.` });
        const separando = paquetes.find((p) => p.separar && p.separar.estado === "pedida");
        if (separando) return json(409, { error: `Estamos separando ${separando.folio}; en cuanto quede listo lo puedes enviar.` });
        const corregir = paquetes.find((p) => p.correccion && p.correccion.estado === "pedida");
        if (corregir) return json(409, { error: `Antes de enviar, corrige los datos de ${corregir.folio} (Mae te lo pidió).` });
        const pendiente = paquetes.find((p) => p.datosPendientes);
        if (pendiente) return json(409, { error: `Antes de enviar, completa los datos de ${pendiente.folio} (qué trae y cuánto costó).` });
        const consolidar = !!b.consolidar && paquetes.length > 1;
        const sug = await cotizacionSugerida(paquetes, consolidar);
        const rec = {
          id: randomUUID(), folio: await nextFolio("envio"), ...base, paqueteIds: ids, consolidar, direccion,
          status: "solicitado", sugerido: { cruce: sug.cruce, consolidacion: sug.consolidacion, sinRegistro: sug.sinRegistro, extras: sug.extras, kg: sug.kg },
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

      case "aplicar_cupon": {
        const kind = b.kind === "compra" ? "compra" : b.kind === "envio" ? "envio" : null;
        if (!kind) return json(400, { error: "Inválido." });
        const rec = await getRecord(kind, String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontramos esa cotización." });
        if (rec.status !== "cotizado" || !rec.cotizacion) return json(409, { error: "Todavía no hay cotización." });
        if (rec.pago && rec.pago.status !== "pendiente") return json(409, { error: "Esta cotización ya se está pagando." });
        if (rec.cotizacion.cupon) return json(409, { error: "Ya tiene un cupón aplicado." });
        const limit = await checkRateLimit(`coupon-swm:${me}`, { max: 20, windowMs: 60 * 60 * 1000 });
        if (!limit.allowed) return json(429, { error: "Demasiados intentos. Espera un poco." });
        const c = await getCoupon(b.code);
        const base = rec.cotizacion.total;
        // "Nueva" = todavía no ha pagado ninguna compra ni envío (para los códigos de amiga).
        const mio = await todoDe(me);
        const nueva = ![...mio.compras, ...mio.envios].some((r) => r.pago && r.pago.status === "pagado");
        const check = checkCoupon(c, { email: me, ambito: "swm", base, nueva });
        if (!check.ok) return json(409, { error: check.error });
        const descuento = discountFor(c, base);
        if (!(descuento > 0)) return json(409, { error: "Ese cupón no aplica a esta cotización." });
        if (!(await redeemCoupon(c.code, me))) return json(409, { error: "Ese cupón ya no está disponible." });
        const updated = await mutateRecord(kind, rec.id, (r) => {
          if (r.cotizacion.cupon) return null;
          r.cotizacion = { ...r.cotizacion, cupon: c.code, descuento, totalSinDescuento: r.cotizacion.total, total: Math.round((r.cotizacion.total - descuento) * 100) / 100 };
          if (r.pago) r.pago.monto = r.cotizacion.total;
          return r;
        });
        if (!updated || updated.cotizacion.cupon !== c.code) return json(409, { error: "Ya tiene un cupón aplicado." });
        return json(200, { [kind]: publico(updated) });
      }

      case "pedir_revision": {
        const rec = await getRecord("paquete", String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontramos ese paquete." });
        if (!["registrado", "recibido"].includes(rec.status)) return json(409, { error: "Ese paquete ya va en un envío; escríbele a Mae." });
        if (rec.revision) return json(409, { error: "Ya pediste la revisión de este paquete." });
        const updated = await mutateRecord("paquete", rec.id, (p) => {
          if (p.revision) return null;
          p.revision = { estado: "pedida", at: now(), fotos: [], nota: "" };
          p.cargos = [...(p.cargos || []), { concepto: "Revisión con fotos", monto: REVISION_FOTOS }];
          p.history = [...(p.history || []), { at: now(), status: "revision_pedida" }];
          return p;
        });
        return json(200, { paquete: publico(updated) });
      }

      case "pedir_separar": {
        const rec = await getRecord("paquete", String(b.id || ""));
        if (!rec || rec.email !== me) return json(404, { error: "No encontramos ese paquete." });
        if (rec.status !== "recibido") return json(409, { error: "Solo se pueden separar paquetes que ya están en el almacén." });
        const nota = clip(b.nota, 500);
        if (!nota) return json(400, { error: "Dime qué artículos quieres que te mandemos ahora." });
        if (rec.separar && rec.separar.estado === "pedida") return json(409, { error: "Ya pediste separar este paquete." });
        const updated = await mutateRecord("paquete", rec.id, (p) => {
          p.separar = { estado: "pedida", nota, at: now() };
          p.history = [...(p.history || []), { at: now(), status: "separar_pedido" }];
          return p;
        });
        return json(200, { paquete: publico(updated) });
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
