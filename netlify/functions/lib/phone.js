// Teléfono a 10 dígitos (México). Si viene con lada de país -- como lo
// llena el autocompletado del celular: +52 663 104 9876, 52 1 55...,
// o +1 915... de EE.UU. -- se le quita para quedarse con los 10 dígitos.
function phone10(value) {
  const d = String(value || "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("521")) return d.slice(3);
  if (d.length === 12 && d.startsWith("52")) return d.slice(2);
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return d;
}

module.exports = { phone10 };
