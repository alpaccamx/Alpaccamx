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
const { detectFileType } = require("./lib/file-signature.js");
const { listApartados, getApartado, saveApartado, mutateApartado, nextFolio, saveFile } = require("./lib/preventa-store.js");
const { configActual, abierta, productosConCupo, productoPublico, pesoDe, pesosEnvio, envioEstimado, apartadoPublico, etapaPorPagar, crearPreferenciaMP, avisar, listaHTML, formatPriceMXN, HORAS_PARA_PAGAR } = require("./lib/preventa-core.js");

const MAX_BYTES = 5 * 1024 * 1024;
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
        if (!p) return json(404, { error: "Ese producto ya no está en la preventa." });
        out = { producto: productoPublico(p, { detalle: true }) };
      } else if (qs.resumen) {
        out = { config: configPublica(cfg), abierta: open, total: visibles.length };
      } else {
        out = { config: configPublica(cfg), abierta: open, productos: visibles.map((p) => productoPublico(p)) };
      }
      if (email && !qs.producto) out.apartados = (await listApartados({ email: String(email).toLowerCase() })).map(apartadoPublico);
      // Sin sesión se guarda 30 s en la CDN (la tienda la consulta en cada
      // visita); el cupo real se revisa otra vez al apartar.
      return json(200, out, email
        ? { "Cache-Control": "private, no-store", "Netlify-Vary": "header=Authorization" }
        : { "Cache-Control": "public, max-age=0, must-revalidate", "Netlify-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=60", "Netlify-Vary": "header=Authorization" });
    } catch (err) {
      console.error("preventa GET:", err);
      return json(500, { error: "No se pudo cargar la preventa." });
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
        if (!abierta(cfg)) return json(409, { error: "La preventa ya cerró." });
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
          if (!p || p.activo === false) return json(409, { error: "Uno de los productos ya no está en la preventa. Recarga la página." });
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
        const pct = Math.min(100, Math.max(1, Number(cfg.anticipoPct) || 50));
        const anticipo = Math.ceil(total * pct / 100);
        const rec = {
          id: randomUUID(), folio: await nextFolio(), email: me, name: customer.name || direccion.nombre, phone: customer.phone || direccion.telefono,
          campana: cfg.titulo, items, total, anticipoPct: pct,
          anticipo: { monto: anticipo, status: "pendiente" },
          resto: { monto: Math.round((total - anticipo) * 100) / 100, status: "espera" },
          envio: 0, ...pesos, envioEstimado: envioEst, entrega, direccion, nota: clip(b.nota, 500), status: "nuevo",
          history: [{ at: now(), status: "nuevo" }], createdAt: now(), updatedAt: now(),
        };
        await saveApartado(rec);
        await avisar(rec, `${rec.folio}: aparta pagando tu anticipo`, `
          <h2 style="margin:0 0 8px;font-size:20px;">¡Ya casi! Paga tu anticipo para apartar</h2>
          ${listaHTML(rec)}
          <p style="font-size:14px;">Total: <b>${formatPriceMXN(total)}</b>. Para apartar pagas el ${pct}%: <b>${formatPriceMXN(anticipo)}</b>. El resto lo pagas cuando lleguen tus productos.</p>
          <p style="font-size:14px;">Tienes ${HORAS_PARA_PAGAR} horas para pagarlo; si no, se libera el lugar.</p>`,
        `${rec.folio}: paga tu anticipo de ${formatPriceMXN(anticipo)} para apartar`);
        return json(200, { apartado: apartadoPublico(rec) });
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

      case "comprobante": {
        const a = await getApartado(String(b.id || ""));
        if (!a || a.email !== me) return json(404, { error: "No encontramos ese apartado." });
        const etapa = etapaPorPagar(a);
        if (!etapa) return json(409, { error: "Este apartado ya no acepta comprobantes." });
        if (!b.dataBase64) return json(400, { error: "Falta el archivo." });
        let buf;
        try { buf = Buffer.from(String(b.dataBase64), "base64"); } catch { return json(400, { error: "El archivo no se pudo leer." }); }
        if (!buf.length || buf.length > MAX_BYTES) return json(400, { error: "El archivo debe pesar menos de 5 MB." });
        const real = detectFileType(buf);
        if (!real) return json(400, { error: "Solo se aceptan imágenes o archivos PDF." });
        const ct = real === "pdf" ? "application/pdf" : /^image\/[a-z0-9.+-]+$/i.test(b.contentType || "") ? b.contentType : "image/jpeg";
        await saveFile(`comprobante/${a.id}/${etapa}`, buf, ct);
        const updated = await mutateApartado(a.id, (r) => {
          r[etapa] = { ...r[etapa], status: "revision", metodo: "transferencia", comprobanteAt: now(), comprobanteTipo: ct, rechazo: undefined };
          return r;
        });
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
