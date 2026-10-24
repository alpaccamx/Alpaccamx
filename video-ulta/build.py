"""Video "Ulta vs Alpacca": clips de la tienda Ulta + capturas de ulta.com y de
alpacca.mx con el precio marcado. 1080x1920, 30 fps. Los clips traen la música
de la tienda y no se usa: si ya corriste voz.py, se le pone la voz de Mae
(salida-voz.mp4) y la música se pone en TikTok/Instagram.

Uso: python3 build.py CARPETA_DE_CLIPS [salida.mp4]
La carpeta de clips tiene los IMG_05xx.MOV originales del iPhone."""
import json, os, subprocess, sys
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
    ("foam",     "ANUA", "Heartleaf Pore Deep\nCleansing Foam",  "IMG_0548", 53.0,  14.00, 187, 800.6, 719.4),
    ("niacin",   "ANUA", "Niacinamide 10\nTXA 4 Serum",          "IMG_0547", 51.6,  22.00, 281, 800.6, 691.9),
    ("snail92",  "COSRX", "Advanced Snail 92\nAll In One Cream", "IMG_0548", 120.0, 21.90, 251, 751.6, 667.9),
    ("snail96",  "COSRX", "Advanced Snail 96\nMucin Essence",    "IMG_0547", 96.0,  20.90, 224, 751.6, 751.9),
    ("peptide",  "COSRX", "The 6 Peptide\nSkin Booster",         "IMG_0548", 74.5,  21.00, 301, 775.6, 667.9),
    ("eyepatch", "COSRX", "Peptide Collagen\nHydrogel Eye Patch", "IMG_0547", 125.0, 23.00, 288, 751.6, 667.9),
    ("toner",    "TIRTIR", "Milk Skin Toner\n150 ml",            "IMG_0548", 161.0, 25.00, 301, 751.6, 751.9),
    ("althea147", "Dr. Althea", "147 Barrier Cream",             "IMG_0545", 41.3,  27.00, 324, 800.6, 691.9),
]

_fc = {}
def F(n, s):
    if (n, s) not in _fc: _fc[n, s] = ImageFont.truetype(f"{FONTS}/Poppins-{n}.ttf", s)
    return _fc[n, s]

def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3
def back(x): x = max(0.0, min(1.0, x)); c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2

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
def frames(clip, start, n, speed=1.0):
    dur = n / FPS + 0.2
    vf = f"setpts=PTS/{speed},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(start), "-t", f"{dur * speed:.3f}",
                          "-i", os.path.join(CLIPS, clip + ".MOV"), "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    last = None
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

def marca_precio(L, box, t, color, w=10, pad=16, m=40):
    """rectángulo que se dibuja alrededor del precio (m = margen de sombra de la tarjeta)"""
    p = ease(t / 0.35)
    if p <= 0: return
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(L)
    rect = (x0 - pad, y0 - pad, x1 + pad, min(y1 + pad, L.height - m - w / 2 - 2))
    # se dibuja en orden: arriba, derecha, abajo, izquierda
    segs = [((rect[0], rect[1]), (rect[2], rect[1])), ((rect[2], rect[1]), (rect[2], rect[3])),
            ((rect[2], rect[3]), (rect[0], rect[3])), ((rect[0], rect[3]), (rect[0], rect[1]))]
    total = p * 4
    for k, (a, b) in enumerate(segs):
        f = max(0.0, min(1.0, total - k))
        if f: d.line((a, (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)), fill=color, width=w)

CORTOS = {"foam": "Anua Heartleaf Foam", "niacin": "Anua Niacinamide Serum", "snail92": "COSRX Snail 92 Cream",
          "snail96": "COSRX Snail 96 Essence", "peptide": "COSRX 6 Peptide Booster", "eyepatch": "COSRX Eye Patch",
          "toner": "TIRTIR Milk Toner", "althea147": "Dr. Althea 147 Cream"}

# ---------- escenas ----------
def escena_texto(fr_gen, lineas, sub=None):
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

SFX = []  # (segundo, sonido): click, glitter y pop (recortados del video de sonidos de TikTok que mandó Mae)
S = 0.5    # tamaño de las capturas chiquitas
_sombra = Image.new("L", (1, H)); [_sombra.putpixel((0, y), int(170 * max(0, (y - 900) / (H - 900)) ** 1.3)) for y in range(H)]
SOMBRA = Image.new("RGBA", (W, H), (0, 0, 0, 255)); SOMBRA.putalpha(_sombra.resize((W, H)))

