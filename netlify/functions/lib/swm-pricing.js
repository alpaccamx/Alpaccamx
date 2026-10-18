// Tarifa del cruce a México de "Shop with Mae". La misma tabla está en
// app.js (SWM_TARIFA) para la calculadora de la página -- si cambias una,
// cambia la otra.
//
// Por peso: se cobra el mayor entre el peso real y el volumétrico
// (alto x ancho x largo en cm / 5000), redondeado al kilo de arriba.
// Arriba de 15 kg se suman $120 por cada kilo extra.
// Por comisión: 15% del valor de los productos (ya con tax).

const TARIFA_KG = { 1: 250, 2: 350, 3: 450, 4: 450, 5: 550, 6: 900, 7: 900, 8: 1000, 9: 1000, 10: 1000, 11: 1000, 12: 1200, 13: 1200, 14: 1400, 15: 2000 };
const KILO_EXTRA = 120;
const COMISION_PCT = 15;
// Juntar varias cajas en un solo envío nacional: $100 por cada grupo de
// hasta 12 kg (13-24 kg = $200, 25-36 kg = $300...).
const CONSOLIDACION = 100;
// Paquete que llega a la bodega sin que la clienta haya registrado su guía.
const CARGO_SIN_REGISTRO = 80;
// Días que se guarda un paquete sin dueña antes de que Mae disponga de él.
const DIAS_SIN_DUENA = 7;
const CONSOLIDACION_MAX_KG = 12;
// Servicios extra que la clienta pide desde su casillero; se suman a la
// cotización de su envío (precios propuestos; Mae los puede cambiar aquí
// y en SWM_EXTRAS de swm.js).
const REVISION_FOTOS = 50; // abrir el paquete y mandar fotos del contenido
const SEPARAR = 50; // separar artículos de un paquete en otro
// Lealtad: cada LEALTAD_CADA envíos entregados, el cruce del siguiente va
// con LEALTAD_PCT % de descuento.
const LEALTAD_CADA = 5;
const LEALTAD_PCT = 50;
// Invita a una amiga: ella tiene este descuento en su primer envío o compra
// y quien la invitó gana un cupón por lo mismo cuando la amiga paga.
const REFERIDO_MXN = 50;

function pesoVolumetrico(alto, ancho, largo) {
  const v = Number(alto) * Number(ancho) * Number(largo);
  return v > 0 ? v / 5000 : 0;
}

function pesoCobrable(pesoKg, alto, ancho, largo) {
  const p = Math.max(Number(pesoKg) || 0, pesoVolumetrico(alto, ancho, largo));
  return p > 0 ? Math.ceil(p - 1e-9) : 0;
}

function crucePorPeso(kg) {
  if (!kg) return 0;
  if (kg <= 15) return TARIFA_KG[kg];
  return TARIFA_KG[15] + (kg - 15) * KILO_EXTRA;
}

function crucePorComision(valorMXN) {
  return Math.ceil((Number(valorMXN) || 0) * COMISION_PCT / 100);
}

function consolidacionPorPeso(totalKg) {
  return Math.max(1, Math.ceil((Number(totalKg) || 0) / CONSOLIDACION_MAX_KG - 1e-9)) * CONSOLIDACION;
}

module.exports = { REVISION_FOTOS, SEPARAR, LEALTAD_CADA, LEALTAD_PCT, REFERIDO_MXN, CARGO_SIN_REGISTRO, DIAS_SIN_DUENA, consolidacionPorPeso, TARIFA_KG, KILO_EXTRA, COMISION_PCT, CONSOLIDACION, CONSOLIDACION_MAX_KG, pesoVolumetrico, pesoCobrable, crucePorPeso, crucePorComision };
