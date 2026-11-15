"""Videos de las pijamas Juicy Couture y True Religion ($699 c/u, precio de mayoreo, se apartan con la mitad), con la
invitación al grupo de WhatsApp y su QR al final (como en los de Target).
Material del 15 de noviembre (carpeta del Drive): IMG_6116 = recorrido por los sets de pijamas en la tienda (iPhone),
IMG_6117 = el carrito lleno de sets de Juicy; fotos IMG_6106-6115 = cada set en la mano (fotos/pNNNN.jpg). Videos
pasados a color normal (saturación 0.8) y estabilizados: est_6116.mp4, est_6117.mp4.
Cuando la toma no muestra bien un set, el video sigue en movimiento difuminado y encima va la foto del set (nunca
cuadros congelados ni franjas).
Etiquetas leídas en las fotos: Juicy coronas = 3 piezas, MSRP $68; Juicy rayas, afelpadas y brillitos = 2 piezas, MSRP $58;
Juicy fucsia de letras = 2 piezas (línea Mommy & Me, una sola pijama), MSRP $58; True Religion (corazón, herraduras, ribete) = 3 piezas.

Variantes:
  regalo  = «El regalo de Navidad que sí van a usar»: regalo resuelto + anclaje (etiqueta de 68 dólares contra $699).
  equipo  = «¿Eres más Juicy o True Religion?»: identidad (equipo) + catálogo numerado + «comenta el número».
  reventa = «Si vendes ropa…»: para revendedoras; entrada baja (apartas con la mitad) y «tú le pones tu precio».
Uso: python3 voz.py VARIANTE; python3 build.py VARIANTE CARPETA_CON_est_*.mp4 -> Pijamas-VARIANTE-voz.mp4"""
import hashlib, json, os, re, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
VAR, CRUDO, ARGS = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else ""), sys.argv[3:]
sys.path.insert(0, os.path.join(RAIZ, "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

# emojis de Noto (los PNG de video-ulta/emoji son el diseño de Apple, que solo se puede usar en aparatos Apple)
b.RAIZ_EMOJI = os.path.join(AQUI, "sin-emoji-apple"); b.emoji.cache_clear(); b.linea.cache_clear()

W, H, FPS = 1080, 1920, 30

# todo lo que se pone en pantalla se anota (rectángulo de lo visible) para que el subtítulo busque un lugar libre
REG = []
_pon = b.pon
def _pon_anota(L, im, cx, cy, s=1.0, a=1.0):
    _pon(L, im, cx, cy, s, a)
    if s <= 0.05 or a <= 0.3: return
    caja = im.getchannel("A").point(lambda v: 255 if v > 90 else 0).getbbox()
    if caja:
        x0, y0, x1, y1 = caja; w2, h2 = im.width * s / 2, im.height * s / 2
        REG.append((cx - w2 + x0 * s, cy - h2 + y0 * s, cx - w2 + x1 * s, cy - h2 + y1 * s))
b.pon = _pon_anota


def choca(r, margen=14):
    return any(not (r[2] + margen < q[0] or q[2] + margen < r[0] or r[3] + margen < q[1] or q[3] + margen < r[1]) for q in REG)
ROSA, NEGRO, WHITE, VERDE = (232, 70, 120), (20, 20, 22), (255, 255, 255), (22, 150, 80)
FUENTES = os.path.join(RAIZ, "carruseles", "fuentes")
T = json.load(open(os.path.join(AQUI, f"tiempos-{VAR}.json")))
INI = [0.0]
for e in T: INI.append(INI[-1] + e["dur"])
def marca(e, m=None): return INI[e] + (0 if m is None else T[e]["marcas"][m])
OUT = os.path.join(AQUI, f"Pijamas-{VAR}.mp4")

# ---------------- tomas: por frase, a velocidad normal (cada una dura lo que le toca de la frase) ----------------
# tomas por frase: (fuente, inicio, segundos o None = lo que sobre de la frase, centro x, centro y, acercamiento).
# Pantalla completa, sin franjas ni cuadros congelados. Cuando Mae sostiene un producto, la ventana se acerca a él
# (centro y acercamiento), recortada del video de los lentes en su resolución original (1376x1840) para que se vea nítido.
# 7º dato de una toma = foto del producto: cuando la toma no muestra bien el producto, el video sigue en movimiento
# pero difuminado, y encima va la foto oficial grande (nunca un cuadro congelado ni franjas)
# piezas leídas en la etiqueta de cada foto: 3 piezas = camisa, short y pantalón; 2 piezas = camisa y pantalón.
# p6111 es de la línea «Mommy & Me» pero es una sola pijama de 2 piezas (la de niña se vende aparte). p6114 es el mismo
# set que p6106 (no se numera dos veces).
FOTOS = {  # foto del set: (nombre, abajo, color)
    "p6107": ("Juicy · coronas", "3 piezas: camisa, short y pantalón", ROSA),
    "p6108": ("Juicy · rayas", "2 piezas", ROSA), "p6112": ("Juicy · afelpada", "2 piezas", ROSA),
    "p6113": ("Juicy · afelpada", "2 piezas", ROSA), "p6115": ("Juicy · brillitos", "2 piezas", ROSA),
    "p6111": ("Juicy · letras", "2 piezas", ROSA),
    "p6106": ("True Religion · corazón", "3 piezas", NEGRO), "p6109": ("True Religion · herraduras", "3 piezas", NEGRO),
    "p6110": ("True Religion · ribete negro", "3 piezas", NEGRO)}
FOTO = {"k": None, "t0": 0.0}  # la foto que va encima ahora y desde cuándo ("fondo": solo difumina)
M = (0.5, 0.52, 1.15)  # el set en la mano, al centro
A = (0.5, 0.5, 1.0)    # toma abierta
F = ("6116", 150.0, None, 0.5, 0.5, 1.0, "fondo")  # video difuminado de fondo (encima van las fotos)
# en el video solo se acercan los segundos en que Mae sostiene sets que están en las fotos:
# 0-2.7 coronas (p6107) · 46-51 brillitos (p6115) · 112.5-119 fucsia de letras (p6111) · 130-133.4 afelpada beige (p6112)
# 139-142.4 afelpada blanca (p6113) · 157.2-159 True Religion rosa (p6106) · 261-265 rayas (p6108) · 278.8-283 ribete (p6110)
TOMAS = {  # por frase: (fuente, inicio, segundos o None, centro x, centro y, acercamiento[, foto])
    "regalo": [[("6117", 2.5, 3.6, *A), ("6116", 0.0, None, *M)],
               [("6116", 261.0, None, *A, "fondo")],
               [("6116", 150.0, None, *A, "p6107")],
               [("6116", 112.5, None, *M)],
               [("6117", 6.0, None, *A)],
               [("6116", 139.0, 3.4, *M), ("6117", 8.5, None, *A)]],
    "equipo": [[("6117", 2.0, 2.8, *A), ("6116", 278.8, None, *M)],
               [("6116", 0.0, 2.6, *M), ("6116", 150.0, None, *A, "p6107")],
               [("6116", 160.0, None, *A, "fondo")],
               [("6116", 170.0, None, *A, "fondo")],
               [("6116", 261.0, 4.2, *M), ("6116", 157.2, None, *M)],
               [("6116", 180.0, None, *A, "fondo")],
               [("6117", 2.0, 5.0, *A), ("6116", 139.0, 3.4, *M), ("6116", 46.0, None, *M)]],
    "reventa": [[("6117", 1.0, None, *A)],
                [("6116", 0.0, 2.6, *M), ("6116", 261.0, None, *M)],
                [("6116", 190.0, None, *A, "fondo")],
                [("6116", 278.8, 3.6, *M), ("6116", 46.0, None, *M)],
                [("6117", 8.0, None, *A)],
                [("6116", 129.9, 3.4, *M), ("6116", 139.0, None, *M)],
                [("6116", 112.5, 3.0, *M), ("6117", 8.5, None, *A)]],
}[VAR]

def video(fuente, ini, n, cx=0.5, cy=0.5, z=1.0, foto=None):
    """ventana 9:16 de la toma, centrada en (cx, cy) y acercada z veces; llena la pantalla (sin franjas)"""
    src = os.path.join(CRUDO, "estf_189.mp4" if fuente == "189" else f"est_{fuente}.mp4")
    sw, sh = (1376, 1840) if fuente == "189" else (W, H)
    h = sh / z; w = h * 9 / 16
    if w > sw: w = sw; h = w * 16 / 9
    x0 = min(max(cx * sw - w / 2, 0), sw - w); y0 = min(max(cy * sh - h / 2, 0), sh - h)
    vf = f"fps={FPS},crop={int(w) // 2 * 2}:{int(h) // 2 * 2}:{int(x0)}:{int(y0)},scale={W}:{H}:flags=lanczos"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(ini), "-i", src, "-t", f"{n / FPS + 0.3:.2f}",
                          "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3:
            im = Image.frombytes("RGB", (W, H), x)
            if foto:  # sigue en movimiento, solo difuminado y un poco más oscuro
                im = im.resize((W // 6, H // 6), Image.BILINEAR).filter(ImageFilter.GaussianBlur(5)).resize((W, H), Image.BICUBIC)
                im = Image.blend(im, Image.new("RGB", (W, H), (25, 12, 20)), 0.25)
            last = im.convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


def degradado():
    """oscurece un poco arriba (títulos) y abajo (subtítulo) para que se lea sin bordes en el texto"""
    g = Image.new("L", (1, H))
    for y in range(H):
        a = max(0, 1 - y / 620) * 130  # solo arriba: abajo va el producto y no se oscurece
        g.putpixel((0, y), int(min(255, a)))
    im = Image.new("RGBA", (W, H), (15, 8, 12, 255)); im.putalpha(g.resize((W, H))); return im
SOMBRA = degradado()


# ---------------- textos ----------------
def _sombra(im, r=10, a=150):
    sh = Image.new("RGBA", (im.width + 4 * r, im.height + 4 * r))
    m = im.getchannel("A").point(lambda v: v * a // 255)
    base = Image.new("RGBA", im.size, (20, 10, 16, 255)); base.putalpha(m)
    sh.alpha_composite(base, (2 * r, 2 * r + 4)); sh = sh.filter(ImageFilter.GaussianBlur(r))
    sh.alpha_composite(im, (2 * r, 2 * r)); return sh


def bagel(txt, sz, col=ROSA):
    f = ImageFont.truetype(os.path.join(FUENTES, "BagelFatOne-Regular.ttf"), sz)
    im = Image.new("RGBA", (int(f.getlength(txt)) + 40, int(sz * 1.45)))
    ImageDraw.Draw(im).text((20, im.height // 2), txt, font=f, fill=col, anchor="lm"); return im


def pas(L, s, cy, t, t0, sz=58, bg=ROSA, fg=WHITE, n="ExtraBold", maxw=1000, cx=W / 2):
    if t < t0: return
    while b.pastilla(s, n, sz, bg, fg).width > maxw and sz > 30: sz -= 3
    b.pon(L, b.pastilla(s, n, sz, bg, fg), cx, cy, *b.entra(t, t0, 0.35))


def gancho(L, t, arriba, abajo, t_abajo):
    """el gancho: se lee y se escucha en el segundo 0"""
    im = _sombra(bagel(arriba, 104, WHITE), 12, 170)
    if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
    b.pon(L, im, W / 2, 360, *b.entra(t, -0.3, 0.3))  # ya completo en el primer cuadro (lo que se ve al pasar)
    if abajo: pas(L, abajo, 500, t, t_abajo, sz=56)


def numero(L, n, t, t0):
    """número del tip en círculo rosa (como el cuadrito de los videos de estrategia): quieren llegar al último"""
    if t < t0: return
    im = Image.new("RGBA", (160, 160)); d = ImageDraw.Draw(im)
    d.ellipse((5, 5, 155, 155), fill=ROSA, outline=WHITE, width=7)
    f = ImageFont.truetype(os.path.join(FUENTES, "BagelFatOne-Regular.ttf"), 100)
    d.text((80, 78), str(n), font=f, fill=WHITE, anchor="mm")
    b.pon(L, _sombra(im, 10, 120), 115, 330, *b.entra(t, t0, 0.35))


def interrupcion(L, t, t0, texto, dur=0.9):
    """golpe a la mitad: palabra gigante que entra de golpe"""
    if not (t0 <= t < t0 + dur): return
    f = ImageFont.truetype(os.path.join(FUENTES, "BebasNeue-Regular.ttf"), 420)
    im = Image.new("RGBA", (int(f.getlength(texto)) + 40, 460)); ImageDraw.Draw(im).text((20, 230), texto, font=f, fill=ROSA, anchor="lm")
    if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
    k = (t - t0) / dur
    b.pon(L, _sombra(im, 14, 170), W / 2, 900, 1.25 - 0.25 * b.ease(k / 0.25), min(1.0, (1 - k) / 0.2))


# subtítulo de una palabra (blanca, sin borde); las clave, grandes en rosa con Bagel
CLAVE = {"Navidad", "Juicy", "Couture", "True", "Religion", "suavecitas", "moño", "etiqueta", "dólares", "seiscientos",
         "mayoreo", "mitad", "liquidas", "WhatsApp", "ofertas", "exclusivas", "número", "coronas", "rayas", "afelpadas",
         "herraduras", "ribete", "corazón", "diciembre", "pijamas", "originales", "envolver", "vendes", "favorita", "regalar", "piezas", "short", "escojan"}

def _palabras():
    v = open(os.path.join(AQUI, "voz.py")).read()
    voz = re.search(r'^VOZ = "([^"]+)"', v, re.M).group(1)
    frases = json.load(open(os.path.join(AQUI, f"narracion-{VAR}.json"))); out = []
    for n, fr in enumerate(frases):
        k = hashlib.sha1(f"{voz}|eleven_v4|0.5|{fr['texto']}".encode()).hexdigest()[:12]
        a = json.load(open(os.path.join(AQUI, "voz", "cache", k + ".json")))["alignment"]
        ch, st = a["characters"], a["character_start_times_seconds"]
        ini = max(0.0, st[0] - 0.03); off = 0.25 if n == 0 else 0.0
        pal, tp = "", None
        for c, t in zip(ch + [" "], st + [st[-1]]):
            if c.isspace():
                if pal: out.append((INI[n] + off + tp - ini, pal.strip(".,:;…¿?¡!").replace("Dái-se", "DAISE")))  # la voz dice «Dái-se» (se escucha la E)
                pal = ""; continue
            if not pal: tp = t
            pal += c
    return out
PAL = _palabras()


SIN_LUGAR = []


def subtitulo(L, t, y=None):
    """la palabra que se dice; va arriba del producto (que va abajo en la toma) y nunca encima de otro texto o tarjeta:
    si su lugar está ocupado, busca el hueco libre más cercano"""
    if y is None: y = 1700
    act = [(t0, w) for t0, w in PAL if t0 <= t]
    if not act or t > PAL[-1][0] + 0.8: return
    t0, w = act[-1]
    clave = w in CLAVE
    im = _sombra(bagel(w, 140)) if clave else _sombra(b.linea(w, "ExtraBold", 70, WHITE))
    caja = im.getchannel("A").point(lambda v: 255 if v > 90 else 0).getbbox() or (0, 0, im.width, im.height)
    hw, hh = (caja[2] - caja[0]) / 2, (caja[3] - caja[1]) / 2
    for yy in sorted(range(400, 1841, 20), key=lambda v: abs(v - y)):  # el hueco libre más cercano a su lugar
        if not choca((W / 2 - hw, yy - hh, W / 2 + hw, yy + hh)): y = yy; break
    else:
        SIN_LUGAR.append(round(t, 2))  # no encontró hueco (se reporta al terminar)
    if clave: _pon(L, im, W / 2, y, *b.entra(t, t0, 0.3))
    else: _pon(L, im, W / 2, y)


# ---------------- productos: foto oficial en tarjeta blanca redonda ----------------
_cache = {}
def tarjeta(foto, nombre, abajo=None, ancho=440, color_abajo=ROSA, prop=1.2):
    k = (foto, nombre, abajo, ancho, prop)
    if k in _cache: return _cache[k]
    alto_foto = int(ancho * prop)
    im = Image.open(os.path.join(AQUI, "fotos", foto + ".jpg")).convert("RGB")
    im = ImageOps.fit(im, (ancho - 40, alto_foto - 40), Image.LANCZOS, centering=(0.5, 0.45))
    sz = 40 if ancho >= 400 else 34
    lineas = [nombre]
    if b.linea(nombre, "ExtraBold", sz, NEGRO).width > ancho - 40 and " " in nombre:  # en dos renglones
        p = nombre.split(" "); k = max(1, len(p) // 2) if len(p) > 2 else 1
        if len(p) == 3: k = 2 if len(p[0]) + len(p[1]) < len(p[1]) + len(p[2]) else 1
        lineas = [" ".join(p[:k]), " ".join(p[k:])]
    ls = [b.linea(x, "ExtraBold", sz, NEGRO) for x in lineas]
    ls = [x.resize((ancho - 40, int(x.height * (ancho - 40) / x.width)), Image.LANCZOS) if x.width > ancho - 40 else x for x in ls]
    tx = Image.new("RGBA", (max(x.width for x in ls), sum(x.height for x in ls)))
    y = 0
    for x in ls: tx.alpha_composite(x, ((tx.width - x.width) // 2, y)); y += x.height
    pa = b.pastilla(abajo, "ExtraBold", 36 if ancho >= 400 else 30, color_abajo, WHITE, padx=22, pady=8) if abajo else None
    if pa and pa.width > ancho - 20: pa = pa.resize((ancho - 20, int(pa.height * (ancho - 20) / pa.width)), Image.LANCZOS)
    alto = alto_foto + tx.height + 30 + (pa.height + 16 if pa else 0)
    c = Image.new("RGBA", (ancho + 60, alto + 60))
    sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 42, ancho + 30, alto + 42), 44, fill=120)
    c.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(c); d.rounded_rectangle((30, 30, ancho + 30, alto + 30), 44, fill=WHITE)
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 30, fill=255)
    c.paste(im, (50, 50), m)
    c.alpha_composite(tx, (30 + (ancho - tx.width) // 2, 30 + alto_foto))
    if pa: c.alpha_composite(pa, (30 + (ancho - pa.width) // 2, 30 + alto_foto + tx.height + 14))
    _cache[k] = c; return c


def foto_tarjeta(foto, ancho, prop=1.2):
    """solo la foto del producto en tarjeta blanca redonda (para las portadas): esquinas completas y sin espacio vacío"""
    h = int(ancho * prop)
    im = Image.open(os.path.join(AQUI, "fotos", foto + ".jpg")).convert("RGB")
    im = ImageOps.fit(im, (ancho - 32, h - 32), Image.LANCZOS, centering=(0.5, 0.45))
    c = Image.new("RGBA", (ancho + 60, h + 60))
    sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 42, ancho + 30, h + 42), 36, fill=120)
    c.putalpha(sh.filter(ImageFilter.GaussianBlur(16)))
    ImageDraw.Draw(c).rounded_rectangle((30, 30, ancho + 30, h + 30), 36, fill=WHITE)
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 24, fill=255)
    c.paste(im, (46, 46), m)
    return c


def pon_tarjeta(L, tj, cx, cy, t, t0, giro=0):
    if t < t0 or FOTO["k"]: return  # con la foto grande encima no van las tarjetas chicas
    s, a = b.entra(t, t0, 0.4)
    if giro: tj = tj.rotate(giro, expand=True, resample=Image.BICUBIC)
    b.pon(L, tj, cx, cy, s, a)


def chips(L, textos, cy, t, t0, sep=0.25):
    """notas del aroma como pastillitas blancas que van entrando"""
    ims = [b.pastilla(x, "Bold", 44, WHITE, NEGRO, padx=24, pady=10) for x in textos]
    total = sum(i.width for i in ims) + 20 * (len(ims) - 1)
    if total > 1040:  # que quepan a lo ancho
        k = 1040 / total; ims = [i.resize((int(i.width * k), int(i.height * k)), Image.LANCZOS) for i in ims]
        total = sum(i.width for i in ims) + 20 * (len(ims) - 1)
    x = W / 2 - total / 2
    for j, im in enumerate(ims):
        if t >= t0 + j * sep: b.pon(L, im, x + im.width / 2, cy, *b.entra(t, t0 + j * sep, 0.3))
        x += im.width + 20


def cierre(L, t, t0, arriba, abajo):
    """final sin «Comenta GRUPO»: guardar o comentar algo concreto, y alpacca.mx"""
    im = Image.new("RGBA", (900, 330)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 899, 329), 50, fill=WHITE)
    a = b.linea(arriba, "ExtraBold", 74, ROSA); a = a.resize((min(a.width, 840), int(a.height * min(a.width, 840) / a.width)), Image.LANCZOS)
    im.alpha_composite(a, ((900 - a.width) // 2, 70))
    z = b.linea(abajo, "Bold", 48, NEGRO); z = z.resize((min(z.width, 840), int(z.height * min(z.width, 840) / z.width)), Image.LANCZOS)
    im.alpha_composite(z, ((900 - z.width) // 2, 200))
    b.pon(L, _sombra(im, 14, 110), W / 2, 820, *b.entra(t, t0, 0.4))
    pas(L, "alpacca.mx", 1080, t, t0 + 0.5, sz=66)


# ---------------- capas de cada variante ----------------
def etapa(t): return next(i for i in range(len(T)) if t < INI[i + 1] or i == len(T) - 1)


def sello(L, txt, t, t0, cy=1290, bg=ROSA, cx=W / 2 + 200):
    """el precio como estampa que cae girada"""
    if t < t0: return
    im = _sombra(b.pastilla(txt, "ExtraBold", 84, bg, WHITE, padx=40, pady=14), 10, 120).rotate(-6, expand=True, resample=Image.BICUBIC)
    cx = min(max(cx, im.width / 2 + 10), W - im.width / 2 - 10)  # que siempre quepa completo en la pantalla
    s, a = b.entra(t, t0, 0.35); b.pon(L, im, cx, cy, 1.6 - 0.6 * b.ease((t - t0) / 0.25), a)


def rejilla(L, t, fotos, t0s, numeros=None, y0=520, cols=3, ancho=300, etiqueta=True):
    """tarjetas de los sets (con su número y cuántas piezas trae); cada una entra en su momento"""
    paso = (W - 60) / cols
    for k, (f, t0) in enumerate(zip(fotos, t0s)):
        if t < t0: continue
        tj = foto_tarjeta(f, ancho, 1.2)
        c = Image.new("RGBA", (tj.width, tj.height + (60 if etiqueta else 0))); c.alpha_composite(tj); d = ImageDraw.Draw(c)
        col = ROSA if f in JUICY else NEGRO
        if numeros:
            d.ellipse((14, 14, 92, 92), fill=col, outline=WHITE, width=5)
            d.text((53, 52), str(numeros[k]), font=ImageFont.truetype(os.path.join(FUENTES, "BagelFatOne-Regular.ttf"), 50), fill=WHITE, anchor="mm")
        if etiqueta:
            pz = b.pastilla(FOTOS[f][1].split(":")[0], "ExtraBold", 30 if ancho >= 260 else 24, col, WHITE, padx=16, pady=6)
            c.alpha_composite(pz, ((c.width - pz.width) // 2, tj.height - 30))
        b.pon(L, c, 30 + paso * (k % cols + 0.5), y0 + (k // cols) * (c.height + 20), *b.entra(t, t0, 0.35))


JUICY = ["p6107", "p6108", "p6111", "p6112", "p6113", "p6115"]
TR = ["p6106", "p6109", "p6110"]


def capa_regalo(L, t):
    e = etapa(t)
    if e == 0:
        gancho(L, t, "¿No sabes qué regalar?", "🎁 Pijamas Juicy Couture y True Religion", marca(0, 1) - 0.3)
    if e == 1:
        rejilla(L, t, ["p6108", "p6107"], [marca(1, 0) - 0.3, marca(1, 1) - 0.3], y0=1000, cols=2, ancho=420)
        pas(L, "2 piezas: camisa y pantalón", 330, t, marca(1, 0) - 0.3, sz=50, bg=WHITE, fg=NEGRO)
        pas(L, "3 piezas: camisa, short y pantalón", 460, t, marca(1, 1) - 0.3, sz=50)
        pas(L, "🎀 Ya vienen con su moño", 1430, t, marca(1, 2) - 0.2, sz=52, bg=NEGRO)
    if e == 2:
        pas(L, "Precio de etiqueta en EE. UU.", 300, t, INI[2] + 0.2, sz=52, bg=WHITE, fg=NEGRO)
        chips(L, ["2 piezas: MSRP $58", "3 piezas: MSRP $68"], 1560, t, marca(2, 1) - 0.1, sep=0.7)
    if e == 3:
        pas(L, "Conmigo 💗", 330, t, INI[3] + 0.1, sz=60, bg=WHITE, fg=ROSA)
        sello(L, "$699", t, marca(3, 0) - 0.1, cy=520, cx=W / 2)
        pas(L, "cada set · precio de mayoreo", 700, t, marca(3, 1) - 0.1, sz=50, bg=NEGRO)
    if e == 4:
        pas(L, "Apártalo con la mitad", 330, t, marca(4, 0) - 0.1, sz=60)
        pas(L, "y liquidas antes de que te lo envíe", 460, t, marca(4, 1) - 0.1, sz=46, bg=WHITE, fg=NEGRO)
    if e != 1: subtitulo(L, t)


def capa_equipo(L, t):
    e = etapa(t)
    if e == 0:
        gancho(L, t, "¿Juicy o True Religion?", "Elige tu pijama 👇", marca(0, 2) - 0.2)
    if e == 1:
        pas(L, "1 · Juicy coronas", 300, t, INI[1] + 0.1, sz=58)
        chips(L, ["camisa", "short", "pantalón"], 1590, t, marca(1, 1), sep=0.4)
    if e == 2:
        pas(L, "Juicy · 2 piezas: camisa y pantalón", 300, t, INI[2], sz=50)
        rejilla(L, t, ["p6108", "p6111", "p6112", "p6113", "p6115"],
                [marca(2, 0) - 0.2, marca(2, 1) - 0.2, marca(2, 2) - 0.2, marca(2, 2) + 0.3, marca(2, 3) - 0.2],
                [2, 3, 4, 5, 6], y0=640, cols=3, ancho=300)
    if e == 3:
        pas(L, "True Religion · 3 piezas", 300, t, INI[3], sz=56, bg=NEGRO)
        chips(L, ["camisa", "short", "pantalón"], 420, t, marca(3, 0), sep=0.3)
        rejilla(L, t, TR, [marca(3, 1) - 0.2, marca(3, 2) - 0.2, marca(3, 3) - 0.2], [7, 8, 9], y0=760, cols=3, ancho=300)
    if e == 4:
        pas(L, "Todos los sets a", 330, t, INI[4] + 0.1, sz=56, bg=WHITE, fg=NEGRO)
        sello(L, "$699", t, marca(4, 0) - 0.1, cy=520, cx=W / 2)
        pas(L, "Apártalo con la mitad", 700, t, marca(4, 1) - 0.1, sz=52)
    if e == 5:
        pas(L, "Comenta el NÚMERO de tu favorita 👇", 300, t, INI[5], sz=50)
        rejilla(L, t, JUICY + TR, [INI[5] + 0.04 * k for k in range(9)], list(range(1, 10)), y0=600, cols=3, ancho=230)
    if e not in (2, 5): subtitulo(L, t)


def capa_reventa(L, t):
    e = etapa(t)
    if e == 0:
        gancho(L, t, "¿Vendes ropa?", "Esto es lo que más se pide en diciembre", marca(0, 1) - 0.3)
    if e == 1:
        chips(L, ["Juicy Couture", "True Religion"], 330, t, marca(1, 0) + 0.1, sep=0.6)
        pas(L, "✅ Originales, con su etiqueta", 460, t, marca(1, 2) - 0.1, sz=50, bg=WHITE, fg=NEGRO)
    if e == 2:
        pas(L, "Para que tus clientas escojan", 300, t, INI[2], sz=50, bg=WHITE, fg=NEGRO)
        rejilla(L, t, ["p6108", "p6111", "p6107"], [marca(2, 0) - 0.2, marca(2, 0) + 0.3, marca(2, 1) - 0.2], y0=820, cols=3, ancho=320)
    if e == 3:
        sello(L, "$699 c/u", t, marca(3, 0) - 0.1, cy=360, cx=W / 2)
        pas(L, "precio de mayoreo", 550, t, marca(3, 1) - 0.1, sz=52, bg=NEGRO)
        pas(L, "💸 Tú le pones tu precio", 680, t, marca(3, 2) - 0.1, sz=54)
    if e == 4:
        pas(L, "Apártalos con la mitad", 330, t, marca(4, 1) - 0.2, sz=60)
        pas(L, "y liquidas antes de que te los envíe", 460, t, marca(4, 2) - 0.1, sz=46, bg=WHITE, fg=NEGRO)
    if e == 5:
        pas(L, "🎀 Listos para regalar", 330, t, marca(5, 0) - 0.2, sz=60)
        pas(L, "tus clientas no envuelven nada", 460, t, marca(5, 1) - 0.2, sz=48, bg=WHITE, fg=NEGRO)
    if e != 2: subtitulo(L, t)


VERDE_WA = (37, 211, 102)
_qr = {}
def qr_grupo():
    """el QR del grupo (chat.whatsapp.com/Jx4rYqxZvES93A4y4zvfXu, el mismo de la franja de alpacca.mx)"""
    if "qr" not in _qr:
        sys.path.insert(0, os.path.join(RAIZ, "carruseles")); import whatsapp
        _qr["qr"] = whatsapp.tarjeta(420)
    return _qr["qr"]


def invitacion(L, t, e):
    """última frase de los 3 videos, como en los de Bath & Body Works y Victoria's Secret: el QR grande arriba sobre el
    video normal, la pastilla rosa «Únete a mi grupo de WhatsApp» debajo, y luego mayoreo, ofertas y el link"""
    b.pon(L, qr_grupo(), W / 2, 470, *b.entra(t, INI[e] + 0.05, 0.4))
    pas(L, "Únete a mi grupo de WhatsApp 💬", 840, t, INI[e] + 0.25, sz=60, maxw=1020)
    pas(L, "📦 Precio de mayoreo", 980, t, marca(e, 1) - 0.1, sz=54, bg=WHITE, fg=NEGRO)
    pas(L, "🔥 Ofertas exclusivas", 1100, t, marca(e, 2) - 0.1, sz=54, bg=WHITE, fg=NEGRO)
    pas(L, "Link en alpacca.mx 👆", 1230, t, marca(e, 3) - 0.1, sz=58, bg=NEGRO)


ULTIMA = len(T) - 1
_capa = {"regalo": capa_regalo, "equipo": capa_equipo, "reventa": capa_reventa}[VAR]
def CAPA(L, t):
    if etapa(t) == ULTIMA:
        invitacion(L, t, ULTIMA); subtitulo(L, t)
    else: _capa(L, t)

def reparto(e):
    """cuadros de cada toma de la frase e: las que traen segundos los usan, las demás se reparten lo que sobra"""
    n_frase = int(round(INI[e + 1] * FPS)) - int(round(INI[e] * FPS)); tomas = TOMAS[e]
    fijos = [int(round(tm[2] * FPS)) if tm[2] else None for tm in tomas]
    libres = [k for k, x in enumerate(fijos) if x is None]
    resto = n_frase - sum(x for x in fijos if x)
    for k in libres: fijos[k] = resto // len(libres)
    fijos[-1] += n_frase - sum(fijos)
    return fijos


def foto_grande(L, t):
    if not FOTO["k"] or FOTO["k"] == "fondo": return  # "fondo": solo difumina (encima va una rejilla de fotos)
    nom, abajo, col = FOTOS[FOTO["k"]]
    tj = tarjeta(FOTO["k"], nom, abajo or None, ancho=560, color_abajo=col, prop=1.25)
    s_, a_ = b.entra(t, FOTO["t0"], 0.4); b.pon(L, tj, W / 2, 900, s_, a_)


def usa_foto(toma, t):
    k = toma[6] if len(toma) > 6 else None
    if k != FOTO["k"]: FOTO["t0"] = t  # entra con rebote solo cuando cambia
    FOTO["k"] = k


def cuadros():
    f = 0
    for e, tomas in enumerate(TOMAS):
        for toma, n in zip(tomas, reparto(e)):
            fuente, ini, _, cx, cy, z = toma[:6]; usa_foto(toma, f / FPS)
            for L in video(fuente, ini, n, cx, cy, z, FOTO["k"]):
                REG.clear(); L.alpha_composite(SOMBRA); foto_grande(L, f / FPS); CAPA(L, f / FPS); yield L; f += 1


def prueba(ts, ruta):
    """cuadros sueltos para revisar sin hacer todo el video"""
    ims = []
    for tq in ts:
        e = next(i for i in range(len(T)) if tq < INI[i + 1] or i == len(T) - 1)
        ns = reparto(e); dentro = tq - INI[e]; k = 0
        while k < len(ns) - 1 and dentro >= ns[k] / FPS: dentro -= ns[k] / FPS; k += 1
        toma = TOMAS[e][k]; fuente, ini, _, cx, cy, z = toma[:6]; FOTO["k"] = None; usa_foto(toma, tq - dentro)
        L = next(video(fuente, ini + dentro, 1, cx, cy, z, FOTO["k"])); REG.clear(); L.alpha_composite(SOMBRA); foto_grande(L, tq); CAPA(L, tq)
        ims.append(L.convert("RGB").resize((270, 480)))
    c = Image.new("RGB", (270 * min(6, len(ims)), 480 * ((len(ims) + 5) // 6)))
    for j, im in enumerate(ims): c.paste(im, ((j % 6) * 270, (j // 6) * 480))
    c.save(ruta)


PORTADA = {  # (fuente, segundo, renglón 1, renglón 2, pastilla, productos)
    "regalo": ("6117", 3.0, "El regalo que", "SÍ van a usar", "🎁 Pijamas Juicy y True Religion · $699", ["p6107", "p6109", "p6113"]),
    "equipo": ("6116", 150.0, "¿Juicy o", "True Religion?", "Elige tu pijama · $699 c/u 👇", ["p6108", "p6106", "p6111", "p6110"]),
    "reventa": ("6117", 8.0, "¿Vendes ropa?", "Esto se vende en diciembre", "Pijamas de marca a $699 (mayoreo)", ["p6107", "p6106", "p6115"]),
}


def portada():
    """todo dentro de la zona 3:4 que se ve en el perfil (y 240-1680)"""
    fuente, seg, r1, r2, pastilla, prods = PORTADA[VAR]
    L = next(video(fuente, seg, 1)); L.alpha_composite(Image.new("RGBA", (W, H), (20, 10, 16, 90)))
    for j, txt in enumerate((r1, r2)):
        im = _sombra(bagel(txt.replace(" 🎯", "").replace(" 🎄", ""), 130, WHITE if j == 0 else ROSA), 14, 190)
        if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
        b.pon(L, im, W / 2, 380 + j * 165)
    pas(L, pastilla, 700, 1, 0, sz=50, bg=NEGRO, maxw=1020)
    # una tarjeta por producto (tantas como dice la portada), solo con la foto, sin espacio vacío abajo
    n = len(prods); ancho = 290 if n <= 3 else 220; paso = (W - 60) / n
    giros = [-4, 0, 4] if n == 3 else [-4, -1, 1, 4]
    for j, f in enumerate(prods):
        tj = foto_tarjeta(f, ancho, 1.25).rotate(giros[j], expand=True, resample=Image.BICUBIC)
        b.pon(L, tj, 30 + paso * (j + 0.5), 1110 + (30 if j in (0, n - 1) else 0))
    pas(L, "alpacca.mx", 1560, 1, 0, sz=62)
    L.convert("RGB").save(os.path.join(AQUI, f"portada-{VAR}.jpg"), quality=92)


def revisa():
    """busca en todo el video cuadros donde dos cosas (textos, tarjetas, precios) se enciman"""
    malos = []
    for k in range(0, int(INI[-1] * FPS), 3):
        t = k / FPS; e = next(i for i in range(len(T)) if t < INI[i + 1] or i == len(T) - 1)
        ns = reparto(e); d = t - INI[e]; j = 0
        while j < len(ns) - 1 and d >= ns[j] / FPS: d -= ns[j] / FPS; j += 1
        FOTO["k"] = None; usa_foto(TOMAS[e][j], t - d)
        L = Image.new("RGBA", (W, H)); REG.clear(); foto_grande(L, t); n0 = len(REG)
        globals()["subtitulo"], real = (lambda *a, **k: None), subtitulo
        CAPA(L, t); globals()["subtitulo"] = real
        for a_ in range(len(REG)):
            for b_ in range(a_ + 1, len(REG)):
                r, q = REG[a_], REG[b_]
                if not (r[2] < q[0] or q[2] < r[0] or r[3] < q[1] or q[3] < r[1]):
                    ov = (min(r[2], q[2]) - max(r[0], q[0])) * (min(r[3], q[3]) - max(r[1], q[1]))
                    if ov > 400: malos.append((round(t, 1), e, [int(v) for v in r], [int(v) for v in q]))
    vistos = set()
    for m in malos:
        clave = (m[1], tuple(m[2][:2]), tuple(m[3][:2]))
        if clave not in vistos: vistos.add(clave); print(m)
    print("encimados:", len(malos))


if __name__ == "__main__" and ARGS[:1] == ["revisa"]:
    revisa()
elif __name__ == "__main__" and ARGS[:1] == ["portada"]:
    portada()
elif __name__ == "__main__" and ARGS[:1] == ["prueba"]:
    prueba([float(x) for x in ARGS[1:-1]], ARGS[-1])
elif __name__ == "__main__":
    SFX = [(0.05, "glitter")] + [(INI[e] + m, "pop") for e in range(len(T)) for m in T[e]["marcas"] if INI[e] + m > 0.3]
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in cuadros():
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait()
    final = OUT.replace(".mp4", "-voz.mp4")
    ins, fil = ["-i", OUT, "-i", os.path.join(AQUI, f"voz-{VAR}", "narracion.wav")], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=0.3[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final, f"{cnt / FPS:.1f}s")
    print("subtítulo sin hueco en", len(SIN_LUGAR), "cuadros", SIN_LUGAR[:10])
