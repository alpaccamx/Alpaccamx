// Shop with Mae para /admin.html (Más → Shop with Mae). Requiere el header
// "x-admin-key".
//
// GET                 → { paquetes, compras, envios, almacenajeDias }
// GET ?archivo=<key>  → el archivo (foto de paquete, comprobante o factura de un paquete)
// GET ?buscarClienta=<texto> → { clientas: [{ email, name, phone, casillero }] }  (acepta "ALP-ANA L")
// POST { accion, ... }:
//   recibir_paquete   { id, kg, alto, ancho, largo, fotos?: [{ dataBase64, contentType }], notaClienta? }
//   sin_registrar     { email?, etiqueta, tienda?, rastreo?, kg, alto, ancho, largo, fotos?, notaClienta? }
//                     (llegó un paquete que nadie registró; sin email queda "sin dueña")
//   asignar_paquete   { id, email }   (un paquete sin dueña ya tiene dueña)
//   probar_avisos     {} (manda aviso_casillero y aviso_pedido de prueba al WhatsApp de Mae)
//   crear_envio       { email, paqueteIds[], direccion } (Mae junta paquetes de una clienta en una caja)
//   editar_paquete    { id, tienda?, rastreo?, contenido?, valorUSD?, cobro?, kg?, alto?, ancho?, largo?, notaClienta?, notaPrivada? }
//   cotizar_compra    { id, productos, cruce?, notaClienta? }   (MXN)
//   crear_compra      { email, name?, phone?, tienda, items: [{ nombre, tono?, cantidad, precioUSD }], taxPct?, envioUSD?, cobro, cruce?, notaClienta?, fotos? }
//                     (Mae arma la cotización con lo que la clienta le mandó por WhatsApp;
//                      precioUSD = precio de la tienda por pieza, sin tax. Se pasa a pesos
//                      con el tipo de cambio + el tax (8.25% si no viene); el envío de la
//                      tienda va como un renglón aparte. Items viejos con "precio" (MXN) siguen sirviendo.
//                      Regresa la compra para mandarle el link)
//   editar_compra     { id, tienda?, items, taxPct?, envioUSD?, cobro, cruce?, notaClienta?, fotos? }
//                     (corrige una cotización que todavía no se paga; si tenía cupón,
//                      se recalcula el descuento)
//   compra_comprada   { id, paquetes: [{ tienda, rastreo, contenido }] }
//   cotizar_envio     { id, envio, cruce?, consolidacion?, sinRegistro?, extras?, notaClienta? }
//   revision_hecha    { id, fotos: [{ dataBase64, contentType }], nota? }  (fotos del contenido)
//   separar_paquete   { id, nuevo: { contenido, valorUSD?, kg, alto, ancho, largo }, resto: { contenido?, valorUSD?, kg, alto, ancho, largo }, fotos? }
//   aprobar_pago      { kind, id }
//   rechazar_pago     { kind, id, motivo }
//   marcar_enviado    { id, paqueteria, guia }
//   marcar_entregado  { id }
//   cancelar          { kind, id, motivo? }
//   notas             { kind, id, notaClienta?, notaPrivada? }
//   pedir_correccion  { id, motivo }  (la clienta debe corregir lo que declaró; no puede pedir envío hasta hacerlo)
//   quitar_correccion { id }          (ya está bien / ya lo revisaste)

const { randomUUID } = require("crypto");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { detectFileType } = require("./lib/file-signature.js");
const { nextFolio, saveRecord, getRecord, listRecords, mutateRecord, saveFile, getFile, emailDeCasillero, todosLosCasilleros } = require("./lib/swm-store.js");
const { pesoCobrable, crucePorComision, CARGO_SIN_REGISTRO, DIAS_SIN_DUENA, SEPARAR, COMISION_PCT, LEALTAD_PCT } = require("./lib/swm-pricing.js");
const { getCustomerByEmail, searchCustomers } = require("./lib/customer-store.js");
const { getCoupon, discountFor } = require("./lib/coupons.js");
const { ALMACENAJE_DIAS, round2, cotizacionSugerida, cotizarEnvio, despacharConGuia, aplicarPago, avisar, formatPriceMXN, tiposDeCambio, lealtadDe } = require("./lib/swm-core.js");

const num = (v) => Math.max(0, parseFloat(v) || 0);
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const now = () => new Date().toISOString();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KINDS = ["paquete", "compra", "envio"];
const push = (r, status, extra) => { r.history = [...(r.history || []), { at: now(), status, ...(extra || {}) }]; };

/* Correos de un paquete: llegó al almacén y ya cruzó a México (aquí empieza
   a contar el almacenaje gratis). Regresan [asunto, html]. */
function correoLlego(rec, yaEstaba, nFotos) {
  return [yaEstaba ? `actualicé tu paquete ${rec.folio} (peso, fotos o nota)` : `llegó tu paquete ${rec.folio} 📦`, `
    <h2 style="margin:0 0 8px;font-size:20px;">${yaEstaba ? "Actualicé tu paquete" : "¡Tu paquete llegó a nuestro almacén!"}</h2>
    <p style="font-size:14px;">${esc([rec.tienda, rec.rastreo && `rastreo ${rec.rastreo}`].filter(Boolean).join(" · "))}${rec.cobrable ? ` · ${rec.cobrable} kg` : ""}.${nFotos ? ` Te adjuntamos ${nFotos === 1 ? "la foto" : `las ${nFotos} fotos`} de tu paquete (también las ves en tu casillero).` : ""}</p>
    ${rec.notaClienta ? `<p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(rec.notaClienta)}</p>` : ""}
    <p style="font-size:14px;">Te avisamos en cuanto cruce a México; ahí entras a tu casillero y pides tu envío a casa (puedes juntarlo con otros paquetes).</p>`];
}

