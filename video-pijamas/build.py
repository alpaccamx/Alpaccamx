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
Diseño navideño en los colores y la letra de la marca Alpacca (el boutique, el juvenil y el navideño rojo/verde no le gustaron): titulares Anton con contorno, stickers de colores,
precio en estrella amarilla, corazones y estrellas, fotos con rebote y subtítulos gruesos con contorno.
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
        pas(L, "Conmigo 💗", 290, t, INI[3] + 0.1, sz=60, bg=WHITE, fg=ROSA)
        sello(L, "$699", t, marca(3, 0) - 0.1, cy=600, cx=W / 2)
        pas(L, "cada set · precio de mayoreo", 780, t, marca(3, 1) - 0.1, sz=50, bg=NEGRO)
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
        pas(L, "Todos los sets a", 290, t, INI[4] + 0.1, sz=56, bg=WHITE, fg=NEGRO)
        sello(L, "$699", t, marca(4, 0) - 0.1, cy=600, cx=W / 2)
        pas(L, "Apártalo con la mitad", 780, t, marca(4, 1) - 0.1, sz=52)
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
        rejilla(L, t, ["p6108", "p6111", "p6107"], [marca(2, 0) - 0.2, marca(2, 0) + 0.3, marca(2, 1) - 0.2], y0=820, cols=3, ancho=290)
    if e == 3:
        sello(L, "$699 c/u", t, marca(3, 0) - 0.1, cy=420, cx=W / 2)
        pas(L, "precio de mayoreo", 650, t, marca(3, 1) - 0.1, sz=52, bg=NEGRO)
        pas(L, "💸 Tú le pones tu precio", 770, t, marca(3, 2) - 0.1, sz=54)
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



# ======================= DISEÑO «BOUTIQUE» (pijamas) =======================
# Distinto a los videos anteriores (pastillas rosas y letra Bagel): letras de boutique (Cormorant + Inter Display en
# mayúsculas espaciadas), etiquetas de ropa colgando de un hilo dorado, precio en sello redondo con borde dorado, fotos
# tipo polaroid con cinta, subtítulos en frase (no una palabra a la vez), colores crema, cacao, rosa empolvado y oro.
import re as _re, unicodedata as _ud
CREMA, CACAO, EMPOLVADO, ORO = (250, 243, 234), (58, 40, 38), (232, 178, 184), (201, 164, 92)
_COR = os.path.join(FUENTES, "Cormorant.ttf")
_INT = "/usr/share/fonts/opentype/inter/InterDisplay-{}.otf"
_fcache = {}
def fcor(sz, peso="Bold"):
    k = ("c", sz, peso)
    if k not in _fcache:
        f = ImageFont.truetype(_COR, int(sz)); f.set_variation_by_name(peso); _fcache[k] = f
    return _fcache[k]
def fint(sz, peso="SemiBold"):
    k = ("i", sz, peso)
    if k not in _fcache: _fcache[k] = ImageFont.truetype(_INT.format(peso), int(sz))
    return _fcache[k]
def sin_emoji(s): return "".join(c for c in s if not (ord(c) >= 0x2190 and _ud.category(c) in ("So", "Sk", "Mn", "Cf"))).replace("  ", " ").strip()
def trazo(txt, f, fill, track=0):
    """texto como imagen (con espaciado entre letras opcional)"""
    w = int(sum(f.getlength(c) + track for c in txt)) + 10; asc, desc = f.getmetrics()
    im = Image.new("RGBA", (max(w, 1), asc + desc + 6)); d = ImageDraw.Draw(im); x = 3
    for c in txt: d.text((x, 2), c, font=f, fill=fill); x += f.getlength(c) + track
    return im.crop(im.getbbox() or (0, 0, 1, 1))
def _suave(t, t0, dur=0.45):
    if t < t0: return 0.0
    return b.ease((t - t0) / dur)


