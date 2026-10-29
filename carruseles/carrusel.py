"""Carruseles de fotos (1080x1350, 4:5) para TikTok (modo foto) e Instagram, estilo tarjetas crema sobre fondo rosa.
Cada lámina de producto lleva 2 productos: foto recortada (recortes/), qué es, marca y precio de la preventa.
Uso: python3 carrusel.py NOMBRE -> NOMBRE/01.jpg, 02.jpg, ..."""
from precios_mx import comparacion
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

    # texto centrado en su columna; k achica todo cuando la tarjeta es más bajita (láminas de 3)
    k = min(1.0, (y1 - y0) / 525)
    tw = tx1 - tx0; tc = (tx0 + tx1) / 2
    sz = int((100 if p.get("dato") else 112) * k)
    tope = sz * 0.78  # primero intenta que quepa en 2 renglones achicando un poco; si no, 3
    while True:
        fn = F(BEBAS, sz); rs = renglones(p["que"], fn, tw)
        cabe = all(fn.getlength(r) <= tw for r in rs)
        if cabe and (len(rs) <= 2 or (sz <= tope and len(rs) <= 3)) or sz < 50: break
        sz -= 4
    m, pr, an, de = int(46 * k), int(104 * k), int(44 * k), int(36 * k)
    fm, fp, fa = F(BEBAS, m), F(BEBAS, pr), F(BEBAS, an)
    alto = len(rs) * sz * 0.92 + 18 * k + m + 30 * k + pr + ((14 * k + an) if comparacion(p) else 0) + (de - 2 if p.get("desde") else 0)
    if p.get("dato"):  # sello con el dato real (ventas, premio Allure) arriba del nombre
        alto += 60 * k + 16
    y = cy - alto / 2
    if p.get("dato"):
        fd = F(BEBAS, int(42 * k)); dw = fd.getlength(p["dato"])
        d.rounded_rectangle((tc - dw / 2 - 20, y, tc + dw / 2 + 20, y + 60 * k), int(30 * k), fill=TINTA)
        d.text((tc, y + 31 * k), p["dato"], font=fd, fill=BLANCO, anchor="mm"); y += 60 * k + 16
    for r in rs:
        texto(d, (tc, y + sz * 0.46), r, fn, TINTA); y += sz * 0.92
    y += 18 * k
    texto(d, (tc, y + m / 2), p["marca"].upper(), fm, SUAVE, sombra=False); y += m + 30 * k
    if p.get("desde"):
        texto(d, (tc, y + de * 0.42), "DESDE", F(BEBAS, de), SUAVE, sombra=False); y += de - 2
    texto(d, (tc, y + pr / 2), f"${p['precio']:,}", fp, TINTA); y += pr
    if comparacion(p):
        y += 14 * k; et, pa = comparacion(p); s = f"{et.upper()} ${pa:,}"
        d.text((tc, y + an / 2), s, font=fa, fill=SUAVE, anchor="mm")
        lw = fa.getlength(s); d.line((tc - lw / 2 - 4, y + an / 2 + 2, tc + lw / 2 + 4, y + an / 2 + 2), fill=SUAVE, width=max(3, int(4 * k)))


def firma(L):
    d = ImageDraw.Draw(L)
    d.text((W / 2, 1268), HANDLE, font=F(CORM, 64), fill=(255, 250, 249), anchor="mm")


def lamina_productos(*ps):
    """2 tarjetas (una pegada a la izquierda y otra a la derecha) o 3, como en el ejemplo"""
    L = Image.new("RGBA", (W, H), ROSA + (255,))
    if len(ps) == 2:
        cajas = [(-80, 80, 965, 605), (115, 675, W + 80, 1200)]
    else:
        cajas = [(-80, 40, 905, 400), (330, 440, W + 80, 800), (-80, 840, 905, 1200)]
    for i, (p, c) in enumerate(zip(ps, cajas)):
        producto(L, c, p, foto_izq=i % 2 == 0)
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


def gracias(c):
    """cierre como el del ejemplo: ¡GRACIAS! grande, mensajito y el logo con la alpaca navideña"""
    L = Image.new("RGBA", (W, H), ROSA + (255,))
    d = ImageDraw.Draw(L)
    f = F("BagelFatOne-Regular.ttf", 170)
    d.text((W / 2 + 6, 430 + 7), "¡GRACIAS!", font=f, fill=(232, 150, 165), anchor="mm")
    d.text((W / 2, 430), "¡GRACIAS!", font=f, fill=BLANCO, anchor="mm")
    y = 580
    for r in c["texto"]:
        d.text((W / 2, y), r, font=F(CORM, 54), fill=BLANCO, anchor="mm"); y += 62
    raiz = os.path.dirname(AQUI)
    al = Image.open(os.path.join(raiz, "video-sephora", "alpacas", "navidad.png")).convert("RGBA")
    al.thumbnail((430, 430), Image.LANCZOS)
    L.alpha_composite(al, (int(W / 2 - al.width / 2), 780))
    lo = Image.open(os.path.join(raiz, "assets", "logo-wordmark.png")).convert("RGBA")
    lo.thumbnail((440, 160), Image.LANCZOS)
    borde = lo.getchannel("A").filter(ImageFilter.MaxFilter(13))  # contorno blanco para que se lea sobre rosa
    b = Image.new("RGBA", lo.size, BLANCO + (255,)); b.putalpha(borde)
    x, y = int(W / 2 - lo.width / 2), 1205
    L.alpha_composite(b, (x, y)); L.alpha_composite(lo, (x, y))
    return L


if __name__ == "__main__":
    import importlib
    nombre = sys.argv[1]
    cfg = importlib.import_module(f"guion_{nombre.replace('-', '_')}")
    import precios_mx; precios_mx.ajusta_guion(cfg)
    out = os.path.join(AQUI, nombre); os.makedirs(out, exist_ok=True)
    fin = gracias(cfg.GRACIAS) if hasattr(cfg, "GRACIAS") else cierre(cfg.CIERRE)
    import whatsapp
    wa = whatsapp.lamina(W, H, ROSA, ["ÚNETE A MI GRUPO", "DE WHATSAPP"], ["Ahí aviso de las preventas, ofertas", "y todo lo nuevo que llega"],
                         TINTA, BLANCO, lambda: F(BEBAS, 120), lambda: F(CORM, 50))
    laminas = [portada(cfg.PORTADA)] + [lamina_productos(*ps) for ps in cfg.PARES] + [fin, wa]
    for i, L in enumerate(laminas, 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"{nombre}/{i:02d}.jpg")
