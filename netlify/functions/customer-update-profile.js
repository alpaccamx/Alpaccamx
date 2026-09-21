// Actualiza el nombre, teléfono y (opcionalmente) la contraseña de la
// clienta que inició sesión -- para la sección "Editar mis datos" del
// sitio.
//
// Requiere el header "Authorization: Bearer <token>" (el que regresa
// customer-login / customer-signup). El correo no se puede cambiar aquí
// (es la llave de la cuenta en el almacenamiento) -- solo se muestra.
//
// Body esperado (JSON): { name, phone, currentPassword?, newPassword? }
// currentPassword/newPassword solo hacen falta si quiere cambiar su
// contraseña.

const bcrypt = require("bcryptjs");
const { getCustomerByEmail, updateCustomerFields } = require("./lib/customer-store.js");
const { verifyCustomerToken } = require("./lib/customer-auth.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const email = verifyCustomerToken(event);
  if (!email) return jsonResponse(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "JSON inválido." });
  }

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/[^0-9]/g, "");
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!name) return jsonResponse(400, { error: "Falta tu nombre." });
  if (phone.length !== 10) return jsonResponse(400, { error: "El teléfono debe tener 10 dígitos." });

  const customer = await getCustomerByEmail(email).catch(() => null);
  if (!customer) return jsonResponse(401, { error: "Tu sesión no es válida o ya venció. Inicia sesión de nuevo." });

  const patch = { name, phone };

  if (newPassword) {
    if (newPassword.length < 8) return jsonResponse(400, { error: "La nueva contraseña debe tener al menos 8 caracteres." });
    if (!currentPassword) return jsonResponse(400, { error: "Escribe tu contraseña actual para cambiarla." });
    const matches = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!matches) return jsonResponse(401, { error: "Tu contraseña actual no es correcta." });
    patch.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  try {
    await updateCustomerFields(email, patch);
  } catch (err) {
    console.error("Error actualizando la cuenta de la clienta:", err);
    return jsonResponse(500, { error: "No se pudieron guardar tus datos. Intenta de nuevo." });
  }

  return jsonResponse(200, { ok: true, name, phone });
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
