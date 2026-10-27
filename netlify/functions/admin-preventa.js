// Preventa en /admin.html (Stock en México → 🛍️ Preventa). Header "x-admin-key".
//
// GET                         → { config, productos (con apartadas/disponibles), apartados }
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

const { randomUUID } = require("crypto");
const { checkAdminKey } = require("./lib/admin-auth.js");
const { saveConfig, listProductos, getProducto, saveProducto, deleteProducto, saveProductosLote, listApartados, getApartado, mutateApartado, getFile } = require("./lib/preventa-store.js");
const { CONFIG_DEFAULT, configActual, productosConCupo, cuenta, aplicarPago, avisar, listaHTML, esc, formatPriceMXN, round2 } = require("./lib/preventa-core.js");

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const now = () => new Date().toISOString();
const num = (v) => Math.max(0, Math.round((parseFloat(v) || 0) * 100) / 100);

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
          await avisar(rec, `${rec.folio}: ¡ya llegaron tus productos! Paga el resto`, `
            <h2 style="margin:0 0 8px;font-size:20px;">¡Ya llegó tu preventa! 🎉</h2>
            ${listaHTML(rec)}
            <p style="font-size:14px;">Te falta pagar <b>${formatPriceMXN(rec.resto.monto)}</b>${rec.envio ? ` (resto ${formatPriceMXN(rec.total - rec.anticipo.monto)} + envío ${formatPriceMXN(rec.envio)})` : ""}. En cuanto lo pagues ${rec.entrega === "personal" ? "quedamos para la entrega" : "te lo mando"}.</p>`,
          `${rec.folio}: ya llegaron tus productos, paga el resto de ${formatPriceMXN(rec.resto.monto)}`);
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
        const rec = await mutateApartado(id, (a) => {
          if (a.status === "cancelado") return null;
          a.status = "cancelado"; a.motivoCancelacion = motivo; hist(a, "cancelado");
          return a;
        });
        if (!rec) return json(404, { error: "No existe ese apartado." });
        if (b.avisar) {
          await avisar(rec, `${rec.folio}: se canceló tu apartado`, `<h2 style="margin:0 0 8px;font-size:20px;">Se canceló tu apartado</h2>${motivo ? `<p style="font-size:14px;">${esc(motivo)}</p>` : ""}`,
            `${rec.folio}: se canceló tu apartado${motivo ? `. ${motivo}` : ""}`);
        }
        return json(200, { apartado: rec });
      }

      case "nota": {
        const rec = await mutateApartado(id, (a) => { a.notaPrivada = clip(b.notaPrivada, 1000); return a; });
        if (!rec) return json(404, { error: "No existe ese apartado." });
        return json(200, { apartado: rec });
      }

      default:
        return json(400, { error: "Acción desconocida." });
    }
  } catch (err) {
    console.error("admin-preventa POST:", err);
    return json(500, { error: err.message || "No se pudo guardar." });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
