/* Emojis estilo iPhone en el admin. En iPhone/iPad/Mac ya salen así solos;
   en Windows y Android se cambian por las imágenes de Apple. */
(function () {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Macintosh/.test(ua) && !/Windows|Android/.test(ua)) return;

  const CDN = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/";
  const RE = /\p{RI}\p{RI}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
  const SALTAR = new Set(["©", "®", "™", "↔", "↕", "‼", "⁉"]);
  const FALLIDOS = new Set(); // símbolos que Apple no tiene: se quedan como texto
  const NO_TOCAR = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "TITLE", "NOSCRIPT"]);

  const style = document.createElement("style");
  style.textContent = "img.emj{height:1.15em;width:1.15em;vertical-align:-0.2em;margin:0 .05em;display:inline-block;}";
  document.head.appendChild(style);

  function candidatos(e) {
    const cps = [...e].map((c) => c.codePointAt(0).toString(16));
    const tal = cps.join("-");
    const sin = cps.filter((c) => c !== "fe0f").join("-");
    const lista = [tal, sin];
    if (!sin.includes("-")) lista.push(`${sin}-fe0f`);
    return [...new Set(lista)];
  }

  function imagen(e) {
    const img = document.createElement("img");
    const opciones = candidatos(e);
    let i = 0;
    img.className = "emj";
    img.alt = e;
    img.draggable = false;
    img.decoding = "async";
    img.onerror = () => {
      i += 1;
      if (i < opciones.length) img.src = `${CDN}${opciones[i]}.png`;
      else { FALLIDOS.add(e); img.replaceWith(document.createTextNode(e)); }
    };
    img.src = `${CDN}${opciones[0]}.png`;
    return img;
  }

  function cambiar(nodo) {
    const txt = nodo.nodeValue;
    RE.lastIndex = 0;
    if (!RE.test(txt)) return;
    RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let ultimo = 0;
    let hubo = false;
    for (const m of txt.matchAll(RE)) {
      if (SALTAR.has(m[0].replace("\uFE0F", "")) || FALLIDOS.has(m[0])) continue;
      hubo = true;
      if (m.index > ultimo) frag.appendChild(document.createTextNode(txt.slice(ultimo, m.index)));
      frag.appendChild(imagen(m[0]));
      ultimo = m.index + m[0].length;
    }
    if (!hubo) return;
    if (ultimo < txt.length) frag.appendChild(document.createTextNode(txt.slice(ultimo)));
    nodo.replaceWith(frag);
  }

  function recorrer(raiz) {
    if (raiz.nodeType === 3) { if (raiz.parentNode && !NO_TOCAR.has(raiz.parentNode.nodeName)) cambiar(raiz); return; }
    if (raiz.nodeType !== 1 || NO_TOCAR.has(raiz.nodeName) || raiz.isContentEditable) return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (NO_TOCAR.has(n.parentNode.nodeName) || n.parentNode.closest("[contenteditable]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodos = [];
    while (w.nextNode()) nodos.push(w.currentNode);
    nodos.forEach(cambiar);
  }

  // El admin repinta seguido (innerHTML), así que se revisa lo nuevo en cada cambio.
  let pendientes = new Set();
  let programado = false;
  function procesar() {
    programado = false;
    const lote = pendientes;
    pendientes = new Set();
    lote.forEach((n) => { if (n.isConnected) recorrer(n); });
  }
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") pendientes.add(m.target);
      else m.addedNodes.forEach((n) => { if (!(n.nodeType === 1 && n.classList && n.classList.contains("emj"))) pendientes.add(n); });
    }
    if (!programado && pendientes.size) { programado = true; requestAnimationFrame(procesar); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  recorrer(document.body);
})();
