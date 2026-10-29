"""Carrusel de calendarios de adviento (estilo @nyc.girls777), 1080x1920 para TikTok modo foto.
Portada: foto real de Mae con título grande. Láminas: foto del calendario en fondo blanco y abajo, en letra
blanca con contorno negro, nombre, precio de la preventa y cuánto te ahorras. Cierre con pregunta.
Uso: python3 calendarios.py NOMBRE -> NOMBRE/01.jpg, ... (guion en guion_NOMBRE.py)"""
import importlib, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
_argv, sys.argv = sys.argv, [sys.argv[0], "/dev/null"]
import build as b
sys.argv = _argv
from PIL import Image, ImageDraw
from carrusel import F as FC, BEBAS
from tipo_piel import parrafo

W, H = 1080, 1920
NEGRO, CREMA = (15, 15, 15), (255, 244, 225)
FOTOS = os.path.join(os.path.dirname(AQUI), "video-sephora", "fotos")


def contorno(L, s, sz, y, ancho=940):
    return parrafo(L, s, "Bold", sz, y, ancho, b.WHITE, stroke=max(5, sz // 11), sfill=NEGRO, inter=1.12)


def imagen(nombre):
    r = os.path.join(AQUI, "recortes", nombre + ".png")
    im = Image.open(r if os.path.exists(r) else os.path.join(FOTOS, nombre + ".jpg")).convert("RGBA")
    if not os.path.exists(r):  # foto en fondo blanco: se recorta el blanco de las orillas
        g = im.convert("L").point(lambda v: 255 if v < 245 else 0); im = im.crop(g.getbbox())
    return im


def portada(c):
    L = Image.open(c["foto"]).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    L.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, 60)))
    d = ImageDraw.Draw(L); y = c.get("titulo_y", 720)
    for r in c["titulo"]:
        f = FC(BEBAS, 150)
        while f.getlength(r) > 980: f = FC(BEBAS, f.size - 6)
        d.text((W / 2 + 4, y + 5), r, font=f, fill=(0, 0, 0, 120), anchor="mm")
        d.text((W / 2, y), r, font=f, fill=CREMA, anchor="mm"); y += f.size * 0.95
    if c.get("nota"):
        n = b.pastilla(c["nota"], "SemiBold", 32, (255, 255, 255, 225), NEGRO, padx=24, pady=8)
        L.alpha_composite(n, (int(W / 2 - n.width / 2), 300))
    return L


def lamina(p):
    L = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    im = imagen(p["foto"]); k = min(960 / im.width, 700 / im.height)
    im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    L.alpha_composite(im, (int(W / 2 - im.width / 2), int(980 - im.height)))
    y = contorno(L, p["nombre"], 72, 1060)
    y = contorno(L, f"${p['precio']:,}", 100, y + 6)
    contorno(L, f"Te ahorras ${p['antes'] - p['precio']:,}", 64, y + 10)
    return L


def cierre(c):
    L = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    y = contorno(L, c["pregunta"], 70, 620, 900)
    y = parrafo(L, c["sub"], "SemiBold", 48, y + 60, 880)
    pi = b.pastilla(c["pastilla"], "Bold", 46, (232, 112, 145), b.WHITE, padx=40, pady=14)
    L.alpha_composite(pi, (int(W / 2 - pi.width / 2), int(y + 40)))
    return L


if __name__ == "__main__":
    import whatsapp
    nombre = sys.argv[1]
    g = importlib.import_module(f"guion_{nombre.replace('-', '_')}")
    out = os.path.join(AQUI, nombre); os.makedirs(out, exist_ok=True)
    laminas = [portada(g.PORTADA)] + [lamina(p) for p in g.CALENDARIOS] + [cierre(g.CIERRE)] + [whatsapp.lamina(W, H, (255, 255, 255), ["Únete a mi grupo", "de WhatsApp"], ["Ahí aviso de las preventas, ofertas", "y todo lo nuevo que llega"],
                                 (22, 22, 24), (70, 70, 74), lambda: b.F("Bold", 84), lambda: b.F("SemiBold", 44))]
    for i, L in enumerate(laminas, 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"{nombre}/{i:02d}.jpg")
