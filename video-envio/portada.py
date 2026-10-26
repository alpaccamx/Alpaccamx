"""Portadas (1080x1920) de "La historia de tu pedido": completa y corta.
Lo importante queda entre y=300 y y=1650 (recorte 3:4 del perfil de Instagram y la interfaz de TikTok).
Uso: python3 portada.py -> portada-historia.jpg y portada-historia-corto.jpg"""
import os, subprocess, sys
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageFilter

AQUI, W, H = b.AQUI, b.W, b.H

def cuadro(seg):  # un cuadro del clip de Seúl (la alpaca con la torre Namsan atrás)
    x = subprocess.check_output(["ffmpeg", "-v", "error", "-ss", str(seg), "-i", os.path.join(AQUI, "clips", "1-seul.mp4"),
                                 "-frames:v", "1", "-vf", f"scale={W}:{H}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    return Image.frombytes("RGB", (W, H), x).convert("RGBA")

def portada(l1, l2, pie, nombre):
    L = cuadro(2.6)
    # degradado oscuro abajo para que se lea el pie
    g = Image.new("L", (1, H)); [g.putpixel((0, y), int(150 * max(0, (y - 1250) / (H - 1250)) ** 1.3)) for y in range(H)]
    som = Image.new("RGBA", (W, H), (60, 20, 40, 255)); som.putalpha(g.resize((W, H))); L.alpha_composite(som)
    b.pon(L, b.linea(l1, "ExtraBold", 104, b.INK, stroke=12, sfill=b.WHITE), W / 2, 560)
    b.pon(L, b.linea(l2, "ExtraBold", 104, b.PINK, stroke=12, sfill=b.WHITE), W / 2, 690)
    b.pon(L, b.pastilla(pie, "Bold", 50, b.WHITE, b.DEEP), W / 2, 1560)
    L.convert("RGB").save(os.path.join(AQUI, nombre), quality=92); print("ok", nombre)

portada("La historia", "de tu pedido 📦", "De Seúl 🇰🇷 hasta tu casa 🏠", "portada-historia.jpg")
portada("Tu pedido viaja", "+10,000 km 📦", "De Seúl 🇰🇷 hasta tu casa 🏠", "portada-historia-corto.jpg")