def mini(card, box):
    c = card.resize((int(card.width * S), int(card.height * S)), Image.LANCZOS)
    return c, tuple(v * S for v in box)

def etiqueta(texto, fondo, f=None):
    f = f or F("Bold", 34); w = f.getlength(texto)
    L = Image.new("RGBA", (int(w) + 60, 70)); d = ImageDraw.Draw(L)
    d.rounded_rectangle((0, 0, L.width - 1, 69), 35, fill=fondo)
    d.text((L.width / 2, 37), texto, font=f, fill=(255, 255, 255), anchor="mm")
    return L

def aparece(L, card, box, color, cx, y, t):
    """la captura chiquita entra con rebote y un destello blanco; luego se marca el precio"""
    s = 0.7 + 0.3 * back(t / 0.32)
    c = card.copy(); marca_precio(c, box, t - 0.3, color, w=6, pad=8, m=int(40 * S))
    if s != 1: c = c.resize((max(1, int(c.width * s)), max(1, int(c.height * s))), Image.BILINEAR)
    fl = max(0.0, 1 - t / 0.2)
    if fl:
        wht = Image.new("RGBA", c.size, (255, 255, 255, 0)); m = int(40 * S * s)
        ImageDraw.Draw(wht).rounded_rectangle((m, m, c.width - m, c.height - m), int(36 * S), fill=(255, 255, 255, int(235 * fl)))
        c.alpha_composite(wht)
    paste(L, c, (cx - c.width / 2, y + (card.height - c.height) / 2), min(1.0, t / 0.08))

def escena_producto(i, prod, n, nu, na, f0=0):
    """el clip corre toda la escena; la captura de Ulta entra (chiquita, a la izquierda) en el
    cuadro nu y la de Alpacca (a la derecha) en na; f0 = primer cuadro de la escena en el video"""
    key, marca, nombre, clip, ini, usd, alp, yu, ya = prod
    tit = capa_titulo(i, marca, nombre)
    (cu, bu), (ca, ba) = mini(*captura("ulta-" + key, yu, True)), mini(*captura("alp-" + key, ya, False))
    ahorro = round(usd * TC) - alp  # en pesos, con los mismos números redondeados que se muestran
    eu = etiqueta(f"${usd:.0f} USD = {mxn(usd * TC)}", ULTA); ea = etiqueta(f"{mxn(alp)} pesos", PINK)
    badge = etiqueta(f"Ahorras {mxn(ahorro)}", GREEN, F("ExtraBold", 54))
    xl, xr, y = W * 0.27, W * 0.73, 1000
    SFX.append(((f0 + nu) / FPS, "click")); SFX.append(((f0 + na) / FPS, "glitter"))
    SFX.append(((f0 + na) / FPS + 0.5, "pop"))  # cuando sale el "Ahorras $..."
    vel = min(1.0, 4.8 / (n / FPS))  # en cámara lenta para que el clip no se salga del producto
    for k, fr in enumerate(frames(clip, ini, n, speed=vel)):
        t = k / FPS
        L = fr.copy(); a = ease(t / 0.3); paste(L, tit, (0, (1 - a) * -40), a)
        if k >= nu:
            tu = (k - nu) / FPS
            L.alpha_composite(SOMBRA) if tu > 0.25 else paste(L, SOMBRA, (0, 0), tu / 0.25)
            aparece(L, cu, bu, ULTA, xl, y, tu)
            paste(L, eu, (xl - eu.width / 2, y + cu.height - 6), ease((tu - 0.3) / 0.25))
        if k >= na:
            ta = (k - na) / FPS
            aparece(L, ca, ba, PINK, xr, y, ta)
            paste(L, ea, (xr - ea.width / 2, y + ca.height - 6), ease((ta - 0.3) / 0.25))
            tb = ta - 0.5
            if tb > 0:
                s = 0.6 + 0.4 * back(tb / 0.3); bd = badge.resize((int(badge.width * s), int(badge.height * s)))
                paste(L, bd, (W / 2 - bd.width / 2, 1815 - bd.height / 2), min(1.0, tb / 0.1))
        yield L

