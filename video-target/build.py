"""Videos del stock de Target (con gancho desde el primer segundo y neuromarketing, sin verse como anuncio).
Material: lo que Mae grabó el 12 de noviembre (carpeta del Drive): video-189 = con sus lentes Meta, en el
estacionamiento de Target, sacando del carrito cada set y enseñándolo frente a la tienda; IMG_5861 = el carrito lleno
de sets de DAISE en el pasillo. Los dos son SDR: se pasan a 1080 de ancho con saturación 0.85 y el de los lentes se
estabiliza (est_189.mp4, est_5861.mp4). No sale la cara de Mae ni gente de cerca.
No se muestran el kit rosa de medicube (s 44-52 de video-189), la caja Dreamhouse de DAISE (s 76-86) ni los Petal
Pod de DAISE (s 126-150): no hay piezas en stock. DAISE: trío de mists s 103-109, trío de labios s 111-118.

Variantes:
  haul     = «Me traje 4 sets de Target… y de uno solo me queda una pieza. Adivina cuál»: pregunta abierta que se
             contesta al final (se quedan a ver la respuesta), cada set aparece con su precio, y deja picado el
             siguiente video (el carrito de DAISE).
  daise    = «Llené un carrito ENTERO de esto»: imagen que rompe el scroll, qué es y qué trae, y el truco del precio
             (suelto $189, en trío $133 cada uno: el paquete se siente como ganga). Cierra con una pregunta de dos opciones.
  adviento = «Si quieres calendario de adviento, el 1 de diciembre ya es tarde»: fecha límite real y la cuenta de cuánto
             sale cada sorpresa ($599 ÷ 12 ≈ $50, $789 ÷ 25 ≈ $32), con escasez real (Real Techniques: quedan 2).
Precios y piezas: alpacca.mx/stock.csv (12 de noviembre).
Uso: python3 voz.py VARIANTE; python3 build.py VARIANTE CARPETA_CON_est_*.mp4 -> Target-VARIANTE-voz.mp4"""
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
ROSA, NEGRO, WHITE, VERDE = (232, 70, 120), (20, 20, 22), (255, 255, 255), (22, 150, 80)
FUENTES = os.path.join(RAIZ, "carruseles", "fuentes")
T = json.load(open(os.path.join(AQUI, f"tiempos-{VAR}.json")))
INI = [0.0]
for e in T: INI.append(INI[-1] + e["dur"])
def marca(e, m=None): return INI[e] + (0 if m is None else T[e]["marcas"][m])
OUT = os.path.join(AQUI, f"Target-{VAR}.mp4")

# ---------------- tomas: por frase, a velocidad normal (cada una dura lo que le toca de la frase) ----------------
TOMAS = {
    "haul": [[("189", 66.5), ("189", 23.0)], [("189", 6.0)], [("189", 20.0)], [("189", 35.0)], [("189", 61.0)],
             [("189", 8.0), ("189", 64.5)], [("189", 151.0), ("5861", 0.5)]],
    "daise": [[("5861", 2.5)], [("189", 106.0), ("189", 111.0)], [("189", 113.5), ("189", 116.5)],
              [("189", 103.0), ("5861", 0.0), ("189", 107.5)], [("189", 111.5), ("5861", 3.5), ("189", 117.0)],
              [("5861", 5.8), ("189", 108.0)], [("5861", 4.4)]],
    "adviento": [[("5861", 6.6), ("189", 0.0)], [("189", 42.0), ("189", 52.0)], [("189", 88.0), ("189", 96.0)],
                 [("189", 13.0), ("189", 140.0)], [("189", 155.0), ("189", 162.0)], [("189", 0.5)], [("189", 168.0)]],
}[VAR]

def video(fuente, ini, n):
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"est_{fuente}.mp4"),
                          "-t", f"{n / FPS + 0.3:.2f}", "-an", "-vf",
                          f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


def degradado():
    """oscurece un poco arriba (títulos) y abajo (subtítulo) para que se lea sin bordes en el texto"""
    g = Image.new("L", (1, H))
    for y in range(H):
        a = max(0, 1 - y / 560) * 120 + max(0, (y - 1250) / 670) * 150
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
CLAVE = {"cuatro", "Target", "pieza", "Adivina", "medicube", "colágeno", "SKIN1004", "Starface", "barritos", "BYOMA",
         "barrera", "adivinaste", "uno", "México", "DAISE", "entero", "flor", "péptidos", "karité", "Sunny", "Hello",
         "Glaze", "truco", "Navidad", "labios", "mists", "calendario", "diciembre", "tarde", "sorpresa", "skincare",
         "spa", "cincuenta", "Real", "Techniques", "veinticinco", "rendidor", "dos", "Cuál", "siete", "carrito"}

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
                if pal: out.append((INI[n] + off + tp - ini, pal.strip(".,:;…¿?¡!").replace("Deisi", "DAISE")))  # la voz dice «Deisi»
                pal = ""; continue
            if not pal: tp = t
            pal += c
    return out
