// Cupones de descuento. Mae los crea en /admin.html → Más → Cupones.
//
// Un cupón (blob "coupons", llave "c/<CÓDIGO>"):
//   { code, tipo: "pct" | "monto", valor, tope?, aplica: "tienda" | "swm" | "ambos",
//     minimo?, usosMax?, unaVez?, desde?, hasta?, activo, nota?, usos, usadoPor: [correos] }
// - pct: porcentaje sobre los productos (tienda) o sobre la cotización (Shop
//   with Mae); "tope" es el máximo de descuento en pesos (0 = sin tope).
// - monto: pesos de descuento (nunca más que el total).
// - minimo: compra mínima en pesos (sobre el precio de transferencia).
// - usosMax: usos totales (0 = sin límite); unaVez: una vez por clienta.
// - desde / hasta: "AAAA-MM-DD" o "AAAA-MM-DDTHH:MM", hora de Ciudad Juárez.
//   Sin hora, "hasta" incluye todo ese día y "desde" empieza a las 00:00.
//   Con hora, el cupón se activa / se desactiva solo a esa hora.
// El descuento nunca toca el envío de la tienda.
// - Invita a una amiga (Shop with Mae): "duena" es la clienta dueña del
//   código (no lo puede usar ella) y "soloNuevas" lo deja solo para quien
//   todavía no ha pagado nada. "soloPara" es un cupón de premio que solo
//   puede usar esa clienta.
// - sinMinimo: "pedido compartido de Corea": quita el pedido mínimo de
//   productos de Corea (solo tienda). Puede no tener descuento (valor 0).
//   Mae lo activa o lo pausa cuando abre o cierra la dinámica.

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

const AMBITOS = ["tienda", "swm", "ambos"];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function store() {
  return getStore({ name: "coupons", consistency: "strong", ...blobsClientOptions() });
}

const normCode = (c) => String(c || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
const key = (code) => `c/${normCode(code)}`;

/* Fecha y hora de ahorita en Ciudad Juárez, "AAAA-MM-DDTHH:MM". */
function ahoraJuarez() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Ciudad_Juarez", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function limpiar(c) {
  const tipo = c.tipo === "monto" ? "monto" : "pct";
  const fecha = (v) => (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(v || "").slice(0, 16)) ? String(v).slice(0, 16) : "");
  return {
    code: normCode(c.code),
    tipo,
    valor: Math.max(0, Math.min(tipo === "pct" ? 100 : 100000, Number(c.valor) || 0)),
    tope: Math.max(0, Number(c.tope) || 0),
    aplica: AMBITOS.includes(c.aplica) ? c.aplica : "ambos",
    minimo: Math.max(0, Number(c.minimo) || 0),
    usosMax: Math.max(0, Math.floor(Number(c.usosMax) || 0)),
    unaVez: !!c.unaVez,
    desde: fecha(c.desde),
    hasta: fecha(c.hasta),
    activo: c.activo !== false,
    nota: String(c.nota || "").slice(0, 200),
    sinMinimo: !!c.sinMinimo,
    duena: String(c.duena || "").toLowerCase().slice(0, 200),
    soloNuevas: !!c.soloNuevas,
    soloPara: String(c.soloPara || "").toLowerCase().slice(0, 200),
    // Pedido compartido: envío Corea→México fijo por kg (MXN). 0 = tabla normal.
    envioKg: c.sinMinimo ? Math.max(0, Math.min(10000, Number(c.envioKg) || 0)) : 0,
  };
}

async function listCoupons() {
  const s = store();
  const { blobs } = await s.list({ prefix: "c/" });
  const all = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean);
  return all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

async function getCoupon(code) {
  if (!normCode(code)) return null;
  return store().get(key(code), { type: "json" });
}

