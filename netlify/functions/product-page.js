// Ficha de producto: alpacca.mx/?p=SKU (ver netlify.toml). Sirve la misma
// página de la tienda, pero con el título, la descripción, la foto y los
// datos del producto (para Google y para la vista previa al compartir el
// link por WhatsApp o Facebook). La tienda, al cargar, abre la ficha sola.
//
// Con ?format=json regresa solo { descripcion, tipoPiel, pais } -- lo que
// la ficha pide al abrirse (el catálogo ligero no trae la descripción).

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

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
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
