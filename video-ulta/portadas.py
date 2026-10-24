"""Portadas (1080x1920) de los videos "Ulta vs Alpacca" parte 1 y 2.
Lo importante va entre y=300 y y=1650 para que se vea en el recorte 3:4 del
perfil de Instagram y no lo tape la interfaz de TikTok.
Uso: python3 portadas.py  (lee fondo-portada.jpg y alpaca.png de cada carpeta)"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
FONTS = os.path.join(RAIZ, "video-sephora", "fonts")
W, H = 1080, 1920
INK = (17, 17, 17); PINK = (238, 108, 146); DEEP = (196, 70, 110); ULTA = (243, 113, 33); GREEN = (22, 150, 80)


def F(n, s): return ImageFont.truetype(f"{FONTS}/Poppins-{n}.ttf", s)


RAIZ_EMOJI = os.path.join(AQUI, "emoji")

def emoji(ch, size):
    """emoji con el diseño de iPhone (PNG en video-ulta/emoji); si falta, el de Noto"""
    png = os.path.join(RAIZ_EMOJI, "%x.png" % ord(ch))
    if os.path.exists(png):
        im = Image.open(png).convert("RGBA")
    else:
        f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
        im = Image.new("RGBA", (220, 220)); ImageDraw.Draw(im).text((110, 110), ch, font=f, embedded_color=True, anchor="mm")
    im = im.crop(im.getbbox())  # se escala por la altura, sin deformar
    return im.resize((max(1, round(im.width * size / im.height)), size), Image.LANCZOS)


def texto(L, xy, s, font, fill=(255, 255, 255), stroke=6, anchor="mm"):
    ImageDraw.Draw(L).text(xy, s, font=font, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0))


def precio(L, cx, cy, etiqueta, monto, fondo, tachado=False):
    """pastilla con etiqueta chica arriba y precio grande"""
    d = ImageDraw.Draw(L); fe, fm = F("Bold", 34), F("ExtraBold", 84)
    w = max(fe.getlength(etiqueta), fm.getlength(monto)) + 80
    d.rounded_rectangle((cx - w / 2, cy - 85, cx + w / 2, cy + 85), 40, fill=fondo)
    d.text((cx, cy - 42), etiqueta, font=fe, fill=(255, 255, 255), anchor="mm")
    d.text((cx, cy + 22), monto, font=fm, fill=(255, 255, 255), anchor="mm")
    if tachado:
        mw = fm.getlength(monto)
        d.line((cx - mw / 2 - 8, cy + 30, cx + mw / 2 + 8, cy + 10), fill=(255, 255, 255), width=8)


def base(carpeta, oscuro=0.0):
    bg = Image.open(os.path.join(RAIZ, carpeta, "fondo-portada.jpg")).convert("RGBA").resize((W, H))
    if oscuro: bg.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, int(255 * oscuro))))
    # degradado abajo para que se lean los precios
    g = Image.new("L", (1, H)); [g.putpixel((0, y), int(200 * max(0, (y - 850) / (H - 850)) ** 1.2)) for y in range(H)]
    sombra = Image.new("RGBA", (W, H), (0, 0, 0, 255)); sombra.putalpha(g.resize((W, H)))
    bg.alpha_composite(sombra)
    return bg


def alpaca(L, carpeta, cx, cy, alto):
    a = Image.open(os.path.join(RAIZ, carpeta, "alpaca.png")).convert("RGBA")
    a = a.resize((int(a.width * alto / a.height), alto), Image.LANCZOS)
    L.alpha_composite(a, (int(cx - a.width / 2), int(cy - a.height / 2)))


def parte1():
    L = base("video-ulta", 0.15)
    texto(L, (W / 2, 1010), "Fui a ULTA", F("ExtraBold", 132), stroke=8)
    texto(L, (W / 2 - 40, 1150), "a comparar precios", F("ExtraBold", 74), fill=(255, 225, 235))
    L.alpha_composite(emoji("👀", 86), (int(W / 2 + F("ExtraBold", 74).getlength("a comparar precios") / 2 - 20), 1105))
    texto(L, (230, 1262), "Dr. Althea 345", F("Bold", 40), stroke=4)
    precio(L, 230, 1380, "En Ulta", "$508", ULTA, tachado=True)
    precio(L, 230, 1580, "Conmigo", "$324", PINK)
    alpaca(L, "video-ulta", 790, 1470, 420)
    return L


def parte2():
    L = base("video-ulta-2", 0.1)
    d = ImageDraw.Draw(L); f = F("ExtraBold", 58); w = f.getlength("PARTE 2")
    d.rounded_rectangle((W / 2 - w / 2 - 40, 300, W / 2 + w / 2 + 40, 400), 50, fill=PINK)
    d.text((W / 2, 352), "PARTE 2", font=f, fill=(255, 255, 255), anchor="mm")
    texto(L, (W / 2, 520), "Hasta $330", F("ExtraBold", 140), stroke=9)
    texto(L, (W / 2 - 50, 670), "menos", F("ExtraBold", 110), stroke=8, fill=(255, 225, 235))
    L.alpha_composite(emoji("😳", 110), (int(W / 2 + F("ExtraBold", 110).getlength("menos") / 2 - 20), 612))
    texto(L, (230, 1262), "SKIN1004 Probio-Cica", F("Bold", 38), stroke=4)
    precio(L, 230, 1380, "En Ulta", "$639", ULTA, tachado=True)
    precio(L, 230, 1580, "Conmigo", "$309", PINK)
    alpaca(L, "video-ulta-2", 790, 1470, 430)
    return L


if __name__ == "__main__":
    for carpeta, fn in (("video-ulta", parte1), ("video-ulta-2", parte2)):
        out = os.path.join(RAIZ, carpeta, "portada.jpg")
        fn().convert("RGB").save(out, quality=92); print("ok", out)