function correoEnMexico(rec) {
  const hasta = new Date(new Date(rec.enMexicoAt).getTime() + ALMACENAJE_DIAS * 864e5).toLocaleDateString("es-MX", { day: "numeric", month: "long" });
  return [`tu paquete ${rec.folio} ya está en México 🇲🇽`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu paquete ya cruzó a México!</h2><p style="font-size:14px;">${esc([rec.tienda, rec.rastreo && `rastreo ${rec.rastreo}`].filter(Boolean).join(" · ") || rec.folio)}</p>
    <p style="font-size:14px;">Lo guardamos gratis hasta el <b>${hasta}</b>. Entra a tu casillero y pide tu envío a casa (puedes juntarlo con otros paquetes).</p>`];
}

exports.handler = async (event) => {
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });

  if (event.httpMethod === "GET") {
    const qs = event.queryStringParameters || {};
    if (qs.buscarClienta != null) {
      try {
        // "ALP-ANA L" (o "alp ana l"): busca por código de casillero.
        const m = /^\s*alp[\s-]+(.+)$/i.exec(qs.buscarClienta);
        if (m) {
          const code = `ALP-${m[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()}`;
          const email = await emailDeCasillero(code);
          if (email) {
            const found = (await searchCustomers(email)).filter((c) => c.email === email);
            return json(200, { clientas: found.map((c) => ({ ...c, casillero: code })) });
          }
          qs.buscarClienta = m[1];
        }
        const [clientas, cas] = await Promise.all([searchCustomers(qs.buscarClienta), todosLosCasilleros()]);
        return json(200, { clientas: clientas.map((c) => ({ ...c, casillero: cas[c.email] || "" })) });
      } catch (err) { console.error(err); return json(500, { error: "No se pudo buscar." }); }
    }
    const key = qs.archivo;
    if (key) {
      if (!/^(foto\/[0-9a-f-]{36}|comprobante\/(compra|envio)\/[0-9a-f-]{36}|factura\/paquete\/[0-9a-f-]{36}(\/\d{1,2})?)$/.test(key)) return json(400, { error: "Archivo inválido." });
      const f = await getFile(key);
      if (!f) return json(404, { error: "No existe." });
      return { statusCode: 200, headers: { "Content-Type": f.contentType, "Cache-Control": "private, no-store" }, body: f.buffer.toString("base64"), isBase64Encoded: true };
    }
    try {
      const [paquetes, compras, envios, casilleros, tiposCambio] = await Promise.all([listRecords("paquete"), listRecords("compra"), listRecords("envio"), todosLosCasilleros(), tiposDeCambio()]);
      return json(200, { paquetes, compras, envios, casilleros, tiposCambio, comisionPct: COMISION_PCT, almacenajeDias: ALMACENAJE_DIAS, cargoSinRegistro: CARGO_SIN_REGISTRO, diasSinDuena: DIAS_SIN_DUENA });
    } catch (err) {
      console.error("admin-swm GET:", err);
      return json(500, { error: "No se pudo cargar la dirección americana." });
    }
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
  const id = String(b.id || "");

  try {
    switch (b.accion) {
      case "recibir_paquete": {
        const fotos = await guardarFotos(b.fotos);
        let yaEstaba = false;
        const rec = await mutateRecord("paquete", id, (p) => {
          yaEstaba = p.status !== "registrado";
          p.kg = num(b.kg); p.alto = num(b.alto); p.ancho = num(b.ancho); p.largo = num(b.largo);
          p.cobrable = pesoCobrable(p.kg, p.alto, p.ancho, p.largo);
          p.fotos = [...(p.fotos || []), ...fotos];
          if (b.notaClienta != null) p.notaClienta = clip(b.notaClienta, 1000);
          if (p.status === "registrado") { p.status = "recibido"; p.receivedAt = now(); push(p, "recibido"); }
          return p;
        });
        if (!rec) return json(404, { error: "No existe ese paquete." });
        await avisar(rec, ...correoLlego(rec, yaEstaba, fotos.length), fotosAdjuntas(b.fotos, `paquete-${rec.folio}`));
        return json(200, { paquete: rec });
      }

      case "sin_registrar": {
        let dueña = null;
        if (b.email) {
          dueña = await getCustomerByEmail(b.email);
          if (!dueña) return json(404, { error: "No hay ninguna cuenta con ese correo." });
        }
        const fotos = await guardarFotos(b.fotos);
        const kg = num(b.kg), alto = num(b.alto), ancho = num(b.ancho), largo = num(b.largo);
        const p = {
          id: randomUUID(), folio: await nextFolio("paquete"),
          email: dueña ? dueña.email : "", name: dueña ? dueña.name || "" : "", phone: dueña ? dueña.phone || "" : "",
          origen: "sin_registro", etiqueta: clip(b.etiqueta, 120), tienda: clip(b.tienda, 80), rastreo: clip(b.rastreo, 80),
          contenido: "", valorUSD: 0, cobro: "auto", status: dueña ? "recibido" : "sin_dueña",
          kg, alto, ancho, largo, cobrable: pesoCobrable(kg, alto, ancho, largo), fotos,
          datosPendientes: true, cargoSinRegistro: CARGO_SIN_REGISTRO,
          notaClienta: clip(b.notaClienta, 1000), notaPrivada: "",
          receivedAt: now(), history: [{ at: now(), status: dueña ? "recibido_sin_registro" : "sin_dueña" }], createdAt: now(), updatedAt: now(),
        };
        await saveRecord("paquete", p);
        if (dueña) await avisarSinRegistro(p);
        return json(200, { paquete: p });
      }

      case "asignar_paquete": {
        const dueña = await getCustomerByEmail(b.email || "");
        if (!dueña) return json(404, { error: "No hay ninguna cuenta con ese correo." });
        const rec = await mutateRecord("paquete", id, (p) => {
          if (p.status !== "sin_dueña") return null;
          p.email = dueña.email; p.name = dueña.name || ""; p.phone = dueña.phone || "";
          p.status = "recibido"; push(p, "asignado"); return p;
        });
        if (!rec || rec.status !== "recibido") return json(409, { error: "Ese paquete ya tiene dueña." });
        await avisarSinRegistro(rec);
        return json(200, { paquete: rec });
      }

      case "editar_paquete": {
        const antes = await getRecord("paquete", id);
        const rec = await mutateRecord("paquete", id, (p) => {
          ["tienda", "rastreo"].forEach((k) => { if (b[k] != null) p[k] = clip(b[k], 80); });
          if (b.contenido != null) p.contenido = clip(b.contenido, 300);
          if (b.valorUSD != null) p.valorUSD = num(b.valorUSD);
          if (b.cobro === "peso" || b.cobro === "comision") p.cobro = b.cobro;
          if (["kg", "alto", "ancho", "largo"].some((k) => b[k] != null)) {
            ["kg", "alto", "ancho", "largo"].forEach((k) => { if (b[k] != null) p[k] = num(b[k]); });
            p.cobrable = pesoCobrable(p.kg, p.alto, p.ancho, p.largo);
          }
          if (b.notaClienta != null) p.notaClienta = clip(b.notaClienta, 1000);
          if (b.notaPrivada != null) p.notaPrivada = clip(b.notaPrivada, 2000);
          return p;
        });
        if (!rec) return json(404, { error: "No existe ese paquete." });
        await avisarCambios(rec, antes, "tu paquete");
        return json(200, { paquete: rec });
      }

      case "crear_compra":
      case "editar_compra": {
        const editar = b.accion === "editar_compra";
        const enUSD = (Array.isArray(b.items) ? b.items : []).some((x) => num(x.precioUSD) > 0) || num(b.envioUSD) > 0;
        const tc = enUSD ? (await tiposDeCambio()).USD : 0;
        if (enUSD && !tc) return json(500, { error: "No pude leer el tipo de cambio (Config → Tipo de cambio)." });
        const taxPct = b.taxPct === "" || b.taxPct == null ? 8.25 : Math.max(0, num(b.taxPct));
        const items = leerItems(b.items, tc, taxPct);
        if (num(b.envioUSD) > 0) items.push({ nombre: "Envío de la tienda", tono: "", cantidad: 1, precioUSD: round2(num(b.envioUSD)), precio: round2(num(b.envioUSD) * tc), envio: true });
        if (!items.some((x) => !x.envio)) return json(400, { error: "Pon al menos un artículo con su precio." });
        const extraUSD = enUSD ? { tipoCambio: tc, taxPct } : {};
        const cobro = b.cobro === "comision" ? "comision" : "peso";
        const productos = round2(items.reduce((t, x) => t + x.precio * x.cantidad, 0));
        const cruce = cobro === "comision" ? (b.cruce !== "" && b.cruce != null ? round2(num(b.cruce)) : crucePorComision(productos)) : 0;
        if (editar) {
          const actual = await getRecord("compra", id);
          if (!actual) return json(404, { error: "No existe esa compra." });
          const cup = actual.cotizacion && actual.cotizacion.cupon ? await getCoupon(actual.cotizacion.cupon) : null;
          const fotos = await guardarFotos(b.fotos);
          let error = "";
          const rec = await mutateRecord("compra", id, (c) => {
            if (c.status !== "cotizado" || (c.pago && c.pago.status !== "pendiente")) { error = "Ya no se puede editar: ya mandó su pago o la compra cambió de estado."; return null; }
            const base = round2(productos + cruce);
            const viejo = c.cotizacion || {};
            const descuento = viejo.cupon && cup ? discountFor(cup, base) : viejo.cupon ? Math.min(viejo.descuento || 0, base) : 0;
            c.cotizacion = { items, productos, cruce, total: round2(base - descuento), at: now(), ...extraUSD,
              ...(viejo.cupon ? { cupon: viejo.cupon, descuento, totalSinDescuento: base } : {}) };
            c.cobro = cobro;
            if (b.tienda != null) c.tienda = clip(b.tienda, 80);
            if (b.notaClienta != null) c.notaClienta = clip(b.notaClienta, 1000);
            c.capturas = [...(c.capturas || []), ...fotos];
            c.pago = { status: "pendiente", monto: c.cotizacion.total };
            push(c, "editado");
            return c;
          });
          if (!rec || error) return json(409, { error: error || "No se pudo editar." });
          await avisar(rec, `actualicé tu cotización ${rec.folio}`, `
            <h2 style="margin:0 0 8px;font-size:20px;">Actualicé tu cotización</h2>
            <p style="font-size:14px;">${rec.cotizacion.items.map((x) => `${x.cantidad} × ${esc(x.nombre)}${x.tono ? ` · ${esc(x.tono)}` : ""}`).join("<br>")}</p>
            <p style="font-size:14px;">Total a pagar: <b>${formatPriceMXN(rec.cotizacion.total)}</b></p>
            <p style="font-size:14px;"><a href="https://alpacca.mx/?ver=direccion-americana&compra=${rec.id}">Ver y pagar mi cotización</a></p>`).catch(() => {});
          return json(200, { compra: rec });
        }
        const email = clip(b.email, 200).toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: "Pon el correo de la clienta (el de su cuenta)." });
        const cuenta = await getCustomerByEmail(email);
        const fotos = await guardarFotos(b.fotos);
        const rec = {
          id: randomUUID(), folio: await nextFolio("compra"), email,
          name: (cuenta && cuenta.name) || clip(b.name, 120), phone: (cuenta && cuenta.phone) || clip(b.phone, 30),
          origen: "whatsapp", tienda: clip(b.tienda, 80), links: "", notas: "", capturas: fotos, cobro, status: "cotizado",
          cotizacion: { items, productos, cruce, total: round2(productos + cruce), at: now(), ...extraUSD },
          pago: { status: "pendiente", monto: round2(productos + cruce) }, paqueteIds: [],
          notaClienta: clip(b.notaClienta, 1000), notaPrivada: "",
          history: [{ at: now(), status: "cotizado", por: "whatsapp" }], createdAt: now(), updatedAt: now(),
        };
        await saveRecord("compra", rec);
        await avisar(rec, `tu cotización ${rec.folio} está lista`, `
          <h2 style="margin:0 0 8px;font-size:20px;">Tu cotización está lista</h2>
          <p style="font-size:14px;">${rec.tienda ? `${esc(rec.tienda)} · ` : ""}${items.length} artículo${items.length > 1 ? "s" : ""}</p>
          <p style="font-size:14px;">Productos: <b>${formatPriceMXN(productos)}</b>${cruce ? `<br>Cruce a México (15%): <b>${formatPriceMXN(cruce)}</b>` : ""}<br>Total a pagar: <b>${formatPriceMXN(rec.cotizacion.total)}</b></p>
          ${rec.notaClienta ? `<p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(rec.notaClienta)}</p>` : ""}
          <p style="font-size:14px;"><a href="https://alpacca.mx/?ver=direccion-americana&compra=${rec.id}">Ver y pagar mi cotización</a></p>`).catch(() => {});
        return json(200, { compra: rec, tieneCuenta: Boolean(cuenta) });
      }

      case "cotizar_compra": {
        const productos = round2(num(b.productos));
        if (!productos) return json(400, { error: "Pon el costo de los productos." });
        const rec = await mutateRecord("compra", id, (c) => {
          const cruce = c.cobro === "comision" ? (b.cruce !== "" && b.cruce != null ? round2(num(b.cruce)) : crucePorComision(productos)) : 0;
          c.cotizacion = { productos, cruce, total: round2(productos + cruce), at: now() };
          c.pago = { status: "pendiente", monto: c.cotizacion.total };
          if (b.notaClienta != null) c.notaClienta = clip(b.notaClienta, 1000);
          c.status = "cotizado"; push(c, "cotizado");
          return c;
        });
        if (!rec) return json(404, { error: "No existe esa compra." });
        await avisar(rec, `tu cotización ${rec.folio} está lista`, `
          <h2 style="margin:0 0 8px;font-size:20px;">Tu cotización está lista</h2>
          <p style="font-size:14px;">Productos: <b>${formatPriceMXN(rec.cotizacion.productos)}</b>${rec.cotizacion.cruce ? `<br>Cruce a México (15%): <b>${formatPriceMXN(rec.cotizacion.cruce)}</b>` : ""}<br>Total a pagar: <b>${formatPriceMXN(rec.cotizacion.total)}</b></p>
          ${rec.notaClienta ? `<p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(rec.notaClienta)}</p>` : ""}
          <p style="font-size:14px;">Págala con tarjeta o transferencia desde tu casillero y hago tu compra.</p>`);
        return json(200, { compra: rec });
      }

      case "compra_comprada": {
        const compra = await getRecord("compra", id);
        if (!compra) return json(404, { error: "No existe esa compra." });
        const lista = (Array.isArray(b.paquetes) ? b.paquetes : []).map((x) => ({ tienda: clip(x.tienda, 80), rastreo: clip(x.rastreo, 80), contenido: clip(x.contenido, 300) })).filter((x) => x.tienda || x.rastreo);
        if (!lista.length) return json(400, { error: "Pon al menos un paquete (tienda o rastreo)." });
        const ids = [];
        for (const x of lista) {
          const p = {
            id: randomUUID(), folio: await nextFolio("paquete"), email: compra.email, name: compra.name, phone: compra.phone,
            origen: "compra", compraId: compra.id, ...x, valorUSD: 0, cobro: compra.cobro,
            crucePagado: compra.cobro === "comision", status: "registrado", kg: 0, alto: 0, ancho: 0, largo: 0, cobrable: 0, fotos: [],
            notaClienta: "", notaPrivada: "", history: [{ at: now(), status: "registrado" }], createdAt: now(), updatedAt: now(),
          };
          await saveRecord("paquete", p);
          ids.push(p.id);
        }
        const rec = await mutateRecord("compra", id, (c) => { c.paqueteIds = [...(c.paqueteIds || []), ...ids]; c.status = "comprado"; push(c, "comprado"); return c; });
        await avisar(rec, `ya hice tu compra ${rec.folio} 🛍️`, `
          <h2 style="margin:0 0 8px;font-size:20px;">¡Compra hecha!</h2>
          <p style="font-size:14px;">Ya compré tus productos. Va${lista.length > 1 ? "n" : ""} en camino a nuestro almacén ${lista.length} paquete${lista.length > 1 ? "s" : ""}; te aviso cuando llegue${lista.length > 1 ? "n" : ""}.</p>`);
        return json(200, { compra: rec });
      }

      case "cotizar_envio": {
        const r = await cotizarEnvio(id, b);
        return r.error ? json(r.status || 400, { error: r.error }) : json(200, { envio: r.envio });
      }

      case "revision_hecha": {
        const fotos = await guardarFotos(b.fotos);
        if (!fotos.length) return json(400, { error: "Sube al menos una foto del contenido." });
        const rec = await mutateRecord("paquete", id, (p) => {
          if (!p.revision) p.revision = { estado: "pedida", at: now(), fotos: [], nota: "" };
          p.revision = { ...p.revision, estado: "hecha", hechaAt: now(), fotos: [...(p.revision.fotos || []), ...fotos], nota: clip(b.nota, 1000) };
          push(p, "revision_hecha");
          return p;
        });
        if (!rec) return json(404, { error: "No existe ese paquete." });
        await avisar(rec, `revisamos tu paquete ${rec.folio} 📸`, `
          <h2 style="margin:0 0 8px;font-size:20px;">Ya revisamos tu paquete</h2>
          <p style="font-size:14px;">Abrimos ${esc(rec.folio)} y le tomamos ${rec.revision.fotos.length} foto${rec.revision.fotos.length === 1 ? "" : "s"} al contenido. Te las adjuntamos (también las ves en tu casillero).</p>
          ${rec.revision.nota ? `<p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(rec.revision.nota)}</p>` : ""}`, fotosAdjuntas(b.fotos, `revision-${rec.folio}`));
        return json(200, { paquete: rec });
      }

      case "separar_paquete": {
        const orig = await getRecord("paquete", id);
        if (!orig || orig.status !== "recibido") return json(409, { error: "Solo se separan paquetes que están en el almacén." });
        const nu = b.nuevo || {}, re = b.resto || {};
        if (!(num(nu.kg) > 0) || !(num(re.kg) > 0)) return json(400, { error: "Pon el peso de las dos partes." });
        const fotos = await guardarFotos(b.fotos);
        const kg = num(nu.kg), alto = num(nu.alto), ancho = num(nu.ancho), largo = num(nu.largo);
        const nuevo = {
          id: randomUUID(), folio: await nextFolio("paquete"), email: orig.email, name: orig.name, phone: orig.phone,
          origen: "separado", parentId: orig.id, tienda: orig.tienda, rastreo: orig.rastreo,
          contenido: clip(nu.contenido, 300) || (orig.separar && orig.separar.nota) || "", valorUSD: num(nu.valorUSD),
          cobro: orig.cobro, crucePagado: orig.crucePagado, status: "recibido",
          kg, alto, ancho, largo, cobrable: pesoCobrable(kg, alto, ancho, largo), fotos,
          cargos: [{ concepto: "Separar paquete", monto: SEPARAR }], notaClienta: `Separado de ${orig.folio}.`, notaPrivada: "",
          receivedAt: orig.receivedAt || now(), history: [{ at: now(), status: "separado" }], createdAt: now(), updatedAt: now(),
        };
        await saveRecord("paquete", nuevo);
        const rec = await mutateRecord("paquete", id, (p) => {
          ["kg", "alto", "ancho", "largo"].forEach((k) => { p[k] = num(re[k]); });
          p.cobrable = pesoCobrable(p.kg, p.alto, p.ancho, p.largo);
          if (re.contenido != null && re.contenido !== "") p.contenido = clip(re.contenido, 300);
          if (re.valorUSD != null && re.valorUSD !== "") p.valorUSD = num(re.valorUSD);
          p.separar = { ...(p.separar || {}), estado: "hecha", hechaAt: now(), nuevoId: nuevo.id, nuevoFolio: nuevo.folio };
          push(p, "separado");
          return p;
        });
        await avisar(orig, `separamos tu paquete ${orig.folio}`, `
          <h2 style="margin:0 0 8px;font-size:20px;">Ya separamos tu paquete</h2>
          <p style="font-size:14px;">Lo que pediste quedó en el paquete <b>${esc(nuevo.folio)}</b> (${nuevo.cobrable} kg), listo para que pidas su envío. El resto sigue guardado en <b>${esc(orig.folio)}</b>.</p>`);
        return json(200, { paquete: rec, nuevo });
      }

      case "aprobar_pago": {
        const kind = b.kind === "compra" ? "compra" : "envio";
        const rec = await aplicarPago(kind, id, { metodo: "transferencia" });
        return rec ? json(200, { [kind]: rec }) : json(404, { error: "No existe." });
      }

      case "rechazar_pago": {
        const kind = b.kind === "compra" ? "compra" : "envio";
        const motivo = clip(b.motivo, 500) || "No pudimos validar tu comprobante.";
        const rec = await mutateRecord(kind, id, (r) => {
          if (!r.pago || r.pago.status === "pagado") return null;
          r.pago = { ...r.pago, status: "pendiente", rechazo: motivo }; r.notaClienta = motivo; push(r, "pago_rechazado"); return r;
        });
        if (rec) await avisar(rec, `revisa tu pago de ${rec.folio}: ${motivo}`, `<h2 style="margin:0 0 8px;font-size:20px;">No pudimos validar tu pago</h2><p style="font-size:14px;">${esc(motivo)}</p><p style="font-size:14px;">Puedes volver a subir tu comprobante o pagar con tarjeta desde tu casillero.</p>`);
        return rec ? json(200, { [kind]: rec }) : json(404, { error: "No existe." });
      }

      // Prueba de las plantillas de WhatsApp: solo al número de Mae.
      case "probar_avisos": {
        const { notifyCustomerTemplate } = require("./lib/whatsapp.js");
        const { WHATSAPP_MAE } = require("./lib/order-notify.js");
        const a = { phone: WHATSAPP_MAE, name: "Mae" };
        const casillero = await notifyCustomerTemplate("aviso_casillero", { ...a, texto: "Esto es una PRUEBA del aviso de la dirección americana. Así le llega a tu clienta cuando su paquete llega, se cotiza, cruza a México o se envía." });
        const pedido = await notifyCustomerTemplate("aviso_pedido", { ...a, texto: "Esto es una PRUEBA del aviso de pedidos de la tienda. Así le llega a tu clienta cuando cambias su pedido, le reembolsas o lo cancelas." });
        // Con "correo": también los correos de "llegó al almacén" y "ya
        // cruzó a México", iguales a los de las clientas, a ese correo.
        if (b.correo) {
          const correo = clip(b.correo, 200).toLowerCase();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return json(400, { error: "Correo no válido." });
          const ej = { folio: "P-PRUEBA", tienda: "Sephora", rastreo: "1Z999PRUEBA", cobrable: 2, email: correo, enMexicoAt: now() };
          await avisar(ej, ...correoLlego(ej, false, 0));
          await avisar(ej, ...correoEnMexico(ej));
        }
        return json(200, { aviso_casillero: casillero, aviso_pedido: pedido });
      }

      // Mae junta varios paquetes de una clienta en una sola caja (un solo
      // envío nacional con una guía). Sigue el flujo normal: cotizar → pago.
      case "crear_envio": {
        const email = clip(b.email, 200).toLowerCase();
        const ids = [...new Set((Array.isArray(b.paqueteIds) ? b.paqueteIds : []).map(String))].slice(0, 40);
        if (!email || !ids.length) return json(400, { error: "Elige al menos un paquete." });
        const d = b.direccion || {};
        const direccion = {
          nombre: clip(d.nombre, 100), telefono: clip(d.telefono, 30), calle: clip(d.calle, 150), colonia: clip(d.colonia, 100),
          ciudad: clip(d.ciudad, 80), estado: clip(d.estado, 60), cp: clip(d.cp, 10), referencias: clip(d.referencias, 200),
        };
        if (!direccion.nombre || !direccion.calle || !direccion.ciudad || !/^\d{5}$/.test(direccion.cp) || !direccion.telefono) {
          return json(400, { error: "Completa la dirección: nombre, teléfono, calle y número, ciudad y código postal de 5 dígitos." });
        }
        const paquetes = await Promise.all(ids.map((x) => getRecord("paquete", x)));
        if (paquetes.some((p) => !p || p.email !== email || p.status !== "recibido")) return json(409, { error: "Solo se pueden juntar paquetes de la misma clienta que estén en el almacén o en México (sin envío)." });
        const pendiente = paquetes.find((p) => p.datosPendientes || (p.separar && p.separar.estado === "pedida"));
        if (pendiente) return json(409, { error: `${pendiente.folio} tiene datos o una separación pendiente.` });
        const consolidar = paquetes.length > 1;
        const sug = await cotizacionSugerida(paquetes, consolidar);
        const p0 = paquetes[0];
        const rec = {
          id: randomUUID(), folio: await nextFolio("envio"), email, name: p0.name || "", phone: p0.phone || "",
          paqueteIds: ids, consolidar, direccion, creadoPor: "mae",
          status: "solicitado", sugerido: { cruce: sug.cruce, consolidacion: sug.consolidacion, sinRegistro: sug.sinRegistro, extras: sug.extras, kg: sug.kg },
          cotizacion: null, pago: null, paqueteria: "", guia: "", notaClienta: "", notaPrivada: "",
          history: [{ at: now(), status: "solicitado", por: "mae" }], createdAt: now(), updatedAt: now(),
        };
        await saveRecord("envio", rec);
        await Promise.all(ids.map((x) => mutateRecord("paquete", x, (p) => {
          if (p.status !== "recibido") return null;
          p.status = "en_envio"; p.envioId = rec.id; return p;
        })));
        return json(200, { envio: rec });
      }

      // Ya cruzó: está en México, antes de mandarlo por paquetería.
      case "marcar_en_mexico": {
        const rec = await mutateRecord("envio", id, (e) => {
          if (e.status !== "pagado") return null;
          e.status = "en_mexico"; e.enMexicoAt = now(); push(e, "en_mexico"); return e;
        });
        if (!rec) return json(409, { error: "Ese envío no está pagado o ya avanzó." });
        await Promise.all((rec.paqueteIds || []).map((x) => mutateRecord("paquete", x, (p) => { if (!p.enMexicoAt) { p.enMexicoAt = now(); push(p, "en_mexico"); } return p; })));
        await avisar(rec, `tu envío ${rec.folio} ya está en México 🇲🇽`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu envío ya está en México!</h2><p style="font-size:14px;">Ya cruzó la frontera. En cuanto lo mandemos te llega la guía de la paquetería.</p>`);
        return json(200, { envio: rec });
      }

      // Un paquete ya cruzó a México (sigue disponible para pedir su envío:
      // el status no cambia, solo se marca la fecha del cruce).
      case "paquete_en_mexico": {
        const rec = await mutateRecord("paquete", id, (p) => {
          if (!["recibido", "en_envio"].includes(p.status) || p.enMexicoAt) return null;
          p.enMexicoAt = now(); push(p, "en_mexico"); return p;
        });
        if (!rec) return json(409, { error: "Ese paquete no está en el almacén o ya estaba en México." });
        await avisar(rec, ...correoEnMexico(rec));
        return json(200, { paquete: rec });
      }

      case "marcar_enviado": {
        const rec = await mutateRecord("envio", id, (e) => {
          e.paqueteria = clip(b.paqueteria, 40) || "Estafeta"; e.guia = clip(b.guia, 80);
          e.status = "enviado"; e.enviadoAt = now(); push(e, "enviado"); return e;
        });
        if (!rec) return json(404, { error: "No existe ese envío." });
        await Promise.all((rec.paqueteIds || []).map((x) => mutateRecord("paquete", x, (p) => { p.status = "enviado"; push(p, "enviado"); return p; })));
        await avisar(rec, `tu envío ${rec.folio} va en camino 🚚`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu envío va en camino!</h2><p style="font-size:14px;">Paquetería: <b>${esc(rec.paqueteria)}</b>${rec.guia ? `<br>Guía: <b>${esc(rec.guia)}</b>` : ""}</p>`);
        return json(200, { envio: rec });
      }

      case "marcar_entregado": {
        const rec = await mutateRecord("envio", id, (e) => { e.status = "entregado"; e.entregadoAt = now(); push(e, "entregado"); return e; });
        if (!rec) return json(404, { error: "No existe ese envío." });
        await Promise.all((rec.paqueteIds || []).map((x) => mutateRecord("paquete", x, (p) => { p.status = "entregado"; push(p, "entregado"); return p; })));
        await avisar(rec, `tu envío ${rec.folio} fue entregado 🎁`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu envío fue entregado!</h2><p style="font-size:14px;">Esperamos que te encante todo 💗 Si algo llegó mal, escríbenos por WhatsApp.</p>`);
        return json(200, { envio: rec });
      }

      case "cancelar": {
        const kind = KINDS.includes(b.kind) ? b.kind : null;
        if (!kind) return json(400, { error: "Inválido." });
        const motivo = clip(b.motivo, 500);
        const rec = await mutateRecord(kind, id, (r) => { r.status = "cancelado"; if (motivo) r.notaClienta = motivo; push(r, "cancelado", { por: "mae" }); return r; });
        if (!rec) return json(404, { error: "No existe." });
        if (kind === "envio") {
          await Promise.all((rec.paqueteIds || []).map((x) => mutateRecord("paquete", x, (p) => {
            if (p.envioId !== rec.id || p.status !== "en_envio") return null;
            p.status = "recibido"; p.envioId = null; return p;
          })));
        }
        await avisar(rec, `${rec.folio} fue cancelado`, `<h2 style="margin:0 0 8px;font-size:20px;">${esc(rec.folio)} fue cancelado</h2>${motivo ? `<p style="font-size:14px;">${esc(motivo)}</p>` : ""}<p style="font-size:14px;">Si tienes dudas, escríbenos por WhatsApp.</p>`, null, `${rec.folio} fue cancelado${motivo ? `: ${motivo}` : ""}`);
        return json(200, { [kind]: rec });
      }

      case "pedir_correccion": {
        const motivo = clip(b.motivo, 500);
        if (!motivo) return json(400, { error: "Dile qué tiene que corregir." });
        const rec = await mutateRecord("paquete", id, (p) => {
          p.correccion = { estado: "pedida", motivo, at: now() };
          push(p, "correccion_pedida");
          return p;
        });
        if (!rec) return json(404, { error: "No existe ese paquete." });
        await avisar(rec, `corrige los datos de tu paquete ${rec.folio}`, `
          <h2 style="margin:0 0 8px;font-size:20px;">Necesito que corrijas tu paquete</h2>
          <p style="font-size:14px;">Revisé ${esc(rec.folio)}${rec.tienda ? ` (${esc(rec.tienda)})` : ""} y hay algo que no coincide con lo que registraste:</p>
          <p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(motivo)}</p>
          <p style="font-size:14px;">Entra a tu casillero y corrige tus datos ahí mismo. Hasta que lo corrijas no podrás pedir el envío de este paquete.</p>`, null,
          `necesito que corrijas los datos de tu paquete ${rec.folio}: ${motivo}`);
        return json(200, { paquete: rec });
      }

      case "quitar_correccion": {
        let estaba = "";
        const rec = await mutateRecord("paquete", id, (p) => {
          estaba = p.correccion ? p.correccion.estado : "";
          delete p.correccion;
          push(p, "correccion_cerrada");
          return p;
        });
        if (rec && estaba === "pedida") await avisar(rec, `ya no necesitas corregir tu paquete ${rec.folio}`, `<p style="font-size:14px;">Ya revisé ${esc(rec.folio)} y todo está bien; no tienes que corregir nada. Ya puedes pedir su envío cuando quieras.</p>`);
        return rec ? json(200, { paquete: rec }) : json(404, { error: "No existe ese paquete." });
      }

      case "notas": {
        const kind = KINDS.includes(b.kind) ? b.kind : null;
        if (!kind) return json(400, { error: "Inválido." });
        let notaAntes = "";
        const rec = await mutateRecord(kind, id, (r) => {
          notaAntes = r.notaClienta || "";
          if (b.notaClienta != null) r.notaClienta = clip(b.notaClienta, 1000);
          if (b.notaPrivada != null) r.notaPrivada = clip(b.notaPrivada, 2000);
          return r;
        });
        if (rec && rec.notaClienta && rec.notaClienta !== notaAntes) {
          await avisar(rec, `tienes un mensaje de Mae sobre ${rec.folio}`, `<h2 style="margin:0 0 8px;font-size:20px;">Mensaje de Mae</h2><p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(rec.notaClienta)}</p>`, null, `mensaje de Mae sobre ${rec.folio}: ${rec.notaClienta}`);
        }
        return rec ? json(200, { [kind]: rec }) : json(404, { error: "No existe." });
      }

      default:
        return json(400, { error: "Acción inválida." });
    }
  } catch (err) {
    console.error("admin-swm POST:", b && b.accion, err);
    return json(500, { error: "No se pudo guardar." });
  }
};

