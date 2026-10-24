"""Video "Ulta vs Alpacca, parte 2": clips de la tienda Ulta + capturas de ulta.com y de
alpacca.mx con el precio marcado. 1080x1920, 30 fps. Los clips traen la música
de la tienda y no se usa: si ya corriste voz.py, se le pone la voz de Mae
(salida-voz.mp4) y la música se pone en TikTok/Instagram.

Uso: python3 build.py CARPETA_DE_CLIPS [salida.mp4]
La carpeta de clips tiene los IMG_05xx.MOV originales del iPhone."""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
CLIPS = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, "Ulta-vs-Alpacca-2.mp4")
FONTS = os.path.join(os.path.dirname(AQUI), "video-sephora", "fonts")
W, H, FPS = 1080, 1920, 30

INK = (17, 17, 17); GREY = (120, 120, 128); PINK = (238, 108, 146); DEEP = (196, 70, 110)
BLUSH = (253, 236, 242); ULTA = (243, 113, 33); GREEN = (22, 150, 80)

TC = 18.8   # MXN por USD, el que eligió Mae
FECHA = "24 oct 2026"

# el del gancho (primer segundo): también entra en la tabla final
GANCHO = ("probio",    "SKIN1004", "Probio-Cica Intensive\nAmpoule 95 ml",   "IMG_0550", 35.5,  34.00, 309, 775.6, 719.4)
# nombre, clip, inicio (s), precio Ulta USD, precio Alpacca MXN, caja del precio en cada captura (px css: y)
PRODUCTOS = [
    ("hyalcream", "COSRX", "Hyaluronic Acid\nIntensive Cream",          "IMG_0548", 129.5, 25.00, 257, 751.6, 667.9),
    ("whiterice", "Dr.Melaxin", "Peel Shot White\nRice Ampoule",        "IMG_0547", 9.0,   26.00, 273, 751.6, 667.9),
    ("pdrnserum", "ANUA", "PDRN Capsule\n100 Serum",                    "IMG_0548", 14.5,  28.00, 354, 776.6, 691.9),
    ("ceramide",  "ANUA", "7 Rice Ceramide\nBarrier Serum",             "IMG_0547", 37.0,  22.00, 281, 776.6, 691.9),
    ("b5",        "SKIN1004", "Tea-Trica\nB5 Cream",                    "IMG_0550", 0.2,   25.00, 205, 776.6, 691.9),
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

CORTOS = {"probio": "SKIN1004 Probio-Cica", "whiterice": "Dr.Melaxin Peel Shot", "powder": "Anua Rice Enzyme Powder",
          "rice70": "Anua Rice 70 Toner", "ceramide": "Anua 7 Rice Ceramide", "pdrnfoam": "Anua PDRN Foam",
          "pdrnserum": "Anua PDRN Serum", "hyalcream": "COSRX Hyaluronic Cream",
          "b5": "SKIN1004 B5 Cream"}

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

# segundos del clip en los que sí se ve el producto (si es menos que lo normal, se ve más lento)
SPAN = {"powder": 2.6, "b5": 2.8}
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

CON_BANNER = (2, 3, 4)  # productos durante los que se ve la invitación a la comunidad
_banner = []

def banner():
    """etiqueta verde de WhatsApp que se queda arriba a media escena"""
    if not _banner:
        f1, f2 = F("ExtraBold", 46), F("SemiBold", 34)
        l1, l2 = "Comenta “Me quiero unir”", "y te mando la invitación a mi grupo de WhatsApp"
        w = int(max(f1.getlength(l1) + 80, f2.getlength(l2)) + 90)
        B = Image.new("RGBA", (w, 150)); d = ImageDraw.Draw(B)
        d.rounded_rectangle((0, 0, w - 1, 149), 40, fill=(18, 140, 76, 240))
        e = emoji("💬", 54); B.alpha_composite(e, (int(w / 2 - f1.getlength(l1) / 2 - e.width / 2 - 10), 16))
        d.text((w / 2 + e.width / 2, 48), l1, font=f1, fill=(255, 255, 255), anchor="mm")
        d.text((w / 2, 110), l2, font=f2, fill=(220, 255, 230), anchor="mm")
        _banner.append(B)
    return _banner[0]

def pon_banner(L, i, k, n):
    if i not in CON_BANNER: return
    B = banner(); t = k / FPS
    entra = ease(t / 0.4) if i == CON_BANNER[0] else 1.0
    sale = 1 - ease((t - (n / FPS - 0.35)) / 0.35) if i == CON_BANNER[-1] else 1.0
    a = min(entra, sale)
    if a <= 0: return
    s = 1 + 0.03 * math.sin(t * 4.0)  # late suavecito
    im = B.resize((int(B.width * s), int(B.height * s)), Image.BILINEAR)
    paste(L, im, (W / 2 - im.width / 2, 510 - im.height / 2 - (1 - a) * 60), a)

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
    vel = min(1.0, SPAN.get(key, 4.8) / (n / FPS))  # en cámara lenta para que el clip no se salga del producto
    for k, fr in enumerate(frames(clip, ini, n, speed=vel)):
        t = k / FPS
        L = fr.copy(); a = ease(t / 0.3); paste(L, tit, (0, (1 - a) * -40), a)
        pon_banner(L, i, k, n)
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

ALPACA = Image.open(os.path.join(AQUI, "alpaca.png")).convert("RGBA")  # dibujo de Mae para este video
ALPACA = ALPACA.resize((int(ALPACA.width * 340 / ALPACA.height), 340), Image.LANCZOS)
BENEFICIOS = [("Pagas en pesos", "transferencia o tarjeta"), ("Te llega a tu casa", "envíos a todo México"),
              ("Te atiendo yo", "por WhatsApp, en todo tu pedido"), ("¿Lo revendes?", "por caja te sale aún más barato")]

def capa_tabla(t, filas):
    O = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(O)
    a = ease(t / 0.3)
    text_c(d, W / 2, 120, "Mismo producto coreano", F("ExtraBold", 70), INK + (int(255 * a),))
    text_c(d, W / 2, 210, "en pesos, sin cruzar la frontera", F("SemiBold", 44), GREY + (int(255 * a),))
    y0 = 320
    d.text((90, y0), "Producto", font=F("SemiBold", 30), fill=GREY, anchor="lm")
    d.text((700, y0), "Ulta", font=F("Bold", 32), fill=ULTA, anchor="rm")
    d.text((870, y0), "Alpacca", font=F("Bold", 32), fill=PINK, anchor="rm")
    for j, (nm, u, al, ah) in enumerate(filas):
        b = ease((t - 0.25 - j * 0.12) / 0.3)
        if not b: continue
        y = y0 + 70 + j * min(118, 1060 // len(filas)); al_ = int(255 * b)
        d.rounded_rectangle((60, y - 48, W - 60, y + 48), 28, fill=(BLUSH if j % 2 == 0 else (248, 248, 250)) + (al_,))
        d.text((90, y), nm, font=F("SemiBold", 32), fill=INK + (al_,), anchor="lm")
        d.text((700, y), u, font=F("SemiBold", 36), fill=GREY + (al_,), anchor="rm")
        d.text((870, y), al, font=F("ExtraBold", 38), fill=DEEP + (al_,), anchor="rm")
        d.rounded_rectangle((890, y - 26, 1010, y + 26), 26, fill=GREEN + (al_,))
        d.text((950, y + 2), f"-{mxn(ah)}", font=F("Bold", 30), fill=(255, 255, 255, al_), anchor="mm")
    return O

def capa_cta(d, c, y=1530, cx=W / 2, ynota=120):
    pill(d, cx, y, "alpacca.mx", F("ExtraBold", 64), PINK + (int(255 * c),), (255, 255, 255, int(255 * c)), padx=50, pady=22)
    nota = (f"Precios del {FECHA}. Ulta: precio en ulta.com, sin impuestos, a ${TC:.2f} por dólar.\n"
            "Alpacca: precio por transferencia, pieza individual; se pide a Corea\n"
            "y cuenta para el pedido mínimo de $6,000.")
    text_c(d, W / 2, y + ynota, nota, F("Medium", 25), GREY + (int(255 * c),), lh=1.4)

def capa_beneficios(t, marcas):
    """'¿Por qué comprar conmigo?': cada beneficio entra cuando la voz lo dice; al final, alpacca.mx"""
    O = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(O)
    a = ease(t / 0.35)
    text_c(d, W / 2, 250 + (1 - a) * 30, "¿Por qué comprar\nconmigo?", F("ExtraBold", 80), INK + (int(255 * a),))
    for j, (tit, sub) in enumerate(BENEFICIOS):
        b = ease((t - marcas[j]) / 0.3)
        if not b: continue
        y = 560 + j * 205 + (1 - b) * 40; al_ = int(255 * b)
        d.rounded_rectangle((70, y, W - 70, y + 170), 40, fill=(BLUSH if j % 2 == 0 else (248, 248, 250)) + (al_,))
        cx, cy = 165, y + 85
        d.ellipse((cx - 46, cy - 46, cx + 46, cy + 46), fill=PINK + (al_,))
        d.line(((cx - 22, cy + 2), (cx - 6, cy + 18), (cx + 24, cy - 16)), fill=(255, 255, 255, al_), width=11, joint="curve")
        d.text((245, y + 62), tit, font=F("ExtraBold", 54), fill=INK + (al_,), anchor="lm")
        d.text((245, y + 122), sub, font=F("Medium", 38), fill=GREY + (al_,), anchor="lm")
    c = ease((t - marcas[-1]) / 0.35)
    if c: capa_cta(d, c, 1450 + (1 - c) * 40, cx=W * 0.36, ynota=265) if ALPACA else capa_cta(d, c, 1480 + (1 - c) * 40)
    return O

def escena_final(n, e):
    filas = []
    for key, marca, nombre, clip, ini, usd, alp, yu, ya in [GANCHO] + PRODUCTOS:
        filas.append((CORTOS[key], mxn(usd * TC), mxn(alp), round(usd * TC) - alp))
    marcas = e.get("marcas")  # cuándo dice cada beneficio y "alpacca.mx" (de voz.py)
    for k in range(n):
        t = k / FPS
        L = Image.new("RGBA", (W, H), (255, 255, 255, 255))
        if not marcas:  # sin voz: la tabla y alpacca.mx
            O = capa_tabla(t, filas); capa_cta(ImageDraw.Draw(O), ease((t - 1.6) / 0.4)); L.alpha_composite(O); yield L; continue
        cambio = marcas[0] - 0.45  # la tabla se va justo antes del primer beneficio
        if t < cambio + 0.35:
            s = ease((t - cambio) / 0.35) if t > cambio else 0
            paste(L, capa_tabla(t, filas), (0, -s * 80), 1 - s)
        if t > cambio:
            L.alpha_composite(capa_beneficios(t - cambio, [m - cambio for m in marcas]))
        ta = t - marcas[-1]  # la alpaca entra con "alpacca.mx" y se mece
        if ta > 0 and ALPACA:
            s = 0.5 + 0.5 * back(ta / 0.4); bob = math.sin(ta * 3.2) * 8
            im = ALPACA.resize((int(ALPACA.width * s), int(ALPACA.height * s)), Image.BILINEAR)
            paste(L, im, (W * 0.77 - im.width / 2, 1535 - im.height / 2 + bob), min(1.0, ta / 0.15))
        yield L

WA = (37, 211, 102); WA_OSC = (18, 140, 76)

RAIZ_EMOJI = os.path.join(os.path.dirname(AQUI), "video-ulta", "emoji")

def emoji(ch, size):
    """emoji con el diseño de iPhone (PNG en video-ulta/emoji); si falta, el de Noto"""
    png = os.path.join(RAIZ_EMOJI, "%x.png" % ord(ch))
    if os.path.exists(png):
        im = Image.open(png).convert("RGBA")
    else:
        f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
        im = Image.new("RGBA", (220, 220)); ImageDraw.Draw(im).text((110, 110), ch, font=f, embedded_color=True, anchor="mm")
    im = im.crop(im.getbbox())  # se escala por la altura, sin deformar
    return im.resize((max(1, round(im.width * size / im.height)), size), Image.LANCZOS)

COMUNIDAD = ["Novedades", "Descuentos", "Emprendemos juntas"]

def precio_pill(L, cx, cy, etiqueta, monto, fondo, tachado=False, a=1.0):
    fe, fm = F("Bold", 34), F("ExtraBold", 84)
    w = max(fe.getlength(etiqueta), fm.getlength(monto)) + 80
    P = Image.new("RGBA", (int(w) + 20, 190)); d = ImageDraw.Draw(P); cxp = P.width / 2
    d.rounded_rectangle((10, 10, P.width - 10, 180), 40, fill=fondo)
    d.text((cxp, 53), etiqueta, font=fe, fill=(255, 255, 255), anchor="mm")
    d.text((cxp, 117), monto, font=fm, fill=(255, 255, 255), anchor="mm")
    if tachado:
        mw = fm.getlength(monto); d.line((cxp - mw / 2 - 8, 125, cxp + mw / 2 + 8, 105), fill=(255, 255, 255), width=8)
    s = 0.6 + 0.4 * back(a / 1.0) if a < 1 else 1.0
    if s != 1: P = P.resize((int(P.width * s), int(P.height * s)), Image.BILINEAR)
    paste(L, P, (cx - P.width / 2, cy - P.height / 2), min(1.0, a * 3))

def escena_gancho(n, e, f0=0):
    """primer segundo: el producto más impactante con su precio en Ulta (tachado) contra el de Alpacca, como la portada"""
    key, marca, nombre, clip, ini, usd, alp, yu, ya = GANCHO
    m = e.get("marcas") or [0.4, 1.4, 2.6]
    SFX.append(((f0 + round(m[0] * FPS)) / FPS, "click")); SFX.append(((f0 + round(m[1] * FPS)) / FPS, "glitter"))
    SFX.append(((f0 + round(m[1] * FPS)) / FPS + 0.5, "pop"))
    ahorro = round(usd * TC) - alp; badge = etiqueta(f"Ahorras {mxn(ahorro)}", GREEN, F("ExtraBold", 54))
    vel = min(1.0, 3.0 / (n / FPS))
    titulo = 'Ulta vs\nmi tienda'; sub = 'Parte 2'
    for k, fr in enumerate(frames(clip, ini, n, speed=vel)):
        t = k / FPS
        L = fr.copy(); L.alpha_composite(SOMBRA)
        O = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(O)
        y0 = 300
        if sub:
            f = F("ExtraBold", 54); w = f.getlength(sub)
            d.rounded_rectangle((W / 2 - w / 2 - 40, 250, W / 2 + w / 2 + 40, 340), 45, fill=PINK)
            d.text((W / 2, 297), sub, font=f, fill=(255, 255, 255), anchor="mm"); y0 = 380
        text_c(d, W / 2, y0, titulo, F("ExtraBold", 104), (255, 255, 255), stroke=7, sfill=(0, 0, 0))
        text_c(d, 230, 1238, marca + " " + nombre.split(chr(10))[0].split(" ")[0], F("Bold", 42), (255, 255, 255), stroke=4, sfill=(0, 0, 0))
        L.alpha_composite(O)
        if t >= m[0]: precio_pill(L, 230, 1380, "En Ulta", f"{mxn(usd * TC)}", ULTA, True, (t - m[0]) / 0.35)
        if t >= m[1]: precio_pill(L, 230, 1580, "Conmigo", f"{mxn(alp)}", PINK, False, (t - m[1]) / 0.35)
        if t >= m[1] + 0.5:
            tb = t - m[1] - 0.5; s = 0.6 + 0.4 * back(tb / 0.3); bd = badge.resize((int(badge.width * s), int(badge.height * s)))
            paste(L, bd, (W / 2 - bd.width / 2, 1790 - bd.height / 2), min(1.0, tb / 0.1))
        if ALPACA:
            s = 0.5 + 0.5 * back(t / 0.45); bob = math.sin(t * 3.2) * 8
            im = ALPACA.resize((int(ALPACA.width * s * 1.2), int(ALPACA.height * s * 1.2)), Image.BILINEAR)
            paste(L, im, (790 - im.width / 2, 1470 - im.height / 2 + bob), min(1.0, t / 0.15))
        yield L

def escena_comunidad(n, e):
    """invitación al grupo de WhatsApp: cada punto entra cuando la voz lo dice; al final, cómo pedir la invitación"""
    marcas = e.get("marcas") or [1.0, 1.8, 2.6, 3.6]
    ojos = emoji("💬", 60); carta = emoji("💌", 64)
    for k in range(n):
        t = k / FPS
        L = Image.new("RGBA", (W, H), (255, 255, 255, 255)); O = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(O)
        a = ease(t / 0.35); al = int(255 * a)
        # pastilla verde "Grupo de WhatsApp"
        f = F("Bold", 44); txt = "Grupo de WhatsApp"; w = f.getlength(txt) + 90
        d.rounded_rectangle((W / 2 - w / 2 - 20, 230, W / 2 + w / 2 + 20, 330), 50, fill=WA + (al,))
        d.text((W / 2 + 45, 282), txt, font=f, fill=(255, 255, 255, al), anchor="mm")
        text_c(d, W / 2, 410 + (1 - a) * 30, "Únete a nuestra\ncomunidad", F("ExtraBold", 92), INK + (al,))
        for j, s in enumerate(COMUNIDAD):
            b = ease((t - marcas[j]) / 0.3)
            if not b: continue
            y = 680 + j * 175 + (1 - b) * 40; al_ = int(255 * b)
            d.rounded_rectangle((110, y, W - 110, y + 140), 40, fill=((232, 250, 239) if j % 2 == 0 else (245, 250, 247)) + (al_,))
            cx, cy = 200, y + 70
            d.ellipse((cx - 42, cy - 42, cx + 42, cy + 42), fill=WA + (al_,))
            d.line(((cx - 20, cy + 2), (cx - 5, cy + 17), (cx + 22, cy - 15)), fill=(255, 255, 255, al_), width=10, joint="curve")
            d.text((280, y + 72), s, font=F("ExtraBold", 56), fill=INK + (al_,), anchor="lm")
        c = ease((t - marcas[3]) / 0.35)
        if c:
            al_ = int(255 * c); y = 1240 + (1 - c) * 40
            d.rounded_rectangle((80, y, W - 80, y + 290), 48, fill=WA_OSC + (al_,))
            text_c(d, W / 2, y + 38, "Comenta “Me quiero unir”\no mándame mensaje", F("ExtraBold", 56), (255, 255, 255, al_), lh=1.2)
            text_c(d, W / 2 - 36, y + 200, "y te envío la invitación", F("SemiBold", 44), (220, 255, 230, al_))
        L.alpha_composite(O)
        paste(L, ojos, (W / 2 - (F("Bold", 44).getlength("Grupo de WhatsApp") + 90) / 2 + 22, 250), a)
        if c:
            paste(L, carta, (W / 2 - 36 + F("SemiBold", 44).getlength("y te envío la invitación") / 2 + 16, 1240 + (1 - c) * 40 + 196), c)
            if ALPACA:
                s = 0.5 + 0.5 * back((t - marcas[3]) / 0.4); bob = math.sin((t - marcas[3]) * 3.2) * 8
                im = ALPACA.resize((int(ALPACA.width * s * 0.95), int(ALPACA.height * s * 0.95)), Image.BILINEAR)
                paste(L, im, (W / 2 - im.width / 2, 1720 - im.height / 2 + bob), min(1.0, (t - marcas[3]) / 0.15))
        yield L

# Tiempos: si existe tiempos.json (de voz.py) cada escena dura lo que su frase y las
# capturas entran cuando se dice cada precio; si no, los tiempos de abajo (sin voz).
_tj = os.path.join(AQUI, "tiempos.json")
TIEMPOS = json.load(open(_tj)) if os.path.exists(_tj) else (
    [{"dur": 4.0}] + [{"dur": 4.6, "ulta": 1.7, "alp": 3.15}] * len(PRODUCTOS) + [{"dur": 6.0}, {"dur": 6.0}])
assert len(TIEMPOS) == len(PRODUCTOS) + 3  # gancho, productos, beneficios, comunidad

def escenas():
    # cuadros por escena sobre una línea de tiempo acumulada (así no se desfasa del audio)
    ini = [0.0]
    for e in TIEMPOS: ini.append(ini[-1] + e["dur"])
    q = lambda s: int(round(s * FPS))
    n = [q(ini[j + 1]) - q(ini[j]) for j in range(len(TIEMPOS))]
    yield from escena_gancho(n[0], TIEMPOS[0], 0)
    for i, prod in enumerate(PRODUCTOS, 1):
        e = TIEMPOS[i]
        yield from escena_producto(i, prod, n[i], q(e["ulta"]), q(e["alp"]), q(ini[i]))
    yield from escena_final(n[-2], TIEMPOS[-2])
    yield from escena_comunidad(n[-1], TIEMPOS[-1])

if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", OUT],
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
        fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")  # -14 LUFS, como piden TikTok/Instagram
        subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
        print("ok", final)
    else:
        print("OJO: sin voz/narracion.wav o tiempos.json; corre primero python3 voz.py (usa las frases guardadas)")
