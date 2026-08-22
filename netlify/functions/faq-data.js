// Base de preguntas frecuentes para el chatbot de Instagram.
// Edita las respuestas de aquí sin tocar el resto del código.
// Cada entrada busca alguna de las "palabras" dentro del mensaje del cliente
// (sin importar mayúsculas/acentos) y responde con el texto de "respuesta".
// El orden importa: se usa la primera que haga match.

const FAQS = [
  {
    palabras: ["minimo", "mínimo", "cuanto es el pedido", "pedido minimo"],
    respuesta:
      "¡Hola! 👋 Nuestro pedido mínimo de compra es de $5,100 MXN. Puedes armar tu pedido y ver los precios en nuestro catálogo: [PON_AQUI_EL_LINK_DE_TU_SITIO]",
  },
  {
    palabras: ["horario", "hora", "abren", "cierran", "atienden"],
    respuesta:
      "Nuestro horario de atención es [PON_AQUI_TU_HORARIO]. Si nos escribes fuera de ese horario, te respondemos en cuanto podamos 🙌",
  },
  {
    palabras: ["cotiza", "cotización", "pedido", "como compro", "cómo compro", "quiero comprar"],
    respuesta:
      "Para armar tu pedido y cotización, entra a nuestro catálogo aquí: [PON_AQUI_EL_LINK_DE_TU_SITIO] — eliges tus productos, agregas al carrito y al final se genera tu cotización por WhatsApp.",
  },
  {
    palabras: ["envio", "envío", "envios", "envíos", "entrega", "cuanto tarda", "cuánto tarda"],
    respuesta:
      "Los tiempos y costos de envío son [PON_AQUI_TU_INFORMACION_DE_ENVIOS]. Cualquier duda con gusto te ayudamos 💛",
  },
  {
    palabras: ["pago", "pagar", "transferencia", "tarjeta", "efectivo"],
    respuesta:
      "Aceptamos [PON_AQUI_TUS_FORMAS_DE_PAGO]. Si tienes dudas del proceso, dinos y te explicamos con gusto.",
  },
  {
    palabras: ["ubicacion", "ubicación", "donde estan", "dónde están", "direccion", "dirección", "tienda fisica", "tienda física"],
    respuesta:
      "[PON_AQUI_TU_UBICACION_O_SI_SOLO_VENDEN_EN_LINEA]",
  },
  {
    palabras: ["hola", "buenas", "buenos dias", "buenos días", "buenas tardes", "buenas noches", "info", "informacion", "información"],
    respuesta:
      "¡Hola! 👋 Bienvenido/a a Alpacca. Puedes ver nuestro catálogo completo y precios de mayoreo aquí: [PON_AQUI_EL_LINK_DE_TU_SITIO] Si tienes alguna duda, dinos en qué te podemos ayudar 💛",
  },
];

// Se manda cuando ningún tema anterior hace match.
const RESPUESTA_DEFAULT =
  "¡Gracias por escribirnos! 💛 En un momento uno de nuestros asesores te responde. Mientras tanto puedes ver nuestro catálogo aquí: [PON_AQUI_EL_LINK_DE_TU_SITIO]";

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita acentos
}

function buscarRespuesta(mensaje) {
  const texto = normalizar(mensaje || "");
  for (const faq of FAQS) {
    for (const palabra of faq.palabras) {
      if (texto.includes(normalizar(palabra))) {
        return faq.respuesta;
      }
    }
  }
  return RESPUESTA_DEFAULT;
}

module.exports = { buscarRespuesta, FAQS, RESPUESTA_DEFAULT };
