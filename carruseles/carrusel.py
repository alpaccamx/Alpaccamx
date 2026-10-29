"""Carruseles de fotos (1080x1350, 4:5) para TikTok (modo foto) e Instagram, estilo tarjetas crema sobre fondo rosa.
Cada lámina de producto lleva 2 productos: foto recortada (recortes/), qué es, marca y precio de la preventa.
Uso: python3 carrusel.py NOMBRE -> NOMBRE/01.jpg, 02.jpg, ..."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1350
ROSA, CREMA, BLANCO = (255, 188, 194), (254, 235, 228), (255, 255, 255)
TINTA = (232, 112, 145)       # rosa fuerte para que el texto se lea sobre crema
SUAVE = (196, 140, 150)       # marca y precio de antes
HANDLE = "@alpaccamx"

_f = {}
def F(n, s):
    k = (n, s)
    if k not in _f:
        _f[k] = ImageFont.truetype(os.path.join(AQUI, "fuentes", n), s)
        if n == "Cormorant.ttf": _f[k].set_variation_by_name("Medium")
    return _f[k]
BEBAS, CORM = "BebasNeue-Regular.ttf", "Cormorant.ttf"


def texto(d, xy, s, fuente, color, anchor="mm", sombra=True):
    """texto con sombra blanca abajo a la derecha, como en el ejemplo"""
    if sombra: d.text((xy[0] + 4, xy[1] + 4), s, font=fuente, fill=BLANCO, anchor=anchor)
    d.text(xy, s, font=fuente, fill=color, anchor=anchor)


def renglones(s, fuente, ancho):
    out, cur = [], ""
    for p in s.split():
        t = (cur + " " + p).strip()
        if fuente.getlength(t) <= ancho or not cur: cur = t
        else: out.append(cur); cur = p
    return out + [cur]


def tarjeta(L, caja, radio=60):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle(caja, radio, fill=255)
    L.paste(Image.new("RGBA", (W, H), CREMA + (255,)), (0, 0), m)


def foto(nombre, alto, ancho):
    im = Image.open(os.path.join(AQUI, "recortes", nombre + ".png")).convert("RGBA")
    k = min(alto / im.height, ancho / im.width)
    return im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)


def pega(L, im, cx, cy, sombra=True):
    x, y = int(cx - im.width / 2), int(cy - im.height / 2)
    if sombra:  # sombrita suave para que no se vea "flotando"
        s = Image.new("RGBA", (im.width + 80, im.height + 80), (0, 0, 0, 0))
        a = im.getchannel("A").point(lambda v: v * 0.22)
        s.paste(Image.new("RGBA", im.size, (150, 80, 90, 255)), (40, 40), a)
        L.alpha_composite(s.filter(ImageFilter.GaussianBlur(18)), (x - 40 + 10, y - 40 + 16))
    L.alpha_composite(im, (x, y))


def producto(L, caja, p, foto_izq=True):
    """una tarjeta: foto de un lado, del otro QUÉ ES (grande), marca y precio"""
    x0, y0, x1, y1 = caja
    tarjeta(L, caja)
    d = ImageDraw.Draw(L)
    ancho_foto = (x1 - x0) * 0.50
    fx = max(x0, 0) + ancho_foto / 2 + 10 if foto_izq else min(x1, W) - ancho_foto / 2 - 10
    tx0 = x0 + ancho_foto + 40 if foto_izq else x0 + 50
    tx1 = x1 - 50 if foto_izq else x1 - ancho_foto - 40
    cy = (y0 + y1) / 2
    if p.get("swatch"):  # la mancha del color detrás, como en el ejemplo del blush
        sw = foto(p["swatch"], (y1 - y0) * 0.70, ancho_foto * 0.95)
        pega(L, sw, fx + 40, cy - 20, sombra=False)
    im = foto(p["foto"], (y1 - y0) * p.get("alto", 0.80), ancho_foto * p.get("ancho", 0.9))
    pega(L, im, fx - (40 if p.get("swatch") else 0), cy + 10)

    # texto centrado en su columna
    tw = tx1 - tx0; tc = (tx0 + tx1) / 2
    sz = 112
    while True:
        fn = F(BEBAS, sz); rs = renglones(p["que"], fn, tw)
        if (len(rs) <= 3 and all(fn.getlength(r) <= tw for r in rs)) or sz < 60: break
        sz -= 4
    fm, fp, fa = F(BEBAS, 46), F(BEBAS, 104), F(BEBAS, 44)
    alto = len(rs) * sz * 0.92 + 18 + 46 + 30 + 104 + (14 + 44 if p.get("antes") else 0) + (34 if p.get("desde") else 0)
    y = cy - alto / 2
    for r in rs:
        texto(d, (tc, y + sz * 0.46), r, fn, TINTA); y += sz * 0.92
    y += 18
    texto(d, (tc, y + 23), p["marca"].upper(), fm, SUAVE, sombra=False); y += 46 + 30
    if p.get("desde"):
        texto(d, (tc, y + 15), "DESDE", F(BEBAS, 36), SUAVE, sombra=False); y += 34
    texto(d, (tc, y + 52), f"${p['precio']:,}", fp, TINTA); y += 104
    if p.get("antes"):
        y += 14; s = f"SEPHORA ${p['antes']:,}"
        d.text((tc, y + 22), s, font=fa, fill=SUAVE, anchor="mm")
        lw = fa.getlength(s); d.line((tc - lw / 2 - 4, y + 24, tc + lw / 2 + 4, y + 24), fill=SUAVE, width=4)


def firma(L):
    d = ImageDraw.Draw(L)
    d.text((W / 2, 1268), HANDLE, font=F(CORM, 64), fill=(255, 250, 249), anchor="mm")


def lamina_productos(a, b):
    L = Image.new("RGBA", (W, H), ROSA + (255,))
    producto(L, (-80, 80, 965, 605), a, foto_izq=True)
    producto(L, (115, 675, W + 80, 1200), b, foto_izq=False)
    firma(L)
    return L


def estrella(d, cx, cy, r, color=(246, 236, 222)):
    import math
    pts = [(cx + (r if i % 2 == 0 else r * 0.42) * math.cos(math.pi / 2 + i * math.pi / 5 + 0.3),
            cy - (r if i % 2 == 0 else r * 0.42) * math.sin(math.pi / 2 + i * math.pi / 5 + 0.3)) for i in range(10)]
    d.polygon(pts, fill=color)


def portada(c):
    """como la del ejemplo: fondo rosa con estrellitas, productos chuecos saliéndose por las esquinas
    y en medio "Productos del / SEPHORA SALE / que puedes encontrar en mi preventa" """
    L = Image.new("RGBA", (W, H), ROSA + (255,))
    d = ImageDraw.Draw(L)
    for x, y, r in [(310, 90, 46), (520, 330, 30), (990, 470, 52), (70, 620, 34), (960, 900, 46),
                    (390, 1100, 58), (1000, 1080, 26), (130, 960, 24), (760, 1290, 34), (640, 120, 22)]:
        estrella(d, x, y, r)
    for nom, alto, ang, cx, cy in c["esquinas"]:  # (foto, alto, grados, centro x, centro y)
        im = foto(nom, alto, 900).rotate(ang, expand=True, resample=Image.BICUBIC)
        pega(L, im, cx, cy)
    d = ImageDraw.Draw(L)
    d.text((W / 2, 470), c["arriba"], font=F(CORM, 66), fill=BLANCO, anchor="mm")
    y = 610
    for r in c["grande"]:
        f = F("BagelFatOne-Regular.ttf", 230)
        while f.getlength(r) > 960: f = F("BagelFatOne-Regular.ttf", f.size - 6)
        d.text((W / 2, y), r, font=f, fill=BLANCO, anchor="mm"); y += f.size * 0.86
    for r in c["abajo"]:
        d.text((W / 2, y - 20), r, font=F(CORM, 60), fill=BLANCO, anchor="mm"); y += 64
    firma(L)
    return L


def cierre(c):
    L = Image.new("RGBA", (W, H), ROSA + (255,))
    d = ImageDraw.Draw(L)
    texto(d, (W / 2, 190), c["titulo"], F(BEBAS, 150), TINTA)
    tarjeta(L, (70, 300, W - 70, 1150), 70)
    y = 400
    for i, (grande, chico) in enumerate(c["pasos"], 1):
        d.ellipse((150, y, 250, y + 100), fill=TINTA)
        d.text((200, y + 54), str(i), font=F(BEBAS, 76), fill=BLANCO, anchor="mm")
        d.text((290, y + 30), grande, font=F(BEBAS, 72), fill=TINTA, anchor="lm")
        d.text((292, y + 84), chico, font=F(BEBAS, 44), fill=SUAVE, anchor="lm")
        y += 190
    s = c["pastilla"]; fn = F(BEBAS, 64); tw = fn.getlength(s)
    d.rounded_rectangle(((W - tw) / 2 - 40, 1010, (W + tw) / 2 + 40, 1100), 46, fill=TINTA)
    d.text((W / 2, 1057), s, font=fn, fill=BLANCO, anchor="mm")
    firma(L)
    return L


if __name__ == "__main__":
    import importlib
    nombre = sys.argv[1]
    cfg = importlib.import_module(f"guion_{nombre.replace('-', '_')}")
    out = os.path.join(AQUI, nombre); os.makedirs(out, exist_ok=True)
    laminas = [portada(cfg.PORTADA)] + [lamina_productos(a, b) for a, b in cfg.PARES] + [cierre(cfg.CIERRE)]
    for i, L in enumerate(laminas, 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"{nombre}/{i:02d}.jpg")
