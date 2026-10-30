"""Carrusel de los mists de Victoria's Secret (hoy a $155), 1080x1350: las tomas de Mae en la tienda de fondo
(fotos-vs/*.jpg, sacadas de sus videos de la carpeta Ross del Drive) y encima la foto real de los mists.
Uso: python3 vs.py -> mists-vs/01.jpg, ..."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageOps

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
_argv, sys.argv = sys.argv, [sys.argv[0], "/dev/null"]
import build as b
sys.argv = _argv
import whatsapp

W, H = 1080, 1350
VSROSA, NEGRO, BLANCO = (236, 92, 140), (20, 20, 22), (255, 255, 255)
PRECIO = "$155 c/u"
AROMAS = ["Amber Romance", "Strawberries & Champagne", "Love Spell", "Velvet Petals", "Pure Seduction",
          "Bare Vanilla", "Midnight Bloom", "Coconut Passion", "Pear Glacé", "Aqua Kiss"]


def fondo(nombre, k=110, borroso=0):
    im = ImageOps.fit(Image.open(os.path.join(AQUI, "fotos-vs", nombre + ".jpg")).convert("RGB"), (W, H), Image.LANCZOS, centering=(0.5, 0.4))
    if borroso: im = im.filter(ImageFilter.GaussianBlur(borroso))
    L = im.convert("RGBA"); L.alpha_composite(Image.new("RGBA", (W, H), (25, 8, 18, k)))
    return L


def tarjeta(nombre, ancho, alto=None, radio=36):
    """foto en tarjeta blanca con sombra"""
    im = Image.open(os.path.join(AQUI, "fotos-vs", nombre + ".jpg")).convert("RGB")
    alto = alto or int(im.height * ancho / im.width)
    im = ImageOps.fit(im, (ancho, alto), Image.LANCZOS)
    pad = 18; c = Image.new("RGBA", (ancho + 2 * pad + 60, alto + 2 * pad + 60))
    sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 42, 30 + ancho + 2 * pad, 42 + alto + 2 * pad), radio, fill=140)
    c.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(c).rounded_rectangle((30, 30, 30 + ancho + 2 * pad, 30 + alto + 2 * pad), radio, fill=BLANCO)
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, ancho - 1, alto - 1), radio - 10, fill=255)
    c.paste(im, (30 + pad, 30 + pad), m)
    return c


def caja(L, lineas, cy, bg=(255, 255, 255, 240), ancho=940):
    """renglones [(texto, peso, tamaño, color)] en una caja redondeada centrada en cy"""
    ims = []
    for s, n, sz, col in lineas:
        while b.linea(s, n, sz, col).width > ancho - 70 and sz > 28: sz -= 2
        ims.append(b.linea(s, n, sz, col))
    alto = sum(i.height - 12 for i in ims) + 50
    y0 = int(cy - alto / 2)
    ImageDraw.Draw(L).rounded_rectangle((W / 2 - ancho / 2, y0, W / 2 + ancho / 2, y0 + alto), 40, fill=bg)
    y = y0 + 25
    for i in ims: L.alpha_composite(i, (int(W / 2 - i.width / 2), y)); y += i.height - 12


def pastilla(L, s, cy, n="ExtraBold", sz=60, bg=VSROSA, fg=BLANCO):
    p = b.pastilla(s, n, sz, bg, fg); L.alpha_composite(p, (int(W / 2 - p.width / 2), int(cy - p.height / 2)))


def firma(L):
    ImageDraw.Draw(L).text((W / 2, H - 40), "@alpaccamx", font=b.F("SemiBold", 34), fill=BLANCO, anchor="mm")


def laminas():
    # 1. portada: el letrero de la tienda y la foto real de los mists
    L = fondo("letrero", 90)
    caja(L, [("SOLO HOY 🚨", "ExtraBold", 78, VSROSA), ("Mists Victoria's Secret", "ExtraBold", 66, NEGRO)], 175)
    t = tarjeta("mists", 560); L.alpha_composite(t, (int(W / 2 - t.width / 2), 300))
    pastilla(L, PRECIO, 1110, sz=96)
    pastilla(L, "Originales · 250 ml ✅", 1240, "Bold", 46, BLANCO, NEGRO)
    yield L
    # 2. originales, directo de la tienda
    L = fondo("pared", 70)
    caja(L, [("Originales ✅", "ExtraBold", 70, NEGRO), ("Los compro yo directo en la tienda", "SemiBold", 44, (70, 70, 74))], 175)
    t = tarjeta("bolsa", 520, 680); L.alpha_composite(t, (int(W / 2 - t.width / 2), 300))
    pastilla(L, "Los escojo uno por uno 💗", 1180, sz=54)
    firma(L); yield L
    # 3. aromas: la foto grande y los nombres abajo en dos columnas
    L = fondo("mesa", 120, borroso=6)
    caja(L, [("¿Cuál es tu favorito? 💭", "ExtraBold", 64, NEGRO)], 110)
    t = tarjeta("mists", 500); L.alpha_composite(t, (int(W / 2 - t.width / 2), 190))
    d = ImageDraw.Draw(L); d.rounded_rectangle((50, 870, W - 50, 1210), 36, fill=(255, 255, 255, 240))
    for i, a in enumerate(AROMAS):
        f = b.F("Bold", 34)
        while f.getlength(a) > 440: f = b.F("Bold", f.size - 2)
        d.text((90 + (i // 5) * 480, 910 + (i % 5) * 64), a, font=f, fill=NEGRO, anchor="lm")
    pastilla(L, "Fragrance Mist 250 ml · " + PRECIO, 1265, sz=44)
    yield L
    # 4. precio y mayoreo
    L = fondo("caja", 120)
    caja(L, [("HOY", "ExtraBold", 80, VSROSA), ("Mists Victoria's Secret", "ExtraBold", 60, NEGRO)], 230)
    pastilla(L, PRECIO, 560, sz=150)
    pastilla(L, "🛍️ Mayoreo desde 1 pieza", 790, "Bold", 54, BLANCO, NEGRO)
    pastilla(L, "💸 Tú le pones tu precio si revendes", 910, "Bold", 46, BLANCO, NEGRO)
    pastilla(L, "⏰ Solo por hoy: apártalos ya", 1080, "ExtraBold", 54)
    firma(L); yield L
    # 5. grupo de WhatsApp con el QR
    yield whatsapp.lamina(W, H, (255, 236, 242), ["Únete a mi grupo", "de WhatsApp"], ["Ahí aviso de las ofertas como esta", "y todo lo nuevo que llega"],
                          NEGRO, (70, 70, 74), lambda: b.F("Bold", 76), lambda: b.F("SemiBold", 40))


if __name__ == "__main__":
    out = os.path.join(AQUI, "mists-vs"); os.makedirs(out, exist_ok=True)
    for i, L in enumerate(laminas(), 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"mists-vs/{i:02d}.jpg")