async function saveCoupon(input) {
  const c = limpiar(input);
  if (!c.code || c.code.length < 3) throw new Error("El código debe tener al menos 3 letras o números.");
  if (c.sinMinimo) c.aplica = "tienda";
  if (!(c.valor > 0) && !c.sinMinimo) throw new Error("Pon el descuento.");
  const s = store();
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await s.getWithMetadata(key(c.code), { type: "json" });
    const prev = (cur && cur.data) || {};
    const data = { ...c, duena: c.duena || prev.duena || "", soloNuevas: c.soloNuevas || !!prev.soloNuevas, soloPara: c.soloPara || prev.soloPara || "", usos: prev.usos || 0, usadoPor: prev.usadoPor || [], createdAt: prev.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    const res = cur ? await s.setJSON(key(c.code), data, { onlyIfMatch: cur.etag }) : await s.setJSON(key(c.code), data, { onlyIfNew: true });
    if (res.modified) return data;
  }
  throw new Error("No se pudo guardar el cupón. Intenta de nuevo.");
}

async function deleteCoupon(code) {
  await store().delete(key(code));
}

/* Revisa si el cupón sirve. base = total al precio de transferencia (para
   el mínimo). Regresa { ok, error?, coupon }. */
function checkCoupon(c, { email, ambito, base, nueva }) {
  if (!c || !c.activo) return { ok: false, error: "Ese cupón no existe o ya no está activo." };
  if (c.aplica !== "ambos" && c.aplica !== ambito) {
    return { ok: false, error: c.aplica === "swm" ? "Ese cupón es solo para la dirección americana." : "Ese cupón es solo para la tienda." };
  }
  const ahora = ahoraJuarez();
  if (c.desde && ahora < (c.desde.length === 10 ? `${c.desde}T00:00` : c.desde)) return { ok: false, error: "Ese cupón todavía no empieza." };
  if (c.hasta && (c.hasta.length === 10 ? ahora.slice(0, 10) > c.hasta : ahora >= c.hasta)) return { ok: false, error: "Ese cupón ya venció." };
  if (c.usosMax && (c.usos || 0) >= c.usosMax) return { ok: false, error: "Ese cupón ya se agotó." };
  const who = String(email || "").toLowerCase();
  if (c.unaVez && who && (c.usadoPor || []).includes(who)) return { ok: false, error: "Ya usaste este cupón." };
  if (c.duena && who === c.duena) return { ok: false, error: "Ese es tu código para invitar amigas; compártelo 💗" };
  if (c.soloNuevas && nueva === false) return { ok: false, error: "Ese código es solo para tu primer envío o compra." };
  if (c.soloPara && who !== c.soloPara) return { ok: false, error: "Ese cupón es de otra clienta." };
  if (c.minimo && (Number(base) || 0) < c.minimo) {
    return { ok: false, error: `Este cupón es para compras desde $${c.minimo.toLocaleString("es-MX")}.` };
  }
  return { ok: true, coupon: c };
}

/* Descuento en pesos sobre "monto" (productos de la tienda o cotización). */
function discountFor(c, monto) {
  const m = Math.max(0, Number(monto) || 0);
  let d = c.tipo === "monto" ? c.valor : (m * c.valor) / 100;
  if (c.tipo === "pct" && c.tope) d = Math.min(d, c.tope);
  return round2(Math.min(d, m));
}

/* Lo que ve la clienta antes de usarlo (sin datos de uso). */
function publicTerms(c) {
  return { code: c.code, tipo: c.tipo, valor: c.valor, tope: c.tope, minimo: c.minimo, aplica: c.aplica, sinMinimo: !!c.sinMinimo, envioKg: c.envioKg || 0, hasta: c.hasta || "" };
}

/* Cuenta un uso (se llama al registrar el pedido o aplicar el cupón).
   Vuelve a revisar los límites por si dos personas lo usan al mismo
   tiempo. */
async function redeemCoupon(code, email) {
  const s = store();
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await s.getWithMetadata(key(code), { type: "json" });
    if (!cur) return false;
    const c = cur.data;
    if (c.usosMax && (c.usos || 0) >= c.usosMax) return false;
    const who = String(email || "").toLowerCase();
    if (c.unaVez && who && (c.usadoPor || []).includes(who)) return false;
    const data = { ...c, usos: (c.usos || 0) + 1, usadoPor: who ? [...(c.usadoPor || []), who].slice(-5000) : c.usadoPor || [] };
    const res = await s.setJSON(key(code), data, { onlyIfMatch: cur.etag });
    if (res.modified) return true;
  }
  return false;
}

module.exports = { normCode, listCoupons, getCoupon, saveCoupon, deleteCoupon, checkCoupon, discountFor, publicTerms, redeemCoupon };
