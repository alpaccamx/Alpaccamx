// Avisos a la clienta cuando Mae mueve algo de su pedido de la tienda en
// /admin.html (etapa, productos, entrega personal, cancelación...): correo
// (el de la cuenta con la que compró) y
// WhatsApp con la plantilla "aviso_pedido" (ver README).

const { sendEmail, baseEmailHTML } = require("./email.js");
const { getCustomerByPhone } = require("./customer-store.js");
const { notifyCustomerTemplate } = require("./whatsapp.js");
const { loadCatalog } = require("./catalog-source.js");

const SITE = "https://alpacca.mx";
const numeroPedido = (order) => String(order.id || "").slice(0, 8).toUpperCase();

/* Correo de la clienta de un pedido: el de la cuenta con la que compró
   (los pedidos lo guardan en customerEmail, porque comprar pide iniciar
   sesión). Los pedidos viejos sin ese dato se buscan por teléfono. */
async function cuentaDelPedido(order) {
  if (order && order.customerEmail) return { email: order.customerEmail };
  return getCustomerByPhone(order && order.customer && order.customer.phone).catch(() => null);
}

/* texto = aviso corto (WhatsApp y resumen del correo); html = detalle
   extra opcional para el correo. */
async function avisarPedido(order, { asunto, titulo, texto, html = "", soloWhatsApp = false, intro }) {
  if (!order) return;
  const c = order.customer || {};
  await notifyCustomerTemplate("aviso_pedido", { phone: c.phone, name: c.name, texto }).catch((err) => console.error("aviso_pedido:", err));
  if (soloWhatsApp) return;
  const cuenta = await cuentaDelPedido(order);
  if (!cuenta || !cuenta.email) return;
  await sendEmail({
    to: cuenta.email,
    subject: asunto,
    html: baseEmailHTML(`
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#c4466e;letter-spacing:.3px;text-transform:uppercase;">Pedido ${esc(numeroPedido(order))}</p>
      <h2 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#2b2430;">${esc(titulo || asunto)}</h2>
      ${intro != null ? intro : `<p style="font-size:15px;margin:0 0 12px;">${esc(texto.charAt(0).toUpperCase() + texto.slice(1))}.</p>`}
      ${html}
      <p style="margin:24px 0 0;text-align:center;"><a href="${SITE}/?ver=mis-pedidos" style="display:inline-block;background:#c4466e;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Ver mis pedidos</a></p>`),
  }).catch((err) => console.error("correo de aviso de pedido:", err));
}