/* Precio por pieza en pesos. Con precioUSD (precio de la tienda sin tax) se
   calcula: USD × (1 + tax) × tipo de cambio. */
function leerItems(lista, tc = 0, taxPct = 0) {
  return (Array.isArray(lista) ? lista : []).slice(0, 60)
    .filter((x) => !x.envio)
    .map((x) => {
      const it = { nombre: clip(x.nombre, 200), tono: clip(x.tono, 100), cantidad: Math.max(1, Math.floor(num(x.cantidad)) || 1) };
      const usd = round2(num(x.precioUSD));
      if (usd > 0 && tc > 0) return { ...it, precioUSD: usd, precio: round2(usd * (1 + taxPct / 100) * tc) };
      return { ...it, precio: round2(num(x.precio)) };
    })
    .filter((x) => x.nombre && x.precio > 0);
}

/* Las mismas fotos que se guardan, como adjuntos del correo a la clienta. */
function fotosAdjuntas(lista, prefijo) {
  const out = [];
  for (const f of (Array.isArray(lista) ? lista : []).slice(0, 6)) {
    const buf = Buffer.from(String(f.dataBase64 || ""), "base64");
    if (!buf.length || buf.length > 5 * 1024 * 1024) continue;
    const t = detectFileType(buf);
    if (!t || t === "pdf") continue;
    const ext = /png/i.test(f.contentType || "") ? "png" : /webp/i.test(f.contentType || "") ? "webp" : "jpg";
    out.push({ filename: `${prefijo}-${out.length + 1}.${ext}`, content: buf.toString("base64") });
  }
  return out;
}

