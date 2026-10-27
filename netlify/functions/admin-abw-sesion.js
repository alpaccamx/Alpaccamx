// Sesión de Asian Beauty Wholesale para la revisión semanal automática
// (.github/workflows/revision-abw.yml). ABW pide un código por correo al
// iniciar sesión, así que la revisión no puede entrar sola: Claude entra una
// vez con la cuenta de Mae y guarda aquí las cookies de esa sesión; la
// revisión las lee y, al terminar, guarda las cookies renovadas para que la
// sesión no caduque. Nunca se guardan el usuario ni la contraseña.
//
// Requiere el header "x-admin-key" con el valor de ADMIN_KEY.
//
//   GET          -> { state, updatedAt }  (state = storage_state de Playwright)
//   POST { state } -> guarda

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./lib/blob-store.js");
const { checkAdminKey } = require("./lib/admin-auth.js");

const KEY = "state";
const MAX_BYTES = 512 * 1024;

function jsonResponse(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

function store() {
  return getStore({ name: "abw-sesion", consistency: "strong", ...blobsClientOptions() });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return jsonResponse(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return jsonResponse(401, { error: "Clave de administrador incorrecta." });

  try {
    if (event.httpMethod === "GET") {
      const data = await store().get(KEY, { type: "json" });
      if (!data) return jsonResponse(404, { error: "Todavía no hay sesión de ABW guardada." });
      return jsonResponse(200, data);
    }
    if ((event.body || "").length > MAX_BYTES) return jsonResponse(400, { error: "La sesión es demasiado grande." });
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return jsonResponse(400, { error: "JSON inválido." }); }
    const state = body.state;
    if (!state || !Array.isArray(state.cookies)) return jsonResponse(400, { error: "Falta la sesión (state.cookies)." });
    const data = { state, updatedAt: new Date().toISOString() };
    await store().setJSON(KEY, data);
    return jsonResponse(200, { ok: true, updatedAt: data.updatedAt });
  } catch (err) {
    console.error("admin-abw-sesion:", err);
    return jsonResponse(500, { error: "No se pudo leer o guardar la sesión." });
  }
};
