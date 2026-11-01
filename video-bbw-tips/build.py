"""Videos de Bath & Body Works que se ven como tips, no como anuncio (la venta va al final, suave).
Material: lo que Mae grabó el 1 de noviembre en el outlet (carpeta Bbw del Drive) con sus lentes Meta (video-123 =
llegada de noche y entrada, video-138 = recorrido, salida y pasillo del outlet) y su iPhone (IMG_5369 = sus bolsas en
el piso), más tomas de la visita anterior (IMG_4705: mists en su mano). Todo pasado a color normal (saturación 0.75)
y los de los lentes estabilizados: est_123.mp4, est_138.mp4, est_5369.mp4, est_4705.mp4.
La cara de Mae no sale: no se usan video-138 1.5-10.5 s (espejo) ni IMG_4705 118-146 s (espejo); tampoco tomas con
caras de otras personas de cerca (video-123 6-9 s, video-138 52-56 s).

Variantes (cada una con un truco distinto para que no parezca venta):
  dura        = «Si tu mist se te quita en una hora…»: miedo a perder (lo estás usando mal) + 4 tips numerados (el
                cerebro quiere llegar al último) y al final los 3 mists de los que más piezas hay.
  elige       = «¿Cómo escoges un mist si no lo puedes oler?»: quita la duda que frena la compra en línea; elegir por
                familia (dulce, floral, frutal) y escasez real (de 3 de los 5 queda 1 pieza). Cierra con una pregunta.
  intercambio = «¿Te tocó intercambio?»: tres precios ($90, $150, $199) para que elijan el de en medio o el de arriba
                (anclaje), con las tomas navideñas nuevas y «te lo mando de inmediato».
Datos de stock y precios: alpacca.mx/stock.csv (1 de noviembre). Notas de cada aroma: fichas de Bath & Body Works.
Uso: python3 voz.py VARIANTE; python3 build.py VARIANTE CARPETA_CON_est_*.mp4 -> BBW-tips-VARIANTE-voz.mp4"""
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
OUT = os.path.join(AQUI, f"BBW-tips-{VAR}.mp4")

