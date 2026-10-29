"""Carrusel "Cosas que valen cada centavo" (estilo @yourdailyglow_), 1080x1440 (3:4) para TikTok e Instagram.
Portada: foto real de Mae con título blanco de contorno negro. Láminas: fondo blanco, frase arriba, foto del producto
en medio y frase abajo, como si Mae lo platicara, más el precio de la preventa. Cierre: "¿cuáles me faltaron?" y el QR.
Uso: python3 centavo.py NOMBRE -> NOMBRE/01.jpg, ... (guion en guion_NOMBRE.py)"""
import importlib, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
_argv, sys.argv = sys.argv, [sys.argv[0], "/dev/null"]
import build as b
sys.argv = _argv
from PIL import Image, ImageDraw
from carrusel import foto, pega
import whatsapp

W, H = 1080, 1440
FONDO, NEGRO, GRIS, ROSA = (251, 251, 251), (17, 17, 17), (130, 130, 136), (232, 112, 145)


def renglones(s, n, sz, ancho):
    out, cur = [], ""
    for p in s.split():
        t = (cur + " " + p).strip()
        if b.linea(t, n, sz, NEGRO).width <= ancho or not cur: cur = t
        else: out.append(cur); cur = p
    return out + [cur]


def bloque(L, texto, cx, y, sz=42, ancho=640, n="Medium", color=NEGRO, stroke=0, sfill=NEGRO, inter=1.2):
    """varios renglones centrados en cx; cada \\n empieza renglón nuevo. Regresa dónde terminó."""
    for parte in texto.split("\n"):
        for r in renglones(parte, n, sz, ancho):
            im = b.linea(r, n, sz, color, stroke, sfill)
            L.alpha_composite(im, (int(cx - im.width / 2), int(y))); y += sz * inter
    return y


def fondo_foto(ruta):
    im = Image.open(ruta).convert("RGB")
    k = max(W / im.width, H / im.height); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    y0 = int((im.height - H) * 0.35)
    L = im.crop(((im.width - W) // 2, y0, (im.width - W) // 2 + W, y0 + H)).convert("RGBA")
    L.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, 40)))
    return L


def pastilla_gris(L, s, y, sz=40):
    t = b.linea(s, "Medium", sz, b.WHITE)
    p = Image.new("RGBA", (t.width + 40, t.height + 8))
    ImageDraw.Draw(p).rounded_rectangle((0, 0, p.width - 1, p.height - 1), 14, fill=(70, 70, 74, 200))
    p.alpha_composite(t, (20, 4)); L.alpha_composite(p, (int(W / 2 - p.width / 2), int(y)))
    return y + p.height


def portada(c):
    L = fondo_foto(c["foto"])
    if c.get("nota"):
        n = b.pastilla(c["nota"], "SemiBold", 30, (255, 255, 255, 225), NEGRO, padx=22, pady=8)
        L.alpha_composite(n, (int(W / 2 - n.width / 2), 120))
    y = bloque(L, c["titulo"], W / 2, 560, 96, 980, "Bold", b.WHITE, 9, NEGRO, 1.05)
    y = bloque(L, c["sub"], W * 0.6, y + 6, 54, 700, "SemiBold", b.WHITE, 6, NEGRO)
    pastilla_gris(L, c["pastilla"], y + 24)
    return L


def lamina(p, i):
    L = Image.new("RGBA", (W, H), FONDO + (255,))
    izq = i % 2 == 0  # los bloques de texto se van alternando de lado, como en el ejemplo
    cxa = W * (0.38 if izq else 0.55)
    nombre, frase = p["arriba"].split("\n", 1)  # el nombre del producto va en negritas
    y = bloque(L, nombre, cxa, 130, 46, 700, "Bold")
    y = bloque(L, frase, cxa, y, 42, 660)
    y0, y1 = max(y + 40, 330), 1090
    cy = (y0 + y1) / 2
    if p.get("swatch"):
        sw = foto(p["swatch"], (y1 - y0) * 0.8, 700)
        pega(L, sw, W / 2 + 110, cy - 20, sombra=False)
    im = foto(p["foto"], (y1 - y0) * p.get("alto", 1.0), p.get("ancho", 620))
    pega(L, im, W / 2 - (80 if p.get("swatch") else 0), cy)
    ImageDraw.Draw(L).text((W - 50, 1080), "@alpaccamx", font=b.F("Medium", 30), fill=(205, 205, 210), anchor="rm")
    cx = W * (0.6 if izq else 0.42)
    y = bloque(L, p["abajo"], cx, 1130, 40, 700)
    d = ImageDraw.Draw(L)
    s = f"{'Desde ' if p.get('desde') else ''}${p['precio']:,} en mi preventa"
    d.text((cx, y + 50), s, font=b.F("SemiBold", 38), fill=ROSA, anchor="mm")
    a = f"Precio Sephora ${p['antes']:,}"; f = b.F("Medium", 28); ya = y + 96
    d.text((cx, ya), a, font=f, fill=GRIS, anchor="mm")
    lw = f.getlength(a); d.line((cx - lw / 2, ya + 1, cx + lw / 2, ya + 1), fill=GRIS, width=3)
    return L


def faltaron(c):
    L = fondo_foto(c["foto"])
    y = bloque(L, c["texto"], W / 2, 560, 76, 900, "Bold", b.WHITE, 8, NEGRO, 1.1)
    pastilla_gris(L, c["pastilla"], y + 30)
    return L


if __name__ == "__main__":
    nombre = sys.argv[1]
    g = importlib.import_module(f"guion_{nombre.replace('-', '_')}")
    out = os.path.join(AQUI, nombre); os.makedirs(out, exist_ok=True)
    wa = whatsapp.lamina(W, H, FONDO, ["Únete a mi grupo", "de WhatsApp"], ["Ahí aviso de las preventas, ofertas", "y todo lo nuevo que llega"],
                         NEGRO, (70, 70, 74), lambda: b.F("Bold", 76), lambda: b.F("SemiBold", 38))
    laminas = [portada(g.PORTADA)] + [lamina(p, i) for i, p in enumerate(g.PRODUCTOS)] + [faltaron(g.FALTARON), wa]
    for i, L in enumerate(laminas, 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"{nombre}/{i:02d}.jpg")
