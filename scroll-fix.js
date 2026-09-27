// Evita que el navegador salte automáticamente a una sección al recargar
// o abrir el sitio -- siempre debe abrir arriba, en la página principal.
// Cubre dos causas distintas: (1) un #ancla guardado en la URL de una
// visita anterior, y (2) que el navegador restaure por su cuenta la
// posición de scroll de la última vez que se visitó la página.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
if (window.location.hash) {
  history.replaceState(null, document.title, window.location.pathname + window.location.search);
}
window.scrollTo(0, 0);
