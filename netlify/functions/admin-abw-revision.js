// Revisión de precios y disponibilidad contra Asian Beauty Wholesale.
//
// La revisión la corre Claude desde su sesión (necesita la cuenta de ABW
// de Mae, que nunca se guarda en el sitio) marca por marca, y sube aquí lo
// que encontró. Mae lo ve en /admin.html → Más → Revisión ABW y aplica los
// cambios al Sheet con admin-append-catalog-rows ({ updates }).
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
//   GET                                    -> { marcas: { Marca: { fecha, revisados, cambios: [...] } }, updatedAt }
//   POST { marca, fecha, revisados, cambios } -> guarda (reemplaza) lo de esa marca
//   POST { quitar: [{ marca, sku, tipo }] }   -> quita cambios ya aplicados o ignorados
//
// Cada cambio: { sku, nombre, presentacion, tipo: "precio" | "agotado" |
//   "disponible" | "no_existe", antes: { usd, disp }, despues: { usd, disp } }

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

const KEY = "reporte";
const MAX_CAMBIOS = 5000;

function jsonResponse(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

function store() {
  return getStore({ name: "abw-revision", consistency: "strong", ...blobsClientOptions() });
}

/* Lee, cambia y guarda el reporte sin pisar lo que otra llamada guardó
   al mismo tiempo (etag). */
async function mutate(fn) {
  const s = store();
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await s.getWithMetadata(KEY, { type: "json" });
    const data = (cur && cur.data) || { marcas: {} };
    fn(data);
    data.updatedAt = new Date().toISOString();
    const res = cur ? await s.setJSON(KEY, data, { onlyIfMatch: cur.etag }) : await s.setJSON(KEY, data, { onlyIfNew: true });
    if (res.modified) return data;
  }
  throw new Error("No se pudo guardar (conflicto). Intenta de nuevo.");
}

const clean = (v, n = 300) => String(v == null ? "" : v).slice(0, n);
const num = (v) => (v === null || v === undefined || v === "" || !isFinite(Number(v)) ? null : Number(v));
const TIPOS = ["precio", "agotado", "disponible", "no_existe", "preorden"];

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return jsonResponse(401, { error: "Clave de administrador incorrecta." });

  try {
    if (event.httpMethod === "GET") {
      const data = await store().get(KEY, { type: "json" });
      return jsonResponse(200, data || { marcas: {} });
    }

    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return jsonResponse(400, { error: "JSON inválido." }); }

    if (Array.isArray(body.quitar)) {
      const quitar = new Set(body.quitar.map((q) => `${q.marca}|${q.sku}|${q.tipo}`));
      const data = await mutate((d) => {
        Object.entries(d.marcas || {}).forEach(([marca, m]) => {
          m.cambios = (m.cambios || []).filter((c) => !quitar.has(`${marca}|${c.sku}|${c.tipo}`));
        });
      });
      return jsonResponse(200, { ok: true, updatedAt: data.updatedAt });
    }

    const marca = clean(body.marca, 100).trim();
    if (!marca || !Array.isArray(body.cambios)) return jsonResponse(400, { error: "Falta marca o cambios." });
    if (body.cambios.length > MAX_CAMBIOS) return jsonResponse(400, { error: `Máximo ${MAX_CAMBIOS} cambios por marca.` });
    const cambios = body.cambios
      .filter((c) => c && c.sku && TIPOS.includes(c.tipo))
      .map((c) => ({
        sku: clean(c.sku, 60),
        nombre: clean(c.nombre),
        presentacion: clean(c.presentacion, 60),
        tipo: c.tipo,
        antes: { usd: num(c.antes && c.antes.usd), disp: clean(c.antes && c.antes.disp, 4) },
        despues: { usd: num(c.despues && c.despues.usd), disp: clean(c.despues && c.despues.disp, 4) },
      }));
    const data = await mutate((d) => {
      d.marcas = d.marcas || {};
      d.marcas[marca] = { fecha: clean(body.fecha || new Date().toISOString(), 40), revisados: Number(body.revisados) || 0, cambios };
    });
    return jsonResponse(200, { ok: true, cambios: cambios.length, updatedAt: data.updatedAt });
  } catch (err) {
    console.error("admin-abw-revision:", err);
    return jsonResponse(500, { error: err.message || "Error del servidor." });
  }
};
