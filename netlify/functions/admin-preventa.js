// Preventa en /admin.html (Stock en México → 🛍️ Preventa). Header "x-admin-key".
//
// GET                         → { config, productos (con apartadas/disponibles), apartados }
// GET ?solo=apartados         → { apartados }  (ligero: para el aviso de Inicio y Pedidos)
// GET ?archivo=comprobante/<id>/<anticipo|resto>  → el comprobante
// POST { accion, ... }:
//   guardar_config    { titulo, descripcion, cierre, llegada, anticipoPct, envioDefault, activa }
//   guardar_producto  { id?, nombre, marca, imagen, descripcion, precio, precioAntes, piezas, peso, activo }
//                     (peso en kg por pieza; si es 0 se usa el estimado de cada tono)
//   borrar_producto   { id }   (si ya tiene apartados, solo se oculta)
//   importar          { productos: [{ id, nombre, marca, grupo, imagen, descripcion, variantes, ... }] }
//                     (agrega o reemplaza por id; así se cargan marcas completas de Sephora)
//   activar_grupo     { grupo, activo }  (mostrar u ocultar toda una marca/grupo)
//   aprobar_pago      { id, etapa }
//   rechazar_pago     { id, etapa, motivo }
//   llego             { id, envio }   (cobra el resto + envío)
//   marcar_enviado    { id, paqueteria, guia }
//   marcar_entregado  { id }
//   cancelar          { id, motivo, avisar }
//   nota              { id, notaPrivada }
//   crear_apartado    { email, nombre, telefono, items: [{ id, sku?, qty }], entrega, direccion, pagoCompleto, yaPagoAnticipo, avisar }
//                     (Mae le agrega un pedido a una clienta; no depende de que la venta esté abierta)
//   editar_items      { id, items: [{ id, sku?, qty }], avisar }   (la lista completa nueva; recalcula lo que debe/pagó)
//   reembolsado       { id }   (ya le devolví lo que tocaba)
// GET ?producto=<id>  → { producto } con todos sus tonos/tamaños
// GET ?cliente=<correo> → { nombre, telefono } de su cuenta (si ya tiene)

const { randomUUID } = require("crypto");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { saveConfig, listProductos, getProducto, saveProducto, deleteProducto, saveProductosLote, listApartados, getApartado, saveApartado, mutateApartado, nextFolio, getFile } = require("./lib/preventa-store.js");
const { CONFIG_DEFAULT, HORAS_PARA_PAGAR, configActual, productosConCupo, productoPublico, pesoDe, pesosEnvio, envioEstimado, cuenta, aplicarPago, avisar, listaHTML, esc, formatPriceMXN, round2 } = require("./lib/preventa-core.js");
const { getCustomerByEmail, normalizeEmail } = require("./lib/customer-store.js");

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const now = () => new Date().toISOString();
const num = (v) => Math.max(0, Math.round((parseFloat(v) || 0) * 100) / 100);

const buscarTexto = (a) => [a.folio, a.name, a.phone, a.email, ...Object.values(a.direccion || {}), ...(a.items || []).map((it) => `${it.marca || ""} ${it.nombre || ""} ${it.variante || ""}`)].filter(Boolean).join(" ").slice(0, 1500);

