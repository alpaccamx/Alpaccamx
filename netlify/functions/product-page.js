// Ficha de producto: alpacca.mx/?p=SKU (ver netlify.toml). Sirve la misma
// página de la tienda, pero con el título, la descripción, la foto y los
// datos del producto (para Google y para la vista previa al compartir el
// link por WhatsApp o Facebook). La tienda, al cargar, abre la ficha sola.
//
// Con ?format=json regresa solo { descripcion, tipoPiel, pais } -- lo que
// la ficha pide al abrirse (el catálogo ligero no trae la descripción).
//
// También sirve los links de listados (?marca=, ?categoria=, ?pais=,
// ?ver=stock|catalogo|shopwithmae, ?q=) con su propio título, descripción e
// imagen, para que al pegarlos en WhatsApp la miniatura sea de esa marca y
// no la genérica. Las imágenes salen de assets/og/<tipo>-<slug>.jpg
// (scripts/og_images.py); si una marca no tiene, se usa la foto de uno de
// sus productos.

const { loadCatalog, loadStock, isAvailable } = require("./lib/catalog-source.js");

const SITE = "https://alpacca.mx";
const STOCK_SUFFIX = "__stock";
const HTML_TTL_MS = 5 * 60 * 1000;
let htmlCache = null; // { at, html }

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function loadIndexHtml() {
  if (htmlCache && Date.now() - htmlCache.at < HTML_TTL_MS) return htmlCache.html;
  const base = process.env.URL || SITE;
  const res = await fetch(`${base}/index.html`, { redirect: "follow" });
  if (!res.ok) throw new Error(`index.html respondió ${res.status}`);
  const html = await res.text();
  htmlCache = { at: Date.now(), html };
  return html;
}

function absUrl(src) {
  if (!src) return `${SITE}/assets/og-alpacca.jpg`;
  if (/^https?:\/\//.test(src)) return src;
  return `${SITE}/${src.replace(/^\.?\/+/, "")}`;
}

function price(v) {
  const cleaned = String(v || "").replace(/[^0-9.,]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let n = cleaned;
  if (lastComma > lastDot) n = cleaned.replace(/\./g, "").replace(",", ".");
  else n = cleaned.replace(/,/g, "");
  return parseFloat(n) || 0;
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*">`);
  const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `${tag}\n</head>`);
}

function productHtml(html, row, sku) {
  const nombre = row.Nombre;
  const marca = row.Marca || "";
  const pres = row.Presentacion || "";
  const precio = price(row.Precio);
  const title = `${marca && !nombre.toLowerCase().includes(marca.toLowerCase()) ? `${marca} ` : ""}${nombre}${pres && /^caja/i.test(pres) ? ` (${pres})` : ""} — Alpacca`;
  const desc = (row.Descripcion || `${marca} ${nombre}`).slice(0, 155) +
    (precio ? ` Desde $${precio.toLocaleString("es-MX")} MXN. Envíos a todo México.` : "");
  const url = `${SITE}/?p=${encodeURIComponent(sku)}`;
  const img = absUrl(row.Imagen);
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  out = setMeta(out, "name", "description", desc);
  out = setMeta(out, "property", "og:type", "product");
  out = setMeta(out, "property", "og:title", title);
  out = setMeta(out, "property", "og:description", desc);
  out = setMeta(out, "property", "og:image", img);
  out = setMeta(out, "property", "og:url", url);
  out = setMeta(out, "name", "twitter:title", title);
  out = setMeta(out, "name", "twitter:description", desc);
  out = setMeta(out, "name", "twitter:image", img);
  // La foto del producto no es 1200x630: se quitan las medidas de la imagen genérica.
  out = out.replace(/<meta property="og:image:(width|height)" content="[^"]*">\n?/g, "");
  out = out.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nombre,
    sku,
    image: [img],
    description: row.Descripcion || undefined,
    brand: marca ? { "@type": "Brand", name: marca } : undefined,
    offers: precio
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "MXN",
          price: precio.toFixed(2),
          availability: isAvailable(row) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        }
      : undefined,
  };
  const json = JSON.stringify(ld).replace(/</g, "\\u003c");
  return out.replace("</head>", `<script type="application/ld+json">${json}</script>\n</head>`);
}

const slug = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const ogExists = new Map(); // url -> { at, ok }
async function ogImage(tipo, name) {
  const url = `${SITE}/assets/og/${tipo}-${slug(name)}.jpg`;
  const c = ogExists.get(url);
  if (c && Date.now() - c.at < HTML_TTL_MS) return c.ok ? url : null;
  let ok = false;
  try { ok = (await fetch(url, { method: "HEAD" })).ok; } catch (err) { ok = false; }
  ogExists.set(url, { at: Date.now(), ok });
  return ok ? url : null;
}
const fam = (n) => String(n || "").replace(/\s*\(.*\)$/, "").toLowerCase();

