// Pasa una foto HEIC (las del iPhone) a JPG para el admin. Chrome no sabe
// leer HEIC y las librerías para hacerlo en el navegador necesitan
// "unsafe-eval", que la seguridad del sitio no permite; aquí, en el
// servidor, no hay ese problema.
//
// Requiere el header "x-admin-key".
//   POST { dataBase64 }  -> { contentType: "image/jpeg", dataBase64 }
//   (ya achicada a 1600 px por lado, como las demás fotos del admin)

const { checkAdminKey } = require("./lib/admin-auth.js");

const MAX_LADO = 1600;
let libheif = null;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const auth = checkAdminKey(event);
  if (!auth.configured) return json(500, { error: "Falta configurar ADMIN_KEY en Netlify." });
  if (!auth.valid) return json(401, { error: "Clave de administrador incorrecta." });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido." }); }
  const buf = Buffer.from(String(b.dataBase64 || ""), "base64");
  if (!buf.length) return json(400, { error: "No llegó la foto." });

  try {
    if (!libheif) libheif = require("libheif-js/wasm-bundle");
    const imgs = new libheif.HeifDecoder().decode(buf);
    if (!imgs || !imgs.length) return json(400, { error: "No es una foto HEIC válida." });
    const im = imgs[0];
    const w = im.get_width();
    const h = im.get_height();
    const rgba = await new Promise((resolve, reject) => {
      im.display({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }, (d) => (d ? resolve(d.data) : reject(new Error("HEIF"))));
    });
    const { data, width, height } = achicar(rgba, w, h, MAX_LADO);
    const jpeg = require("jpeg-js").encode({ data, width, height }, 82);
    return json(200, { contentType: "image/jpeg", dataBase64: Buffer.from(jpeg.data).toString("base64") });
  } catch (err) {
    console.error("admin-heic:", err);
    return json(500, { error: "No se pudo convertir la foto." });
  }
};

/* Promedia bloques de pixeles para que el lado mayor quede en `max`. */
function achicar(src, w, h, max) {
  const k = Math.min(1, max / Math.max(w, h));
  if (k === 1) return { data: Buffer.from(src.buffer, src.byteOffset, src.byteLength), width: w, height: h };
  const W = Math.max(1, Math.round(w * k));
  const H = Math.max(1, Math.round(h * k));
  const out = Buffer.alloc(W * H * 4);
  const fx = w / W;
  const fy = h / H;
  for (let y = 0; y < H; y++) {
    const y0 = Math.floor(y * fy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
    for (let x = 0; x < W; x++) {
      const x0 = Math.floor(x * fx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
      let r = 0, g = 0, bl = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        let i = (yy * w + x0) * 4;
        for (let xx = x0; xx < x1; xx++, i += 4) { r += src[i]; g += src[i + 1]; bl += src[i + 2]; n++; }
      }
      const o = (y * W + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = bl / n; out[o + 3] = 255;
    }
  }
  return { data: out, width: W, height: H };
}

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) };
}
