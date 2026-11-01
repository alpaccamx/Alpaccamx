// Grabación de pantalla del tutorial "cómo comprar stock" en alpacca.mx (iPhone 13). Cada paso dura lo mismo que su
// frase de la voz (tiempos-tutorial.json) y queda anotado en grabacion/pasos.json. Nunca manda pedidos (bloquea
// create-order y Mercado Pago), no inicia sesión ni crea cuentas: el formulario se muestra solo en este navegador.
// Los datos del banco se difuminan en la página antes de que salgan.
// Chrome sin pantalla solo graba video a 390 px de ancho (el texto se ve borroso), así que se toman capturas
// continuas a 2x mientras todo pasa K veces más lento (esperas, escritura, deslizar y animaciones CSS); al juntar los
// cuadros con su tiempo dividido entre K, el video queda a velocidad normal y fluido.
// Uso: node graba.js -> grabacion/pantalla.mp4 (30 fps) + grabacion/pasos.json
const { chromium, devices } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');
const DUR = JSON.parse(fs.readFileSync('tiempos-tutorial.json')).map(e => e.dur);
const K = Number(process.env.K) || 12;  // con 12 salen ~50 cuadros por segundo de video y ninguno se repite al pasar a 30 (con 4 eran ~15 y se veía trabado)

