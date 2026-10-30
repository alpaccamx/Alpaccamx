"""Portadas (1080x1920) de los 3 videos de Victoria's Secret. Todo lo importante queda entre y=260 y y=1660
(el recorte 3:4 con que TikTok e Instagram muestran la portada en el perfil).
Uso: python3 portada.py CARPETA_DE_VIDEOS -> portada-oferta.jpg, portada-pedido.jpg, portada-razones.jpg"""
import os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image

W, H = 1080, 1920
VSROSA, NEGRO = (236, 92, 140), (20, 20, 22)
SDR = ("scale=1080:-2,zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,"
       "tonemap=reinhard:param=0.6:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24,eq=saturation=0.75")  # 0.75: sin bajarle, se veía muy saturado


def cuadro(vid, seg):
    x = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(seg), "-i", os.path.join(CRUDO, f"IMG_{vid}.MOV"), "-frames:v", "1",
                                 "-vf", f"{SDR},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}",
                                 "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    return Image.frombytes("RGB", (W, H), x).convert("RGBA")


def oscurece(L, desde=1150, fuerza=150):
    """degradado oscuro abajo para que se lean las pastillas"""
    g = Image.new("L", (1, H))
    for y in range(H): g.putpixel((0, y), int(fuerza * max(0, (y - desde) / (H - desde)) ** 1.3))
    som = Image.new("RGBA", (W, H), (40, 10, 25, 255)); som.putalpha(g.resize((W, H))); L.alpha_composite(som)


def titulo(L, s, y, color, sz=104):
    while b.F("ExtraBold", sz).getlength(s) > 960: sz -= 4
    b.pon(L, b.linea(s, "ExtraBold", sz, color, stroke=12, sfill=b.WHITE), W / 2, y)


def guarda(L, nombre):
    L.convert("RGB").save(os.path.join(AQUI, nombre), quality=92); print("ok", nombre)


# 1. Oferta: la pared de mists
L = cuadro("1198", 1.0); oscurece(L)
titulo(L, "¡SOLO HOY! 🚨", 400, VSROSA, 130)
titulo(L, "Mists Victoria's Secret", 540, NEGRO, 82)
b.pon(L, b.pastilla("$155 c/u", "ExtraBold", 120, VSROSA, b.WHITE, padx=54, pady=26), W / 2, 1430)
b.pon(L, b.pastilla("Originales ✅", "Bold", 54, b.WHITE, NEGRO), W / 2, 1580)
guarda(L, "portada-oferta.jpg")

# 2. Pedido (vlog): el letrero de la tienda
L = cuadro("1200", 28.0); oscurece(L)
v = b.pastilla("📍 Acompáñame a recoger", "ExtraBold", 66, (20, 20, 22, 225), b.WHITE, padx=40, pady=22)
b.pon(L, v, W / 2, 400)
v = b.pastilla("un pedido a Victoria's Secret", "ExtraBold", 60, (20, 20, 22, 225), b.WHITE, padx=40, pady=22)
b.pon(L, v, W / 2, 530)
b.pon(L, b.pastilla("Mists HOY a $155 c/u", "ExtraBold", 76, VSROSA, b.WHITE, padx=46, pady=22), W / 2, 1520)
guarda(L, "portada-pedido.jpg")

# 3. Razones: la bolsa llena de mists
L = cuadro("1198", 10.5); oscurece(L)
titulo(L, "3 razones", 420, VSROSA, 140)
titulo(L, "para comprar tus mists", 560, NEGRO, 78)
titulo(L, "Victoria's Secret conmigo", 660, NEGRO, 78)
b.pon(L, b.pastilla("Originales · $155 c/u · Mayoreo", "Bold", 54, b.WHITE, NEGRO), W / 2, 1520)
guarda(L, "portada-razones.jpg")
