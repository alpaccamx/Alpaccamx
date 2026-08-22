// Webhook de Instagram para el chatbot de preguntas frecuentes.
//
// Variables de entorno necesarias (configúralas en Netlify → Site settings → Environment variables):
//   IG_VERIFY_TOKEN       -> una palabra secreta que tú inventas, se usa solo para que Meta
//                            confirme que este webhook es tuyo.
//   IG_PAGE_ACCESS_TOKEN  -> el token que te da Meta al conectar tu cuenta de Instagram.
//
// URL del webhook una vez publicado el sitio:
//   https://TU-SITIO.netlify.app/.netlify/functions/instagram-webhook

const { buscarRespuesta } = require("./faq-data.js");

const GRAPH_API_VERSION = "v21.0";

exports.handler = async (event) => {
  // Meta llama con GET para verificar que el webhook es tuyo.
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    const mode = params["hub.mode"];
    const token = params["hub.verify_token"];
    const challenge = params["hub.challenge"];

    if (mode === "subscribe" && token === process.env.IG_VERIFY_TOKEN) {
      return { statusCode: 200, body: challenge };
    }
    return { statusCode: 403, body: "Verificación fallida" };
  }

  // Meta llama con POST cada vez que llega un mensaje nuevo.
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const entries = body.entry || [];

      for (const entry of entries) {
        const messagingEvents = entry.messaging || [];
        for (const msgEvent of messagingEvents) {
          // Ignora eventos que no son mensajes de texto (ej. "leído", "entregado", o mensajes del propio negocio).
          if (msgEvent.message && !msgEvent.message.is_echo && msgEvent.message.text) {
            const senderId = msgEvent.sender && msgEvent.sender.id;
            const texto = msgEvent.message.text;
            if (senderId) {
              const respuesta = buscarRespuesta(texto);
              await enviarMensaje(senderId, respuesta);
            }
          }
        }
      }

      // Meta espera un 200 rápido para no reintentar el envío del evento.
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    } catch (err) {
      console.error("Error procesando webhook de Instagram:", err);
      // Igual respondemos 200 para que Meta no reintente en bucle un evento que no pudimos leer.
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};

async function enviarMensaje(recipientId, texto) {
  const accessToken = process.env.IG_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("Falta configurar IG_PAGE_ACCESS_TOKEN en Netlify.");
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: texto },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Error enviando mensaje por Instagram:", res.status, errText);
  }
}
