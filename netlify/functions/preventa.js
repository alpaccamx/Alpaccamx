// Preventa para las clientas (alpacca.mx/?ver=preventa).
//
// GET ?resumen=1       → { config, abierta, total } (liviano: lo pide la tienda en cada visita)
// GET                  → { config, abierta, productos } (sin tonos)
// GET ?producto=<id>   → { producto } con todas sus variantes (tonos/tamaños)
// Con sesión, GET (sin ?producto) agrega { apartados } de la clienta.
// POST (con sesión), { accion, ... }:
//   apartar      { items: [{ id, sku?, qty }], entrega: "envio"|"personal", direccion, nota }
//   pagar        { id, metodo: "mercadopago"|"transferencia" }  (la etapa que le toque)
//   comprobante  { id, filename, contentType, dataBase64 }
//   cancelar     { id }  (solo si todavía no paga el anticipo)

const { randomUUID } = require("crypto");
const { getCustomerByEmail } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");
const { checkRateLimit } = require("./lib/rate-limit.js");
const { leerComprobantes } = require("./lib/comprobantes.js");
const { avisarMae } = require("./lib/order-notify.js");
const { listApartados, getApartado, saveApartado, mutateApartado, nextFolio, saveFile } = require("./lib/preventa-store.js");
const { configActual, abierta, productosConCupo, productoPublico, pesoDe, pesosEnvio, envioEstimado, apartadoPublico, etapaPorPagar, crearPreferenciaMP, avisar, listaHTML, formatPriceMXN, HORAS_PARA_PAGAR, round2 } = require("./lib/preventa-core.js");

/* Guarda hasta 3 comprobantes: el 1.º en comprobante/<id>/<etapa> y los demás en .../2 y .../3. */
async function guardarComprobantes(id, etapa, files) {
  for (let i = 0; i < files.length; i++) await saveFile(`comprobante/${id}/${etapa}${i ? `/${i + 1}` : ""}`, files[i].buffer, files[i].contentType);
}
const MAX_PIEZAS = 60;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const now = () => new Date().toISOString();

function configPublica(cfg) {
  return { titulo: cfg.titulo, descripcion: cfg.descripcion, cierre: cfg.cierre, llegada: cfg.llegada, anticipoPct: cfg.anticipoPct, horasParaPagar: HORAS_PARA_PAGAR };
}