const WHATSAPP_MAE = "5216571920559";
const fmtMXN = (v) => (Number(v) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/* Cuánto pagó la clienta: lo que se guardó al confirmar el pago; si es un
   pedido viejo sin ese dato, su total antes del cambio. */
const montoPagado = (order) => (order.montoPagado != null ? Number(order.montoPagado) : Number(order.grandTotal) || 0);

/* Nombre completo y claro de un artículo: marca, nombre, tono, capacidad
   (ml, g...) y si es pieza individual o caja. El tono y la presentación
   vienen en el nombre del pedido ("... (#21 Beige) (Pieza individual)");
   la capacidad sale del catálogo por SKU. */
const PRESENTACION_RE = /^(pieza individual|caja (con|de) \d+ piezas?)$/i;
function describirArticulo(it, fila) {
  let nombre = String(it.nombre || "").trim();
  const extras = [];
  let presentacion = "";
  let tono = "";
  // Quita del final los paréntesis de presentación y tono.
  for (let i = 0; i < 3; i++) {
    const m = /\s*\(([^()]*)\)\s*$/.exec(nombre);
    if (!m) break;
    if (PRESENTACION_RE.test(m[1])) presentacion = m[1];
    else if (/^#/.test(m[1])) tono = m[1];
    else break;
    nombre = nombre.slice(0, m.index).trim();
  }
  nombre = nombre.replace(/\s*-\s*\d+\s+(colores|tonos|versiones|tipos)$/i, "");
  const capacidad = fila && fila.Capacidad;
  if (tono) extras.push(`Tono ${tono}`);
  if (capacidad && !nombre.toLowerCase().includes(String(capacidad).toLowerCase())) extras.push(capacidad);
  presentacion = presentacion || (fila && fila.Presentacion) || "";
  if (presentacion) extras.push(presentacion.charAt(0).toUpperCase() + presentacion.slice(1));
  return `${it.marca ? `${it.marca} ` : ""}${nombre}${extras.length ? ` (${extras.join(", ")})` : ""}`;
}

/* Agrega "detalle" (el nombre claro de arriba) a cada artículo. */
async function conDetalle(items) {
  let porSku = new Map();
  try {
    const { rows } = await loadCatalog();
    porSku = new Map(rows.filter((r) => r.SKU).map((r) => [r.SKU, r]));
  } catch (err) {
    console.error("No se pudo leer el catálogo para el aviso:", err);
  }
  return (items || []).map((it) => {
    const fila = porSku.get(it.sku) || porSku.get(String(it.sku || "").replace(/__stock$/, ""));
    const img = (fila && fila.Imagen) || it.imagen || "";
    return { ...it, detalle: describirArticulo(it, fila), imagen: /^https?:/.test(img) ? img : img ? `${SITE}/${img.replace(/^\.?\//, "")}` : "" };
  });
}

/* Qué cambió entre los productos de antes y los de ahora. */
function cambiosProductos(antes, ahora) {
  const key = (it) => String(it.sku || it.nombre).toLowerCase();
  const nombre = (it) => it.detalle || `${it.marca ? `${it.marca} ` : ""}${it.nombre}`;
  const piezas = (n) => `${n} pieza${n === 1 ? "" : "s"}`;
  const prev = new Map((antes || []).map((it) => [key(it), it]));
  const next = new Map((ahora || []).map((it) => [key(it), it]));
  const out = { agregados: [], quitados: [], cantidad: [], precio: [], agregadosIt: [], quitadosIt: [], cantidadIt: [], precioIt: [] };
  // "It" = lo mismo pero con el artículo, para pintarlo con foto en el correo.
  const add = (k, it, texto, nota) => { out[k].push(texto); out[`${k}It`].push({ it, nota }); };
  next.forEach((it, k) => {
    const old = prev.get(k);
    if (!old) { add("agregados", it, `${nombre(it)} · ${piezas(it.qty)} · ${fmtMXN(it.precio)} c/u`, `${piezas(it.qty)} · ${fmtMXN(it.precio)} c/u`); return; }
    if (old.qty !== it.qty) add("cantidad", it, `${nombre(it)}: antes ${piezas(old.qty)}, ahora ${piezas(it.qty)}`, `Antes ${piezas(old.qty)} → ahora <b>${piezas(it.qty)}</b>`);
    if (Math.round(old.precio * 100) !== Math.round(it.precio * 100)) add("precio", it, `${nombre(it)}: antes ${fmtMXN(old.precio)}, ahora ${fmtMXN(it.precio)} c/u`, `Antes ${fmtMXN(old.precio)} → ahora <b>${fmtMXN(it.precio)}</b> c/u`);
  });
  prev.forEach((it, k) => { if (!next.has(k)) add("quitados", it, `${nombre(it)} · ${piezas(it.qty)}`, piezas(it.qty)); });
  return out;
}

/* ---- Piezas visuales de los correos de pedido ---- */
const PLACEHOLDER_IMG = `${SITE}/assets/mascot.png`;
const COLORES_SECCION = { "❌": "#fdecef", "➕": "#eef8f2", "🔁": "#eef3ff", "🏷️": "#fff6e5" };

function fotoArticulo(it) {
  return `<img src="${esc(it.imagen || PLACEHOLDER_IMG)}" alt="" width="52" height="52" style="width:52px;height:52px;border-radius:10px;object-fit:cover;background:#f6f1f4;display:block;" />`;
}

function seccion(titulo, lista) {
  const fondo = COLORES_SECCION[Object.keys(COLORES_SECCION).find((k) => titulo.startsWith(k))] || "#f6f1f4";
  return `<p style="font-size:15px;font-weight:700;margin:18px 0 8px;">${esc(titulo)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${fondo};border-radius:14px;">
      ${lista.map(({ it, nota }) => `<tr>
        <td style="padding:10px 0 10px 12px;width:52px;vertical-align:top;">${fotoArticulo(it)}</td>
        <td style="padding:10px 12px;vertical-align:top;font-size:14px;line-height:1.4;">
          <b>${esc(it.detalle || `${it.marca ? `${it.marca} ` : ""}${it.nombre}`)}</b><br>
          <span style="color:#6f6474;">${nota}</span>
        </td></tr>`).join("")}
    </table>`;
}

function tablaProductos(items, conPrecios) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0e6ec;">
    ${(items || []).map((it) => `<tr>
      <td style="padding:10px 0;width:52px;vertical-align:top;border-bottom:1px solid #f0e6ec;">${fotoArticulo(it)}</td>
      <td style="padding:10px 10px;vertical-align:top;font-size:14px;line-height:1.4;border-bottom:1px solid #f0e6ec;">${esc(it.detalle || `${it.marca ? `${it.marca} ` : ""}${it.nombre}`)}<br><span style="color:#6f6474;">${it.qty} pieza${it.qty === 1 ? "" : "s"}</span></td>
      <td style="padding:10px 0;vertical-align:top;text-align:right;font-size:14px;font-weight:700;white-space:nowrap;border-bottom:1px solid #f0e6ec;">${conPrecios ? fmtMXN(it.precio * it.qty) : ""}</td>
    </tr>`).join("")}
  </table>`;
}

function filaSimple(t, v, fuerte) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="padding:10px 0;font-size:${fuerte ? 16 : 14}px;${fuerte ? "font-weight:700;" : ""}">${esc(t)}</td>
    <td style="padding:10px 0;text-align:right;font-size:${fuerte ? 18 : 14}px;font-weight:700;${fuerte ? "color:#c4466e;" : ""}">${esc(v)}</td>
  </tr></table>`;
}

function tablaCuentas(cuentas) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f8;border-radius:14px;">
    ${cuentas.map(([t, v, color], i) => `<tr>
      <td style="padding:12px 14px;font-size:14px;${i < cuentas.length - 1 ? "border-bottom:1px solid #efe5eb;" : "font-weight:700;"}">${esc(t)}</td>
      <td style="padding:12px 14px;text-align:right;font-size:${i === cuentas.length - 1 ? 17 : 14}px;font-weight:700;${color ? `color:${color};` : ""}${i < cuentas.length - 1 ? "border-bottom:1px solid #efe5eb;" : ""}">${esc(v)}</td>
    </tr>`).join("")}
  </table>`;
}

/* Recuadro grande de arriba con el resultado (reembolso / falta pagar). */
function heroSaldo(pagado, nuevoTotal, dif) {
  if (pagado == null) return `<div style="background:#faf6f8;border-radius:16px;padding:16px;text-align:center;margin:0 0 6px;"><p style="margin:0;font-size:13px;color:#6f6474;">Total nuevo de tu pedido</p><p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#2b2430;">${fmtMXN(nuevoTotal)}</p></div>`;
  if (dif > 0.5) return `<div style="background:#eef8f2;border:1px solid #bfe5cd;border-radius:16px;padding:16px;text-align:center;margin:0 0 6px;"><p style="margin:0;font-size:13px;color:#17803d;font-weight:700;">✅ TE REEMBOLSAREMOS</p><p style="margin:4px 0 2px;font-size:32px;font-weight:800;color:#17803d;">${fmtMXN(dif)}</p><p style="margin:0;font-size:13px;color:#4c6b57;">Pagaste ${fmtMXN(pagado)} · tu pedido ahora es de ${fmtMXN(nuevoTotal)}</p></div>`;
  if (dif < -0.5) return `<div style="background:#fdecef;border:1px solid #f3c2cf;border-radius:16px;padding:16px;text-align:center;margin:0 0 6px;"><p style="margin:0;font-size:13px;color:#b33660;font-weight:700;">⚠️ TE FALTA PAGAR</p><p style="margin:4px 0 2px;font-size:32px;font-weight:800;color:#b33660;">${fmtMXN(-dif)}</p><p style="margin:0;font-size:13px;color:#7a4a5a;">Pagaste ${fmtMXN(pagado)} · tu pedido ahora es de ${fmtMXN(nuevoTotal)}</p></div>`;
  return `<div style="background:#faf6f8;border-radius:16px;padding:16px;text-align:center;margin:0 0 6px;"><p style="margin:0;font-size:13px;color:#6f6474;">Tu total sigue igual</p><p style="margin:4px 0 0;font-size:28px;font-weight:800;">${fmtMXN(nuevoTotal)}</p><p style="margin:2px 0 0;font-size:13px;color:#6f6474;">No tienes que hacer nada</p></div>`;
}