# ---------------- tomas: por frase, a velocidad normal (cada una dura lo que le toca de la frase) ----------------
TOMAS = {
    "dura": [[("4705", 93.0), ("138", 13.0)], [("4705", 3.0), ("4705", 10.0)], [("4705", 156.0)],
             [("4705", 188.0), ("138", 24.0)], [("4705", 112.0), ("138", 30.0)], [("4705", 99.0), ("4705", 162.0), ("138", 36.0)],
             [("4705", 210.0), ("4705", 42.0), ("4705", 198.0)], [("5369", 4.4), ("138", 62.0)]],
    "elige": [[("123", 0.3), ("123", 3.6)], [("4705", 26.0), ("4705", 57.0)], [("4705", 86.0), ("4705", 92.0)],
              [("4705", 214.0), ("138", 40.0)], [("4705", 29.0), ("4705", 161.0)], [("138", 44.0), ("138", 16.0)],
              [("138", 60.0), ("138", 66.0)]],
    "intercambio": [[("123", 10.5), ("138", 20.0)], [("4705", 150.0), ("138", 26.0)], [("138", 32.0), ("4705", 194.0)],
                    [("4705", 222.0), ("4705", 23.0)], [("4705", 228.0), ("138", 38.0)], [("5369", 4.4), ("138", 46.0)],
                    [("138", 62.0)]],
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
    b.pon(L, im, W / 2, 360, *b.entra(t, 0.0, 0.3))
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
CLAVE = {"hora", "crema", "frotes", "ropa", "cabello", "baño", "retocarlo", "grande", "Japanese", "Thousand", "Champagne",
         "Guárdalo", "nunca", "oler", "notas", "dulce", "vainilla", "Orchid", "Amber", "floral", "Violet", "Worth", "frutal",
         "Gold", "pieza", "intercambio", "PocketBac", "noventa", "Snowflakes", "Warm", "uno", "set", "inmediato", "Uno",
         "Dos", "Tres", "Cuatro", "ojo", "cincuenta", "doscientos"}


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
                if pal: out.append((INI[n] + off + tp - ini, pal.strip(".,:;…¿?¡!")))
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
    im = Image.open(os.path.join(AQUI, "fotos", foto + ".webp")).convert("RGB")
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
    total = sum(i.width for i in ims) + 20 * (len(ims) - 1); x = W / 2 - total / 2
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
def capa_dura(L, t):
    e = next(i for i in range(len(T)) if t < INI[i + 1] or i == len(T) - 1)
    if e == 0: gancho(L, t, "¿Tu mist te dura 1 hora?", "Es por cómo te lo pones 👇", marca(0, 1))
    tips = {1: ("Sobre tu crema 🧴", "crema"), 2: ("No frotes las muñecas 🚫", None), 3: ("En ropa y cabello 👕", None),
            4: ("Fuera del baño 🚿", None)}
    if e in tips:
        numero(L, e, t, INI[e]); pas(L, tips[e][0], 330, t, INI[e] + 0.15, sz=60, maxw=800, cx=610)
        if e == 3: chips(L, ["👕 ropa", "✨ cabello", "↔️ desde lejos"], 460, t, marca(3, 1), sep=0.6)
        if e == 4: chips(L, ["🔥 calor", "☀️ luz"], 460, t, marca(4, 1) + 0.4, sep=0.4)
    if e == 5:
        interrupcion(L, t, INI[5], "OJO")
        if t >= INI[5] + 0.9:
            pas(L, "Mist = menos fragancia que un perfume", 330, t, INI[5] + 0.9, sz=50, bg=WHITE, fg=NEGRO)
            pas(L, "Retócalo en el día ✨", 450, t, marca(5, 1))
            pas(L, "El grande rinde más: 236 ml", 560, t, marca(5, 2), bg=NEGRO)
    if e == 6:
        for j, (f, nom, x, g) in enumerate([("jcb", "Japanese Cherry Blossom", 190, -3), ("atw", "A Thousand Wishes", 540, 0),
                                            ("ct", "Champagne Toast", 890, 3)]):
            pon_tarjeta(L, tarjeta(f, nom, "$150", ancho=300), x, 800, t, marca(6, j), g)
        pas(L, "$150 c/u · alpacca.mx", 1240, t, marca(6, 3), sz=60)
    if e == 7: cierre(L, t, INI[7], "📌 Guárdalo", "¿Cuál nunca te dura? 👇")
    if e != 6 and e != 7: subtitulo(L, t)


def capa_elige(L, t):
    e = next(i for i in range(len(T)) if t < INI[i + 1] or i == len(T) - 1)
    if e == 0:
        gancho(L, t, "¿Cómo elegir un mist", "", 0)
        if t < marca(0, 1): pas(L, "…sin olerlo? 🤔", 500, t, 0.4, sz=60, bg=WHITE, fg=ROSA)
        else: pas(L, "Fíjate en sus NOTAS 👃", 500, t, marca(0, 1), sz=60)
    fam = {1: ("🍰 DULCE", ["vainilla", "miel", "tonka"]), 2: ("🍰 DULCE", None), 3: ("🌸 FLORAL", ["violeta", "lirio"]),
           4: ("🍓 FRUTAL", ["frutos rojos", "zarzamora"])}
    if e in fam:
        b.pon(L, _sombra(bagel(fam[e][0][2:], 130, WHITE), 12, 170), W / 2, 330, *b.entra(t, INI[e], 0.3))
        if fam[e][1]: chips(L, fam[e][1], 470, t, marca(e, 1) if e == 1 else marca(e, 0) + 0.5)
    if e == 2:
        pon_tarjeta(L, tarjeta("orchid", "Orchid Effect", "vainilla batida", ancho=380), 300, 820, t, marca(2, 0), -3)
        pon_tarjeta(L, tarjeta("amber", "Amber Era", "ámbar con miel", ancho=380), 780, 820, t, marca(2, 1), 3)
    if e == 3:
        pon_tarjeta(L, tarjeta("violet", "Very Violet", "violeta", ancho=380), 300, 860, t, marca(3, 1), -3)
        pon_tarjeta(L, tarjeta("worth", "Worth Wanting", "lirio y miel", ancho=380), 780, 860, t, marca(3, 2), 3)
    if e == 4:
        pon_tarjeta(L, tarjeta("gold", "Touch of Gold", "zarzamora y azahar", ancho=420), W / 2, 880, t, marca(4, 1), -2)
    if e == 5:
        pas(L, "$150 c/u", 330, t, marca(5, 0), sz=80)
        stock = [("orchid", "Orchid Effect", "Quedan 3", ROSA), ("amber", "Amber Era", "Queda 1", NEGRO), ("violet", "Very Violet", "Quedan 3", ROSA),
                 ("worth", "Worth Wanting", "Queda 1", NEGRO), ("gold", "Touch of Gold", "Queda 1", NEGRO)]
        pos = [(200, 700), (540, 700), (880, 700), (370, 1190), (710, 1190)]
        for j, ((f, n, q, c), (x, y)) in enumerate(zip(stock, pos)):
            pon_tarjeta(L, tarjeta(f, n, q if t >= marca(5, 1) else "$150", ancho=300, color_abajo=c if t >= marca(5, 1) else ROSA), x, y, t, INI[5] + 0.15 * j)
    if e == 6:
        cierre(L, t, INI[6], "¿Dulce, floral o frutal?", "Coméntalo y te digo cuál te va 👇")
    if e not in (5, 6): subtitulo(L, t)


def capa_intercambio(L, t):
    e = next(i for i in range(len(T)) if t < INI[i + 1] or i == len(T) - 1)
    if e == 0:
        gancho(L, t, "¿Te tocó INTERCAMBIO?", "🎁 3 ideas de menos de $200", marca(0, 1))
    precios = {1: "$90", 2: "$150", 3: "$150", 4: "$199"}
    if e in precios:
        b.pon(L, _sombra(bagel(precios[e], 170, WHITE), 12, 170), W / 2, 330, *b.entra(t, INI[e], 0.3))
    if e == 1: pon_tarjeta(L, tarjeta("pocketbac3", "3 PocketBac navideños", "gel antibacterial", ancho=460), W / 2, 860, t, marca(1, 0))
    if e == 2:
        pon_tarjeta(L, tarjeta("snow", "Snowflakes & Cashmere", "mist de invierno", ancho=420), W / 2, 840, t, marca(2, 1))
        if t >= marca(2, 2): chips(L, ["vainilla", "maderas", "caramelo"], 1340, t, marca(2, 2))
    if e == 3:
        pon_tarjeta(L, tarjeta("wvs", "Warm Vanilla Sugar", "Queda 1", ancho=420, color_abajo=NEGRO), W / 2, 840, t, marca(3, 0))
        chips(L, ["vainilla", "azúcar", "sándalo"], 1340, t, marca(3, 0) + 0.6)
    if e == 4:
        pon_tarjeta(L, tarjeta("miniset-spc", "Strawberry Pound Cake", "gel + mist + crema", ancho=400), 300, 860, t, marca(4, 0), -3)
        pon_tarjeta(L, tarjeta("miniset-ct", "Champagne Toast", "gel + mist + crema", ancho=400), 780, 860, t, marca(4, 0) + 0.4, 3)
    if e == 5:
        pas(L, "🎁 Listos para regalar", 330, t, marca(5, 0))
        pas(L, "🇲🇽 Ya en México = envío inmediato", 450, t, marca(5, 1), bg=NEGRO, sz=52)
    if e == 6: cierre(L, t, INI[6], "📌 Guárdalo", "para cuando compres tu intercambio 🎁")
    if e not in (2, 3, 6): subtitulo(L, t)
    elif e in (2, 3): subtitulo(L, t, y=1620)


CAPA = {"dura": capa_dura, "elige": capa_elige, "intercambio": capa_intercambio}[VAR]


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
    "dura": ("4705", 93.6, "¿Tu mist te", "dura 1 hora?", "4 tips para que dure todo el día", ["jcb", "atw", "ct"]),
    "elige": ("4705", 214.5, "¿Cómo elegir", "un mist sin olerlo?", "🍰 dulce · 🌸 floral · 🍓 frutal", ["orchid", "violet", "gold"]),
    "intercambio": ("138", 22.0, "Ideas para tu", "INTERCAMBIO", "🎁 3 regalos de menos de $200", ["pocketbac3", "snow", "miniset-spc"]),
}


def portada():
    """todo dentro de la zona 3:4 que se ve en el perfil (y 240-1680)"""
    fuente, seg, r1, r2, pastilla, prods = PORTADA[VAR]
    L = next(video(fuente, seg, 1)); L.alpha_composite(Image.new("RGBA", (W, H), (20, 10, 16, 90)))
    for j, txt in enumerate((r1, r2)):
        im = _sombra(bagel(txt, 130, WHITE if j == 0 else ROSA), 14, 190)
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