PAL = _palabras()


def subtitulo(L, t, y=1560):
    act = [(t0, w) for t0, w in PAL if t0 <= t]
    if not act or t > PAL[-1][0] + 0.8: return
    t0, w = act[-1]
    if w in CLAVE:
        b.pon(L, _sombra(bagel(w, 140)), W / 2, y, *b.entra(t, t0, 0.3))
    else:
        b.pon(L, _sombra(b.linea(w, "ExtraBold", 70, WHITE)), W / 2, y)


# ---------------- productos: foto oficial en tarjeta blanca redonda ----------------
_cache = {}
def tarjeta(foto, nombre, abajo=None, ancho=440, color_abajo=ROSA):
    k = (foto, nombre, abajo, ancho)
    if k in _cache: return _cache[k]
    alto_foto = int(ancho * 1.2)
    im = Image.open(os.path.join(AQUI, "fotos", foto + ".jpg")).convert("RGB")
    # la foto trae mucho fondo: se recorta al producto (lo que no es del color de la esquina) y se centra sin cortarlo
    from PIL import ImageChops
    fondo = im.getpixel((3, 3))
    caja = ImageChops.difference(im, Image.new("RGB", im.size, fondo)).convert("L").point(lambda v: 255 if v > 28 else 0).getbbox()
    if caja:
        x0, y0, x1, y1 = caja; mx, my = (x1 - x0) * 0.12, (y1 - y0) * 0.06
        im = im.crop((max(0, int(x0 - mx)), max(0, int(y0 - my)), min(im.width, int(x1 + mx)), min(im.height, int(y1 + my))))
    im = ImageOps.pad(im, (ancho - 40, alto_foto - 40), Image.LANCZOS, color=fondo)
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


def pon_tarjeta(L, tj, cx, cy, t, t0, giro=0):
    if t < t0: return
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


def sello(L, txt, t, t0, cy=1290, bg=ROSA):
    """el precio como estampa que cae girada"""
    if t < t0: return
    im = _sombra(b.pastilla(txt, "ExtraBold", 84, bg, WHITE, padx=40, pady=14), 10, 120).rotate(-6, expand=True, resample=Image.BICUBIC)
    s, a = b.entra(t, t0, 0.35); b.pon(L, im, W / 2 + 200, cy, 1.6 - 0.6 * b.ease((t - t0) / 0.25), a)


def capa_haul(L, t):
    e = etapa(t)
    if e == 0:
        gancho(L, t, "Me traje 4 sets de Target", "…y de uno solo me queda 1 🫣", marca(0, 1))
        if t >= marca(0, 2): pas(L, "¿Adivinas cuál? 👀", 620, t, marca(0, 2), sz=64, bg=WHITE, fg=ROSA)
    sets = {1: ("spa", "medicube Holiday Night Spa", "crema de colágeno + 2 mascarillas", "$529"),
            2: ("unlockt", "Unlockt 7 días K-Beauty", "SKIN1004 · Round Lab · medicube", "$789"),
            3: ("starface", "Starface Big Lil", "parches para barritos", "$529"),
            4: ("byoma", "BYOMA Barrier Lab Kit", "5 minis para tu barrera", "$659")}
    if e in sets:
        f, nom, que, precio = sets[e]
        b.pon(L, _sombra(bagel(f"{e}/4", 120, WHITE), 12, 170), 150, 330, *b.entra(t, INI[e], 0.3))
        pon_tarjeta(L, tarjeta(f, nom, que, ancho=470), W / 2 + 120, 760, t, marca(e, 0) - 0.2, 3)
        sello(L, precio, t, marca(e, 1), cy=1170)
    if e == 5:
        pas(L, "¿Ya adivinaste? 🥁", 330, t, INI[5], sz=64)
        if t >= marca(5, 1):
            pon_tarjeta(L, tarjeta("spa", "medicube Night Spa", "Queda 1", ancho=500, color_abajo=NEGRO), W / 2, 830, t, marca(5, 1))
    if e == 6:
        pas(L, "🇲🇽 Todos ya están en México", 330, t, INI[6], sz=56)
        pas(L, "alpacca.mx", 450, t, marca(6, 1), sz=64, bg=WHITE, fg=ROSA)
        if t >= marca(6, 2): pas(L, "Próximo video: el carrito de DAISE 🌼", 1180, t, marca(6, 2), sz=50, bg=NEGRO)
    if e not in (6,): subtitulo(L, t)


