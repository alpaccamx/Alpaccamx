"""Video "Ulta vs Alpacca": clips de la tienda Ulta + capturas de ulta.com y de
alpacca.mx con el precio marcado. 1080x1920, 30 fps, sin audio (los clips
traen la música de la tienda; el sonido se pone en TikTok/Instagram).

Uso: python3 build.py CARPETA_DE_CLIPS [salida.mp4]
La carpeta de clips tiene los IMG_05xx.MOV originales del iPhone."""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
CLIPS = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, "Ulta-vs-Alpacca.mp4")
FONTS = os.path.join(os.path.dirname(AQUI), "video-sephora", "fonts")
W, H, FPS = 1080, 1920, 30

INK = (17, 17, 17); GREY = (120, 120, 128); PINK = (238, 108, 146); DEEP = (196, 70, 110)
BLUSH = (253, 236, 242); ULTA = (243, 113, 33); GREEN = (22, 150, 80)

TC = 18.69          # MXN por USD, 24 oct 2026 (open.er-api.com)
FECHA = "24 oct 2026"

# nombre, clip, inicio (s), precio Ulta USD, precio Alpacca MXN, caja del precio en cada captura (px css: y)
PRODUCTOS = [
    ("foam",     "ANUA", "Heartleaf Pore Deep\nCleansing Foam",  "IMG_0547", 31.2,  14.00, 187, 800.6, 719.4),
    ("niacin",   "ANUA", "Niacinamide 10\nTXA 4 Serum",          "IMG_0547", 51.6,  22.00, 281, 800.6, 691.9),
    ("snail92",  "COSRX", "Advanced Snail 92\nAll In One Cream", "IMG_0548", 120.0, 21.90, 251, 751.6, 667.9),
    ("snail96",  "COSRX", "Advanced Snail 96\nMucin Essence",    "IMG_0547", 96.0,  20.90, 224, 751.6, 751.9),
    ("peptide",  "COSRX", "The 6 Peptide\nSkin Booster",         "IMG_0548", 74.5,  21.00, 301, 775.6, 667.9),
    ("eyepatch", "COSRX", "Peptide Collagen\nHydrogel Eye Patch", "IMG_0547", 125.0, 23.00, 288, 751.6, 667.9),
    ("fixer",    "TIRTIR", "Mask Fit\nMake Up Fixer",            "IMG_0549", 1.0,   15.00, 173, 776.6, 751.9),
    ("toner",    "TIRTIR", "Milk Skin Toner",                    "IMG_0548", 161.0, 25.00, 160, 751.6, 751.9),
    ("althea",   "Dr. Althea", "345 Relief Cream",               "IMG_0546", 0.6,   27.00, 324, 751.6, 691.9),
]

_fc = {}
def F(n, s):
    if (n, s) not in _fc: _fc[n, s] = ImageFont.truetype(f"{FONTS}/Poppins-{n}.ttf", s)
    return _fc[n, s]

def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3

def mxn(v): return f"${v:,.0f}"

def text_c(d, cx, y, s, font, fill, lh=1.12, stroke=0, sfill=None):
    for i, line in enumerate(s.split("\n")):
        d.text((cx, y + i * font.size * lh), line, font=font, fill=fill, anchor="ma",
               stroke_width=stroke, stroke_fill=sfill)

def pill(d, cx, cy, s, font, bg, fg, padx=34, pady=16):
    w = font.getlength(s); h = font.size
    d.rounded_rectangle((cx - w / 2 - padx, cy - h / 2 - pady, cx + w / 2 + padx, cy + h / 2 + pady + 6), radius=h, fill=bg)
    d.text((cx, cy + 3), s, font=font, fill=fg, anchor="mm")

def shadow_card(im, r=36):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    card = Image.new("RGBA", (im.width + 80, im.height + 80), (0, 0, 0, 0))
    sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((40, 52, im.width + 40, im.height + 52), r, fill=110)
    card.putalpha(sh.filter(ImageFilter.GaussianBlur(22)))
    body = im.convert("RGBA"); body.putalpha(m); card.alpha_composite(body, (40, 40))
    return card

def paste(base, im, xy, a=1.0):
    if a < 1:
        im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a)))
    base.alpha_composite(im, (int(xy[0]), int(xy[1])))

# ---------- clips ----------
def frames(clip, start, dur, speed=1.0):
    vf = f"setpts=PTS/{speed},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(start), "-t", f"{dur * speed:.3f}",
                          "-i", os.path.join(CLIPS, clip + ".MOV"), "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    n, last = int(round(dur * FPS)), None
    for _ in range(n):
        b = p.stdout.read(W * H * 3)
        if len(b) == W * H * 3: last = Image.frombytes("RGB", (W, H), b).convert("RGBA")
        yield last
    p.stdout.close(); p.wait()