/* Aviso de "cambiamos tu pedido", ordenado y sin ambigüedad:
   1) qué cambió, 2) las cuentas (pagaste / total nuevo / diferencia),
   3) qué sigue, y en el correo también cómo quedó el pedido completo.
   pagado = lo que ya pagó (null si todavía no paga). */
function avisoCambioPedido(order, items, nuevoTotal, pagado, envio = 0) {
  const n = numeroPedido(order);
  const c = cambiosProductos(order.items, items);
  const grupos = [
    ["❌ Quitamos", c.quitados, c.quitadosIt],
    ["➕ Agregamos", c.agregados, c.agregadosIt],
    ["🔁 Cambiamos la cantidad", c.cantidad, c.cantidadIt],
    ["🏷️ Cambiamos el precio", c.precio, c.precioIt],
  ].filter(([, l]) => l.length);
  const dif = pagado == null ? 0 : Math.round((pagado - nuevoTotal) * 100) / 100;
  const debe = dif < -0.5;
  const reembolso = dif > 0.5;

  const cuentas = pagado == null
    ? [["Total nuevo de tu pedido", fmtMXN(nuevoTotal), ""]]
    : [
      ["Ya pagaste", fmtMXN(pagado), ""],
      ["Total nuevo de tu pedido", fmtMXN(nuevoTotal), ""],
      reembolso ? ["✅ Te reembolsaremos", fmtMXN(dif), "#17803d"]
        : debe ? ["⚠️ Te falta pagar", fmtMXN(-dif), "#b33660"]
          : ["Diferencia", "$0.00 (no tienes que hacer nada)", ""],
    ];
  const sigue = reembolso
    ? "Escríbenos por WhatsApp para hacerte tu reembolso."
    : debe ? "Escríbenos por WhatsApp para pagar la diferencia."
      : pagado == null ? "Paga el total nuevo para que confirmemos tu pedido." : "";

  const asunto = reembolso ? `Cambiamos tu pedido ${n}: te reembolsaremos ${fmtMXN(dif)}`
    : debe ? `Cambiamos tu pedido ${n}: falta pagar ${fmtMXN(-dif)}`
      : `Cambiamos tu pedido ${n}`;

  // WhatsApp: Meta no deja saltos de línea en las variables, así que va en
  // bloques cortos separados por " · ". Las cuentas y "qué sigue" siempre
  // van completos; si no cabe, primero se acortan los nombres y si aún no
  // cabe, se resume cuántos productos cambiaron (el detalle va en el correo).
  const armar = (gs) => [
    `cambiamos tu pedido ${n}`,
    ...gs.map(([t, l]) => `${t}: ${l.join(", ")}`),
    ...cuentas.map(([t, v]) => `${t}: ${v}`),
    sigue.replace(/\.$/, ""),
  ].filter(Boolean).join(" · ");
  let texto = armar(grupos);
  if (texto.length > 800) {
    const corto = cambiosProductos(
      (order.items || []).map((it) => ({ ...it, detalle: `${it.marca ? `${it.marca} ` : ""}${String(it.nombre || "").replace(/\s*\(.*$/, "")}` })),
      (items || []).map((it) => ({ ...it, detalle: `${it.marca ? `${it.marca} ` : ""}${String(it.nombre || "").replace(/\s*\(.*$/, "")}` })),
    );
    texto = armar(grupos.map(([t]) => [t, corto[{ "❌ Quitamos": "quitados", "➕ Agregamos": "agregados", "🔁 Cambiamos la cantidad": "cantidad", "🏷️ Cambiamos el precio": "precio" }[t]]]));
  }
  if (texto.length > 800) {
    texto = armar(grupos.map(([t, l]) => [t, [`${l.length} producto${l.length === 1 ? "" : "s"} (detalle en tu correo)`]]));
  }

  const tarjeta = order.source === "mercadopago";
  const html = `
    ${heroSaldo(pagado, nuevoTotal, dif)}
    ${grupos.map(([t, l, items2]) => seccion(t, items2)).join("")}
    ${pagado == null ? "" : `<p style="font-size:16px;font-weight:700;margin:22px 0 8px;">🧾 Tus cuentas</p>${tablaCuentas(cuentas)}`}
    ${sigue ? `<p style="font-size:16px;font-weight:700;margin:22px 0 8px;">👉 ¿Qué sigue?</p>
      ${reembolso || debe ? `<p style="margin:0;"><a href="https://wa.me/${WHATSAPP_MAE}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px;">💬 ${esc(sigue.replace(/\.$/, ""))}</a></p>` : `<p style="margin:0;">${esc(sigue)}</p>`}` : ""}
    <p style="font-size:16px;font-weight:700;margin:22px 0 8px;">📦 Así quedó tu pedido</p>
    ${tablaProductos(items, !tarjeta)}
    ${(!tarjeta && Number(envio) > 0) ? filaSimple("🚚 Envío", fmtMXN(envio)) : ""}
    ${filaSimple("Total", fmtMXN(nuevoTotal), true)}`;
  const titulo = reembolso ? "Hicimos cambios en tu pedido" : debe ? "Hicimos cambios en tu pedido" : "Actualizamos tu pedido";
  return { asunto, titulo, texto, html, intro: "" };
}