exports.handler = async (event) => {
  const email = verifyCustomerToken(event);

  if (event.httpMethod === "GET") {
    try {
      const qs = event.queryStringParameters || {};
      const [cfg, productos] = await Promise.all([configActual(), productosConCupo()]);
      const open = abierta(cfg);
      const visibles = open ? productos.filter((p) => p.activo !== false) : [];
      let out;
      if (qs.producto) {
        const p = visibles.find((x) => x.id === String(qs.producto));
        if (!p) return json(404, { error: "Ese producto ya no está en la venta." });
        out = { producto: productoPublico(p, { detalle: true }) };
      } else if (qs.resumen) {
        out = { config: configPublica(cfg), abierta: open, total: visibles.length };
      } else {
        out = { config: configPublica(cfg), abierta: open, productos: visibles.map((p) => productoPublico(p)) };
      }
      if (email && !qs.producto) out.apartados = (await listApartados({ email: String(email).toLowerCase() })).map(apartadoPublico);
      // Sin sesión se guarda 30 s en la CDN (la tienda la consulta en cada
      // visita); el cupo real se revisa otra vez al apartar.
      // La llave de la caché incluye todo el query (?producto, ?resumen), si no la CDN puede
      // regresar los tonos de otro producto.
      const vary = "query,header=Authorization";
      return json(200, out, email
        ? { "Cache-Control": "private, no-store", "Netlify-Vary": vary }
        : { "Cache-Control": "public, max-age=0, must-revalidate", "Netlify-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=60", "Netlify-Vary": vary });
    } catch (err) {
      console.error("preventa GET:", err);
      return json(500, { error: "No se pudo cargar la venta." });
    }
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  if (!email) return json(401, { error: "Inicia sesión para apartar." });
  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return json(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });
  const me = customer.email;

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }

  try {
    switch (b.accion) {
      case "apartar": {
        const limit = await checkRateLimit(`preventa:${me}`, { max: 10, windowMs: 60 * 60 * 1000 });
        if (!limit.allowed) return json(429, { error: "Hiciste muchos apartados seguidos. Intenta en un rato." });
        const cfg = await configActual();
        if (!abierta(cfg)) return json(409, { error: "La venta ya cerró." });
        // Cómo va a pagar: con transferencia el comprobante VIENE EN ESTA MISMA
        // petición y es obligatorio (no se crea un apartado por transferencia sin
        // comprobante); con tarjeta se manda directo a Mercado Pago.
        const metodo = b.metodo === "mercadopago" ? "mercadopago" : b.metodo === "transferencia" ? "transferencia" : null;
        if (!metodo) return json(400, { error: "Elige cómo vas a pagar (transferencia o tarjeta). Si no te sale, recarga la página e inténtalo otra vez." });
        let comprobantes = null;
        if (metodo === "transferencia") {
          // Hasta 3 comprobantes a la vez ("comprobantes"); "comprobante" (uno solo) también vale.
          const leidos = leerComprobantes(Array.isArray(b.comprobantes) ? b.comprobantes : b.comprobante);
          if (leidos.error) return json(400, { error: leidos.error.startsWith("Sube") ? "Sube la captura de tu transferencia para apartar." : leidos.error });
          comprobantes = leidos.files;
        }
        // Un renglón por producto + tono/tamaño (sku).
        const pedidos = new Map();
        for (const it of Array.isArray(b.items) ? b.items : []) {
          const qty = parseInt(it && it.qty, 10);
          const id = String((it && it.id) || "");
          const sku = String((it && it.sku) || "");
          const k = `${id}|${sku}`;
          if (id && qty > 0) pedidos.set(k, { id, sku, qty: ((pedidos.get(k) || {}).qty || 0) + qty });
        }
        if (!pedidos.size) return json(400, { error: "Elige al menos un producto." });
        if ([...pedidos.values()].reduce((s, x) => s + x.qty, 0) > MAX_PIEZAS) return json(400, { error: `Puedes apartar hasta ${MAX_PIEZAS} piezas por apartado.` });
        const productos = new Map((await productosConCupo()).map((p) => [p.id, p]));
        const items = [];
        const porProducto = {};
        for (const { id, sku, qty } of pedidos.values()) {
          const p = productos.get(id);
          if (!p || p.activo === false) return json(409, { error: "Uno de los productos ya no está en la venta. Recarga la página." });
          let v = null;
          if ((p.variantes || []).length) {
            v = p.variantes.find((x) => x.id === sku);
            if (!v) return json(400, { error: `Elige el tono o tamaño de ${p.nombre}.` });
            if (v.agotado) return json(409, { error: `${p.nombre} (${v.nombre}) ya no está disponible.` });
          }
          porProducto[id] = (porProducto[id] || 0) + qty;
          if (p.disponibles != null && porProducto[id] > p.disponibles) return json(409, { error: p.disponibles ? `De ${p.nombre} solo quedan ${p.disponibles} para apartar.` : `${p.nombre} ya se agotó.` });
          items.push({
            id, nombre: p.nombre, marca: p.marca || "", imagen: (v && v.imagen) || p.imagen || "", precio: Number(v ? v.precio : p.precio), qty, peso: pesoDe(p, v), vol: Number(v ? v.vol : p.vol) || 0,
            ...(v ? { sku: v.id, variante: v.nombre, tamano: v.tamano || "" } : {}),
          });
        }
        const entrega = b.entrega === "personal" ? "personal" : "envio";
        const d = b.direccion || {};
        const direccion = Object.fromEntries(["nombre", "telefono", "calle", "colonia", "ciudad", "estado", "cp", "referencias"].map((k) => [k, clip(d[k], k === "referencias" ? 200 : 120)]));
        if (!direccion.nombre) direccion.nombre = customer.name || "";
        if (!direccion.telefono) direccion.telefono = customer.phone || "";
        if (!direccion.nombre || String(direccion.telefono).replace(/\D/g, "").length < 10) return json(400, { error: "Pon tu nombre y un teléfono de 10 dígitos." });
        if (entrega === "envio" && (!direccion.calle || !direccion.ciudad || !/^\d{5}$/.test(direccion.cp))) return json(400, { error: "Completa tu dirección: calle y número, ciudad y código postal de 5 dígitos." });
        const total = Math.round(items.reduce((s, it) => s + it.precio * it.qty, 0) * 100) / 100;
        const pesos = pesosEnvio(items);
        const envioEst = entrega === "envio" ? await envioEstimado(direccion.cp, pesos.pesoCobrableKg) : 0;
        // pagoCompleto: la clienta prefiere pagar todo ahora (al llegar solo
        // paga el envío, si es a domicilio).
        const completo = !!b.pagoCompleto;
        const pct = completo ? 100 : Math.min(100, Math.max(1, Number(cfg.anticipoPct) || 50));
        const anticipo = Math.ceil(total * pct / 100);
        const rec = {
          id: randomUUID(), folio: await nextFolio(), email: me, name: customer.name || direccion.nombre, phone: customer.phone || direccion.telefono,
          campana: cfg.titulo, items, total, anticipoPct: pct, ...(completo ? { pagoCompleto: true } : {}),
          anticipo: { monto: anticipo, status: "pendiente" },
          resto: { monto: Math.round((total - anticipo) * 100) / 100, status: "espera" },
          envio: 0, ...pesos, envioEstimado: envioEst, entrega, direccion, nota: clip(b.nota, 500), status: "nuevo",
          history: [{ at: now(), status: "nuevo" }], createdAt: now(), updatedAt: now(),
        };
        if (comprobantes) {
          // Los comprobantes se guardan ANTES que el apartado: si falla, no se crea nada.
          await guardarComprobantes(rec.id, "anticipo", comprobantes);
          rec.anticipo = { ...rec.anticipo, metodo: "transferencia", status: "revision", comprobanteAt: now(), comprobanteTipo: comprobantes[0].contentType, comprobanteN: comprobantes.length };
        } else {
          rec.anticipo = { ...rec.anticipo, metodo: "mercadopago", elegidoAt: now() };
        }
        await saveApartado(rec);
        if (comprobantes) {
          await avisarMae(`🔎 ${rec.name || me} apartó en el ${rec.campana || "Sephora Sale"} (${rec.folio}) y subió su comprobante de ${completo ? "pago completo" : "anticipo"} por ${formatPriceMXN(anticipo)}. Revísalo en Preventa del admin: alpacca.mx/admin`);
          await avisar(rec, `${rec.folio}: recibimos tu comprobante`, `
            <h2 style="margin:0 0 8px;font-size:20px;">¡Recibimos tu comprobante!</h2>
            ${listaHTML(rec)}
            <p style="font-size:14px;">Total: <b>${formatPriceMXN(total)}</b>. ${completo ? "Elegiste pagar todo ahora." : `Anticipo (${pct}%): <b>${formatPriceMXN(anticipo)}</b>.`} Lo estamos revisando y te avisamos en cuanto se confirme tu apartado.</p>`,
          `${rec.folio}: recibimos tu comprobante, lo estamos revisando y te avisamos en cuanto se confirme tu apartado`);
          return json(200, { apartado: apartadoPublico(rec) });
        }
        let redirectUrl;
        try {
          redirectUrl = await crearPreferenciaMP(rec, "anticipo", event);
        } catch (err) {
          await mutateApartado(rec.id, (r) => { r.status = "cancelado"; r.motivoCancelacion = "No se pudo abrir Mercado Pago"; return r; });
          return json(502, { error: err.message || "No se pudo conectar con Mercado Pago. Intenta de nuevo." });
        }
        await avisar(rec, completo ? `${rec.folio}: paga tu pedido para apartarlo` : `${rec.folio}: aparta pagando tu anticipo`, `
          <h2 style="margin:0 0 8px;font-size:20px;">¡Ya casi! ${completo ? "Paga tu pedido para apartarlo" : "Paga tu anticipo para apartar"}</h2>
          ${listaHTML(rec)}
          <p style="font-size:14px;">${completo ? `Total: <b>${formatPriceMXN(total)}</b>. Elegiste pagar todo ahora${entrega === "envio" ? "; cuando lleguen tus productos solo pagas el envío" : ""}.` : `Total: <b>${formatPriceMXN(total)}</b>. Para apartar pagas el ${pct}%: <b>${formatPriceMXN(anticipo)}</b>. El resto lo pagas cuando lleguen tus productos.`}</p>
          <p style="font-size:14px;">Tienes ${HORAS_PARA_PAGAR} horas para pagarlo; si no, se libera el lugar.</p>`,
        `${rec.folio}: paga tu anticipo de ${formatPriceMXN(anticipo)} para apartar`);
        return json(200, { apartado: apartadoPublico(rec), redirectUrl });
      }

      case "pagar": {
        const a = await getApartado(String(b.id || ""));
        if (!a || a.email !== me) return json(404, { error: "No encontramos ese apartado." });
        const etapa = etapaPorPagar(a);
        if (!etapa) return json(409, { error: a.status === "nuevo" ? "Este apartado venció. Haz uno nuevo." : "No hay nada por pagar ahorita." });
        const metodo = b.metodo === "mercadopago" ? "mercadopago" : "transferencia";
        let redirectUrl = null;
        if (metodo === "mercadopago") redirectUrl = await crearPreferenciaMP(a, etapa, event);
        const updated = await mutateApartado(a.id, (r) => {
          if (r[etapa].status === "pagado") return null;
          r[etapa] = { ...r[etapa], metodo, elegidoAt: now(), status: r[etapa].status === "revision" ? "revision" : "pendiente" };
          return r;
        });
        return json(200, { redirectUrl, apartado: apartadoPublico(updated) });
      }

      // Liquidar antes de que lleguen los productos: se abre el pago del resto (sin envío).
      case "liquidar": {
        const a = await getApartado(String(b.id || ""));
        if (!a || a.email !== me) return json(404, { error: "No encontramos ese apartado." });
        if (a.status !== "apartado" || a.pagoCompleto || !a.anticipo || a.anticipo.status !== "pagado") return json(409, { error: "Este apartado ya no se puede liquidar desde aquí." });
        if (a.adelantado) return json(200, { apartado: apartadoPublico(a) });
        const resto = round2((Number(a.total) || 0) - (Number(a.anticipo.monto) || 0));
        if (!(resto > 0)) return json(409, { error: "No hay nada por liquidar." });
        const updated = await mutateApartado(a.id, (r) => {
          if (r.status !== "apartado" || r.pagoCompleto || r.adelantado) return null;
          r.adelantado = true;
          r.resto = { ...r.resto, monto: resto, status: "pendiente" };
          r.history = [...(r.history || []), { at: now(), status: r.status, liquidarAntes: true }];
          return r;
        });
        return json(200, { apartado: apartadoPublico(updated || a) });
      }

      case "comprobante": {
        const a = await getApartado(String(b.id || ""));
        if (!a || a.email !== me) return json(404, { error: "No encontramos ese apartado." });
        const etapa = etapaPorPagar(a);
        if (!etapa) return json(409, { error: "Este apartado ya no acepta comprobantes." });
        const leidos = leerComprobantes(Array.isArray(b.comprobantes) ? b.comprobantes : { filename: b.filename, contentType: b.contentType, dataBase64: b.dataBase64 });
        if (leidos.error) return json(400, { error: leidos.error });
        await guardarComprobantes(a.id, etapa, leidos.files);
        const updated = await mutateApartado(a.id, (r) => {
          r[etapa] = { ...r[etapa], status: "revision", metodo: "transferencia", comprobanteAt: now(), comprobanteTipo: leidos.files[0].contentType, comprobanteN: leidos.files.length, rechazo: undefined };
          return r;
        });
        await avisarMae(`🔎 ${a.name || me} subió su comprobante del ${etapa === "anticipo" ? (a.pagoCompleto ? "pago completo" : "anticipo") : a.pagoCompleto ? "envío" : "resto"} de ${a.folio} (${a.campana || "Sephora Sale"}) por ${formatPriceMXN(updated[etapa].monto || 0)}. Revísalo en Preventa del admin: alpacca.mx/admin`);
        return json(200, { apartado: apartadoPublico(updated) });
      }

      case "cancelar": {
        const a = await getApartado(String(b.id || ""));
        if (!a || a.email !== me) return json(404, { error: "No encontramos ese apartado." });
        if (a.status !== "nuevo" || ["pagado", "revision"].includes(a.anticipo.status)) return json(409, { error: "Este apartado ya tiene un pago; escríbele a Mae para cancelarlo." });
        const updated = await mutateApartado(a.id, (r) => {
          r.status = "cancelado";
          r.history = [...(r.history || []), { at: now(), status: "cancelado", por: "clienta" }];
          return r;
        });
        return json(200, { apartado: apartadoPublico(updated) });
      }

      default:
        return json(400, { error: "Acción desconocida." });
    }
  } catch (err) {
    console.error("preventa POST:", err);
    return json(500, { error: err.message || "Algo falló. Intenta de nuevo." });
  }
};

function json(statusCode, obj, headers = {}) {
  return { statusCode, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(obj) };
}
