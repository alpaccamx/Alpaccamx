// Límite de intentos sencillo (ventana fija) para endpoints públicos que
// alguien podría automatizar: login, registro, "olvidé mi contraseña",
// reseñas, crear pedidos. Usa Netlify Blobs (mismo mecanismo que
// orders/stock -- ver blob-store.js) para llevar la cuenta entre
// invocaciones de la función, que no comparten memoria entre sí.
//
// No es un rate limiter de nivel producción (puede haber una condición
// de carrera si llegan dos peticiones al mismo tiempo exacto, y no hay
// limpieza automática de claves viejas más que su propia expiración
// lógica) -- es intencionalmente simple, pensado para frenar abuso
// obvio (miles de intentos automatizados) en un sitio pequeño, no para
// tráfico a gran escala.

const { getStore } = require("@netlify/blobs");
const { blobsClientOptions } = require("./blob-store.js");

function getRateLimitStore() {
  return getStore({ name: "rate-limits", consistency: "strong", ...blobsClientOptions() });
}

// Identifica al cliente por IP cuando Netlify la manda (headers
// estándar de proxy); si no está disponible, cae a un valor fijo -- en
// ese caso el límite queda compartido por todo mundo en vez de por IP,
// pero sigue frenando un abuso masivo desde una función que sí manda
// esos headers (Netlify los manda siempre en producción).
function getClientIp(event) {
  const headers = event.headers || {};
  const forwarded = headers["x-nf-client-connection-ip"] || headers["x-forwarded-for"] || headers["client-ip"];
  if (!forwarded) return "desconocida";
  return String(forwarded).split(",")[0].trim();
}

// Aplica un límite de "max" intentos cada "windowMs" milisegundos para
// la clave dada (normalmente "endpoint:ip" o "endpoint:email"). Regresa
// { allowed, retryAfterSeconds }. Si Netlify Blobs falla por lo que sea,
// se deja pasar la petición (fallar abierto) -- un rate limiter caído
// no debe tumbar el login/registro real de una clienta.
async function checkRateLimit(key, { max, windowMs }) {
  try {
    const store = getRateLimitStore();
    const now = Date.now();
    const record = (await store.get(key, { type: "json" })) || { count: 0, windowStart: now };

    if (now - record.windowStart > windowMs) {
      record.count = 0;
      record.windowStart = now;
    }

    record.count += 1;
    await store.setJSON(key, record, { metadata: { expiresAt: record.windowStart + windowMs } });

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.windowStart + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
    }
    return { allowed: true };
  } catch (err) {
    console.error("Rate limiter falló, se deja pasar la petición:", err);
    return { allowed: true };
  }
}

module.exports = { checkRateLimit, getClientIp };
