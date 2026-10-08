// Límite de intentos sencillo (ventana fija) para endpoints públicos que
// alguien podría automatizar: login, registro, "olvidé mi contraseña",
// reseñas, crear pedidos. Usa Netlify Blobs (mismo mecanismo que
// orders/stock -- ver blob-store.js) para llevar la cuenta entre
// invocaciones de la función, que no comparten memoria entre sí.
//
// Es intencionalmente simple (ventana fija, sin limpieza automática más
// que la expiración de la clave), pensado para frenar abuso obvio en un
// sitio pequeño, no para tráfico a gran escala. El conteo usa control de
// versiones, así que dos peticiones simultáneas no se pierden.

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
    // Lectura, suma y escritura condicionadas a la versión (etag): si otra
    // petición escribió primero, se vuelve a leer y se suma sobre el valor
    // nuevo. Así dos peticiones simultáneas no pueden pasar el límite juntas.
    for (let attempt = 0; attempt < 6; attempt++) {
      const now = Date.now();
      const existing = await store.getWithMetadata(key, { type: "json" });
      const record = (existing && existing.data) || { count: 0, windowStart: now };
      if (now - record.windowStart > windowMs) {
        record.count = 0;
        record.windowStart = now;
      }
      record.count += 1;
      const options = existing && existing.etag
        ? { onlyIfMatch: existing.etag, metadata: { expiresAt: record.windowStart + windowMs } }
        : { onlyIfNew: true, metadata: { expiresAt: record.windowStart + windowMs } };
      const result = await store.setJSON(key, record, options);
      if (!result.modified) continue;

      if (record.count > max) {
        const retryAfterSeconds = Math.ceil((record.windowStart + windowMs - now) / 1000);
        return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
      }
      return { allowed: true };
    }
    throw new Error("conflicto de concurrencia en el límite de intentos");
  } catch (err) {
    // Fallar abierto a propósito: si Netlify Blobs no responde, no se bloquea
    // el login ni los pedidos de una clienta real. El costo es que, en ese
    // momento, el límite no se aplica.
    console.error("Rate limiter falló, se deja pasar la petición:", err);
    return { allowed: true };
  }
}

module.exports = { checkRateLimit, getClientIp };