/* Pedido pagado cancelado por completo. */
function avisoCancelacionPagada(order) {
  const n = numeroPedido(order);
  const pagado = montoPagado(order);
  const asunto = `Cancelamos tu pedido ${n}: te reembolsaremos ${fmtMXN(pagado)}`;
  const texto = [`cancelamos tu pedido ${n} completo`, `Ya pagaste: ${fmtMXN(pagado)}`, `✅ Te reembolsaremos: ${fmtMXN(pagado)} (todo)`, "Escríbenos por WhatsApp para hacerte tu reembolso"].join(" · ");
  const html = `
    <div style="background:#eef8f2;border:1px solid #bfe5cd;border-radius:16px;padding:16px;text-align:center;margin:0 0 6px;"><p style="margin:0;font-size:13px;color:#17803d;font-weight:700;">✅ TE REEMBOLSAREMOS (TODO)</p><p style="margin:4px 0 2px;font-size:32px;font-weight:800;color:#17803d;">${fmtMXN(pagado)}</p><p style="margin:0;font-size:13px;color:#4c6b57;">Cancelamos tu pedido completo</p></div>
    <p style="font-size:16px;font-weight:700;margin:22px 0 8px;">👉 ¿Qué sigue?</p>
    <p style="margin:0;"><a href="https://wa.me/${WHATSAPP_MAE}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px;">💬 Escríbenos por WhatsApp para hacerte tu reembolso</a></p>
    <p style="font-size:16px;font-weight:700;margin:22px 0 8px;">📦 Lo que tenía tu pedido</p>
    ${tablaProductos(order.items, false)}`;
  return { asunto, titulo: "Cancelamos tu pedido", texto, html, intro: "" };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

module.exports = { avisarPedido, numeroPedido, cuentaDelPedido, esc, fmtMXN, montoPagado, cambiosProductos, avisoCambioPedido, avisoCancelacionPagada, conDetalle, describirArticulo, WHATSAPP_MAE };
