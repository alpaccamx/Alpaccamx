// Capturas del tutorial "cómo comprar stock en alpacca.mx" (iPhone 13, 3x). Nunca manda pedidos: bloquea create-order y
// Mercado Pago, y el formulario de datos solo se muestra en este navegador (sin iniciar sesión ni crear cuentas).
// Uso: node captura.js -> pantallas/NN.png + pantallas/toques.json (dónde tocar en cada una, en px de la captura)
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'es-MX' });
  const p = await ctx.newPage();
  await p.route('**/.netlify/functions/create-order**', r => r.abort());
  await p.route('**/.netlify/functions/mp-**', r => r.abort());
  const toques = {}; const S = 3;
  const caja = async (loc) => { const bb = await loc.boundingBox(); return bb ? [bb.x * S, bb.y * S, bb.width * S, bb.height * S] : null; };
  const foto = async (n, loc, extra = {}) => { await p.waitForTimeout(700); await p.screenshot({ path: `pantallas/${n}.png` }); toques[n] = { toque: loc ? await caja(loc) : null, ...extra }; };
  await p.goto('https://alpacca.mx/', { waitUntil: 'networkidle', timeout: 60000 });
  const ic = p.getByRole('button', { name: /Stock en México/i }).first();
  await p.evaluate(() => window.scrollTo(0, 0)); await foto('01', null);
  await ic.scrollIntoViewIfNeeded(); await foto('02', ic);
  await ic.click(); await p.waitForTimeout(2000);
  await foto('03', p.locator('#stock-section select').first());
  const card = p.locator('#stock-grid > *').filter({ hasText: 'Champagne Toast' }).first();
  await card.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -120));
  const add = card.getByRole('button', { name: /Agregar/i });
  await foto('04', add);
  await add.click(); await p.waitForTimeout(1200);
  const ver = p.getByRole('button', { name: /Ver carrito/i });
  await foto('05', ver);
  await ver.click(); await p.waitForTimeout(1500);
  await foto('06', p.locator('text=Te sale en').first());
  const gan = p.locator('text=Tu ganancia total').first();
  await gan.scrollIntoViewIfNeeded(); await foto('07', gan);
  const cta = p.locator('#cart-login-cta'); await cta.scrollIntoViewIfNeeded(); await foto('08', cta);
  await cta.click(); await p.waitForTimeout(1200);
  await foto('09', p.locator('#acct-tab-signup'));
  // cerrar "Mi cuenta" y volver al carrito; el formulario se muestra solo aquí
  await p.click('#account-close'); await p.waitForTimeout(900);
  await p.click('#cart-toggle'); await p.waitForTimeout(1500);  // al abrir "Mi cuenta" el carrito se cierra
  await p.evaluate(() => { document.getElementById('cart-login-required').classList.add('hidden'); document.getElementById('quote-form').classList.remove('hidden'); });
  const set = (id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  await set('customer-name', 'Ana López'); await set('customer-phone', '55 1234 5678'); await set('customer-street', 'Av. Reforma 123');
  await set('customer-colonia', 'Roma Norte'); await set('customer-municipio', 'Cuauhtémoc'); await set('customer-cp', '06700'); await set('customer-estado', 'Ciudad de México');
  await p.evaluate(() => { const c = document.getElementById('customer-consent'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(1500);
  const ver2 = async (sel, block) => { await p.evaluate(([s, bl]) => document.querySelector(s).scrollIntoView({ block: bl }), [sel, block]); await p.waitForTimeout(600); };
  await ver2('#customer-name', 'center'); await foto('10', p.locator('#customer-name'));
  await ver2('#customer-cp', 'center'); await foto('11', p.locator('#customer-cp'));
  const radio = (v) => p.evaluate((v) => { const r = document.querySelector(`input[name=pay-method][value=${v}]`); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }, v);
  await ver2('#pay-method', 'start'); await foto('12', p.locator('#pay-method'));
  await radio('transfer'); await p.waitForTimeout(800); await ver2('#pay-method', 'start');
  await foto('13', p.locator('input[name=pay-method][value=transfer]').locator('xpath=..'), { tapar: await caja(p.locator('#cart-bank-details-body')) });
  await ver2('#send-quote', 'center');
  await foto('14', p.locator('#send-quote'), { tapar: await caja(p.locator('#cart-bank-details-body')) });
  fs.writeFileSync('pantallas/toques.json', JSON.stringify(toques, null, 1));
  await b.close(); console.log(Object.keys(toques).join(' '));
})();