async function guardarFotos(lista) {
  const fotos = [];
  for (const f of (Array.isArray(lista) ? lista : []).slice(0, 6)) {
    const buf = Buffer.from(String(f.dataBase64 || ""), "base64");
    if (!buf.length || buf.length > 5 * 1024 * 1024) continue;
    const t = detectFileType(buf);
    if (!t || t === "pdf") continue;
    const fid = randomUUID();
    await saveFile(`foto/${fid}`, buf, /^image\/[a-z0-9.+-]+$/i.test(f.contentType || "") ? f.contentType : "image/jpeg");
    fotos.push(fid);
  }
  return fotos;
}

/* Mae editó un paquete: si cambió algo que la clienta ve, se le avisa
   qué cambió. */
async function avisarCambios(rec, antes, que) {
  if (!antes) return;
  const etiquetas = { tienda: "tienda", rastreo: "guía", contenido: "contenido", valorUSD: "valor", cobro: "forma de pagar el cruce", cobrable: "peso cobrado", notaClienta: "mensaje de Mae" };
  const cambios = Object.keys(etiquetas).filter((k) => String(antes[k] ?? "") !== String(rec[k] ?? ""));
  if (!cambios.length) return;
  const lista = cambios.map((k) => etiquetas[k]).join(", ");
  await avisar(rec, `actualicé ${que} ${rec.folio}`, `
    <h2 style="margin:0 0 8px;font-size:20px;">Actualicé ${esc(que)} ${esc(rec.folio)}</h2>
    <p style="font-size:14px;">Cambié: <b>${esc(lista)}</b>.</p>
    ${rec.notaClienta && cambios.includes("notaClienta") ? `<p style="font-size:14px;background:#fdf2f6;border-radius:10px;padding:10px 12px;">${esc(rec.notaClienta)}</p>` : ""}`,
    null, `actualicé ${que} ${rec.folio} (${lista})${rec.notaClienta && cambios.includes("notaClienta") ? `: ${rec.notaClienta}` : ""}`);
}

async function avisarSinRegistro(p) {
  await avisar(p, `llegó un paquete tuyo sin registrar (${p.folio})`, `
    <h2 style="margin:0 0 8px;font-size:20px;">Llegó un paquete a tu nombre que no registraste</h2>
    <p style="font-size:14px;">${esc([p.tienda, p.rastreo && `rastreo ${p.rastreo}`].filter(Boolean).join(" · ") || "Paquete")}${p.cobrable ? ` · ${p.cobrable} kg` : ""}.</p>
    <p style="font-size:14px;">Entra a tu casillero y dime <b>qué trae y cuánto costó</b> para poder enviártelo. Por no haber registrado la guía antes de que llegara se cobra un cargo de <b>${formatPriceMXN(p.cargoSinRegistro)}</b>, que se suma a tu envío.</p>
    <p style="font-size:13px;color:#666;">Tip: registra siempre tu número de rastreo en cuanto hagas tu compra para evitar este cargo.</p>`);
}

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