def escena_final(n):
    filas = []
    for key, marca, nombre, clip, ini, usd, alp, yu, ya in PRODUCTOS:
        filas.append((CORTOS[key], mxn(usd * TC), mxn(alp), round(usd * TC) - alp))
    for k in range(n):
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
            y = y0 + 70 + j * min(118, 1060 // len(filas)); al_ = int(255 * b)
            d.rounded_rectangle((60, y - 48, W - 60, y + 48), 28, fill=(BLUSH if j % 2 == 0 else (248, 248, 250)) + (al_,))
            d.text((90, y), n, font=F("SemiBold", 32), fill=INK + (al_,), anchor="lm")
            d.text((700, y), u, font=F("SemiBold", 36), fill=GREY + (al_,), anchor="rm")
            d.text((870, y), al, font=F("ExtraBold", 38), fill=DEEP + (al_,), anchor="rm")
            d.rounded_rectangle((890, y - 26, 1010, y + 26), 26, fill=GREEN + (al_,))
            d.text((950, y + 2), f"-{mxn(ah)}", font=F("Bold", 30), fill=(255, 255, 255, al_), anchor="mm")
        c = ease((t - 1.6) / 0.4)
        if c:
            pill(d, W / 2, 1530, "alpacca.mx", F("ExtraBold", 64), PINK + (int(255 * c),), (255, 255, 255, int(255 * c)), padx=50, pady=22)
            nota = (f"Precios del {FECHA}. Ulta: precio en ulta.com, sin impuestos, a ${TC} por dólar.\n"
                    "Alpacca: precio por transferencia, pieza individual; se pide a Corea\n"
                    "y cuenta para el pedido mínimo de $6,000.")
            text_c(d, W / 2, 1650, nota, F("Medium", 25), GREY + (int(255 * c),), lh=1.4)
        L.alpha_composite(O); yield L

# Tiempos: si existe tiempos.json (de voz.py) cada escena dura lo que su frase y las
# capturas entran cuando se dice cada precio; si no, los tiempos de abajo (sin voz).
_tj = os.path.join(AQUI, "tiempos.json")
TIEMPOS = json.load(open(_tj)) if os.path.exists(_tj) else (
    [{"dur": 3.0}, {"dur": 2.2}] + [{"dur": 4.6, "ulta": 1.7, "alp": 3.15}] * len(PRODUCTOS) + [{"dur": 6.0}])
assert len(TIEMPOS) == len(PRODUCTOS) + 3

def escenas():
    # cuadros por escena sobre una línea de tiempo acumulada (así no se desfasa del audio)
    ini = [0.0]
    for e in TIEMPOS: ini.append(ini[-1] + e["dur"])
    q = lambda s: int(round(s * FPS))
    n = [q(ini[j + 1]) - q(ini[j]) for j in range(len(TIEMPOS))]
    yield from escena_texto(frames("IMG_0553", 0.0, n[0], speed=2.0), "Fui a ULTA\na comparar precios", "vs mi tienda")
    yield from escena_texto(frames("IMG_0543", 0.4, n[1]), "Su sección de\nK-Beauty", "¿es más barato?")
    for i, prod in enumerate(PRODUCTOS, 1):
        e = TIEMPOS[i + 1]
        yield from escena_producto(i, prod, n[i + 1], q(e["ulta"]), q(e["alp"]), q(ini[i + 1]))
    yield from escena_final(n[-1])

if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium", "-movflags", "+faststart", OUT],
                         stdin=subprocess.PIPE)
    n = 0
    for fr in escenas():
        p.stdin.write(fr.convert("RGB").tobytes()); n += 1
    p.stdin.close(); p.wait(); print("ok", OUT, f"{n / FPS:.1f}s")
    voz = os.path.join(AQUI, "voz", "narracion.wav")
    if os.path.exists(_tj) and os.path.exists(voz):  # se le pone la voz
        final = OUT.replace(".mp4", "-voz.mp4")
        # voz + clicks/brillos (cada sonido entra con su retraso, más bajito que la voz)
        GAN = {"click": 0.3, "glitter": 0.35, "pop": 0.35}
        ins, fil = ["-i", OUT, "-i", voz], ["[1:a]aformat=channel_layouts=stereo[v]"]
        for j, (t, s) in enumerate(SFX):
            ins += ["-i", os.path.join(AQUI, "sfx", s + ".wav")]
            ms = int(t * 1000)
            fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume={GAN[s]}[s{j}]")
        fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first[a]")
        subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
        print("ok", final)
    else:
        print("OJO: sin voz/narracion.wav o tiempos.json; corre primero python3 voz.py (usa las frases guardadas)")