def capa_daise(L, t):
    e = etapa(t)
    if e == 0: gancho(L, t, "Llené un carrito ENTERO", "…y te explico por qué 👇", marca(0, 1))
    if e == 1:
        b.pon(L, _sombra(bagel("DAISE", 170, WHITE), 12, 170), W / 2, 340, *b.entra(t, marca(1, 0), 0.3))
        chips(L, ["💋 bálsamos", "🌼 mists en forma de flor"], 500, t, marca(1, 1) - 0.4)
    if e == 2:
        pon_tarjeta(L, tarjeta("daise-lip", "Tinted Lip Balm Trio", "3 bálsamos", ancho=480), W / 2, 760, t, INI[2] + 0.2)
        chips(L, ["péptidos", "manteca de karité", "color que subes"], 1240, t, marca(2, 0), sep=0.6)
    if e == 3:
        pon_tarjeta(L, tarjeta("daise-mist", "Mini Body Mist Trio", "3 mists de 30 ml", ancho=480), W / 2, 740, t, INI[3] + 0.2)
        for j, (txt, y) in enumerate([("☀️ Sunny: vainilla y coco", 1180), ("👋 Hello: frambuesa y menta", 1280), ("🍩 Glaze: vainilla y caramelo", 1380)]):
            pas(L, txt, y, t, marca(3, j), sz=46, bg=WHITE, fg=NEGRO)
    if e == 4:
        interrupcion(L, t, marca(4, 0) - 0.1, "TRUCO")
        if t >= marca(4, 1):
            for j, (f, x, g) in enumerate([("lip-bv", 230, -4), ("lip-cp", 540, 0), ("lip-vv", 850, 4)]):
                pon_tarjeta(L, tarjeta(f, " ", None, ancho=260), x, 690, t, marca(4, 1) + 0.12 * j, g)
            pas(L, "Suelto: $189 c/u", 1060, t, marca(4, 1), sz=60, bg=WHITE, fg=NEGRO)
        if t >= marca(4, 2):
            sello(L, "En trío: $133 c/u", t, marca(4, 2), cy=1200)
    if e == 5:
        pon_tarjeta(L, tarjeta("daise-lip", "Trío de labios", "Quedan 4", ancho=380, color_abajo=NEGRO), 290, 780, t, INI[5], -3)
        pon_tarjeta(L, tarjeta("daise-mist", "Trío de mists", "Quedan 5", ancho=380, color_abajo=NEGRO), 790, 780, t, INI[5] + 0.25, 3)
        pas(L, "$399 cada trío 🎁", 1240, t, marca(5, 0), sz=70)
    if e == 6: cierre(L, t, INI[6], "¿Labios o mists? 💋🌼", "Te leo en los comentarios 👇")
    if e not in (4, 5, 6): subtitulo(L, t)


def capa_adviento(L, t):
    e = etapa(t)
    if e == 0:
        gancho(L, t, "¿Calendario de adviento?", "El 1 de diciembre ya es tarde ⏰", marca(0, 1) - 0.2)
        for j, (f, x, g) in enumerate([("skin-advent", 230, -5), ("rt-cal", 540, 0), ("spa-advent", 850, 5)]):
            pon_tarjeta(L, tarjeta(f, " ", None, ancho=290), x, 980 + (0 if j == 1 else 40), t, 0.12 * j - 0.4, g)
    if e == 1:
        pas(L, "📅 1 de dic = 1ª sorpresa", 330, t, INI[1] + 0.1, sz=62)
        pas(L, "¿Cuánto te sale cada una? 🧮", 460, t, marca(1, 1) - 0.3, sz=56, bg=WHITE, fg=ROSA)
    cal = {2: ("skin-advent", "Skincare Advent de Target", "12 sorpresas", "$599 ÷ 12 ≈ $50"),
           3: ("spa-advent", "Spa Advent de Target", "12 sorpresas", "$599 ÷ 12 ≈ $50"),
           4: ("rt-cal", "Real Techniques", "25 días de brochas", "$789 ÷ 25 ≈ $32")}
    if e in cal:
        f, nom, que, cuenta = cal[e]
        pon_tarjeta(L, tarjeta(f, nom, que, ancho=500), W / 2, 700, t, INI[e] + 0.2, -2 if e != 3 else 2)
        if e == 2: chips(L, ["La Roche-Posay", "BYOMA", "TONYMOLY"], 1180, t, marca(2, 1), sep=0.3)
        if e == 3: chips(L, ["Hero", "Pixi", "Aquaphor"], 1180, t, marca(3, 1), sep=0.3)
        sello(L, cuenta, t, marca(e, 2) - 0.3, cy=1310, bg=ROSA if e != 4 else VERDE)
        if e == 4 and t >= marca(4, 2) + 1.2: pas(L, "🏆 El más rendidor", 330, t, marca(4, 2) + 1.2, sz=64)
    if e == 5:
        pon_tarjeta(L, tarjeta("rt-cal", "Real Techniques", "Quedan 2", ancho=500, color_abajo=NEGRO), W / 2, 760, t, INI[5])
    if e == 6: cierre(L, t, INI[6], "¿Cuál abrirías tú? 🎁", "Skincare, spa o brochas 👇")
    if e not in (2, 3, 4, 5, 6): subtitulo(L, t)
    elif e in (2, 3): subtitulo(L, t, y=1640)


