// Mapa del sitio para Google (alpacca.mx/sitemap.xml, ver netlify.toml):
// portada, catálogo, Stock en México, marcas, categorías y la ficha de
// cada producto disponible (alpacca.mx/?p=SKU).

const { loadCatalog, isAvailable } = require("./lib/catalog-source.js");

const BASE = "https://alpacca.mx/";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

exports.handler = async () => {
  const urls = [
    { loc: BASE, pri: "1.0" },
    { loc: `${BASE}?ver=catalogo`, pri: "0.8" },
    { loc: `${BASE}?ver=stock`, pri: "0.8" },
    { loc: `${BASE}?ver=tipo-de-piel`, pri: "0.7" },
  ];
  try {
    const { rows } = await loadCatalog();
    const avail = rows.filter((r) => r.Nombre && isAvailable(r));
    const marcas = [...new Set(avail.map((r) => r.Marca).filter(Boolean))].sort();
    const cats = [...new Set(avail.map((r) => r.Categoria).filter(Boolean))].sort();
    marcas.forEach((m) => urls.push({ loc: `${BASE}?marca=${encodeURIComponent(m)}`, pri: "0.7" }));
    cats.forEach((c) => urls.push({ loc: `${BASE}?categoria=${encodeURIComponent(c)}`, pri: "0.6" }));
    const seen = new Set();
    avail.forEach((r) => {
      if (!r.SKU || seen.has(r.SKU)) return;
      seen.add(r.SKU);
      urls.push({ loc: `${BASE}?p=${encodeURIComponent(r.SKU)}`, pri: "0.5" });
    });
  } catch (err) {
    console.error("sitemap: no se pudo leer el catálogo", err);
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><priority>${u.pri}</priority></url>`).join("\n")}
</urlset>
`;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
    body,
  };
};
