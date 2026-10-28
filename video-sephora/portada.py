"""Portadas (1080x1920) de los videos del Sephora Sale. Lo importante queda entre y=300 y y=1650
(recorte 3:4 del perfil de Instagram y la interfaz de TikTok).
Uso: python3 portada.py CARPETA_DE_VIDEOS -> portada-anuncio.jpg, portada-emprende.jpg, portada-empaque.jpg, portada-top.jpg"""
import os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image

W, H = 1080, 1920


def cuadro(vid, seg):
    x = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(seg), "-i", os.path.join(CRUDO, f"IMG_{vid}.mp4"), "-frames:v", "1",
                                 "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    return Image.frombytes("RGB", (W, H), x).convert("RGBA")


def oscurece(L, desde=1150, fuerza=150):
    g = Image.new("L", (1, H))
    for y in range(H): g.putpixel((0, y), int(fuerza * max(0, (y - desde) / (H - desde)) ** 1.3))
    som = Image.new("RGBA", (W, H), (60, 20, 40, 255)); som.putalpha(g.resize((W, H))); L.alpha_composite(som)


def titulo(L, s, y, color, sz=104):
    while b.F("ExtraBold", sz).getlength(s) > 960: sz -= 4
    b.pon(L, b.linea(s, "ExtraBold", sz, color, stroke=12, sfill=b.WHITE), W / 2, y)


def sale(L, y):
    b.pon(L, b.pastilla("SEPHORA SALE", "ExtraBold", 110, b.INK, b.WHITE, padx=52, pady=26), W / 2, y)


def guarda(L, nombre):
    L.convert("RGB").save(os.path.join(AQUI, nombre), quality=92); print("ok", nombre)


L = cuadro("2452", 22); oscurece(L)
sale(L, 450); titulo(L, "Preventa abierta 🛍️", 610, b.INK, 90)
b.pon(L, b.pastilla("20% OFF", "ExtraBold", 120, b.PINK, b.WHITE, padx=56, pady=26), W / 2, 1380)
b.pon(L, b.pastilla("Hasta el 8 de noviembre", "Bold", 54, b.WHITE, b.INK), W / 2, 1540)
guarda(L, "portada-anuncio.jpg")

L = cuadro("1830", 36); oscurece(L)
titulo(L, "¿Vendes maquillaje? 👀", 450, b.INK, 96)
titulo(L, "Surte en el Sephora Sale", 580, b.PINK, 80)
b.pon(L, b.pastilla("20% OFF · 100% original", "ExtraBold", 62, b.PINK, b.WHITE), W / 2, 1400)
b.pon(L, b.pastilla("Comenta “Me quiero unir” 👇", "Bold", 54, b.WHITE, b.INK), W / 2, 1540)
guarda(L, "portada-emprende.jpg")

L = cuadro("1828", 150); oscurece(L)
titulo(L, "POV:", 450, b.PINK, 130)
titulo(L, "empacando sus pedidos", 590, b.INK, 84)
titulo(L, "de Sephora 📦", 700, b.INK, 84)
b.pon(L, b.pastilla("Sephora Sale · 20% OFF", "ExtraBold", 62, b.PINK, b.WHITE), W / 2, 1500)
guarda(L, "portada-empaque.jpg")

L = cuadro("1830", 12.3); oscurece(L)
titulo(L, "Lo más pedido", 450, b.INK, 110)
titulo(L, "de Sephora 💗", 580, b.PINK, 110)
b.pon(L, b.pastilla("Con descuento · preventa", "ExtraBold", 62, b.PINK, b.WHITE), W / 2, 1500)
guarda(L, "portada-top.jpg")