CAPA = {"haul": capa_haul, "daise": capa_daise, "adviento": capa_adviento}[VAR]

def cuadros():
    f = 0
    for e, tomas in enumerate(TOMAS):
        n_frase = int(round(INI[e + 1] * FPS)) - int(round(INI[e] * FPS))
        ns = [n_frase // len(tomas)] * len(tomas); ns[-1] += n_frase - sum(ns)
        for (fuente, ini), n in zip(tomas, ns):
            for L in video(fuente, ini, n):
                L.alpha_composite(SOMBRA); CAPA(L, f / FPS); yield L; f += 1


def prueba(ts, ruta):
    """cuadros sueltos para revisar sin hacer todo el video"""
    ims = []
    for tq in ts:
        e = next(i for i in range(len(T)) if tq < INI[i + 1] or i == len(T) - 1)
        n_frase = int(round(INI[e + 1] * FPS)) - int(round(INI[e] * FPS)); tomas = TOMAS[e]
        k = min(len(tomas) - 1, int((tq - INI[e]) * FPS) // max(1, n_frase // len(tomas)))
        fuente, ini = tomas[k]; dentro = tq - INI[e] - k * (n_frase // len(tomas)) / FPS
        L = next(video(fuente, ini + dentro, 1)); L.alpha_composite(SOMBRA); CAPA(L, tq)
        ims.append(L.convert("RGB").resize((270, 480)))
    c = Image.new("RGB", (270 * min(6, len(ims)), 480 * ((len(ims) + 5) // 6)))
    for j, im in enumerate(ims): c.paste(im, ((j % 6) * 270, (j // 6) * 480))
    c.save(ruta)


PORTADA = {  # (fuente, segundo, renglón 1, renglón 2, pastilla, productos)
    "haul": ("189", 8.5, "Me traje 4 sets", "de Target 🎯", "y de uno solo me queda 1 👀", ["spa", "unlockt", "byoma"]),
    "daise": ("5861", 3.0, "Llené un carrito", "ENTERO de esto", "🌼 DAISE ya está en México", ["daise-lip", "daise-mist", "lip-cp"]),
    "adviento": ("189", 0.5, "Calendarios de", "adviento 🎄", "¿cuál vale más la pena? 🧮", ["skin-advent", "rt-cal", "spa-advent"]),
}


def portada():
    """todo dentro de la zona 3:4 que se ve en el perfil (y 240-1680)"""
    fuente, seg, r1, r2, pastilla, prods = PORTADA[VAR]
    L = next(video(fuente, seg, 1)); L.alpha_composite(Image.new("RGBA", (W, H), (20, 10, 16, 90)))
    for j, txt in enumerate((r1, r2)):
        im = _sombra(bagel(txt.replace(" 🎯", "").replace(" 🎄", ""), 130, WHITE if j == 0 else ROSA), 14, 190)
        if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
        b.pon(L, im, W / 2, 380 + j * 165)
    b.pon(L, b.pastilla(pastilla, "ExtraBold", 50, NEGRO, WHITE, padx=34, pady=16), W / 2, 700)
    for j, (f, x, g) in enumerate(zip(prods, (215, 540, 865), (-4, 0, 4))):
        tj = tarjeta(f, " ", None, ancho=290).rotate(g, expand=True, resample=Image.BICUBIC)
        b.pon(L, tj, x, 1150 + (40 if j != 1 else 0))
    pas(L, "alpacca.mx", 1560, 1, 0, sz=62)
    L.convert("RGB").save(os.path.join(AQUI, f"portada-{VAR}.jpg"), quality=92)


if __name__ == "__main__" and ARGS[:1] == ["portada"]:
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
