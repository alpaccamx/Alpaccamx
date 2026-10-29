"""Carrusel "te digo cuál elegir según tu piel" (estilo @yourdailyglow_), 1080x1920 para TikTok modo foto.
Portada: foto real de Mae con el gancho encima. Láminas: nombre del producto (serif), "Si..." (gancho de
identificación), foto recortada, por qué y precio de la preventa. Cierre: todos juntos + pregunta.
Uso: python3 tipo_piel.py NOMBRE -> NOMBRE/01.jpg, ... (el guion va en guion_NOMBRE.py)"""
from precios_mx import comparacion
import importlib, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
_argv, sys.argv = sys.argv, [sys.argv[0], "/dev/null"]
import build as b
sys.argv = _argv
from PIL import Image, ImageDraw, ImageFilter
from carrusel import F as FC, CORM, foto, pega

W, H = 1080, 1920
FONDO, NEGRO, GRIS = (244, 243, 245), (22, 22, 24), (70, 70, 74)
ROSA = (232, 112, 145)


def renglones(s, n, sz, ancho):
    out, cur = [], ""
    for p in s.split():
        t = (cur + " " + p).strip()
        if b.linea(t, n, sz, NEGRO).width <= ancho or not cur: cur = t
        else: out.append(cur); cur = p
    return out + [cur]


def parrafo(L, s, n, sz, y, ancho=860, color=NEGRO, stroke=0, sfill=None, inter=1.18):
    """texto centrado en varios renglones; regresa dónde terminó"""
    for r in renglones(s, n, sz, ancho):
        im = b.linea(r, n, sz, color, stroke, sfill or b.WHITE)
        L.alpha_composite(im, (int(W / 2 - im.width / 2), int(y))); y += sz * inter
    return y


def precio(L, p, y):
    s = f"{'Desde ' if p.get('desde') else ''}${p['precio']:,} en mi preventa 💗"
    pi = b.pastilla(s, "Bold", 44, ROSA, b.WHITE, padx=40, pady=14)
    L.alpha_composite(pi, (int(W / 2 - pi.width / 2), int(y)))
    if not comparacion(p): return
    et, pa = comparacion(p); a = f"Precio {et} ${pa:,}"
    f = b.F("Medium", 34); d = ImageDraw.Draw(L); yy = y + pi.height + 34
    d.text((W / 2, yy), a, font=f, fill=GRIS, anchor="mm")
    lw = f.getlength(a); d.line((W / 2 - lw / 2, yy + 2, W / 2 + lw / 2, yy + 2), fill=GRIS, width=3)


def firma(L, color=(150, 150, 156)):
    ImageDraw.Draw(L).text((W - 60, 1250), "@alpaccamx", font=b.F("Medium", 34), fill=color, anchor="rm")


def portada(c):
    im = Image.open(c["foto"]).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    som = Image.new("RGBA", (W, H), (0, 0, 0, 70)); im.alpha_composite(som)  # que el texto se lea
    y = parrafo(im, c["gancho"], "Bold", 92, 760, 940, b.WHITE, stroke=7, sfill=NEGRO, inter=1.12)
    sub = b.pastilla(c["sub"], "SemiBold", 46, NEGRO, b.WHITE, padx=26, pady=10)
    sub = sub.copy(); m = Image.new("L", sub.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, sub.width - 1, sub.height - 1), 14, fill=255); sub.putalpha(m)
    im.alpha_composite(sub, (int(W / 2 - sub.width / 2), int(y + 30)))
    if c.get("nota"):  # aclaración chiquita (que la foto es de pedidos de otro año)
        n = b.pastilla(c["nota"], "SemiBold", 32, (255, 255, 255, 225), NEGRO, padx=24, pady=8)
        im.alpha_composite(n, (int(W / 2 - n.width / 2), 300))
    return im


def lamina(p):
    L = Image.new("RGBA", (W, H), FONDO + (255,))
    d = ImageDraw.Draw(L)
    nombre = p["nombre"]; f = FC(CORM, 60)
    while f.getlength(nombre) > 940: f = FC(CORM, f.size - 2)
    d.text((W / 2, 330), nombre, font=f, fill=(40, 40, 44), anchor="mm")
    y = parrafo(L, p["si"], "SemiBold", 54, 430, 840)
    caja_y0, caja_y1 = max(y + 40, 640), 1270
    cy = (caja_y0 + caja_y1) / 2
    if p.get("swatch"):
        sw = foto(p["swatch"], (caja_y1 - caja_y0) * 0.75, 560)
        pega(L, sw, W / 2 + 120, cy - 30, sombra=False)
    im = foto(p["foto"], (caja_y1 - caja_y0) * p.get("alto", 0.92), p.get("ancho", 520))
    pega(L, im, W / 2 - (90 if p.get("swatch") else 0), cy)
    y = parrafo(L, p["por_que"], "SemiBold", 46, 1330, 860, inter=1.2)
    precio(L, p, y + 34)
    firma(L)
    return L


def cierre(c, productos):
    L = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    pos = [(200, 420), (540, 420), (880, 420), (200, 1460), (540, 1460), (880, 1460)]  # en medio va la pregunta
    for (x, y), p in zip(pos, productos):
        pega(L, foto(p["foto"], 360, 290), x, y)
    y = parrafo(L, c["pregunta"], "SemiBold", 60, 760, 900, inter=1.2)
    y = parrafo(L, c["sub"], "SemiBold", 48, y + 40, 900, NEGRO, stroke=0)
    pi = b.pastilla(c["pastilla"], "Bold", 44, ROSA, b.WHITE, padx=40, pady=14)
    L.alpha_composite(pi, (int(W / 2 - pi.width / 2), int(y + 30)))
    return L


if __name__ == "__main__":
    import whatsapp
    nombre = sys.argv[1]
    g = importlib.import_module(f"guion_{nombre.replace('-', '_')}")
    import precios_mx; precios_mx.ajusta_guion(g)
    out = os.path.join(AQUI, nombre); os.makedirs(out, exist_ok=True)
    laminas = [portada(g.PORTADA)] + [lamina(p) for p in g.PRODUCTOS] + [cierre(g.CIERRE, g.PRODUCTOS)] + [whatsapp.lamina(W, H, FONDO, ["Únete a mi grupo", "de WhatsApp"], ["Ahí aviso de las preventas, ofertas", "y todo lo nuevo que llega"],
                                 (22, 22, 24), (70, 70, 74), lambda: b.F("Bold", 84), lambda: b.F("SemiBold", 44))]
    for i, L in enumerate(laminas, 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"{nombre}/{i:02d}.jpg")
