"""Estilos de portada para los carruseles de tarjetas (carrusel.py), para que no todas se vean iguales.
PORTADA["estilo"]: "foto" (foto de tienda con caja blanca), "rayas" (rayas de Sephora), "collage" (mosaico de
productos en tarjetas), "heroe" (un producto grande en un círculo). Sin "estilo" se usa la rosa con estrellitas."""
import os
from PIL import Image, ImageDraw, ImageFilter
from carrusel import W, H, BLANCO, F, CORM, foto, pega, AQUI

BAGEL = "BagelFatOne-Regular.ttf"
TINTA = (232, 112, 145)
OSCURO = (40, 34, 38)


def _ajusta(s, n, sz, ancho):
    f = F(n, sz)
    while f.getlength(s) > ancho and f.size > 30: f = F(n, f.size - 4)
    return f


def _titulo(d, c, x, y, ancho, color_grande, color_chico, anchor="mm", sz=200):
    """arriba (chico, elegante) / GRANDE (gordita) / abajo (chico); regresa dónde terminó"""
    if c.get("arriba"):
        f = _ajusta(c["arriba"], CORM, 62, ancho); d.text((x, y), c["arriba"], font=f, fill=color_chico, anchor=anchor); y += f.size * 1.05
    for r in c["grande"]:
        f = _ajusta(r, BAGEL, sz, ancho); y += f.size * 0.42
        d.text((x, y), r, font=f, fill=color_grande, anchor=anchor); y += f.size * 0.5
    y += 14
    for r in c.get("abajo", []):
        f = _ajusta(r, CORM, 52, ancho); d.text((x, y + f.size * 0.5), r, font=f, fill=color_chico, anchor=anchor); y += f.size * 1.05
    return y


def _firma(d, color=(255, 255, 255), y=H - 50):
    d.text((W / 2, y), "@alpaccamx", font=F(CORM, 50), fill=color, anchor="mm")


def _fondo_foto(nombre):
    im = Image.open(os.path.join(AQUI, "fotos-sephora", nombre)).convert("RGB")
    k = max(W / im.width, H / im.height); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    x0, y0 = (im.width - W) // 2, (im.height - H) // 3
    return im.crop((x0, y0, x0 + W, y0 + H)).convert("RGBA")


def foto_tienda(c):
    """foto de una tienda Sephora, productos parados sobre una caja blanca con el título"""
    L = _fondo_foto(c["fondo"])
    L.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, 50)))
    caja = (60, 700, W - 60, 1240)
    d = ImageDraw.Draw(L); d.rounded_rectangle(caja, 56, fill=(255, 255, 255, 245))
    prods = c["productos"]; n = len(prods); paso = (W - 200) / n
    for i, (nom, alto) in enumerate(prods):  # parados encima de la caja
        im = foto(nom, alto, paso * 1.15)
        pega(L, im, 100 + paso * (i + 0.5), caja[1] + 40 - im.height / 2)
    d = ImageDraw.Draw(L)
    _titulo(d, c, W / 2, caja[1] + 90, 880, TINTA, (90, 80, 86), sz=150)
    _firma(d, BLANCO, H - 55)
    return L


def rayas(c):
    """rayas negras y blancas de Sephora; título en una tarjeta y los productos en una repisa"""
    L = Image.new("RGBA", (W, H), (255, 255, 255, 255)); d = ImageDraw.Draw(L)
    for y in range(0, H, 140): d.rectangle((0, y, W, y + 70), fill=(18, 18, 18, 255))
    d.rounded_rectangle((70, 110, W - 70, 700), 60, fill=(255, 255, 255, 255), outline=(18, 18, 18), width=6)
    _titulo(d, c, W / 2, 190, 860, TINTA, OSCURO, sz=170)
    d.rounded_rectangle((70, 760, W - 70, 1220), 60, fill=(255, 236, 240, 255), outline=(18, 18, 18), width=6)
    prods = c["productos"]; n = len(prods); paso = (W - 220) / n
    for i, (nom, alto) in enumerate(prods):
        im = foto(nom, alto, paso * 1.05)
        pega(L, im, 110 + paso * (i + 0.5), 1180 - im.height / 2)
    d = ImageDraw.Draw(L)
    d.rounded_rectangle((W / 2 - 170, H - 95, W / 2 + 170, H - 30), 32, fill=(255, 255, 255))
    d.text((W / 2, H - 62), "@alpaccamx", font=F(CORM, 46), fill=OSCURO, anchor="mm")
    return L


def collage(c):
    """color de fondo, título arriba y los productos en 4 tarjetas blancas"""
    L = Image.new("RGBA", (W, H), tuple(c["color"]) + (255,)); d = ImageDraw.Draw(L)
    y = _titulo(d, c, W / 2, 70, 960, BLANCO, BLANCO, sz=160)
    y0 = max(y + 20, 470); lado = (H - 120 - y0 - 30) / 2; anchoc = (W - 150) / 2
    for i, nom in enumerate(c["productos"][:4]):
        x = 60 + (i % 2) * (anchoc + 30); yy = y0 + (i // 2) * (lado + 30)
        d.rounded_rectangle((x, yy, x + anchoc, yy + lado), 44, fill=(255, 255, 255, 255))
        im = foto(nom, lado * 0.78, anchoc * 0.8)
        pega(L, im, x + anchoc / 2, yy + lado / 2, sombra=False)
    d = ImageDraw.Draw(L); _firma(d, BLANCO, H - 60)
    return L


def heroe(c):
    """un producto grande dentro de un círculo y el título a la izquierda"""
    fondo = tuple(c["color"]); L = Image.new("RGBA", (W, H), fondo + (255,)); d = ImageDraw.Draw(L)
    cx, cy, r = 790, 820, 390
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(c["circulo"]) + (255,))
    im = foto(c["producto"], 700, 540)
    pega(L, im, cx, cy + 20)
    d = ImageDraw.Draw(L)
    color = tuple(c.get("texto", (255, 255, 255)))
    y = 90
    if c.get("arriba"):
        f = _ajusta(c["arriba"], CORM, 60, 900); d.text((60, y), c["arriba"], font=f, fill=color, anchor="la"); y += f.size * 1.2
    for rr in c["grande"]:
        f = _ajusta(rr, BAGEL, 140, 900); d.text((60, y), rr, font=f, fill=color, anchor="la"); y += f.size * 0.95
    s = c.get("pastilla", "20% OFF en mi preventa"); f = F(CORM, 46); tw = f.getlength(s)
    d.rounded_rectangle((60, 1160, 60 + tw + 60, 1240), 40, fill=BLANCO)
    d.text((90, 1200), s, font=f, fill=fondo if sum(fondo) < 500 else OSCURO, anchor="lm")
    d.text((W - 50, H - 50), "@alpaccamx", font=F(CORM, 44), fill=color, anchor="rm")
    return L


ESTILOS = {"foto": foto_tienda, "rayas": rayas, "collage": collage, "heroe": heroe}