/* Título, descripción e imagen de un listado (marca, categoría, país...). */
async function listingMeta(q) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  const fields = [["marca", "Marca"], ["categoria", "Categoria"], ["pais", "País"]];
  const hit = fields.find(([k]) => q[k]);
  if (hit) {
    const [tipo, col] = hit;
    let rows = [];
    try { rows = (await loadCatalog()).rows.filter((r) => r.Nombre && norm(r[col]) === norm(q[tipo])); } catch (err) { console.error("product-page: catálogo", err); }
    if (!rows.length) return null;
    const name = rows[0][col];
    const pieces = rows.filter((r) => r.Presentacion === "Pieza individual");
    const n = new Set((pieces.length ? pieces : rows).map((r) => fam(r.Nombre))).size;
    const min = Math.min(...(pieces.length ? pieces : rows).map((r) => price(r.Precio)).filter((v) => v > 0));
    const desde = isFinite(min) ? ` desde $${min.toLocaleString("es-MX")} MXN` : "";
    const title = tipo === "marca" ? `${name} en México — Alpacca` : tipo === "categoria" ? `${name} coreano y asiático — Alpacca` : `Productos de ${name} — Alpacca`;
    const desc = `${n} producto${n === 1 ? "" : "s"} de ${name}${desde}. Pieza individual o caja, compra en línea y envíos a todo México.`;
    const sample = rows.find((r) => r.Imagen && String(r.Disponible || "SI").toUpperCase() !== "NO") || rows.find((r) => r.Imagen);
    const image = (await ogImage(tipo, name)) || (sample ? absUrl(sample.Imagen) : null);
    return { title, desc, image, url: `${SITE}/?${tipo}=${encodeURIComponent(name)}`, ogSize: Boolean(image && image.includes("/assets/og/")) };
  }
  if (q.ver === "stock") {
    const image = await ogImage("ver", "stock");
    return { title: "Stock en México, entrega inmediata — Alpacca", desc: "Productos que ya están en México: se envían de inmediato, sin pedido mínimo.", url: `${SITE}/?ver=stock`, image, ogSize: Boolean(image) };
  }
  if (q.ver === "catalogo") return { title: "Catálogo completo — Alpacca", desc: "Todo el skincare y maquillaje coreano y asiático: pieza individual o caja, envíos a todo México.", url: `${SITE}/?ver=catalogo` };
  if (q.ver === "shopwithmae" || q.ver === "direccion-americana") {
    return { title: "Dirección americana — Shop with Mae · Alpacca", desc: "Compra en tiendas de EE.UU. (Sephora, Ulta, Amazon...) con tu dirección americana y recíbelo en México.", url: `${SITE}/?ver=shopwithmae` };
  }
  if (q.q) return { title: `"${String(q.q).slice(0, 60)}" — Alpacca`, desc: `Resultados de "${String(q.q).slice(0, 60)}" en Alpacca: skincare coreano y asiático con envíos a todo México.`, url: `${SITE}/?q=${encodeURIComponent(q.q)}` };
  return null;
}

function listingHtml(html, m) {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`);
  out = setMeta(out, "name", "description", m.desc);
  out = setMeta(out, "property", "og:title", m.title);
  out = setMeta(out, "property", "og:description", m.desc);
  out = setMeta(out, "property", "og:url", m.url);
  out = setMeta(out, "name", "twitter:title", m.title);
  out = setMeta(out, "name", "twitter:description", m.desc);
  if (m.image) {
    out = setMeta(out, "property", "og:image", m.image);
    out = setMeta(out, "name", "twitter:image", m.image);
    if (!m.ogSize) out = out.replace(/<meta property="og:image:(width|height)" content="[^"]*">\n?/g, "");
  }
  return out.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(m.url)}">`);
}

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
  "Netlify-Vary": "query=p|sku|marca|categoria|pais|ver|q",
};

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (!q.p && !q.sku) {
    // Link de un listado (marca, categoría, país, stock...).
    const qs = new URLSearchParams(q).toString();
    let html;
    try {
      html = await loadIndexHtml();
    } catch (err) {
      console.error("product-page: no se pudo leer index.html", err);
      return { statusCode: 302, headers: { Location: `/index.html${qs ? `?${qs}` : ""}` }, body: "" };
    }
    const m = await listingMeta(q);
    return { statusCode: 200, headers: HTML_HEADERS, body: m ? listingHtml(html, m) : html };
  }
  const raw = String(q.sku || q.p || "").trim();
  const sku = raw.endsWith(STOCK_SUFFIX) ? raw.slice(0, -STOCK_SUFFIX.length) : raw;

  let row = null;
  try {
    const { rows } = await loadCatalog();
    row = rows.find((r) => r.SKU === sku && r.Nombre) || null;
  } catch (err) {
    console.error("product-page: no se pudo leer el catálogo", err);
  }
  if (!row) {
    // Producto que solo está en "Stock en México" (SKU STOCK-...).
    try {
      const { rows } = await loadStock();
      row = rows.find((r) => r.SKU === sku && r.Nombre) || null;
    } catch (err) {
      console.error("product-page: no se pudo leer el stock", err);
    }
  }

  if (q.format === "json") {
    return {
      statusCode: row ? 200 : 404,
      headers: {
        "Content-Type": "application/json",
        "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        "Netlify-Vary": "query=sku|format",
      },
      body: JSON.stringify(row ? { descripcion: row.Descripcion || "", tipoPiel: row.TipoPiel || "", pais: row["País"] || "" } : {}),
    };
  }

  let html;
  try {
    html = await loadIndexHtml();
  } catch (err) {
    console.error("product-page: no se pudo leer index.html", err);
    return { statusCode: 302, headers: { Location: "/" }, body: "" };
  }
  const body = row ? productHtml(html, row, sku) : html.replace("</head>", '<meta name="robots" content="noindex">\n</head>');
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "Netlify-Vary": "query=p|sku",
    },
    body,
  };
};
