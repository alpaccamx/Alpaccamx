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
const K = 12;  // con 12 salen ~50 cuadros por segundo de video y ninguno se repite al pasar a 30 (con 4 eran ~15 y se veía trabado)

(async () => {
  fs.rmSync('grabacion', { recursive: true, force: true });
  fs.mkdirSync('grabacion/cuadros', { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, locale: 'es-MX' });
  // los temporizadores de la página (carrusel, avisos) también K veces más lentos, para que en el video vayan a su ritmo
  await ctx.addInitScript((k) => {
    const st = window.setTimeout, si = window.setInterval;
    window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) * k, ...a);
    window.setInterval = (f, ms, ...a) => si(f, (ms || 0) * k, ...a);
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
  // deslizar la página o un panel de a poquito
  // deslizar con arranque y frenado suaves, en pasos de ~1/60 s de video
  const suave = (n) => { const e = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; return Array.from({ length: n }, (_, i) => e((i + 1) / n) - e(i / n)); };
  const desliza = async (dy, n = 12, ms = 40) => { const m = Math.max(2, Math.round(n * ms / 16)); for (const f of suave(m)) { await p.evaluate(d => window.scrollBy(0, d), dy * f); await w(16); } };
  const deslizaEn = async (sel, dy, n = 14) => { const m = Math.max(2, Math.round(n * 45 / 16)); for (const f of suave(m)) { await p.evaluate(([s, d]) => document.querySelector(s).scrollBy(0, d), [sel, dy * f]); await w(16); } };
  // llevar un elemento a la vista deslizando (sin brincar)
  const llevaA = async (sel, donde = 'center', n = 16) => {
    const dy = await p.evaluate(([s, dn]) => {
      const e = document.querySelector(s); const r = e.getBoundingClientRect();
      let c = e.parentElement; while (c && c !== document.body) { const st = getComputedStyle(c); if (/(auto|scroll)/.test(st.overflowY) && c.scrollHeight > c.clientHeight) break; c = c.parentElement; }
      const caja = (!c || c === document.body) ? { top: 0, height: innerHeight } : c.getBoundingClientRect();
      const meta = dn === 'start' ? caja.top + 20 : caja.top + caja.height / 2 - r.height / 2;
      if (c && c !== document.body) { c.id = c.id || 'panel-' + Math.random().toString(36).slice(2, 7); window.__panel = '#' + c.id; } else window.__panel = null;
      return r.top - meta;
    }, [sel, donde]);
    const panel = await p.evaluate(() => window.__panel);
    if (panel) await deslizaEn(panel, dy, n); else await desliza(dy, n, 40);
  };

  // 0: la página
  await marca(); await w(1500); await desliza(300); await w(600); await desliza(-300); await espera(0);
  // 1: tocar "Stock en México"
  await marca(); const ic = p.getByRole('button', { name: /Stock en México/i }).first();
  await ic.scrollIntoViewIfNeeded(); await w(DUR[1] * 1000 * 0.45); await toca(ic); await espera(1);
  // 2: la sección de stock, filtros y productos
  await marca(); await w(900); const fil = p.locator('#stock-section select').first();
  await toca(fil, { click: false }); await w(1300); await desliza(700, 20, 45); await espera(2);
  // 3: Agregar y Ver carrito
  await marca(); const card = p.locator('#stock-grid > *').filter({ hasText: 'Champagne Toast' }).first();
  await card.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -150)); await w(900);
  await toca(card.getByRole('button', { name: /Agregar/i }));
  // el aviso "Agregado al carrito" se quita solo con un temporizador de la página (no se hace lento), así que se
  // toca "Ver carrito" en tiempo real; si ya no está, se abre desde el ícono del carrito
  await p.waitForTimeout(1600);
  const ver = p.getByRole('button', { name: /Ver carrito/i });
  // se marca el toque sobre «Ver carrito» y el carrito se abre con su botón (el aviso puede quitarse mientras tanto
  // y el toque caería en otro producto)
  const bb = (await ver.isVisible().catch(() => false)) ? await ver.boundingBox() : null;
  if (bb) await circulo(bb.x + bb.width / 2, bb.y + bb.height / 2); else await toca(p.locator('#cart-toggle'), { click: false });
  await p.waitForTimeout(250);
  await p.evaluate(() => document.getElementById('cart-toggle').click());
  await espera(3);
  // 4: el carrito, total y ganancia
  await marca(); await w(1800);
  await llevaA('#cart-login-cta', 'center', 18); await espera(4);
  // 5: iniciar sesión / crear cuenta
  await marca(); const cta = p.locator('#cart-login-cta'); await cta.scrollIntoViewIfNeeded(); await w(400);
  await toca(cta); await w(1300); await toca(p.locator('#acct-tab-signup')); await espera(5);
  // 6: datos de envío (se muestran solo en este navegador) y se escriben
  await marca(); await p.click('#account-close'); await w(500); await p.click('#cart-toggle'); await w(600);
  await p.evaluate(() => { document.getElementById('cart-login-required').classList.add('hidden'); document.getElementById('quote-form').classList.remove('hidden'); });
  await llevaA('#customer-name', 'center', 8);
  const escribe = async (id, v, d = 35) => { await p.click('#' + id).catch(() => {}); await p.type('#' + id, v, { delay: d * K }); };
  await escribe('customer-name', 'Ana López', 45); await escribe('customer-phone', '5512345678', 30);
  await llevaA('#customer-street', 'center', 8);
  await escribe('customer-street', 'Av. Reforma 123', 25); await escribe('customer-colonia', 'Roma Norte', 25);
  await escribe('customer-municipio', 'Cuauhtémoc', 20); await escribe('customer-cp', '06700', 60);
  await p.selectOption('#customer-estado', 'Ciudad de México').catch(() => {});
  await p.evaluate(() => { const c = document.getElementById('customer-consent'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await espera(6);
  // 7: forma de pago
  await marca(); await llevaA('#pay-method', 'start', 16);
  await w(800); const tr = p.locator('input[name=pay-method][value=transfer]').locator('xpath=..');
  await toca(tr); await w(1600);
  await toca(p.locator('input[name=pay-method][value=card]').locator('xpath=..'), { click: false }); await espera(7);
  // 8: comprobante y enviar (sin mandar nada)
  await marca(); await llevaA('#proof-file-input', 'center', 16);
  await w(700); await toca(p.locator('#proof-file-input'), { click: false });
  await p.setInputFiles('#proof-file-input', 'pantallas/comprobante-ejemplo.jpg').catch(() => {});
  await w(1300); await toca(p.locator('#send-quote'), { click: false }); await espera(8);
  await marca(); await w(300);
  grabando = false; await captura;
  await ctx.close(); await b.close();

  // juntar los cuadros con su duración (ya en tiempo del video final)
  const fin = pasos[pasos.length - 1] + 0.3; let lista = '';
  cuadros.forEach((t, i) => { const sig = i + 1 < cuadros.length ? cuadros[i + 1] : fin; lista += `file 'cuadros/${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(0.001, sig - t).toFixed(4)}\n`; });
  lista += `file 'cuadros/${String(cuadros.length - 1).padStart(5, '0')}.jpg'\n`;
  fs.writeFileSync('grabacion/cuadros.txt', lista);
  const off = cuadros[0];  // el video empieza en el primer cuadro
  fs.writeFileSync('grabacion/pasos.json', JSON.stringify(pasos.map(x => x - off)));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'grabacion/cuadros.txt',
    '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', 'grabacion/pantalla.mp4']);
  console.log('cuadros', cuadros.length, 'fps', (cuadros.length / (fin - off)).toFixed(1), 'pasos', pasos.map(x => (x - off).toFixed(2)).join(' '));
})();