# ---------- capas fijas ----------
def captura(nombre, y_precio, es_ulta):
    im = Image.open(os.path.join(AQUI, "capturas", nombre + ".png")).convert("RGB")
    y0 = max(0, (y_precio - (660 if es_ulta else 620)) * 2); y1 = (y_precio + (34 if es_ulta else 38)) * 2
    im = im.crop((0, int(y0), im.width, int(y1)))
    s = 0.92; im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    # rectángulo del precio dentro de la captura recortada y escalada
    px, py = 16 * 2 * s, (y_precio * 2 - y0) * s
    pw, ph = (66 if es_ulta else 112) * 2 * s, (24 if es_ulta else 32) * 2 * s
    return shadow_card(im), (40 + px, 40 + py, 40 + px + pw, 40 + py + ph)

def fondo_borroso(fr):
    b = fr.convert("RGB").filter(ImageFilter.GaussianBlur(28))
    return Image.blend(b, Image.new("RGB", b.size, (255, 255, 255)), 0.55).convert("RGBA")

def capa_titulo(i, marca, nombre):
    L = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(L)
    grad = Image.new("L", (1, 520)); [grad.putpixel((0, y), int(150 * (1 - y / 520) ** 1.4)) for y in range(520)]
    L.paste(Image.new("RGBA", (W, 520), (0, 0, 0, 255)), (0, 0), grad.resize((W, 520)))
    d = ImageDraw.Draw(L)
    pill(d, W / 2, 120, f"{i} de {len(PRODUCTOS)} · en Ulta", F("SemiBold", 32), (255, 255, 255, 235), INK)
    text_c(d, W / 2, 190, marca.upper(), F("Bold", 40), (255, 255, 255), stroke=2, sfill=(0, 0, 0))
    text_c(d, W / 2, 245, nombre, F("ExtraBold", 66), (255, 255, 255), stroke=3, sfill=(0, 0, 0))
    return L

def capa_precio(es_ulta, usd, alp):
    L = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(L)
    if es_ulta:
        pill(d, W / 2, 120, "ulta.com", F("Bold", 44), ULTA, (255, 255, 255))
        d.rounded_rectangle((90, 1560, W - 90, 1810), 44, fill=(255, 255, 255, 245))
        text_c(d, W / 2, 1585, f"${usd:.2f} USD", F("ExtraBold", 92), INK)
        text_c(d, W / 2, 1700, f"= {mxn(usd * TC)} pesos", F("SemiBold", 56), GREY)
    else:
        ahorro = round((1 - alp / (usd * TC)) * 100)
        pill(d, W / 2, 120, "alpacca.mx", F("Bold", 44), PINK, (255, 255, 255))
        d.rounded_rectangle((90, 1560, W - 90, 1810), 44, fill=(255, 255, 255, 245))
        text_c(d, W / 2, 1585, f"{mxn(alp)} pesos", F("ExtraBold", 92), DEEP)
        txt = f"{ahorro}% menos que en Ulta"
        f = F("Bold", 50); w = f.getlength(txt)
        d.rounded_rectangle((W / 2 - w / 2 - 30, 1702, W / 2 + w / 2 + 30, 1782), 40, fill=GREEN)
        d.text((W / 2, 1744), txt, font=f, fill=(255, 255, 255), anchor="mm")
    return L

def marca_precio(L, box, t, color):
    """rectángulo que se dibuja alrededor del precio"""
    p = ease(t / 0.35)
    if p <= 0: return
    x0, y0, x1, y1 = box; pad = 16
    d = ImageDraw.Draw(L)
    w = 10
    rect = (x0 - pad, y0 - pad, x1 + pad, min(y1 + pad, L.height - 40 - w / 2 - 2))
    # se dibuja en orden: arriba, derecha, abajo, izquierda
    segs = [((rect[0], rect[1]), (rect[2], rect[1])), ((rect[2], rect[1]), (rect[2], rect[3])),
            ((rect[2], rect[3]), (rect[0], rect[3])), ((rect[0], rect[3]), (rect[0], rect[1]))]
    total = p * 4
    for k, (a, b) in enumerate(segs):
        f = max(0.0, min(1.0, total - k))
        if f: d.line((a, (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)), fill=color, width=w)

CORTOS = {"foam": "Anua Heartleaf Foam", "niacin": "Anua Niacinamide Serum", "snail92": "COSRX Snail 92 Cream",
          "snail96": "COSRX Snail 96 Essence", "peptide": "COSRX 6 Peptide Booster", "eyepatch": "COSRX Eye Patch",
          "fixer": "TIRTIR Make Up Fixer", "toner": "TIRTIR Milk Toner", "althea": "Dr. Althea 345 Cream"}

# ---------- escenas ----------
def escena_texto(fr_gen, dur, lineas, sub=None):
    for k, fr in enumerate(fr_gen):
        t = k / FPS
        L = fr.copy()
        L.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, 70)))
        O = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(O)
        a = ease(t / 0.35)
        y = 640 + (1 - a) * 40
        text_c(d, W / 2, y, lineas, F("ExtraBold", 96), (255, 255, 255, int(255 * a)), stroke=4, sfill=(0, 0, 0, int(200 * a)))
        if sub:
            b = ease((t - 0.5) / 0.35)
            if b: pill(d, W / 2, y + 96 * 1.12 * (lineas.count("\n") + 1) + 70, sub, F("Bold", 48), PINK + (int(255 * b),), (255, 255, 255, int(255 * b)))
        L.alpha_composite(O); yield L

