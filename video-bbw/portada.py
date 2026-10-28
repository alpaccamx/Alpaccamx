"""Portadas (1080x1920) de los 5 videos de Bath & Body Works. Lo importante queda entre y=300 y y=1650
(recorte 3:4 del perfil de Instagram y la interfaz de TikTok).
Uso: python3 portada.py CARPETA_DE_VIDEOS -> portada-restock.jpg, portada-pov.jpg, ..."""
import os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image

W, H = 1080, 1920
ESPEJO = (0.04, 0.04, 0.6)  # el mismo acercamiento al espejo que en build.py


def cuadro(vid, seg, zoom=None):
    vf = (f"crop=iw*{zoom[2]}:ih*{zoom[2]}:iw*{zoom[0]}:ih*{zoom[1]}," if zoom else "") + \
         f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    x = subprocess.check_output(["ffmpeg", "-v", "error", "-ss", str(seg), "-i", os.path.join(CRUDO, f"IMG_{vid}.MOV"),
                                 "-frames:v", "1", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    return Image.frombytes("RGB", (W, H), x).convert("RGBA")


def oscurece(L, desde=1150, fuerza=150):
    """degradado oscuro abajo para que se lean las pastillas"""
    g = Image.new("L", (1, H))
    for y in range(H): g.putpixel((0, y), int(fuerza * max(0, (y - desde) / (H - desde)) ** 1.3))
    som = Image.new("RGBA", (W, H), (60, 20, 40, 255)); som.putalpha(g.resize((W, H))); L.alpha_composite(som)


def titulo(L, s, y, color, sz=104):
    while b.F("ExtraBold", sz).getlength(s) > 960: sz -= 4
    b.pon(L, b.linea(s, "ExtraBold", sz, color, stroke=12, sfill=b.WHITE), W / 2, y)


def foto_perfume(nombre, alto=230):
    im = Image.open(os.path.join(AQUI, "perfumes", nombre + ".jpg")).convert("RGB")
    im.thumbnail((alto, alto), Image.LANCZOS)
    card = Image.new("RGBA", (alto + 40, alto + 40), (255, 255, 255, 255))
    card.paste(im, ((card.width - im.width) // 2, (card.height - im.height) // 2))
    m = Image.new("L", card.size, 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).rounded_rectangle((0, 0, card.width - 1, card.height - 1), 28, fill=255)
    card.putalpha(m)
    return card


def guarda(L, nombre):
    L.convert("RGB").save(os.path.join(AQUI, nombre), quality=92); print("ok", nombre)


# 1. Restock: Mae haciendo amor y paz en el espejo
L = cuadro("4705", 123.6, ESPEJO); oscurece(L)
titulo(L, "¡RESTOCK! 🚨", 470, b.PINK, 130)
titulo(L, "Mists Bath & Body Works", 610, b.INK, 78)
b.pon(L, b.pastilla("$150 c/u", "ExtraBold", 110, b.PINK, b.WHITE, padx=50, pady=24), W / 2, 1500)
b.pon(L, b.pastilla("Mayoreo desde 1 pieza", "Bold", 54, b.WHITE, b.INK), W / 2, 1640)
guarda(L, "portada-restock.jpg")

# 2. POV: la entrada de la tienda
L = cuadro("4704", 0.6); oscurece(L)
titulo(L, "POV:", 470, b.PINK, 130)
titulo(L, "fui a Bath & Body Works", 610, b.INK, 80)
titulo(L, "por tus mists 💗", 720, b.INK, 80)
b.pon(L, b.pastilla("$150 c/u · alpacca.mx", "ExtraBold", 66, b.PINK, b.WHITE), W / 2, 1500)
guarda(L, "portada-pov.jpg")

# 3. Reventa: Mae sosteniendo un mist
L = cuadro("4705", 30.0); oscurece(L)
titulo(L, "¿Vendes perfumes? 👀", 470, b.INK, 100)
titulo(L, "Mists originales a $150", 600, b.PINK, 84)
b.pon(L, b.pastilla("Tú le pones tu precio 💸", "Bold", 58, b.WHITE, b.INK), W / 2, 1390)
b.pon(L, b.pastilla("Comenta “Me quiero unir” 👇", "ExtraBold", 58, b.PINK, b.WHITE), W / 2, 1530)
guarda(L, "portada-reventa.jpg")

# 4. Aromas: el anaquel lleno de mists
L = cuadro("4705", 21.6); oscurece(L)
titulo(L, "¿Cuál es tu aroma", 470, b.INK, 100)
titulo(L, "favorito? 💗", 600, b.PINK, 110)
b.pon(L, b.pastilla("Déjamelo en comentarios 👇", "ExtraBold", 58, b.PINK, b.WHITE), W / 2, 1500)
guarda(L, "portada-aromas.jpg")

# 5. Dupes: Pink Obsessed + fotitos de los perfumes de lujo
L = cuadro("4705", 87.6); oscurece(L, 900, 170)
titulo(L, "Dupes de perfumes", 430, b.INK, 100)
titulo(L, "de lujo 💎", 560, b.PINK, 110)
for i, n in enumerate(["born-in-roma", "black-opium", "very-good-girl"]):
    c = foto_perfume(n)
    L.alpha_composite(c, (int(W / 2 + (i - 1) * 300 - c.width / 2), 1130))
b.pon(L, b.pastilla("en Bath & Body Works · $150 c/u", "ExtraBold", 54, b.PINK, b.WHITE), W / 2, 1500)
guarda(L, "portada-dupes.jpg")
