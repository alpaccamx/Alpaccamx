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
async function avisarPedido(order, { asunto, texto, html = "", soloWhatsApp = false, intro }) {
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
      <h2 style="margin:0 0 8px;font-size:20px;">${esc(asunto)}</h2>
      ${intro != null ? intro : `<p style="font-size:14px;">${esc(texto.charAt(0).toUpperCase() + texto.slice(1))}.</p>`}
      ${html}
      <p style="margin-top:18px;"><a href="${SITE}/?ver=mis-pedidos" style="background:#c4466e;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600;">Ver mis pedidos</a></p>`),
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
  return (items || []).map((it) => ({ ...it, detalle: describirArticulo(it, porSku.get(it.sku) || porSku.get(String(it.sku || "").replace(/__stock$/, ""))) }));
}

/* Qué cambió entre los productos de antes y los de ahora. */
function cambiosProductos(antes, ahora) {
  const key = (it) => String(it.sku || it.nombre).toLowerCase();
  const nombre = (it) => it.detalle || `${it.marca ? `${it.marca} ` : ""}${it.nombre}`;
  const piezas = (n) => `${n} pieza${n === 1 ? "" : "s"}`;
  const prev = new Map((antes || []).map((it) => [key(it), it]));
  const next = new Map((ahora || []).map((it) => [key(it), it]));
  const out = { agregados: [], quitados: [], cantidad: [], precio: [] };
  next.forEach((it, k) => {
    const old = prev.get(k);
    if (!old) { out.agregados.push(`${nombre(it)} · ${piezas(it.qty)} · ${fmtMXN(it.precio)} c/u`); return; }
    if (old.qty !== it.qty) out.cantidad.push(`${nombre(it)}: antes ${piezas(old.qty)}, ahora ${piezas(it.qty)}`);
    if (Math.round(old.precio * 100) !== Math.round(it.precio * 100)) out.precio.push(`${nombre(it)}: antes ${fmtMXN(old.precio)}, ahora ${fmtMXN(it.precio)} c/u`);
  });
  prev.forEach((it, k) => { if (!next.has(k)) out.quitados.push(`${nombre(it)} · ${piezas(it.qty)}`); });
  return out;
}

/* Aviso de "cambiamos tu pedido", ordenado y sin ambigüedad:
   1) qué cambió, 2) las cuentas (pagaste / total nuevo / diferencia),
   3) qué sigue, y en el correo también cómo quedó el pedido completo.
   pagado = lo que ya pagó (null si todavía no paga). */
function avisoCambioPedido(order, items, nuevoTotal, pagado, envio = 0) {
  const n = numeroPedido(order);
  const c = cambiosProductos(order.items, items);
  const grupos = [
    ["❌ Quitamos", c.quitados],
    ["➕ Agregamos", c.agregados],
    ["🔁 Cambiamos la cantidad", c.cantidad],
    ["🏷️ Cambiamos el precio", c.precio],
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

  const li = (t) => `<li style="margin:2px 0;">${esc(t)}</li>`;
  const html = `
    <p style="font-size:14px;">Hicimos estos cambios en tu pedido <b>${esc(n)}</b>:</p>
    ${grupos.map(([t, l]) => `<p style="font-size:14px;margin:10px 0 2px;"><b>${esc(t)}</b></p><ul style="font-size:14px;margin:0;padding-left:20px;">${l.map(li).join("")}</ul>`).join("")}
    <p style="font-size:15px;margin:16px 0 6px;"><b>Tus cuentas</b></p>
    <table style="font-size:14px;border-collapse:collapse;width:100%;max-width:420px;">
      ${cuentas.map(([t, v, color]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${esc(t)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;${color ? `color:${color};` : ""}">${esc(v)}</td></tr>`).join("")}
    </table>
    ${sigue ? `<p style="font-size:15px;margin:16px 0 6px;"><b>¿Qué sigue?</b></p><p style="font-size:14px;margin:0;">${reembolso || debe ? `<a href="https://wa.me/${WHATSAPP_MAE}" style="color:#c4466e;font-weight:700;">${esc(sigue)}</a>` : esc(sigue)}</p>` : ""}
    <p style="font-size:15px;margin:16px 0 6px;"><b>Así quedó tu pedido</b></p>
    <ul style="font-size:14px;margin:0;padding-left:20px;">${(items || []).map((it) => li(`${it.detalle || `${it.marca ? `${it.marca} ` : ""}${it.nombre}`} · ${it.qty} pieza${it.qty === 1 ? "" : "s"} · ${fmtMXN(it.precio * it.qty)}`)).join("")}${extrasLista(items, nuevoTotal, envio).map(li).join("")}</ul>
    <p style="font-size:14px;margin:6px 0 0;"><b>Total: ${fmtMXN(nuevoTotal)}</b></p>`;
  return { asunto, texto, html, intro: "" };
}

/* Envío y comisión de tarjeta, para que la lista sume el total. */
function extrasLista(items, total, envio) {
  const sub = (items || []).reduce((t, it) => t + it.precio * it.qty, 0);
  const comision = Math.round((Number(total) - sub - (Number(envio) || 0)) * 100) / 100;
  return [
    Number(envio) > 0 ? `Envío · ${fmtMXN(envio)}` : "",
    comision > 0.5 ? `Comisión por pagar con tarjeta · ${fmtMXN(comision)}` : "",
  ].filter(Boolean);
}

/* Pedido pagado cancelado por completo. */
function avisoCancelacionPagada(order) {
  const n = numeroPedido(order);
  const pagado = montoPagado(order);
  const asunto = `Cancelamos tu pedido ${n}: te reembolsaremos ${fmtMXN(pagado)}`;
  const texto = [`cancelamos tu pedido ${n} completo`, `Ya pagaste: ${fmtMXN(pagado)}`, `✅ Te reembolsaremos: ${fmtMXN(pagado)} (todo)`, "Escríbenos por WhatsApp para hacerte tu reembolso"].join(" · ");
  const html = `
    <p style="font-size:14px;">Cancelamos tu pedido <b>${esc(n)}</b> completo. Tenía:</p>
    <ul style="font-size:14px;margin:0 0 10px;padding-left:20px;">${(order.items || []).map((it) => `<li style="margin:2px 0;">${esc(it.detalle || `${it.marca ? `${it.marca} ` : ""}${it.nombre}`)} · ${it.qty} pieza${it.qty === 1 ? "" : "s"}</li>`).join("")}</ul>
    <table style="font-size:14px;border-collapse:collapse;width:100%;max-width:420px;">
      <tr><td style="padding:6px 0;border-bottom:1px solid #eee;">Ya pagaste</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${fmtMXN(pagado)}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #eee;">✅ Te reembolsaremos</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#17803d;">${fmtMXN(pagado)} (todo)</td></tr>
    </table>
    <p style="font-size:15px;margin:16px 0 6px;"><b>¿Qué sigue?</b></p>
    <p style="font-size:14px;margin:0;"><a href="https://wa.me/${WHATSAPP_MAE}" style="color:#c4466e;font-weight:700;">Escríbenos por WhatsApp para hacerte tu reembolso.</a></p>`;
  return { asunto, texto, html, intro: "" };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

module.exports = { avisarPedido, numeroPedido, cuentaDelPedido, esc, fmtMXN, montoPagado, cambiosProductos, avisoCambioPedido, avisoCancelacionPagada, conDetalle, describirArticulo, WHATSAPP_MAE };