exports.handler = async (event) => {
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });

  if (event.httpMethod === "GET") {
    const key = (event.queryStringParameters || {}).archivo;
    if (key) {
      if (!/^comprobante\/[0-9a-f-]{36}\/(anticipo|resto)$/.test(key)) return json(400, { error: "Archivo inválido." });
      const f = await getFile(key);
      if (!f) return json(404, { error: "No existe." });
      return { statusCode: 200, headers: { "Content-Type": f.contentType, "Cache-Control": "private, no-store" }, body: f.buffer.toString("base64"), isBase64Encoded: true };
    }
    const qsa = event.queryStringParameters || {};
    if (qsa.producto) {
      const p = await getProducto(String(qsa.producto)).catch(() => null);
      if (!p) return json(404, { error: "No existe ese producto." });
      return json(200, { producto: productoPublico(p, { detalle: true }) });
    }
    if (qsa.cliente) {
      const c = await getCustomerByEmail(String(qsa.cliente)).catch(() => null);
      return json(200, { existe: !!c, nombre: (c && c.name) || "", telefono: (c && c.phone) || "" });
    }
    if ((event.queryStringParameters || {}).solo === "apartados") {
      try {
        const apartados = await listApartados();
        return json(200, { apartados: apartados.map((a) => ({ id: a.id, folio: a.folio, status: a.status, anticipo: a.anticipo && { status: a.anticipo.status }, resto: a.resto && { status: a.resto.status }, cuenta: cuenta(a),
          // Para el buscador global del admin (nombre, teléfono, dirección, productos).
          buscar: buscarTexto(a), name: a.name || (a.direccion && a.direccion.nombre) || "" })) });
      } catch (err) {
        console.error("admin-preventa GET apartados:", err);
        return json(500, { error: "No se pudieron cargar los apartados." });
      }
    }
    try {
      const [config, productos, apartados] = await Promise.all([configActual(), productosConCupo({ conApartadas: true }), listApartados()]);
      // Sin la lista de tonos (pesaría megas); solo cuántos tiene.
      const ligeros = productos.map(({ variantes, ...p }) => ({ ...p, numVariantes: (variantes || []).length, pesoEst: Math.max(0, ...(variantes || []).map((v) => Number(v.peso) || 0)), volEst: Math.max(0, ...(variantes || []).map((v) => Number(v.vol) || 0)) }));
      return json(200, { config, productos: ligeros, apartados: apartados.map((a) => ({ ...a, cuenta: cuenta(a) })) });
    } catch (err) {
      console.error("admin-preventa GET:", err);
      return json(500, { error: "No se pudo cargar la preventa." });
    }
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
  const id = String(b.id || "");
  const hist = (a, status, extra = {}) => { a.history = [...(a.history || []), { at: now(), status, por: "mae", ...extra }]; };

  try {
    switch (b.accion) {
      case "guardar_config": {
        const cierre = clip(b.cierre, 40);
        if (cierre && Number.isNaN(Date.parse(cierre))) return json(400, { error: "La fecha de cierre no es válida." });
        const cfg = {
          ...CONFIG_DEFAULT,
          titulo: clip(b.titulo, 80) || CONFIG_DEFAULT.titulo,
          descripcion: clip(b.descripcion, 400),
          cierre: cierre ? new Date(cierre).toISOString() : "",
          llegada: clip(b.llegada, 80),
          anticipoPct: Math.min(100, Math.max(1, parseInt(b.anticipoPct, 10) || 50)),
          envioDefault: num(b.envioDefault),
          activa: !!b.activa,
          updatedAt: now(),
        };
        await saveConfig(cfg);
        return json(200, { config: cfg });
      }

      case "guardar_producto": {
        const nombre = clip(b.nombre, 160);
        const precio = num(b.precio);
        // Vacío = sin límite de piezas.
        const piezas = b.piezas === "" || b.piezas == null ? null : Math.max(0, Math.min(9999, parseInt(b.piezas, 10) || 0));
        if (!nombre) return json(400, { error: "Ponle nombre al producto." });
        if (!(precio > 0)) return json(400, { error: "Pon el precio por pieza." });
        const imagen = clip(b.imagen, 600);
        if (imagen && !/^https:\/\//i.test(imagen)) return json(400, { error: "La foto debe ser un link que empiece con https://" });
        const prev = id ? await getProducto(id) : null;
        if (id && !prev) return json(404, { error: "Ese producto ya no existe." });
        const p = {
          ...(prev || { id: randomUUID(), createdAt: now(), orden: Date.now() }),
          nombre, marca: clip(b.marca, 80), imagen, descripcion: clip(b.descripcion, 600),
          precio, precioAntes: num(b.precioAntes), piezas, peso: b.peso === undefined ? (prev && prev.peso) || 0 : num(b.peso), activo: b.activo !== false, updatedAt: now(),
        };
        await saveProducto(p);
        return json(200, { producto: p });
      }

      case "importar": {
        const lista = Array.isArray(b.productos) ? b.productos.slice(0, 600) : [];
        if (!lista.length) return json(400, { error: "No vienen productos." });
        const actuales = new Map((await listProductos()).map((p) => [p.id, p]));
        const limpios = lista.map((x, i) => {
          const prev = actuales.get(String(x.id));
          const variantes = (Array.isArray(x.variantes) ? x.variantes : []).slice(0, 200).map((v) => ({
            id: clip(v.id, 40), nombre: clip(v.nombre, 120), desc: clip(v.desc, 160), tamano: clip(v.tamano, 120),
            precio: num(v.precio), precioAntes: num(v.precioAntes), imagen: clip(v.imagen, 400), swatch: clip(v.swatch, 400), peso: num(v.peso), vol: num(v.vol), agotado: !!v.agotado,
          })).filter((v) => v.id && v.precio > 0);
          return {
            ...(prev || { createdAt: now(), orden: Date.now() + i }),
            id: clip(x.id, 60), nombre: clip(x.nombre, 160), marca: clip(x.marca, 80), grupo: clip(x.grupo, 60), imagen: clip(x.imagen, 400),
            descripcion: clip(x.descripcion, 600), precio: num(x.precio) || (variantes[0] && variantes[0].precio) || 0, precioAntes: num(x.precioAntes),
            piezas: x.piezas == null || x.piezas === "" ? null : Math.max(0, parseInt(x.piezas, 10) || 0),
            activo: prev ? prev.activo !== false : x.activo !== false, variacion: clip(x.variacion, 40), variantes,
            peso: x.peso != null ? num(x.peso) : (prev && prev.peso) || 0, origen: clip(x.origen, 400), updatedAt: now(),
          };
        }).filter((p) => p.id && p.nombre && p.precio > 0);
        await saveProductosLote(limpios);
        return json(200, { importados: limpios.length });
      }

      case "activar_grupo": {
        const grupo = clip(b.grupo, 60);
        const activo = b.activo !== false;
        const cambiar = (await listProductos()).filter((p) => (p.grupo || "Otros") === grupo).map((p) => ({ ...p, activo, updatedAt: now() }));
        if (!cambiar.length) return json(404, { error: "No hay productos en ese grupo." });
        await saveProductosLote(cambiar);
        return json(200, { cambiados: cambiar.length });
      }

      case "borrar_producto": {
        const p = await getProducto(id);
        if (!p) return json(404, { error: "Ese producto ya no existe." });
        const usado = (await listApartados()).some((a) => a.status !== "cancelado" && (a.items || []).some((it) => it.id === id));
        if (usado) {
          await saveProducto({ ...p, activo: false, updatedAt: now() });
          return json(200, { oculto: true });
        }
        await deleteProducto(id);
        return json(200, { borrado: true });
      }

      case "aprobar_pago": {
        const etapa = b.etapa === "resto" ? "resto" : "anticipo";
        const a = await getApartado(id);
        if (!a) return json(404, { error: "No existe ese apartado." });
        if (!a[etapa] || a[etapa].status === "pagado") return json(409, { error: "Ese pago ya está aprobado." });
        if (etapa === "resto" && a.status !== "llego") return json(409, { error: "Primero marca que llegó." });
        const rec = await aplicarPago(id, etapa, { metodo: a[etapa].metodo || "transferencia" });
        return json(200, { apartado: rec });
      }

      case "rechazar_pago": {
        const etapa = b.etapa === "resto" ? "resto" : "anticipo";
        const motivo = clip(b.motivo, 500) || "No pudimos validar tu comprobante.";
        const rec = await mutateApartado(id, (a) => {
          if (!a[etapa] || a[etapa].status === "pagado") return null;
          a[etapa] = { ...a[etapa], status: "pendiente", rechazo: motivo };
          // Si era el anticipo, se le dan otras horas para pagar.
          if (etapa === "anticipo") a.createdAt = now();
          hist(a, a.status, { rechazo: etapa });
          return a;
        });
        if (!rec) return json(404, { error: "No existe ese apartado." });
        await avisar(rec, `revisa tu pago de ${rec.folio}`, `<h2 style="margin:0 0 8px;font-size:20px;">No pudimos validar tu pago</h2><p style="font-size:14px;">${esc(motivo)}</p><p style="font-size:14px;">Puedes volver a subir tu comprobante o pagar con tarjeta.</p>`,
          `${rec.folio}: no pudimos validar tu pago. ${motivo}`);
        return json(200, { apartado: rec });
      }

      case "llego": {
        const envio = num(b.envio);
        let ok = false;
        const rec = await mutateApartado(id, (a) => {
          if (a.status !== "apartado") return null;
          ok = true;
          a.envio = a.entrega === "personal" ? 0 : envio;
          const monto = round2(a.total - a.anticipo.monto + a.envio);
          a.resto = { ...a.resto, monto, status: monto > 0 ? "pendiente" : "pagado", ...(monto > 0 ? {} : { paidAt: now(), metodo: "nada" }) };
          a.status = monto > 0 ? "llego" : "liquidado";
          a.llegoAt = now();
          hist(a, a.status);
          return a;
        });
        if (!rec) return json(404, { error: "No existe ese apartado." });
        if (!ok) return json(409, { error: "Solo se marcan los apartados con anticipo pagado." });
        if (rec.status === "llego") {
          await avisar(rec, `${rec.folio}: ¡ya llegaron tus productos! Paga ${rec.pagoCompleto ? "el envío" : "el resto"}`, `
            <h2 style="margin:0 0 8px;font-size:20px;">¡Ya llegó tu preventa! 🎉</h2>
            ${listaHTML(rec)}
            <p style="font-size:14px;">Te falta pagar <b>${formatPriceMXN(rec.resto.monto)}</b>${rec.pagoCompleto ? " de envío (tus productos ya están pagados)" : rec.envio ? ` (resto ${formatPriceMXN(rec.total - rec.anticipo.monto)} + envío ${formatPriceMXN(rec.envio)})` : ""}. En cuanto lo pagues ${rec.entrega === "personal" ? "quedamos para la entrega" : "te lo mando"}.</p>`,
          `${rec.folio}: ya llegaron tus productos, paga ${rec.pagoCompleto ? "el envío" : "el resto"} de ${formatPriceMXN(rec.resto.monto)}`);
        }
        if (rec.status === "liquidado" && rec.pagoCompleto) {
          await avisar(rec, `${rec.folio}: ¡ya llegaron tus productos! 🎉`, `
            <h2 style="margin:0 0 8px;font-size:20px;">¡Ya llegó tu preventa! 🎉</h2>
            ${listaHTML(rec)}
            <p style="font-size:14px;">Ya está todo pagado. ${rec.entrega === "personal" ? "Te escribo para quedar en la entrega." : "Ya preparo tu envío; te mando la guía en cuanto salga."}</p>`,
          `${rec.folio}: ya llegaron tus productos, ${rec.entrega === "personal" ? "te escribo para la entrega" : "ya preparo tu envío"}`);
        }
        return json(200, { apartado: rec });
      }

      case "marcar_enviado": {
        const guia = clip(b.guia, 80);
        const paqueteria = clip(b.paqueteria, 40) || "Estafeta";
        const rec = await mutateApartado(id, (a) => {
          if (!["liquidado", "enviado"].includes(a.status)) return null;
          Object.assign(a, { status: "enviado", paqueteria, guia, enviadoAt: now() });
          hist(a, "enviado");
          return a;
        });
        if (!rec || rec.status !== "enviado") return json(409, { error: "Solo se envían los apartados ya liquidados." });
        if (b.avisar !== false) {
          await avisar(rec, `${rec.folio}: tu preventa va en camino 🚚`, `<h2 style="margin:0 0 8px;font-size:20px;">¡Tu preventa va en camino!</h2>
            <p style="font-size:14px;">${guia ? `Paquetería: <b>${esc(paqueteria)}</b><br>Guía: <b>${esc(guia)}</b>` : "Ya salió tu paquete."}</p>`,
          `${rec.folio}: tu preventa va en camino${guia ? `. ${paqueteria}, guía ${guia}` : ""}`);
        }
        return json(200, { apartado: rec });
      }

      case "marcar_entregado": {
        const rec = await mutateApartado(id, (a) => {
          if (!["liquidado", "enviado"].includes(a.status)) return null;
          a.status = "entregado"; a.entregadoAt = now(); hist(a, "entregado");
          return a;
        });
        if (!rec || rec.status !== "entregado") return json(409, { error: "Solo se entregan los apartados ya liquidados." });
        return json(200, { apartado: rec });
      }

      case "cancelar": {
        const motivo = clip(b.motivo, 500);
        let aReembolsar = 0;
        const rec = await mutateApartado(id, (a) => {
          if (a.status === "cancelado") return null;
          a.status = "cancelado"; a.motivoCancelacion = motivo; hist(a, "cancelado");
          // Lo que ya pagó se le reembolsa (queda apuntado como pendiente).
          aReembolsar = yaPagado(a);
          if (aReembolsar > 0) a.devuelto = round2((Number(a.devuelto) || 0) + aReembolsar);
          if (aReembolsar > 0) a.reembolso = { monto: round2(aReembolsar + ((a.reembolso && a.reembolso.status === "pendiente" && Number(a.reembolso.monto)) || 0)), status: "pendiente", at: now() };
          return a;
        });
        if (!rec) return json(404, { error: "No existe ese apartado." });
        if (b.avisar !== false) {
          await avisar(rec, `${rec.folio}: se canceló tu apartado`, `<h2 style="margin:0 0 8px;font-size:20px;">Se canceló tu apartado</h2>${motivo ? `<p style="font-size:14px;">${esc(motivo)}</p>` : ""}${aReembolsar > 0 ? `<p style="font-size:14px;">Te reembolsamos <b>${formatPriceMXN(aReembolsar)}</b>. Escríbenos por WhatsApp para hacerte tu reembolso.</p>` : ""}`,
            `${rec.folio}: se canceló tu apartado${motivo ? `. ${motivo}` : ""}${aReembolsar > 0 ? `. Te reembolsamos ${formatPriceMXN(aReembolsar)}, escríbenos por WhatsApp para hacerte tu reembolso` : ""}`);
        }
        return json(200, { apartado: rec, reembolso: aReembolsar });
      }

      case "nota": {
        const rec = await mutateApartado(id, (a) => { a.notaPrivada = clip(b.notaPrivada, 1000); return a; });
        if (!rec) return json(404, { error: "No existe ese apartado." });
        return json(200, { apartado: rec });
      }

      case "editar_items": {
        const a0 = await getApartado(id);
        if (!a0) return json(404, { error: "No existe ese apartado." });
        if (!["nuevo", "apartado", "llego"].includes(a0.status)) return json(409, { error: "Solo se pueden cambiar los productos antes de que quede liquidado. Cancela este y haz uno nuevo." });
        const productos = new Map((await productosConCupo()).map((p) => [p.id, p]));
        const armado = armarItems(b.items, productos, a0.items || []);
        if (armado.error) return json(400, { error: armado.error });
        const { items, avisos } = armado;
        const totalAntes = a0.total;
        let reembolsoNuevo = 0;
        const rec = await mutateApartado(id, (a) => {
          if (!["nuevo", "apartado", "llego"].includes(a.status)) return null;
          const total = round2(items.reduce((s, it) => s + it.precio * it.qty, 0));
          const pesos = pesosEnvio(items);
          a.items = items; a.total = total; Object.assign(a, pesos);
          const pagado = yaPagado(a);
          if (a.status === "nuevo") {
            // Todavía no paga el anticipo: se recalcula con el mismo porcentaje.
            const anticipo = Math.ceil(total * (a.anticipoPct || 50) / 100);
            a.anticipo = { ...a.anticipo, monto: anticipo };
            a.resto = { ...a.resto, monto: round2(total - anticipo) };
          } else {
            const debido = round2(total + (a.status === "llego" ? a.envio || 0 : 0));
            const falta = round2(debido - pagado);
            if (falta < 0) reembolsoNuevo = round2(-falta);
            a.resto = { ...a.resto, monto: Math.max(0, falta) };
            if (a.status === "llego" && falta <= 0) {
              a.resto = { ...a.resto, status: "pagado", paidAt: now(), metodo: "ya cubierto" };
              a.status = "liquidado";
            }
          }
          if (reembolsoNuevo > 0) {
            const previo = (a.reembolso && a.reembolso.status === "pendiente" && Number(a.reembolso.monto)) || 0;
            a.reembolso = { monto: round2(previo + reembolsoNuevo), status: "pendiente", at: now() };
            a.devuelto = round2((Number(a.devuelto) || 0) + reembolsoNuevo);
          }
          hist(a, a.status, { edicion: true, totalAntes, total });
          return a;
        });
        if (!rec) return json(409, { error: "Ese apartado ya no se puede editar." });
        if (rec.entrega === "envio" && rec.status === "apartado") {
          const est = await envioEstimado(rec.direccion && rec.direccion.cp, rec.pesoCobrableKg);
          if (est != null) await mutateApartado(id, (a) => { a.envioEstimado = est; return a; });
        }
        if (b.avisar !== false) {
          const resumen = rec.status === "nuevo"
            ? `Tu anticipo ahora es de <b>${formatPriceMXN(rec.anticipo.monto)}</b>.`
            : reembolsoNuevo > 0
              ? `Ya habías pagado más de lo que ahora cuesta: te reembolsamos <b>${formatPriceMXN(reembolsoNuevo)}</b>. Escríbenos por WhatsApp para hacerte tu reembolso.`
              : rec.status === "llego" && rec.resto.monto > 0
                ? `Ahora te falta pagar <b>${formatPriceMXN(rec.resto.monto)}</b>. Entra a alpacca.mx > Mis pedidos para pagarlo o subir tu comprobante.`
                : rec.status === "liquidado" ? "Ya está todo pagado."
                : `Lo que pagas cuando lleguen tus productos ahora es <b>${formatPriceMXN(rec.resto.monto)}</b>${rec.entrega === "envio" ? " más el envío" : ""}.`;
          const texto = rec.status === "nuevo"
            ? `tu anticipo ahora es de ${formatPriceMXN(rec.anticipo.monto)}`
            : reembolsoNuevo > 0 ? `te reembolsamos ${formatPriceMXN(reembolsoNuevo)}, escríbenos por WhatsApp para hacerte tu reembolso`
            : rec.status === "llego" && rec.resto.monto > 0 ? `ahora te falta pagar ${formatPriceMXN(rec.resto.monto)}, entra a alpacca.mx > Mis pedidos para pagar o subir tu comprobante`
            : `lo que pagas cuando lleguen tus productos ahora es ${formatPriceMXN(rec.resto.monto)}`;
          await avisar(rec, `${rec.folio}: cambió tu apartado`, `
            <h2 style="margin:0 0 8px;font-size:20px;">Cambió tu apartado</h2>
            ${listaHTML(rec)}
            <p style="font-size:14px;">Total: <b>${formatPriceMXN(rec.total)}</b> (antes ${formatPriceMXN(totalAntes)}). ${resumen}</p>`,
          `${rec.folio}: cambió tu apartado. Ahora el total es ${formatPriceMXN(rec.total)} (antes ${formatPriceMXN(totalAntes)}); ${texto}`);
        }
        return json(200, { apartado: rec, avisos, reembolso: reembolsoNuevo });
      }

      case "reembolsado": {
        const rec = await mutateApartado(id, (a) => {
          if (!a.reembolso) return null;
          a.reembolso = { ...a.reembolso, status: "hecho", hechoAt: now() };
          return a;
        });
        if (!rec) return json(404, { error: "Ese apartado no tiene reembolso pendiente." });
        if (b.avisar !== false) {
          await avisar(rec, `${rec.folio}: ya te hicimos tu reembolso 💸`, `<h2 style="margin:0 0 8px;font-size:20px;">Ya te hicimos tu reembolso</h2><p style="font-size:14px;">Te reembolsamos <b>${formatPriceMXN(rec.reembolso.monto)}</b> de tu apartado ${esc(rec.folio)}. Si no lo ves reflejado en unos días, escríbenos.</p>`,
            `${rec.folio}: ya te hicimos tu reembolso de ${formatPriceMXN(rec.reembolso.monto)}. Si no lo ves reflejado en unos días, escríbenos`);
        }
        return json(200, { apartado: rec });
      }

      case "crear_apartado": {
        const email = normalizeEmail(b.email);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Pon el correo de la clienta (el mismo con el que entra a alpacca.mx)." });
        const customer = await getCustomerByEmail(email).catch(() => null);
        const cfg = await configActual();
        const productos = new Map((await productosConCupo()).map((p) => [p.id, p]));
        const armado = armarItems(b.items, productos);
        if (armado.error) return json(armado.error.startsWith("Elige") ? 400 : armado.error.startsWith("Agrega") ? 400 : 409, { error: armado.error });
        const { items, avisos } = armado;
        const entrega = b.entrega === "personal" ? "personal" : "envio";
        const d = b.direccion || {};
        const direccion = Object.fromEntries(["nombre", "telefono", "calle", "colonia", "ciudad", "estado", "cp", "referencias"].map((k) => [k, clip(d[k], k === "referencias" ? 200 : 120)]));
        const nombre = clip(b.nombre, 120) || (customer && customer.name) || "";
        const telefono = clip(b.telefono, 30) || (customer && customer.phone) || "";
        if (!nombre) return json(400, { error: "Pon el nombre de la clienta." });
        if (!direccion.nombre) direccion.nombre = nombre;
        if (!direccion.telefono) direccion.telefono = telefono;
        const total = round2(items.reduce((s, it) => s + it.precio * it.qty, 0));
        const pesos = pesosEnvio(items);
        const envioEst = entrega === "envio" ? await envioEstimado(direccion.cp, pesos.pesoCobrableKg) : 0;
        const completo = !!b.pagoCompleto;
        const pct = completo ? 100 : Math.min(100, Math.max(1, Number(cfg.anticipoPct) || 50));
        const anticipo = Math.ceil(total * pct / 100);
        const rec = {
          id: randomUUID(), folio: await nextFolio(), email, name: nombre, phone: telefono,
          campana: cfg.titulo, items, total, anticipoPct: pct, ...(completo ? { pagoCompleto: true } : {}),
          anticipo: { monto: anticipo, status: "pendiente" },
          resto: { monto: round2(total - anticipo), status: "espera" },
          envio: 0, ...pesos, envioEstimado: envioEst, entrega, direccion, nota: clip(b.nota, 500), status: "nuevo",
          creadoPorMae: true,
          history: [{ at: now(), status: "nuevo", por: "mae" }], createdAt: now(), updatedAt: now(),
        };
        await saveApartado(rec);
        let final = rec;
        if (b.yaPagoAnticipo) {
          // Ya pagó por fuera: queda apartado y se le avisa que quedó confirmado.
          final = (await aplicarPago(rec.id, "anticipo", { metodo: "por fuera" })) || rec;
        } else if (b.avisar !== false) {
          await avisar(rec, completo ? `${rec.folio}: paga tu pedido para apartarlo` : `${rec.folio}: aparta pagando tu anticipo`, `
            <h2 style="margin:0 0 8px;font-size:20px;">¡Ya casi! ${completo ? "Paga tu pedido para apartarlo" : "Paga tu anticipo para apartar"}</h2>
            ${listaHTML(rec)}
            <p style="font-size:14px;">${completo ? `Total: <b>${formatPriceMXN(total)}</b>. Es pago completo${entrega === "envio" ? "; cuando lleguen tus productos solo pagas el envío" : ""}.` : `Total: <b>${formatPriceMXN(total)}</b>. Para apartar pagas el ${pct}%: <b>${formatPriceMXN(anticipo)}</b>. El resto lo pagas cuando lleguen tus productos.`}</p>
            <p style="font-size:14px;">Entra a alpacca.mx con este correo (${esc(email)}), ve a Mis pedidos y ahí pagas o subes tu comprobante. Tienes ${HORAS_PARA_PAGAR} horas; si no, se libera el lugar.</p>`,
          `${rec.folio}: paga tu anticipo de ${formatPriceMXN(anticipo)} para apartar. Entra a alpacca.mx > Mis pedidos para pagar o subir tu comprobante`);
        }
        return json(200, { apartado: final, tieneCuenta: !!customer, avisos });
      }

      default:
        return json(400, { error: "Acción desconocida." });
    }
  } catch (err) {
    console.error("admin-preventa POST:", err);
    return json(500, { error: err.message || "No se pudo guardar." });
  }
};

/* Pasa [{id, sku, qty}] a renglones del apartado. Los renglones que ya tenía
   conservan su precio (no cambia lo que se le prometió); solo los nuevos
   toman el precio de hoy. */
function armarItems(raw, productos, existentes = []) {
  const pedidos = new Map();
  for (const it of Array.isArray(raw) ? raw : []) {
    const qty = parseInt(it && it.qty, 10);
    const pid = String((it && it.id) || "");
    const sku = String((it && it.sku) || "");
    if (pid && qty > 0) { const k = `${pid}|${sku}`; pedidos.set(k, { id: pid, sku, qty: ((pedidos.get(k) || {}).qty || 0) + qty }); }
  }
  if (!pedidos.size) return { error: "Agrega al menos un producto." };
  const items = [];
  const porProducto = {};
  const avisos = [];
  for (const { id: pid, sku, qty } of pedidos.values()) {
    const ya = existentes.find((x) => x.id === pid && String(x.sku || "") === sku);
    if (ya) { items.push({ ...ya, qty }); continue; }
    const p = productos.get(pid);
    if (!p) return { error: "Uno de los productos ya no existe en la preventa." };
    let v = null;
    if ((p.variantes || []).length) {
      v = p.variantes.find((x) => x.id === sku);
      if (!v) return { error: `Elige el tono o tamaño de ${p.nombre}.` };
    }
    porProducto[pid] = (porProducto[pid] || 0) + qty;
    if (p.disponibles != null && porProducto[pid] > p.disponibles) avisos.push(`${p.nombre}: pasaste el cupo (quedaban ${p.disponibles}).`);
    if (v && v.agotado) avisos.push(`${p.nombre} (${v.nombre}) estaba marcado como agotado.`);
    items.push({
      id: pid, nombre: p.nombre, marca: p.marca || "", imagen: (v && v.imagen) || p.imagen || "", precio: Number(v ? v.precio : p.precio), qty, peso: pesoDe(p, v), vol: Number(v ? v.vol : p.vol) || 0,
      ...(v ? { sku: v.id, variante: v.nombre, tamano: v.tamano || "" } : {}),
    });
  }
  return { items, avisos };
}

/* Lo que la clienta ya pagó de un apartado. */
// (menos lo que ya se le mandó a reembolsar: "devuelto").
const yaPagado = (a) => Math.max(0, round2((a.anticipo && a.anticipo.status === "pagado" ? a.anticipo.monto : 0) + (a.resto && a.resto.status === "pagado" ? a.resto.monto : 0) - (Number(a.devuelto) || 0)));

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