def escena_producto(i, prod):
    key, marca, nombre, clip, ini, usd, alp, yu, ya = prod
    tit = capa_titulo(i, marca, nombre)
    cu, bu = captura("ulta-" + key, yu, True); ca, ba = captura("alp-" + key, ya, False)
    pu, pa = capa_precio(True, usd, alp), capa_precio(False, usd, alp)
    A, B = 1.7, 1.45  # clip, cada captura
    last = None
    for k, fr in enumerate(frames(clip, ini, A)):
        L = fr.copy(); a = ease(k / FPS / 0.3); paste(L, tit, (0, (1 - a) * -40), a); last = fr; yield L
    bg = fondo_borroso(last)
    for card, box, capa, color in ((cu, bu, pu, ULTA), (ca, ba, pa, PINK)):
        x = (W - card.width) / 2
        for k in range(int(round(B * FPS))):
            t = k / FPS; L = bg.copy()
            a = ease(t / 0.28)
            c = card.copy(); marca_precio(c, box, t - 0.3, color)
            paste(L, c, (x, 190 + (1 - a) * 120), a)
            paste(L, capa, (0, (1 - a) * 30), a)
            yield L

def escena_final(dur):
    filas = []
    for key, marca, nombre, clip, ini, usd, alp, yu, ya in PRODUCTOS:
        filas.append((CORTOS[key], mxn(usd * TC), mxn(alp), round((1 - alp / (usd * TC)) * 100)))
    for k in range(int(round(dur * FPS))):
        t = k / FPS
        L = Image.new("RGBA", (W, H), (255, 255, 255, 255)); O = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(O)
        a = ease(t / 0.3)
        text_c(d, W / 2, 120, "Mismo producto coreano", F("ExtraBold", 70), INK + (int(255 * a),))
        text_c(d, W / 2, 210, "en pesos, sin cruzar la frontera", F("SemiBold", 44), GREY + (int(255 * a),))
        y0 = 320
        d.text((90, y0), "Producto", font=F("SemiBold", 30), fill=GREY, anchor="lm")
        d.text((700, y0), "Ulta", font=F("Bold", 32), fill=ULTA, anchor="rm")
        d.text((870, y0), "Alpacca", font=F("Bold", 32), fill=PINK, anchor="rm")
        for j, (n, u, al, ah) in enumerate(filas):
            b = ease((t - 0.25 - j * 0.12) / 0.3)
            if not b: continue
            y = y0 + 70 + j * 118; al_ = int(255 * b)
            d.rounded_rectangle((60, y - 48, W - 60, y + 48), 28, fill=(BLUSH if j % 2 == 0 else (248, 248, 250)) + (al_,))
            d.text((90, y), n, font=F("SemiBold", 32), fill=INK + (al_,), anchor="lm")
            d.text((700, y), u, font=F("SemiBold", 36), fill=GREY + (al_,), anchor="rm")
            d.text((870, y), al, font=F("ExtraBold", 38), fill=DEEP + (al_,), anchor="rm")
            d.rounded_rectangle((890, y - 26, 1010, y + 26), 26, fill=GREEN + (al_,))
            d.text((950, y + 2), f"-{ah}%", font=F("Bold", 30), fill=(255, 255, 255, al_), anchor="mm")
        c = ease((t - 1.6) / 0.4)
        if c:
            pill(d, W / 2, 1530, "alpacca.mx", F("ExtraBold", 64), PINK + (int(255 * c),), (255, 255, 255, int(255 * c)), padx=50, pady=22)
            nota = (f"Precios del {FECHA}. Ulta: precio en ulta.com, sin impuestos, a ${TC} por dólar.\n"
                    "Alpacca: precio por transferencia, pieza individual; se pide a Corea\n"
                    "y cuenta para el pedido mínimo de $6,000.")
            text_c(d, W / 2, 1650, nota, F("Medium", 25), GREY + (int(255 * c),), lh=1.4)
        L.alpha_composite(O); yield L

def escenas():
    yield from escena_texto(frames("IMG_0553", 0.0, 3.0, speed=2.0), 3.0, "Fui a ULTA\na comparar precios", "vs mi tienda")
    yield from escena_texto(frames("IMG_0543", 0.4, 2.2), 2.2, "Su sección de\nK-Beauty", "¿es más barato?")
    for i, prod in enumerate(PRODUCTOS, 1):
        yield from escena_producto(i, prod)
    yield from escena_final(6.0)

if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium", "-movflags", "+faststart", OUT],
                         stdin=subprocess.PIPE)
    n = 0
    for fr in escenas():
        p.stdin.write(fr.convert("RGB").tobytes()); n += 1
    p.stdin.close(); p.wait(); print("ok", OUT, f"{n / FPS:.1f}s")