(async () => {
  fs.rmSync('grabacion/cuadros', { recursive: true, force: true });  // deja grabacion/.gitignore
  fs.mkdirSync('grabacion/cuadros', { recursive: true });
  // Chromium completo (no el headless shell) y en español: así el botón de subir archivo dice «Seleccionar archivo»
  const b = await chromium.launch({ channel: 'chromium', args: ['--lang=es-MX'], env: { ...process.env, LANGUAGE: 'es', LANG: 'es_MX.UTF-8' } });
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, locale: 'es-MX' });
  // los temporizadores de la página (carrusel, avisos) también K veces más lentos, para que en el video vayan a su ritmo
  await ctx.addInitScript((k) => {
    const st = window.setTimeout, si = window.setInterval;
    window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) * k, ...a);
    window.setInterval = (f, ms, ...a) => si(f, (ms || 0) * k, ...a);
    // el desplazamiento suave de la página (scrollIntoView/scrollTo con behavior 'smooth') lo hace el navegador en
    // tiempo real y en el video se vería como un brinco; aquí se hace con temporizadores (que ya van K veces lentos)
    const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const anima = (pares, ms = 450) => {
      const ini = performance.now();
      const paso = () => {
        const u = Math.min(1, (performance.now() - ini) / (ms * k)), e = ease(u);
        for (const [el, a, b] of pares) { if (el === window) window.__scrollTo(0, a + (b - a) * e); else el.scrollTop = a + (b - a) * e; }
        if (u < 1) st(paso, 8);
      };
      paso();
    };
    const pos = el => el === window ? window.scrollY : el.scrollTop;
    const contenedores = el => { const r = [window]; for (let c = el.parentElement; c; c = c.parentElement) if (c.scrollHeight > c.clientHeight) r.push(c); return r; };
    window.__scrollTo = window.scrollTo.bind(window);
    const sIV = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (o) {
      if (!o || typeof o !== 'object' || o.behavior !== 'smooth') return sIV.call(this, o);
      const cs = contenedores(this), antes = cs.map(pos);
      sIV.call(this, { ...o, behavior: 'instant' });
      const despues = cs.map(pos);
      cs.forEach((c, i) => { if (c === window) window.__scrollTo(0, antes[i]); else c.scrollTop = antes[i]; });
      anima(cs.map((c, i) => [c, antes[i], despues[i]]).filter(([, a, b]) => a !== b));
    };
    const suaveWin = (orig, rel) => function (a, b) {
      const o = (a && typeof a === 'object') ? a : null;
      if (!o || o.behavior !== 'smooth') return orig.apply(this, arguments);
      const y0 = window.scrollY, y1 = rel ? y0 + (o.top || 0) : (o.top ?? y0);
      anima([[window, y0, Math.max(0, Math.min(y1, document.documentElement.scrollHeight - innerHeight))]]);
    };
    window.scrollTo = suaveWin(window.scrollTo.bind(window), false);
    window.scrollBy = suaveWin(window.scrollBy.bind(window), true);
  }, K);
  const p = await ctx.newPage();
  await p.route('**/.netlify/functions/create-order**', r => r.abort());
  await p.route('**/.netlify/functions/mp-**', r => r.abort());
  await p.goto('https://alpacca.mx/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.addStyleTag({ content: `
    #cart-bank-details-body { filter: blur(9px) !important; }
    html { scroll-behavior: auto !important; }
    .toque-mae { position: fixed; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%;
      background: rgba(232,70,120,.35); border: 4px solid rgb(232,70,120); pointer-events: none; z-index: 2147483647;
      animation: toque-mae .7s ease-out forwards; }
    ::view-transition-old(root), ::view-transition-new(root) { animation-duration: .45s; animation-timing-function: ease-in-out; }
    @keyframes toque-mae { from { transform: scale(.5); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }` });
  await p.waitForTimeout(800);
  // animaciones y transiciones CSS K veces más lentas
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / K });

  // capturas continuas en segundo plano, cada una con su hora
  const cuadros = []; let grabando = true;
  const t0 = Date.now();
  const captura = (async () => {
    while (grabando) {
      const a = Date.now();
      const buf = await p.screenshot({ type: 'jpeg', quality: 90, caret: 'initial' }).catch(() => null);
      if (!buf) continue;
      const n = String(cuadros.length).padStart(5, '0');
      fs.writeFileSync(`grabacion/cuadros/${n}.jpg`, buf);
      cuadros.push(((a + Date.now()) / 2 - t0) / 1000 / K);
    }
  })();

  const ahora = () => (Date.now() - t0) / 1000 / K;  // tiempo del video final
  const w = (ms) => p.waitForTimeout(ms * K);
  const pasos = [];
  const marca = async () => { pasos.push(ahora()); };
  const espera = async (i) => { const falta = pasos[i] + DUR[i] - ahora(); if (falta > 0) await w(falta * 1000); };
  const circulo = (x, y) => p.evaluate(([x, y, k]) => { const d = document.createElement('div'); d.className = 'toque-mae'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 800); }, [x, y, K]);
  const toca = async (loc, { click = true } = {}) => {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await loc.boundingBox(); if (!bb) return;
    await circulo(bb.x + bb.width / 2, bb.y + bb.height / 2); await w(250);
    if (click) await loc.click({ force: true }).catch(() => {});
  };
  // deslizar la página o un panel con arranque y frenado suaves
  // la posición sale del tiempo del video (no de contar pasos), así cada captura muestra justo dónde va el
  // deslizado y no hay saltos ni cuadros repetidos
  const deslizaT = async (leer, poner, sel, dy, dur) => {
    const e = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const y0 = await p.evaluate(leer, sel), t0_ = ahora();
    for (;;) { const u = Math.min(1, (ahora() - t0_) / dur); await p.evaluate(poner, [sel, y0 + dy * e(u)]); if (u >= 1) break; await p.waitForTimeout(15); }
  };
  const desliza = (dy, n = 12, ms = 40) => deslizaT(() => window.scrollY, ([, y]) => window.__scrollTo(0, y), null, dy, n * ms / 1000);
  const deslizaEn = (sel, dy, n = 14) => deslizaT(s => document.querySelector(s).scrollTop,
    ([s, y]) => { document.querySelector(s).scrollTop = y; }, sel, dy, n * 45 / 1000);
  // llevar un elemento a la vista deslizando (sin brincar)
  const llevaA = async (sel, donde = 'center', n = 16) => {
    const dy = await p.evaluate(([s, dn]) => {
      const e = document.querySelector(s); const r = e.getBoundingClientRect();
      let c = e.parentElement; while (c && c !== document.body) { const st = getComputedStyle(c); if (/(auto|scroll)/.test(st.overflowY) && c.scrollHeight > c.clientHeight) break; c = c.parentElement; }
      const caja = (!c || c === document.body) ? { top: 0, height: innerHeight } : c.getBoundingClientRect();
      const meta = dn === 'start' ? caja.top + 20 : dn === 'end' ? caja.top + caja.height - r.height - 16 : caja.top + caja.height / 2 - r.height / 2;
      if (c && c !== document.body) { c.id = c.id || 'panel-' + Math.random().toString(36).slice(2, 7); window.__panel = '#' + c.id; } else window.__panel = null;
      return r.top - meta;
    }, [sel, donde]);
    const panel = await p.evaluate(() => window.__panel);
    if (panel) await deslizaEn(panel, dy, n); else await desliza(dy, n, 40);
  };

  // cada acción cae cuando la voz dice su palabra: MARCAS[i][j] es el segundo de la palabra clave dentro de la frase i
  // (tiempos-tutorial.json). hasta(i, t) espera a ese momento del video; el círculo del toque sale justo ahí.
  const MARCAS = JSON.parse(fs.readFileSync('tiempos-tutorial.json')).map(e => e.marcas);
  const hasta = async (i, t) => { const falta = pasos[i] + t - ahora(); if (falta > 0) await w(falta * 1000); };
  const registro = [];
  const anota = (i, que) => registro.push(`${i}:${que}@${(ahora() - pasos[i]).toFixed(2)}`);
  const tocaEn = async (i, t, loc, op) => { await loc.scrollIntoViewIfNeeded().catch(() => {}); await hasta(i, t); anota(i, 'toque'); await toca(loc, op); };
  // escribir repartiendo las letras en una ventana de tiempo del video
  const escribe = async (id, v, seg) => { await p.click('#' + id).catch(() => {}); await p.type('#' + id, v, { delay: seg * 1000 / v.length * K }); };

  // 0: «Te enseño cómo comprar lo que tengo en stock en mi página, paso a paso.» — la página, un vistazo hacia abajo
  await marca(); await hasta(0, 1.6); await desliza(300, 12, 50); await hasta(0, 3.4); await desliza(-300, 12, 50); await espera(0);
  // 1: «Entra a alpacca punto eme equis y toca Stock en México.» — el toque cae en «Stock en México»
  await marca(); const ic = p.getByRole('button', { name: /Stock en México/i }).first();
  // la página cambia de vista al tocar (esconde la portada y muestra Stock en México); el cambio se hace con una
  // transición de desvanecido (View Transitions de Chrome) para que no se vea como un brinco
  await ic.scrollIntoViewIfNeeded(); await hasta(1, MARCAS[1][1]); anota(1, 'toque');
  const bi = await ic.boundingBox(); await circulo(bi.x + bi.width / 2, bi.y + bi.height / 2); await w(250);
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find(e => /Stock en México/i.test(e.textContent));
    if (document.startViewTransition) document.startViewTransition(() => el.click()); else el.click();
  });
  await espera(1);
  // 2: «Aquí está todo lo que ya tengo en México, listo para enviarse. Puedes filtrar por categoría.»
  //    se ven los productos y en «filtrar» se toca Categoría
  await marca(); await hasta(2, 0.8); await desliza(330, 20, 45); await hasta(2, 2.9); await desliza(-330, 16, 45);
  const fil = p.locator('#stock-section select').first();
  await tocaEn(2, MARCAS[2][1], fil, { click: false }); await espera(2);
  // 3: «Elige tu producto y toca Agregar. Luego, toca Ver carrito.»
  await marca(); const card = p.locator('#stock-grid > *').filter({ hasText: 'Champagne Toast' }).first();
  const dyCard = await card.evaluate(e => e.getBoundingClientRect().top - 150);
  await desliza(dyCard, 18, 45);
  await tocaEn(3, MARCAS[3][0], card.getByRole('button', { name: /Agregar/i }));
  // el toque se marca sobre «Ver carrito» y el carrito se abre con su botón (si el aviso ya se quitó, el toque
  // caería en otro producto)
  await hasta(3, MARCAS[3][1]);
  const ver = p.getByRole('button', { name: /Ver carrito/i });
  const bb = (await ver.isVisible().catch(() => false)) ? await ver.boundingBox() : null;
  anota(3, 'ver carrito');
  if (bb) await circulo(bb.x + bb.width / 2, bb.y + bb.height / 2); else await toca(p.locator('#cart-toggle'), { click: false });
  await w(250); await p.evaluate(() => document.getElementById('cart-toggle').click());
  await espera(3);
  // 4: «En tu carrito ves el total, y si lo vas a revender, cuánto ganas por pieza.»
  //    en «total» se marca el total; en «revender» se baja al cuadro de ganancia
  await marca(); const tot = p.getByText(/Total estimado/i).first();
  await hasta(4, MARCAS[4][0]); anota(4, 'total');
  const bt = await tot.boundingBox().catch(() => null); if (bt) await circulo(bt.x + 60, bt.y + bt.height / 2);
  await hasta(4, MARCAS[4][1] - 0.4); await llevaA('#cart-login-cta', 'center', 12); await espera(4);
  // 5: «Para seguir, inicia sesión o crea tu cuenta gratis.» — «inicia»: botón; «crea»: pestaña Crear cuenta
  await marca(); const cta = p.locator('#cart-login-cta');
  await tocaEn(5, MARCAS[5][0] - 0.1, cta);
  await tocaEn(5, MARCAS[5][1], p.locator('#acct-tab-signup')); await espera(5);
  // 6: «Llena tus datos y tu dirección. El envío se calcula con tu código postal.»
  //    el formulario sale de inmediato (solo en este navegador) y el código postal se escribe en «código postal»
  await marca();
  await p.evaluate(() => {
    document.getElementById('account-close').click(); document.getElementById('cart-toggle').click();
    document.getElementById('cart-login-required').classList.add('hidden'); document.getElementById('quote-form').classList.remove('hidden');
    document.getElementById('customer-name').scrollIntoView({ block: 'center' });
  });
  await hasta(6, MARCAS[6][0]); anota(6, 'datos');
  await escribe('customer-name', 'Ana López', 0.5); await escribe('customer-phone', '5512345678', 0.5);
  await llevaA('#customer-street', 'center', 6);
  await escribe('customer-street', 'Calle Roble 123', 0.6); await escribe('customer-colonia', 'Centro', 0.3);
  await escribe('customer-municipio', 'Juárez', 0.3);
  await hasta(6, MARCAS[6][1] - 0.2); anota(6, 'cp'); await escribe('customer-cp', '32000', 0.5);
  await p.selectOption('#customer-estado', 'Chihuahua').catch(() => {});
  await p.evaluate(() => { const c = document.getElementById('customer-consent'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await espera(6);
  // 7: «Y si estás en Ciudad Juárez, puedes elegir entre envío o entrega personal, que no tiene costo.»
  //    sube a la casilla de entrega personal (sale con una dirección de Juárez); en «envío» se quita y se ve el costo
  //    del envío nacional, en «entrega personal» se vuelve a poner y queda «Sin costo»
  await marca(); await llevaA('#cart-entrega-personal-wrap', 'end', 12);  // abajo, para que arriba se vea la línea del envío
  const ep = p.locator('#cart-entrega-personal-wrap');
  await hasta(7, MARCAS[7][0]); anota(7, 'juarez');
  const be = await ep.boundingBox().catch(() => null); if (be) await circulo(be.x + 40, be.y + be.height / 2);
  await tocaEn(7, MARCAS[7][1] - 0.9, p.locator('#cart-entrega-personal'));  // en «elegir entre envío»: se ve el costo un rato
  await tocaEn(7, MARCAS[7][2], p.locator('#cart-entrega-personal')); await espera(7);
  // 8: «Elige cómo pagar: por transferencia te ahorras un poquito, o con tarjeta por Mercado Pago.»
  await marca(); await llevaA('#pay-method', 'start', 10);
  await tocaEn(8, MARCAS[8][1], p.locator('input[name=pay-method][value=transfer]').locator('xpath=..'));
  await tocaEn(8, MARCAS[8][2], p.locator('input[name=pay-method][value=card]').locator('xpath=..'), { click: false }); await espera(8);
  // 9: «Si pagas por transferencia, sube tu comprobante y toca Enviar pedido. ¡Y listo!» (sin mandar nada)
  await marca(); await hasta(9, 0.3); await llevaA('#proof-file-input', 'center', 16);
  await tocaEn(9, MARCAS[9][0], p.locator('#proof-file-input'), { click: false });
  await p.setInputFiles('#proof-file-input', 'pantallas/comprobante-ejemplo.jpg').catch(() => {});
  await tocaEn(9, MARCAS[9][1], p.locator('#send-quote'), { click: false }); await espera(9);
  await marca(); await w(300);
  console.log('toques', registro.join(' '));
  grabando = false; await captura;
  await ctx.close(); await b.close();

  // juntar los cuadros con su duración (ya en tiempo del video final)
  const fin = pasos[pasos.length - 1] + 0.3; let lista = '';
  cuadros.forEach((t, i) => { const sig = i + 1 < cuadros.length ? cuadros[i + 1] : fin; lista += `file 'cuadros/${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(0.001, sig - t).toFixed(4)}\n`; });
  lista += `file 'cuadros/${String(cuadros.length - 1).padStart(5, '0')}.jpg'\n`;
  fs.writeFileSync('grabacion/cuadros.txt', lista);
  const off = cuadros[0];  // el video empieza en el primer cuadro
  fs.writeFileSync('grabacion/pasos.json', JSON.stringify(pasos.map(x => x - off)));
  execFileSync('python3', ['juntar.py'], { stdio: 'inherit' });  // 30 fps exactos, sin cuadros repetidos
  console.log('cuadros', cuadros.length, 'fps', (cuadros.length / (fin - off)).toFixed(1), 'pasos', pasos.map(x => (x - off).toFixed(2)).join(' '));
})();