def etiqueta_ropa(s, sz=44, oscura=False, upper=True):
    """etiqueta de ropa: rectángulo con esquina recortada, ojillo y texto en mayúsculas espaciadas"""
    s = sin_emoji(s); s = s.upper() if upper else s
    fondo, tinta = (CACAO, CREMA) if oscura else (CREMA, CACAO)
    tx = trazo(s, fint(sz * 0.8, "SemiBold"), tinta, track=sz * 0.07)
    if tx.width > 900: tx = tx.resize((900, int(tx.height * 900 / tx.width)), Image.LANCZOS)
    h = int(sz * 1.6); w = tx.width + int(sz * 1.9)
    im = Image.new("RGBA", (w + 24, h + 24)); d = ImageDraw.Draw(im)
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((14, 18, w + 10, h + 18), 10, fill=90)
    im.putalpha(sh.filter(ImageFilter.GaussianBlur(7)))
    c = h // 2
    d.polygon([(12 + c * 0.55, 12), (w + 12, 12), (w + 12, h + 12), (12 + c * 0.55, h + 12), (12, 12 + c)], fill=fondo + (255,))
    d.ellipse((12 + c * 0.55 - 2, 12 + c - 7, 12 + c * 0.55 + 12, 12 + c + 7), fill=(0, 0, 0, 0), outline=ORO + (255,), width=3)
    d.line((12 + int(c * 0.55) + int(sz * 0.6), 20, 12 + int(c * 0.55) + int(sz * 0.6), h + 4), fill=ORO + (200,), width=2)
    im.alpha_composite(tx, (12 + int(sz * 1.25), 12 + (h - tx.height) // 2))
    return im


def pas(L, s, cy, t, t0, sz=58, bg=ROSA, fg=WHITE, n="ExtraBold", maxw=1000, cx=W / 2):
    if t < t0: return
    im = etiqueta_ropa(s, sz=min(sz, 60) * 0.95, oscura=(bg == NEGRO or bg == ROSA and fg == WHITE and False))
    if bg == ROSA: im = etiqueta_ropa(s, sz=min(sz, 60) * 0.95, oscura=True)
    if im.width > maxw + 40: im = im.resize((maxw + 40, int(im.height * (maxw + 40) / im.width)), Image.LANCZOS)
    k = _suave(t, t0)
    b.pon(L, im, cx - (1 - k) * 60, cy, 1.0, k)


def gancho(L, t, arriba, abajo, t_abajo):
    """titular de revista: letras Cormorant grandes en crema, alineadas a la izquierda, con raya dorada"""
    arriba = sin_emoji(arriba)
    palabras = arriba.split(); lineas = []; cur = ""
    for p in palabras:
        if fcor(132).getlength((cur + " " + p).strip()) > 980 and cur: lineas.append(cur); cur = p
        else: cur = (cur + " " + p).strip()
    lineas.append(cur)
    y = 300
    for ln in lineas:
        im = _sombra(trazo(ln, fcor(132, "Bold"), CREMA + (255,)), 12, 170)
        b.pon(L, im, 50 + im.width / 2, y, 1.0, 1.0); y += 132
    raya = Image.new("RGBA", (220, 6), ORO + (255,)); b.pon(L, raya, 70 + 110, y - 30, 1.0, 1.0)
    if abajo: pas(L, abajo, y + 50, t, t_abajo, sz=50, cx=70 + 470)


def sello(L, txt, t, t0, cy=1290, bg=ROSA, cx=W / 2 + 200):
    """precio en sello redondo crema con doble borde dorado"""
    if t < t0: return
    txt = sin_emoji(txt); r = 150
    im = Image.new("RGBA", (2 * r + 30, 2 * r + 30)); d = ImageDraw.Draw(im)
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).ellipse((15, 22, 2 * r + 15, 2 * r + 22), fill=110)
    im.putalpha(sh.filter(ImageFilter.GaussianBlur(10)))
    d.ellipse((15, 15, 2 * r + 15, 2 * r + 15), fill=CREMA + (255,), outline=ORO + (255,), width=6)
    d.ellipse((31, 31, 2 * r - 1, 2 * r - 1), outline=ORO + (255,), width=2)
    principal = txt.split(" ")[0]; resto = txt[len(principal):].strip()
    f = fcor(118 if len(principal) <= 4 else 96, "Bold")
    d.text((r + 15, r + 5 - (12 if resto else 0)), principal, font=f, fill=CACAO, anchor="mm")
    if resto: d.text((r + 15, r + 78), resto.upper(), font=fint(28, "SemiBold"), fill=ORO, anchor="mm")
    cx = min(max(cx, r + 30), W - r - 30)
    k = _suave(t, t0, 0.35); im = im.rotate(-8 * (1 - k) - 4, expand=True, resample=Image.BICUBIC)
    b.pon(L, im, cx, cy, 0.85 + 0.15 * k, k)


def chips(L, textos, cy, t, t0, sep=0.25):
    """palabras sueltas en mayúsculas espaciadas separadas por puntos dorados (sin pastillas)"""
    textos = [sin_emoji(x).upper() for x in textos]
    f = fint(36, "SemiBold"); partes = []
    for j, x in enumerate(textos):
        if t >= t0 + j * sep: partes.append(x)
    if not partes: return
    sepi = trazo("·", f, ORO + (255,), 0)
    gap = Image.new("RGBA", (26, 1))
    ims = []
    for j, x in enumerate(partes):
        if j: ims += [gap, sepi, gap]
        ims.append(trazo(x, f, CREMA + (255,), 5))
    w = sum(i.width for i in ims); h = max(i.height for i in ims)
    im = Image.new("RGBA", (w + 60, h + 34)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w + 59, h + 33), 8, fill=CACAO + (215,))
    x = 30
    for i in ims: im.alpha_composite(i, (x, 17 + (h - i.height) // 2)); x += i.width
    if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
    b.pon(L, im, W / 2, cy, 1.0, 1.0)


def polaroid(foto, ancho, pie=None, num=None, giro=0, prop=1.2):
    """foto del set como polaroid con cinta arriba; abajo, el número y cuántas piezas trae"""
    h = int(ancho * prop); marco = max(14, ancho // 18); abajo = int(ancho * 0.30)
    im = Image.open(os.path.join(AQUI, "fotos", foto + ".jpg")).convert("RGB")
    im = ImageOps.fit(im, (ancho, h), Image.LANCZOS, centering=(0.5, 0.45))
    W_, H_ = ancho + 2 * marco, h + marco + abajo
    c = Image.new("RGBA", (W_ + 40, H_ + 60))
    sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rectangle((22, 42, W_ + 22, H_ + 46), fill=120)
    c.putalpha(sh.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(c); d.rectangle((20, 30, W_ + 20, H_ + 30), fill=(252, 250, 246, 255))
    c.paste(im, (20 + marco, 30 + marco))
    if num is not None or pie:
        ty = 30 + marco + h + abajo // 2
        if num is not None:
            d.text((20 + marco + 4, ty), f"N.º {num}", font=fcor(abajo * 0.62, "Bold"), fill=CACAO, anchor="lm")
        if pie:
            p = trazo(sin_emoji(pie).upper(), fint(max(16, abajo * 0.26), "SemiBold"), ORO + (255,), 3)
            if p.width > ancho * (0.55 if num is not None else 0.95):
                k = ancho * (0.55 if num is not None else 0.95) / p.width; p = p.resize((int(p.width * k), max(1, int(p.height * k))), Image.LANCZOS)
            c.alpha_composite(p, (20 + marco + ancho - p.width if num is not None else 20 + (W_ - p.width) // 2, ty - p.height // 2))
    cinta = Image.new("RGBA", (int(ancho * 0.42), 44), EMPOLVADO + (190,))
    cinta = cinta.rotate(-6, expand=True, resample=Image.BICUBIC)
    c.alpha_composite(cinta, ((c.width - cinta.width) // 2, 8))
    return c.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else c


def foto_tarjeta(foto, ancho, prop=1.2):
    return polaroid(foto, ancho - 30, prop=prop)


def tarjeta(foto, nombre, abajo=None, ancho=440, color_abajo=ROSA, prop=1.2):
    return polaroid(foto, ancho - 40, pie=(nombre + (" · " + abajo if abajo else "")), prop=prop)


def rejilla(L, t, fotos, t0s, numeros=None, y0=520, cols=3, ancho=300, etiqueta=True):
    paso = (W - 60) / cols
    giros = [-3, 2, -2, 3, -1, 2, -3, 1, -2]
    for k, (f, t0) in enumerate(zip(fotos, t0s)):
        if t < t0: continue
        pz = FOTOS[f][1].split(":")[0] if etiqueta else None
        c = polaroid(f, ancho - 30, pie=pz, num=numeros[k] if numeros else None, giro=giros[k % len(giros)])
        kk = _suave(t, t0, 0.4)
        b.pon(L, c, 30 + paso * (k % cols + 0.5), y0 + (k // cols) * (c.height - 10) + (1 - kk) * 50, 1.0, kk)


def foto_grande(L, t):
    if not FOTO["k"] or FOTO["k"] == "fondo": return
    nom, abajo, col = FOTOS[FOTO["k"]]
    c = polaroid(FOTO["k"], 520, pie=nom + " · " + abajo.split(":")[0], giro=-2, prop=1.25)
    k = _suave(t, FOTO["t0"], 0.5)
    b.pon(L, c, W / 2, 880 + (1 - k) * 60, 1.0, k)


# subtítulos en frase: hasta 4 palabras, letra Cormorant crema; las palabras clave en rosa empolvado
_FR = []
def _frases():
    cur = []
    for t0, w in PAL:
        cur.append((t0, w))
        if len(cur) >= 4 or w.endswith((",", ".", ":", "?", "!")): _FR.append(cur); cur = []
    if cur: _FR.append(cur)
def subtitulo(L, t, y=None):
    if not _FR: _frases()
    act = [fr for fr in _FR if fr[0][0] <= t]
    if not act or t > PAL[-1][0] + 0.8: return
    fr = act[-1]
    f = fcor(78, "SemiBold"); esp = f.getlength(" ")
    pal = [w.strip(".,:;") for _, w in fr]
    ww = int(sum(f.getlength(p) for p in pal) + esp * (len(pal) - 1)) + 20; asc, desc = f.getmetrics()
    im = Image.new("RGBA", (ww, asc + desc + 20)); d = ImageDraw.Draw(im); x = 10
    for p in pal:  # todas en la misma línea base
        d.text((x, 10 + asc), p, font=f, fill=(EMPOLVADO if p.strip("¿?¡!") in CLAVE else CREMA), anchor="ls"); x += f.getlength(p) + esp
    im = _sombra(im.crop(im.getbbox()), 10, 200)
    if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
    yy0 = 1720 if y is None else y
    caja = im.getchannel("A").point(lambda v: 255 if v > 90 else 0).getbbox() or (0, 0, im.width, im.height)
    hw, hh2 = (caja[2] - caja[0]) / 2, (caja[3] - caja[1]) / 2
    for yy in sorted(range(400, 1841, 20), key=lambda v: abs(v - yy0)):
        if not choca((W / 2 - hw, yy - hh2, W / 2 + hw, yy + hh2)): yy0 = yy; break
    else: SIN_LUGAR.append(round(t, 2))
    _pon(L, im, W / 2, yy0)


def degradado():
    """viñeta cálida arriba y abajo (para que se lean las letras crema)"""
    g = Image.new("L", (1, H))
    for y in range(H):
        a = max(0, 1 - y / 700) * 150 + max(0, (y - 1300) / 620) * 140
        g.putpixel((0, y), int(min(255, a)))
    im = Image.new("RGBA", (W, H), (36, 22, 20, 255)); im.putalpha(g.resize((W, H))); return im
SOMBRA = degradado()


def invitacion(L, t, e):
    """cierre: QR grande arriba (como antes) y debajo las etiquetas del grupo de WhatsApp"""
    b.pon(L, qr_grupo(), W / 2, 470, *b.entra(t, INI[e] + 0.05, 0.4))
    pas(L, "Únete a mi grupo de WhatsApp", 840, t, INI[e] + 0.25, sz=58)
    pas(L, "Precio de mayoreo", 975, t, marca(e, 1) - 0.1, sz=50, bg=WHITE, fg=NEGRO)
    pas(L, "Ofertas exclusivas", 1095, t, marca(e, 2) - 0.1, sz=50, bg=WHITE, fg=NEGRO)
    pas(L, "Link en alpacca.mx", 1225, t, marca(e, 3) - 0.1, sz=56, bg=NEGRO)


def portada():
    """portada boutique: todo dentro de la zona 3:4 que se ve en el perfil (y 240-1680)"""
    fuente, seg, r1, r2, pastilla, prods = PORTADA[VAR]
    L = next(video(fuente, seg, 1)); L.alpha_composite(Image.new("RGBA", (W, H), (30, 18, 16, 110)))
    k = trazo("PIJAMAS · JUICY COUTURE · TRUE RELIGION", fint(30, "SemiBold"), ORO + (255,), 6)
    b.pon(L, k, W / 2, 300)
    for j, txt in enumerate((r1, r2)):
        im = _sombra(trazo(sin_emoji(txt), fcor(140, "Bold"), (CREMA if j == 0 else EMPOLVADO) + (255,)), 14, 190)
        if im.width > 1020: im = im.resize((1020, int(im.height * 1020 / im.width)), Image.LANCZOS)
        b.pon(L, im, W / 2, 420 + j * 150)
    b.pon(L, etiqueta_ropa(pastilla, 46, oscura=False), W / 2, 720)
    n = len(prods); ancho = 300 if n <= 3 else 230; paso = (W - 60) / n
    giros = [-4, 2, 4] if n == 3 else [-4, -1, 2, 4]
    for j, f in enumerate(prods):
        b.pon(L, polaroid(f, ancho, giro=giros[j]), 30 + paso * (j + 0.5), 1150 + (25 if j in (0, n - 1) else 0))
    sello(L, "$699 c/u", 1, 0, cy=1500, cx=W - 190)
    b.pon(L, trazo("alpacca.mx", fcor(70, "Bold"), CREMA + (255,)), 300, 1530)
    L.convert("RGB").save(os.path.join(AQUI, f"portada-{VAR}.jpg"), quality=92)



# ======================= DISEÑO «JUVENIL» (pijamas, elegido por Mae) =======================
# Llamativo estilo TikTok y distinto a los videos anteriores: titulares Anton gigantes en blanco con contorno rosa,
# etiquetas tipo sticker en colores vivos (rosa chicle, amarillo, lila, aqua) con borde blanco grueso y un poco
# giradas, precio dentro de una estrella amarilla, corazones y estrellitas que laten, fotos con borde blanco y sombra
# de color que entran con rebote, subtítulos gruesos con contorno (las palabras clave en amarillo).
import math as _m
CHICLE, AMARILLO, LILA, AQUA, TINTA = (255, 64, 150), (255, 214, 0), (170, 120, 255), (0, 200, 200), (25, 15, 30)
COLORES = [(CHICLE, WHITE), (AMARILLO, TINTA), (LILA, WHITE), (AQUA, TINTA)]
_ANTON = os.path.join(FUENTES, "Anton-Regular.ttf")
def fanton(sz):
    k = ("a", int(sz))
    if k not in _fcache: _fcache[k] = ImageFont.truetype(_ANTON, int(sz))
    return _fcache[k]
def fblack(sz):
    k = ("b", int(sz))
    if k not in _fcache: _fcache[k] = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf", int(sz))
    return _fcache[k]
def contorno(txt, f, fill, stroke, sw):
    asc, desc = f.getmetrics(); w = int(f.getlength(txt)) + 4 * sw + 10
    im = Image.new("RGBA", (w, asc + desc + 4 * sw)); d = ImageDraw.Draw(im)
    d.text((2 * sw, 2 * sw), txt, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke)
    return im.crop(im.getbbox())
def rebote(t, t0, dur=0.45):
    if t < t0: return 0.0, 0.0
    return b.back((t - t0) / dur), min(1.0, (t - t0) / 0.12)
_ncolor = {}
def color_de(s):
    if s not in _ncolor: _ncolor[s] = COLORES[len(_ncolor) % len(COLORES)]
    return _ncolor[s]


def sticker(s, sz=60, colores=None, giro=0):
    """texto en sticker: fondo de color vivo, borde blanco grueso y sombra dura"""
    s = sin_emoji(s)
    fondo, tinta = colores or color_de(s)
    tx = contorno(s, fblack(sz), tinta, tinta, 0) if True else None
    if tx.width > 940: tx = tx.resize((940, int(tx.height * 940 / tx.width)), Image.LANCZOS)
    px, py = int(sz * 0.55), int(sz * 0.32); w, h = tx.width + 2 * px, tx.height + 2 * py
    im = Image.new("RGBA", (w + 30, h + 30)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((12, 14, w + 12, h + 14), h // 3, fill=TINTA + (150,))  # sombra dura
    d.rounded_rectangle((4, 4, w + 4, h + 4), h // 3, fill=WHITE + (255,))
    d.rounded_rectangle((10, 10, w - 2, h - 2), h // 3 - 4, fill=fondo + (255,))
    im.alpha_composite(tx, (4 + px, 4 + py))
    return im.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else im


_giros = {}
def pas(L, s, cy, t, t0, sz=58, bg=ROSA, fg=WHITE, n="ExtraBold", maxw=1000, cx=W / 2):
    if t < t0: return
    if s not in _giros: _giros[s] = [-3, 2, -2, 3][len(_giros) % 4]
    col = (TINTA, WHITE) if bg == NEGRO else ((WHITE, CHICLE) if bg == WHITE else None)
    im = sticker(s, sz=max(62, min(sz * 1.25, 80)), colores=col or color_de(s), giro=_giros[s])
    if im.width > maxw + 60: im = im.resize((maxw + 60, int(im.height * (maxw + 60) / im.width)), Image.LANCZOS)
    cy = libre(im, cx, cy)
    b.pon(L, im, cx, cy, *rebote(t, t0))


def libre(im, cx, cy, margen=28):  # margen para el rebote al entrar
    """si ya hay algo en ese lugar (otra etiqueta, el precio, una foto), baja hasta el primer hueco"""
    caja = im.getchannel("A").point(lambda v: 255 if v > 90 else 0).getbbox() or (0, 0, im.width, im.height)
    w2, h2 = (caja[2] - caja[0]) / 2, (caja[3] - caja[1]) / 2
    for yy in range(int(cy), 1700, 10):
        if not choca((cx - w2, yy - h2, cx + w2, yy + h2), margen): return yy
    return cy


def corazon(sz, col):
    im = Image.new("RGBA", (sz, sz)); d = ImageDraw.Draw(im); r = sz * 0.27
    d.ellipse((sz * 0.06, sz * 0.12, sz * 0.06 + 2 * r, sz * 0.12 + 2 * r), fill=col)
    d.ellipse((sz * 0.94 - 2 * r, sz * 0.12, sz * 0.94, sz * 0.12 + 2 * r), fill=col)
    d.polygon([(sz * 0.08, sz * 0.36), (sz * 0.92, sz * 0.36), (sz * 0.5, sz * 0.92)], fill=col)
    return im
def estrella(sz, col, puntas=5, hueco=0.45):
    im = Image.new("RGBA", (sz, sz)); c = sz / 2
    pts = [(c + (c - 2 if k % 2 == 0 else (c - 2) * hueco) * _m.cos(_m.pi * k / puntas - _m.pi / 2),
            c + (c - 2 if k % 2 == 0 else (c - 2) * hueco) * _m.sin(_m.pi * k / puntas - _m.pi / 2)) for k in range(2 * puntas)]
    ImageDraw.Draw(im).polygon(pts, fill=col); return im
def adornos(L, t, y=300):
    """corazones y estrellitas que laten alrededor del titular"""
    for k, (x, yy, f, sz, col) in enumerate([(70, y - 140, corazon, 70, CHICLE), (1000, y - 120, estrella, 80, AMARILLO),
                                              (1010, y + 170, corazon, 56, LILA), (60, y + 210, estrella, 54, AQUA)]):
        p = 1 + 0.12 * _m.sin(t * 5 + k)
        im = f(int(sz * p), col + (255,)); _pon(L, im, x, yy)


def gancho(L, t, arriba, abajo, t_abajo):
    """titular gigante (Anton) en blanco con contorno rosa, girado, ya completo en el primer cuadro"""
    arriba = sin_emoji(arriba); f = fanton(150)
    palabras = arriba.split(); lineas = []; cur = ""
    for p in palabras:
        if f.getlength((cur + " " + p).strip()) > 900 and cur: lineas.append(cur); cur = p
        else: cur = (cur + " " + p).strip()
    lineas.append(cur)
    y = 330
    for j, ln in enumerate(lineas):
        im = contorno(ln.upper(), f, WHITE, CHICLE if j % 2 == 0 else LILA, 10)
        if im.width > 1000: im = im.resize((1000, int(im.height * 1000 / im.width)), Image.LANCZOS)
        im = im.rotate(-3 if j % 2 == 0 else 2, expand=True, resample=Image.BICUBIC)
        b.pon(L, im, W / 2, y); y += im.height - 20
    adornos(L, t, 330)
    if abajo: pas(L, abajo, y + 70, t, t_abajo, sz=54, colores=None) if False else pas(L, abajo, y + 70, t, t_abajo, sz=54)


def sello(L, txt, t, t0, cy=1290, bg=ROSA, cx=W / 2 + 200):
    """precio dentro de una estrella amarilla que gira un poquito"""
    if t < t0: return
    txt = sin_emoji(txt); principal = txt.split(" ")[0]; resto = txt[len(principal):].strip()
    sz = 330; im = estrella(sz, TINTA + (130,), puntas=12, hueco=0.8)
    base = Image.new("RGBA", (sz + 20, sz + 20)); base.alpha_composite(im, (14, 16))
    base.alpha_composite(estrella(sz, WHITE + (255,), puntas=12, hueco=0.8), (4, 4))
    base.alpha_composite(estrella(sz - 24, AMARILLO + (255,), puntas=12, hueco=0.8), (16, 16))
    tx = contorno(principal, fanton(108 if len(principal) <= 4 else 84), TINTA, TINTA, 0)
    base.alpha_composite(tx, ((base.width - tx.width) // 2, (base.height - tx.height) // 2 - (16 if resto else 0)))
    if resto:
        r = contorno(resto.upper(), fblack(30), CHICLE, CHICLE, 0); base.alpha_composite(r, ((base.width - r.width) // 2, base.height // 2 + 48))
    cx = min(max(cx, base.width / 2 + 20), W - base.width / 2 - 20)
    base = base.rotate(8 * _m.sin(t * 2.2), expand=True, resample=Image.BICUBIC)
    b.pon(L, base, cx, cy, *rebote(t, t0, 0.5))


def chips(L, textos, cy, t, t0, sep=0.25):
    ims = [sticker(x, 54, colores=COLORES[(j + 1) % len(COLORES)], giro=[-3, 2, -2][j % 3]) for j, x in enumerate(textos)]
    total = sum(i.width for i in ims) + 10 * (len(ims) - 1)
    if total > 1050:
        k = 1050 / total; ims = [i.resize((int(i.width * k), int(i.height * k)), Image.LANCZOS) for i in ims]; total = 1050
    x = W / 2 - total / 2
    fila = Image.new("RGBA", (int(total), max(i.height for i in ims))); cy = libre(fila, W / 2, cy)
    for j, im in enumerate(ims):
        if t >= t0 + j * sep: b.pon(L, im, x + im.width / 2, cy, *rebote(t, t0 + j * sep))
        x += im.width + 10


def polaroid(foto, ancho, pie=None, num=None, giro=0, prop=1.2):
    """foto del set con borde blanco grueso redondeado, sombra dura de color y número en círculo amarillo"""
    h = int(ancho * prop); borde = max(10, ancho // 22)
    im = Image.open(os.path.join(AQUI, "fotos", foto + ".jpg")).convert("RGB")
    im = ImageOps.fit(im, (ancho, h), Image.LANCZOS, centering=(0.5, 0.45))
    extra = int(ancho * 0.17) if pie else 0
    W_, H_ = ancho + 2 * borde, h + 2 * borde + extra; rr = max(18, ancho // 9)
    c = Image.new("RGBA", (W_ + 40, H_ + 40)); d = ImageDraw.Draw(c)
    sombra = [CHICLE, LILA, AQUA][hash(foto) % 3]
    d.rounded_rectangle((16, 18, W_ + 16, H_ + 18), rr, fill=sombra + (255,))
    d.rounded_rectangle((4, 4, W_ + 4, H_ + 4), rr, fill=WHITE + (255,))
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, ancho - 1, h - 1), rr - 6, fill=255)
    c.paste(im, (4 + borde, 4 + borde), m)
    if pie:
        p = contorno(sin_emoji(pie).upper(), fblack(max(18, extra * 0.55)), TINTA, TINTA, 0)
        if p.width > ancho: p = p.resize((ancho, int(p.height * ancho / p.width)), Image.LANCZOS)
        c.alpha_composite(p, (4 + (W_ - p.width) // 2, 4 + borde + h + (extra + borde - p.height) // 2))
    if num is not None:
        r = max(26, ancho // 6); n = Image.new("RGBA", (2 * r + 8, 2 * r + 8)); dn = ImageDraw.Draw(n)
        dn.ellipse((0, 0, 2 * r + 6, 2 * r + 6), fill=WHITE); dn.ellipse((4, 4, 2 * r + 2, 2 * r + 2), fill=AMARILLO)
        dn.text((r + 3, r + 3), str(num), font=fanton(r * 1.3), fill=TINTA, anchor="mm")
        c.alpha_composite(n, (0, 0))
    return c.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else c


def rejilla(L, t, fotos, t0s, numeros=None, y0=520, cols=3, ancho=300, etiqueta=True):
    paso = (W - 60) / cols; giros = [-4, 3, -2, 4, -3, 2, -4, 3, -2]
    ancho = min(ancho, int(paso * 0.82))  # que no se toquen las de al lado (van giradas)
    for k, (f, t0) in enumerate(zip(fotos, t0s)):
        if t < t0: continue
        pz = FOTOS[f][1].split(":")[0] if etiqueta else None
        c = polaroid(f, ancho - 30, pie=pz, num=numeros[k] if numeros else None, giro=giros[k % 9])
        b.pon(L, c, 30 + paso * (k % cols + 0.5), y0 + (k // cols) * (c.height + 25), *rebote(t, t0))


def foto_grande(L, t):
    if not FOTO["k"] or FOTO["k"] == "fondo": return
    nom, abajo, col = FOTOS[FOTO["k"]]
    c = polaroid(FOTO["k"], 540, pie=nom + " · " + abajo.split(":")[0], giro=-3, prop=1.2)
    b.pon(L, c, W / 2, 900, *rebote(t, FOTO["t0"], 0.5))


_FR.clear()
def subtitulo(L, t, y=None):
    """frases de hasta 3 palabras, letra gruesa blanca con contorno negro; las clave en amarillo"""
    if not _FR:
        cur = []
        for t0, w in PAL:
            cur.append((t0, w))
            if len(cur) >= 3 or w.endswith((",", ".", ":", "?", "!")): _FR.append(cur); cur = []
        if cur: _FR.append(cur)
    act = [fr for fr in _FR if fr[0][0] <= t]
    if not act or t > PAL[-1][0] + 0.8: return
    fr = act[-1]; f = fblack(76); esp = f.getlength(" ")
    pal = [w.strip(".,:;") for _, w in fr]; asc, desc = f.getmetrics()
    ww = int(sum(f.getlength(p) for p in pal) + esp * (len(pal) - 1)) + 40
    im = Image.new("RGBA", (ww, asc + desc + 40)); d = ImageDraw.Draw(im); x = 20
    for p in pal:
        d.text((x, 20 + asc), p, font=f, fill=(AMARILLO if p.strip("¿?¡!") in CLAVE else WHITE), anchor="ls", stroke_width=7, stroke_fill=TINTA)
        x += f.getlength(p) + esp
    im = im.crop(im.getbbox())
    if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
    yy0 = 1720 if y is None else y
    hw, hh2 = im.width / 2, im.height / 2
    for yy in sorted(range(400, 1841, 20), key=lambda v: abs(v - yy0)):
        if not choca((W / 2 - hw, yy - hh2, W / 2 + hw, yy + hh2)): yy0 = yy; break
    else: SIN_LUGAR.append(round(t, 2))
    k = min(1.0, (t - fr[0][0]) / 0.1); _pon(L, im, W / 2, yy0, 0.9 + 0.1 * k, 1.0)


def degradado():
    g = Image.new("L", (1, H))
    for y in range(H):
        a = max(0, 1 - y / 650) * 110 + max(0, (y - 1450) / 470) * 120
        g.putpixel((0, y), int(min(255, a)))
    im = Image.new("RGBA", (W, H), (20, 10, 25, 255)); im.putalpha(g.resize((W, H))); return im
SOMBRA = degradado()


def invitacion(L, t, e):
    b.pon(L, qr_grupo(), W / 2, 470, *rebote(t, INI[e] + 0.05, 0.4))
    pas(L, "Únete a mi grupo de WhatsApp", 845, t, INI[e] + 0.25, sz=60, bg=ROSA)
    pas(L, "Precio de mayoreo", 990, t, marca(e, 1) - 0.1, sz=54)
    pas(L, "Ofertas exclusivas", 1120, t, marca(e, 2) - 0.1, sz=54)
    pas(L, "Link en alpacca.mx", 1255, t, marca(e, 3) - 0.1, sz=58, bg=WHITE)


def portada():
    fuente, seg, r1, r2, pastilla, prods = PORTADA[VAR]
    L = next(video(fuente, seg, 1)); L.alpha_composite(Image.new("RGBA", (W, H), (20, 10, 25, 70)))
    y = 400
    for j, txt in enumerate((r1, r2)):
        im = contorno(sin_emoji(txt).upper(), fanton(150), WHITE if j == 0 else AMARILLO, CHICLE if j == 0 else TINTA, 11)
        if im.width > 1020: im = im.resize((1020, int(im.height * 1020 / im.width)), Image.LANCZOS)
        im = im.rotate(-3 if j == 0 else 2, expand=True, resample=Image.BICUBIC)
        b.pon(L, im, W / 2, y); y += im.height - 10
    adornos(L, 0.3, 400)
    b.pon(L, sticker(pastilla, 46, colores=(LILA, WHITE), giro=-2), W / 2, y + 60)
    n = len(prods); ancho = 270 if n <= 3 else 215; paso = (W - 60) / n; giros = [-5, 3, -3, 5]
    for j, f in enumerate(prods):
        b.pon(L, polaroid(f, ancho, giro=giros[j]), 30 + paso * (j + 0.5), 1180 + (25 if j in (0, n - 1) else 0))
    sello(L, "$699 c/u", 2.0, 0, cy=1500, cx=W - 200)
    b.pon(L, sticker("alpacca.mx", 56, colores=(CHICLE, WHITE), giro=-3), 300, 1520)
    L.convert("RGB").save(os.path.join(AQUI, f"portada-{VAR}.jpg"), quality=92)



# ======================= DISEÑO NAVIDEÑO (pijamas, pedido por Mae) =======================
# Sobre el juvenil (letras grandes y stickers con borde blanco), pero en rojo, verde, dorado y blanco: nieve que cae,
# tira de foquitos que parpadean arriba, precio dentro de una esfera navideña, moño rojo en cada foto, acebo y copos.
ROJO, VERDE_N, DORADO, PINO = (205, 28, 48), (22, 128, 72), (240, 190, 60), (12, 70, 42)
CHICLE, LILA, AQUA, AMARILLO = ROJO, VERDE_N, PINO, DORADO
COLORES = [(ROJO, WHITE), (VERDE_N, WHITE), (DORADO, TINTA)]
_ncolor.clear()


def copo(sz, col=(255, 255, 255, 235)):
    im = Image.new("RGBA", (sz, sz)); d = ImageDraw.Draw(im); c = sz / 2; w = max(2, sz // 12)
    for k in range(6):
        a = _m.pi * k / 3; x, y = c + (c - 2) * _m.cos(a), c + (c - 2) * _m.sin(a); d.line((c, c, x, y), fill=col, width=w)
        for f in (0.55,):
            px, py = c + (c - 2) * f * _m.cos(a), c + (c - 2) * f * _m.sin(a)
            for s_ in (-1, 1):
                b2 = a + s_ * 0.6; d.line((px, py, px + c * 0.28 * _m.cos(b2), py + c * 0.28 * _m.sin(b2)), fill=col, width=w)
    return im
def acebo(sz):
    im = Image.new("RGBA", (sz, sz)); d = ImageDraw.Draw(im)
    d.ellipse((sz * 0.02, sz * 0.30, sz * 0.52, sz * 0.62), fill=VERDE_N + (255,))
    d.ellipse((sz * 0.48, sz * 0.30, sz * 0.98, sz * 0.62), fill=VERDE_N + (255,))
    for (x, y) in ((0.42, 0.5), (0.58, 0.5), (0.5, 0.64)):
        r = sz * 0.1; d.ellipse((sz * x - r, sz * y - r, sz * x + r, sz * y + r), fill=ROJO + (255,))
    return im
def adornos(L, t, y=300):
    for k, (x, yy, f, sz) in enumerate([(80, y - 140, acebo, 110), (1000, y - 130, copo, 90), (1010, y + 170, acebo, 90), (70, y + 210, copo, 70)]):
        p = 1 + 0.08 * _m.sin(t * 4 + k)
        _pon(L, f(int(sz * p)), x, yy)


def sello(L, txt, t, t0, cy=1290, bg=ROSA, cx=W / 2 + 200):
    """precio dentro de una esfera navideña roja con tapita dorada, que se mece"""
    if t < t0: return
    txt = sin_emoji(txt); principal = txt.split(" ")[0]; resto = txt[len(principal):].strip()
    r = 160; im = Image.new("RGBA", (2 * r + 40, 2 * r + 110)); d = ImageDraw.Draw(im); cx0, cy0 = r + 20, r + 90
    d.line((cx0, 0, cx0, cy0 - r - 20), fill=DORADO + (255,), width=4)
    d.ellipse((cx0 - r + 10, cy0 - r + 14, cx0 + r + 10, cy0 + r + 14), fill=(0, 0, 0, 90))
    d.ellipse((cx0 - r, cy0 - r, cx0 + r, cy0 + r), fill=ROJO + (255,), outline=WHITE + (255,), width=6)
    d.ellipse((cx0 - r * 0.62, cy0 - r * 0.78, cx0 - r * 0.15, cy0 - r * 0.42), fill=(255, 255, 255, 80))
    d.rounded_rectangle((cx0 - 38, cy0 - r - 30, cx0 + 38, cy0 - r + 8), 8, fill=DORADO + (255,))
    d.arc((cx0 - r + 18, cy0 - 30, cx0 + r - 18, cy0 + 50), 15, 165, fill=DORADO + (255,), width=6)
    tx = contorno(principal, fanton(118 if len(principal) <= 4 else 92), WHITE, WHITE, 0)
    im.alpha_composite(tx, (cx0 - tx.width // 2, cy0 - tx.height // 2 - (22 if resto else 6)))
    if resto:
        rr = contorno(resto.upper(), fblack(30), DORADO, DORADO, 0); im.alpha_composite(rr, (cx0 - rr.width // 2, cy0 + 62))
    cx = min(max(cx, im.width / 2 + 20), W - im.width / 2 - 20)
    im = im.rotate(6 * _m.sin(t * 2.4), expand=True, resample=Image.BICUBIC)
    b.pon(L, im, cx, cy, *rebote(t, t0, 0.5))


def mono(sz):
    """moño rojo de regalo"""
    im = Image.new("RGBA", (sz, int(sz * 0.7))); d = ImageDraw.Draw(im); h = im.height
    d.polygon([(sz * 0.5, h * 0.45), (sz * 0.05, h * 0.05), (sz * 0.02, h * 0.8)], fill=ROJO + (255,))
    d.polygon([(sz * 0.5, h * 0.45), (sz * 0.95, h * 0.05), (sz * 0.98, h * 0.8)], fill=ROJO + (255,))
    d.polygon([(sz * 0.45, h * 0.5), (sz * 0.3, h), (sz * 0.42, h * 0.95)], fill=(160, 18, 35, 255))
    d.polygon([(sz * 0.55, h * 0.5), (sz * 0.7, h), (sz * 0.58, h * 0.95)], fill=(160, 18, 35, 255))
    r = sz * 0.12; d.ellipse((sz / 2 - r, h * 0.45 - r, sz / 2 + r, h * 0.45 + r), fill=(170, 20, 38, 255))
    return im
_pol_juvenil = polaroid
def polaroid(foto, ancho, pie=None, num=None, giro=0, prop=1.2):
    c = _pol_juvenil(foto, ancho, pie=pie, num=num, giro=0, prop=prop)
    m = mono(int(ancho * 0.42)); out = Image.new("RGBA", (c.width, c.height + m.height // 2))
    out.alpha_composite(c, (0, m.height // 2)); out.alpha_composite(m, ((c.width - m.width) // 2 + 6, 0))
    return out.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else out


import random as _rnd
_r = _rnd.Random(7)
NIEVE = [(_r.uniform(0, W), _r.uniform(0, H), _r.uniform(60, 160), _r.choice([8, 10, 12, 16, 22]), _r.uniform(0, 6.28)) for _ in range(70)]
_copos = {sz: copo(sz, (255, 255, 255, 220)) for sz in (16, 22)}
def nieve(L, t):
    for x, y, v, sz, f in NIEVE:
        yy = (y + v * t) % (H + 40) - 20; xx = x + 18 * _m.sin(t * 1.3 + f)
        if sz >= 16: L.alpha_composite(_copos[sz], (int(xx), int(yy)))
        else:
            ImageDraw.Draw(L).ellipse((xx, yy, xx + sz, yy + sz), fill=(255, 255, 255, 190))
def foquitos(L, t):
    d = ImageDraw.Draw(L); pts = [(x, 46 + 22 * _m.sin(x / 140)) for x in range(-20, W + 40, 20)]
    d.line(pts, fill=(25, 45, 30, 255), width=4)
    cols = [ROJO, DORADO, VERDE_N, (70, 140, 255)]
    for k, x in enumerate(range(30, W, 90)):
        y = 46 + 22 * _m.sin(x / 140) + 16; on = (int(t * 3) + k) % 3 != 0; col = cols[k % 4]
        if on: d.ellipse((x - 20, y - 18, x + 20, y + 26), fill=col + (90,))
        d.ellipse((x - 10, y - 8, x + 10, y + 18), fill=(col if on else tuple(v // 2 for v in col)) + (255,))
        d.rectangle((x - 5, y - 14, x + 5, y - 6), fill=(60, 60, 60, 255))


_capa_juvenil = CAPA
def CAPA(L, t):
    foquitos(L, t); _capa_juvenil(L, t); nieve(L, t)


_portada_juvenil = portada
def portada():
    _portada_juvenil()
    ruta = os.path.join(AQUI, f"portada-{VAR}.jpg"); L = Image.open(ruta).convert("RGBA")
    foquitos(L, 0.2); nieve(L, 3.0); L.convert("RGB").save(ruta, quality=92)



# ======================= NAVIDAD EN COLORES DE ALPACCA (versión final de Mae) =======================
# El navideño rojo/verde se veía saturado y no checaba con la marca. Ahora: paleta de alpacca.mx (tailwind.config.js:
# rose #ee6c92, rose-deep #c4466e, rose-ink #b33660, lilac-band #766f96, blush #f6cadb, blanco y tinta #111),
# letra del logo («Ready to Party», fonts/ReadyToParty.ttf) para titulares, Inter para lo demás, sombras suaves,
# nieve ligera, esfera navideña rosa y moños rosas. Sin foquitos ni contornos gruesos. La toma va un poco menos saturada.
ROSA_A, ROSA_P, ROSA_I, LILA_A, BLUSH, BLANCO, TINTA_A = (238, 108, 146), (196, 70, 110), (179, 54, 96), (118, 111, 150), (246, 202, 219), (255, 255, 255), (17, 17, 17)
COLORES = [(ROSA_P, BLANCO), (BLANCO, ROSA_I), (LILA_A, BLANCO)]
_ncolor.clear(); _giros.clear()
_RTP = os.path.join(RAIZ, "fonts", "ReadyToParty.ttf")
def fmarca(sz):
    k = ("r", int(sz))
    if k not in _fcache: _fcache[k] = ImageFont.truetype(_RTP, int(sz))
    return _fcache[k]
def finter(sz, peso="Bold"):
    k = ("in", int(sz), peso)
    if k not in _fcache: _fcache[k] = ImageFont.truetype(f"/usr/share/fonts/opentype/inter/InterDisplay-{peso}.otf", int(sz))
    return _fcache[k]
def suave_sombra(im, r=14, a=110, dy=8):
    sh = Image.new("RGBA", (im.width + 4 * r, im.height + 4 * r + dy))
    m = im.getchannel("A").point(lambda v: v * a // 255); base = Image.new("RGBA", im.size, (40, 20, 35, 255)); base.putalpha(m)
    sh.alpha_composite(base, (2 * r, 2 * r + dy)); sh = sh.filter(ImageFilter.GaussianBlur(r)); sh.alpha_composite(im, (2 * r, 2 * r))
    return sh


def sticker(s, sz=60, colores=None, giro=0):
    """pastilla limpia (sin borde grueso ni sombra dura): rosa profundo, blanca o lila"""
    s = sin_emoji(s); fondo, tinta = colores or color_de(s)
    f = finter(sz * 0.78, "Bold"); asc, desc = f.getmetrics()
    tw = int(f.getlength(s)); px, py = int(sz * 0.6), int(sz * 0.36); w, h = tw + 2 * px, asc + desc // 2 + 2 * py
    if w > 1000: f = finter(sz * 0.78 * 1000 / w, "Bold"); tw = int(f.getlength(s)); asc, desc = f.getmetrics(); w, h = tw + 2 * px, asc + desc // 2 + 2 * py
    im = Image.new("RGBA", (w, h)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), h // 2, fill=fondo + (255,))
    d.text((w / 2, h / 2 + 2), s, font=f, fill=tinta, anchor="mm")
    im = suave_sombra(im, 10, 90, 6)
    return im.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else im


def pas(L, s, cy, t, t0, sz=58, bg=ROSA, fg=WHITE, n="ExtraBold", maxw=1000, cx=W / 2):
    if t < t0: return
    col = (TINTA_A, BLANCO) if bg == NEGRO else ((BLANCO, ROSA_I) if bg == WHITE else color_de(s))
    if bg == ROSA: col = (ROSA_P, BLANCO)
    im = sticker(s, sz=max(70, min(sz * 1.35, 86)), colores=col)
    cy = libre(im, cx, cy)
    k = _suave(t, t0, 0.35); b.pon(L, im, cx, cy + (1 - k) * 30, 1.0, k)


def gancho(L, t, arriba, abajo, t_abajo):
    """titular en la letra del logo, blanco con sombra suave (sin contornos)"""
    arriba = sin_emoji(arriba); f = fmarca(150)
    palabras = arriba.split(); lineas = []; cur = ""
    for p in palabras:
        if f.getlength((cur + " " + p).strip()) > 960 and cur: lineas.append(cur); cur = p
        else: cur = (cur + " " + p).strip()
    lineas.append(cur); y = 330
    for j, ln in enumerate(lineas):
        asc, desc = f.getmetrics(); im = Image.new("RGBA", (int(f.getlength(ln)) + 20, asc + desc + 20))
        ImageDraw.Draw(im).text((10, 10), ln, font=f, fill=(BLANCO if j == 0 else BLUSH))
        im = suave_sombra(im.crop(im.getbbox()), 16, 170, 6)
        if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
        b.pon(L, im, W / 2, y); y += im.height - 30
    adornos(L, t, 330)
    if abajo: pas(L, abajo, y + 60, t, t_abajo, sz=54)


def copo_fino(sz, a=200):
    im = Image.new("RGBA", (sz, sz)); d = ImageDraw.Draw(im); c = sz / 2; w = max(2, sz // 16)
    for k in range(6):
        an = _m.pi * k / 3; d.line((c, c, c + (c - 2) * _m.cos(an), c + (c - 2) * _m.sin(an)), fill=(255, 255, 255, a), width=w)
    return im
def adornos(L, t, y=300):
    for k, (x, yy, sz) in enumerate([(90, y - 150, 60), (995, y - 140, 46), (1000, y + 190, 38)]):
        _pon(L, copo_fino(sz).rotate(t * 20 + k * 30, resample=Image.BICUBIC), x, yy)


def sello(L, txt, t, t0, cy=1290, bg=ROSA, cx=W / 2 + 200):
    """precio en esfera navideña rosa profundo con brillo blush y tapita lila"""
    if t < t0: return
    txt = sin_emoji(txt); principal = txt.split(" ")[0]; resto = txt[len(principal):].strip()
    r = 150; im = Image.new("RGBA", (2 * r + 40, 2 * r + 100)); d = ImageDraw.Draw(im); cx0, cy0 = r + 20, r + 80
    d.line((cx0, 0, cx0, cy0 - r - 18), fill=BLANCO + (230,), width=3)
    d.ellipse((cx0 - r, cy0 - r, cx0 + r, cy0 + r), fill=ROSA_P + (255,))
    d.ellipse((cx0 - r * 0.6, cy0 - r * 0.8, cx0 - r * 0.12, cy0 - r * 0.4), fill=BLUSH + (110,))
    d.rounded_rectangle((cx0 - 34, cy0 - r - 26, cx0 + 34, cy0 - r + 8), 8, fill=LILA_A + (255,))
    d.text((cx0, cy0 - (14 if resto else 0)), principal, font=fmarca(120 if len(principal) <= 4 else 96), fill=BLANCO, anchor="mm")
    if resto: d.text((cx0, cy0 + 70), resto, font=finter(30, "SemiBold"), fill=BLUSH, anchor="mm")
    im = suave_sombra(im, 14, 120, 10)
    cx = min(max(cx, im.width / 2 + 10), W - im.width / 2 - 10)
    im = im.rotate(4 * _m.sin(t * 2.0), expand=True, resample=Image.BICUBIC)
    k = _suave(t, t0, 0.4); b.pon(L, im, cx, cy, 0.9 + 0.1 * k, k)


def chips(L, textos, cy, t, t0, sep=0.25):
    ims = [sticker(x, 50, colores=[(BLANCO, ROSA_I), (BLUSH, ROSA_I), (LILA_A, BLANCO)][j % 3]) for j, x in enumerate(textos)]
    total = sum(i.width for i in ims)
    if total > 1060:
        k = 1060 / total; ims = [i.resize((int(i.width * k), int(i.height * k)), Image.LANCZOS) for i in ims]; total = 1060
    x = W / 2 - total / 2
    fila = Image.new("RGBA", (int(total), max(i.height for i in ims))); cy = libre(fila, W / 2, cy)
    for j, im in enumerate(ims):
        if t >= t0 + j * sep: k = _suave(t, t0 + j * sep, 0.3); b.pon(L, im, x + im.width / 2, cy + (1 - k) * 20, 1.0, k)
        x += im.width


def mono_rosa(sz):
    im = Image.new("RGBA", (sz, int(sz * 0.62))); d = ImageDraw.Draw(im); h = im.height
    for lado in (-1, 1):
        d.polygon([(sz * 0.5, h * 0.45), (sz * (0.5 + 0.45 * lado), h * 0.05), (sz * (0.5 + 0.48 * lado), h * 0.78)], fill=ROSA_A + (255,))
        d.polygon([(sz * (0.5 + 0.05 * lado), h * 0.5), (sz * (0.5 + 0.2 * lado), h), (sz * (0.5 + 0.09 * lado), h * 0.96)], fill=ROSA_P + (255,))
    r = sz * 0.11; d.ellipse((sz / 2 - r, h * 0.45 - r, sz / 2 + r, h * 0.45 + r), fill=ROSA_P + (255,))
    return im
def polaroid(foto, ancho, pie=None, num=None, giro=0, prop=1.2):
    """foto en tarjeta blanca redondeada con sombra suave, moño rosa arriba; número en círculo rosa profundo"""
    h = int(ancho * prop); borde = max(10, ancho // 24); rr = max(16, ancho // 12)
    im = Image.open(os.path.join(AQUI, "fotos", foto + ".jpg")).convert("RGB")
    im = ImageOps.fit(im, (ancho, h), Image.LANCZOS, centering=(0.5, 0.45))
    extra = int(ancho * 0.17) if pie else 0
    W_, H_ = ancho + 2 * borde, h + 2 * borde + extra
    c = Image.new("RGBA", (W_, H_)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, W_ - 1, H_ - 1), rr, fill=BLANCO + (255,))
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, ancho - 1, h - 1), rr - 6, fill=255)
    c.paste(im, (borde, borde), m)
    if pie:
        f = finter(max(18, extra * 0.5), "Bold"); p = sin_emoji(pie)
        while f.getlength(p) > ancho and f.size > 14: f = finter(f.size - 2, "Bold")
        d.text((W_ / 2, borde + h + (extra + borde) / 2), p, font=f, fill=ROSA_I, anchor="mm")
    if num is not None:
        r = max(24, ancho // 7); d.ellipse((borde + 6, borde + 6, borde + 6 + 2 * r, borde + 6 + 2 * r), fill=ROSA_P + (255,), outline=BLANCO + (255,), width=4)
        d.text((borde + 6 + r, borde + 6 + r), str(num), font=fmarca(r * 1.25), fill=BLANCO, anchor="mm")
    mo = mono_rosa(int(ancho * 0.38)); out = Image.new("RGBA", (W_, H_ + mo.height // 2))
    out.alpha_composite(c, (0, mo.height // 2)); out.alpha_composite(mo, ((W_ - mo.width) // 2, 0))
    out = suave_sombra(out, 12, 120, 8)
    return out.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else out


def rejilla(L, t, fotos, t0s, numeros=None, y0=520, cols=3, ancho=300, etiqueta=True):
    paso = (W - 60) / cols; giros = [-2, 2, -1, 2, -2, 1, -2, 2, -1]
    ancho = min(ancho, int(paso * 0.82))
    for k, (f, t0) in enumerate(zip(fotos, t0s)):
        if t < t0: continue
        pz = FOTOS[f][1].split(":")[0] if etiqueta else None
        c = polaroid(f, ancho - 30, pie=pz, num=numeros[k] if numeros else None, giro=giros[k % 9])
        kk = _suave(t, t0, 0.35)
        b.pon(L, c, 30 + paso * (k % cols + 0.5), y0 + (k // cols) * (c.height - 10) + (1 - kk) * 30, 1.0, kk)


def foto_grande(L, t):
    if not FOTO["k"] or FOTO["k"] == "fondo": return
    nom, abajo, col = FOTOS[FOTO["k"]]
    c = polaroid(FOTO["k"], 540, pie=nom + " · " + abajo.split(":")[0], giro=-1, prop=1.2)
    k = _suave(t, FOTO["t0"], 0.45); b.pon(L, c, W / 2, 900 + (1 - k) * 40, 1.0, k)


_FR.clear()
def subtitulo(L, t, y=None):
    """frases de hasta 3 palabras en Inter blanco con sombra suave; las clave en blush"""
    if not _FR:
        cur = []
        for t0, w in PAL:
            cur.append((t0, w))
            if len(cur) >= 3 or w.endswith((",", ".", ":", "?", "!")): _FR.append(cur); cur = []
        if cur: _FR.append(cur)
    act = [fr for fr in _FR if fr[0][0] <= t]
    if not act or t > PAL[-1][0] + 0.8: return
    fr = act[-1]; f = finter(72, "Bold"); esp = f.getlength(" ")
    pal = [w.strip(".,:;") for _, w in fr]; asc, desc = f.getmetrics()
    ww = int(sum(f.getlength(p) for p in pal) + esp * (len(pal) - 1)) + 20
    im = Image.new("RGBA", (ww, asc + desc + 20)); d = ImageDraw.Draw(im); x = 10
    for p in pal:
        d.text((x, 10 + asc), p, font=f, fill=(BLUSH if p.strip("¿?¡!") in CLAVE else BLANCO), anchor="ls"); x += f.getlength(p) + esp
    im = suave_sombra(im.crop(im.getbbox()), 12, 200, 4)
    if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
    yy0 = 1720 if y is None else y; hw, hh2 = im.width / 2, im.height / 2
    for yy in sorted(range(400, 1841, 20), key=lambda v: abs(v - yy0)):
        if not choca((W / 2 - hw, yy - hh2, W / 2 + hw, yy + hh2)): yy0 = yy; break
    else: SIN_LUGAR.append(round(t, 2))
    _pon(L, im, W / 2, yy0)


_r2 = _rnd.Random(11)
NIEVE = [(_r2.uniform(0, W), _r2.uniform(0, H), _r2.uniform(40, 90), _r2.choice([6, 8, 10]), _r2.uniform(0, 6.28)) for _ in range(28)]
def nieve(L, t):
    d = ImageDraw.Draw(L)
    for x, y, v, sz, f in NIEVE:
        yy = (y + v * t) % (H + 40) - 20; xx = x + 14 * _m.sin(t * 1.1 + f)
        d.ellipse((xx, yy, xx + sz, yy + sz), fill=(255, 255, 255, 150))


def degradado():
    g = Image.new("L", (1, H))
    for y in range(H):
        a = max(0, 1 - y / 650) * 90 + max(0, (y - 1450) / 470) * 110
        g.putpixel((0, y), int(min(255, a)))
    im = Image.new("RGBA", (W, H), (40, 20, 35, 255)); im.putalpha(g.resize((W, H))); return im
SOMBRA = degradado()

from PIL import ImageEnhance as _IE
_video_antes = video
def video(fuente, ini, n, cx=0.5, cy=0.5, z=1.0, foto=None):
    """la toma un poco menos saturada (las pijamas rosas ya son muy intensas)"""
    for L in _video_antes(fuente, ini, n, cx, cy, z, foto):
        rgb = _IE.Color(L.convert("RGB")).enhance(0.82); yield rgb.convert("RGBA")


def CAPA(L, t):
    _capa_juvenil(L, t); nieve(L, t)


def invitacion(L, t, e):
    k = _suave(t, INI[e] + 0.05, 0.4); b.pon(L, qr_grupo(), W / 2, 470, 0.95 + 0.05 * k, k)
    pas(L, "Únete a mi grupo de WhatsApp", 845, t, INI[e] + 0.25, sz=60, bg=ROSA)
    pas(L, "Precio de mayoreo", 980, t, marca(e, 1) - 0.1, sz=54, bg=WHITE)
    pas(L, "Ofertas exclusivas", 1100, t, marca(e, 2) - 0.1, sz=54, bg=WHITE)
    pas(L, "Link en alpacca.mx", 1225, t, marca(e, 3) - 0.1, sz=56, bg=NEGRO if False else ROSA)


def portada():
    fuente, seg, r1, r2, pastilla, prods = PORTADA[VAR]
    L = next(video(fuente, seg, 1)); L.alpha_composite(Image.new("RGBA", (W, H), (40, 20, 35, 80)))
    y = 400
    for j, txt in enumerate((r1, r2)):
        f = fmarca(140); txt = sin_emoji(txt); asc, desc = f.getmetrics()
        im = Image.new("RGBA", (int(f.getlength(txt)) + 20, asc + desc + 20)); ImageDraw.Draw(im).text((10, 10), txt, font=f, fill=(BLANCO if j == 0 else BLUSH))
        im = suave_sombra(im.crop(im.getbbox()), 16, 180, 6)
        if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
        b.pon(L, im, W / 2, y); y += im.height - 25
    adornos(L, 0.5, 400)
    b.pon(L, sticker(pastilla, 46, colores=(BLANCO, ROSA_I)), W / 2, y + 50)
    n = len(prods); ancho = 260 if n <= 3 else 205; paso = (W - 60) / n; giros = [-3, 2, -2, 3]
    for j, f in enumerate(prods):
        b.pon(L, polaroid(f, ancho, giro=giros[j]), 30 + paso * (j + 0.5), 1170 + (20 if j in (0, n - 1) else 0))
    sello(L, "$699 c/u", 2.0, 0, cy=1500, cx=W - 200)
    b.pon(L, sticker("alpacca.mx", 54, colores=(ROSA_P, BLANCO)), 300, 1530)
    nieve(L, 4.0)
    L.convert("RGB").save(os.path.join(AQUI, f"portada-{VAR}.jpg"), quality=92)


# en los subtítulos, «alpacca punto eme equis» (como lo dice la voz) se escribe «alpacca.mx»
def _junta_web(pal):
    out = []; i = 0
    while i < len(pal):
        ws = [w.strip(".,:;").lower() for _, w in pal[i:i + 4]]
        if ws[:1] == ["alpacca"] and ws[1:4] == ["punto", "eme", "equis"]:
            fin = pal[i + 3][1]; punt = fin[len(fin.rstrip(".,:;")):]
            out.append((pal[i][0], "alpacca.mx" + punt)); i += 4
        else: out.append(pal[i]); i += 1
    return out
PAL[:] = _junta_web(PAL); _FR.clear()


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
