"""5 carruseles de temporada (noviembre 2026), inspirados en el formato «¿vende o aburre?» de @faniastudio:
portada tipo collage (papel, estrellas, burbuja de chat, marco de corazón, carpetas) y slides divididos en dos.
Todo en los colores y la letra de alpacca.mx (rosa #EE6C92, rosa profundo #C4466E, rosa tinta #B33660,
lila #766F96, blush #F6CADB, blanco; «Ready to Party» del logo para titulares, Inter para lo demás).
Precios y piezas: alpacca.mx/stock.csv del 15 de noviembre de 2026 (pijamas: $699, apartado con la mitad).
Uso: python3 carruseles.py  -> historias/, regalos/, pijamas/, calendarios/, como-comprar/ (1080x1350 cada slide)"""
import math, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(RAIZ, "video-envio")); sys.argv = [sys.argv[0], "/dev/null"]
import build as b
b.RAIZ_EMOJI = "/no-usar-emojis-de-apple"; b.emoji.cache_clear()  # emojis de Noto (los de Apple no se pueden usar)
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
import random

W, H = 1080, 1350
ROSA, ROSA_P, ROSA_I, LILA, BLUSH, BLANCO, TINTA = (238, 108, 146), (196, 70, 110), (179, 54, 96), (118, 111, 150), (246, 202, 219), (255, 255, 255), (17, 17, 17)
LILA_CLARO = (226, 222, 240)
FOTOS = os.path.join(AQUI, "fotos")
_RTP = os.path.join(RAIZ, "fonts", "ReadyToParty.ttf")
_fc = {}
def fm(sz):
    k = ("m", int(sz))
    if k not in _fc: _fc[k] = ImageFont.truetype(_RTP, int(sz))
    return _fc[k]
def fi(sz, peso="Bold"):
    k = ("i", int(sz), peso)
    if k not in _fc: _fc[k] = ImageFont.truetype(f"/usr/share/fonts/opentype/inter/InterDisplay-{peso}.otf", int(sz))
    return _fc[k]


def texto(s, f, fill):
    """una línea con emojis (Noto)"""
    partes = b.trozos(s); es = int(f.size * 1.0)
    ims = [b.emoji(t, es) if e else None for e, t in partes]
    w = sum(i.width + 4 if i is not None else f.getlength(t) for i, (e, t) in zip(ims, partes)); asc, desc = f.getmetrics()
    im = Image.new("RGBA", (int(w) + 8, asc + desc + 8)); d = ImageDraw.Draw(im); x = 4
    for i, (e, t) in zip(ims, partes):
        if i is not None: im.alpha_composite(i, (int(x), 4 + asc - i.height + int(desc * 0.3))); x += i.width + 4
        else: d.text((x, 4 + asc), t, font=f, fill=fill, anchor="ls"); x += f.getlength(t)
    return im.crop(im.getbbox() or (0, 0, 1, 1))


def parrafo(s, f, fill, ancho, centrado=True, inter=1.18):
    palabras = s.split(); lineas = []; cur = ""
    for p in palabras:
        if f.getlength((cur + " " + p).strip()) > ancho and cur: lineas.append(cur); cur = p
        else: cur = (cur + " " + p).strip()
    lineas.append(cur)
    ims = [texto(l, f, fill) for l in lineas]; lh = int(f.size * inter)
    im = Image.new("RGBA", (ancho, lh * len(ims) + 10))
    for k, i in enumerate(ims): im.alpha_composite(i, ((ancho - i.width) // 2 if centrado else 0, k * lh))
    return im


def pon(L, im, cx, cy): L.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
def sombra(im, r=14, a=90, dy=8):
    sh = Image.new("RGBA", (im.width + 4 * r, im.height + 4 * r + dy)); m = im.getchannel("A").point(lambda v: v * a // 255)
    base = Image.new("RGBA", im.size, (60, 20, 40, 255)); base.putalpha(m)
    sh.alpha_composite(base, (2 * r, 2 * r + dy)); sh = sh.filter(ImageFilter.GaussianBlur(r)); sh.alpha_composite(im, (2 * r, 2 * r)); return sh


# ---------------- piezas del collage ----------------
def papel(col, semilla=1):
    """fondo de color con textura de papel arrugado"""
    rnd = random.Random(semilla)
    im = Image.new("RGB", (W, H), col)
    ruido = Image.effect_noise((W // 3, H // 3), 18).resize((W, H), Image.BICUBIC)
    im = Image.composite(Image.new("RGB", (W, H), tuple(min(255, c + 14) for c in col)), im, ruido.point(lambda v: max(0, v - 120) * 2))
    d = ImageDraw.Draw(im)
    for _ in range(9):  # pliegues suaves
        x0, y0 = rnd.uniform(-200, W), rnd.uniform(-200, H); a = rnd.uniform(0, math.pi)
        x1, y1 = x0 + 1400 * math.cos(a), y0 + 1400 * math.sin(a)
        d.line((x0, y0, x1, y1), fill=tuple(min(255, c + 10) for c in col), width=3)
        d.line((x0 + 3, y0 + 3, x1 + 3, y1 + 3), fill=tuple(max(0, c - 10) for c in col), width=2)
    return im.convert("RGBA")


def estrella(sz, col=BLANCO, puntas=5, hueco=0.45, giro=0):
    im = Image.new("RGBA", (sz, sz)); c = sz / 2
    pts = [(c + (c - 2 if k % 2 == 0 else (c - 2) * hueco) * math.cos(math.pi * k / puntas - math.pi / 2 + giro),
            c + (c - 2 if k % 2 == 0 else (c - 2) * hueco) * math.sin(math.pi * k / puntas - math.pi / 2 + giro)) for k in range(2 * puntas)]
    ImageDraw.Draw(im).polygon(pts, fill=col + (255,)); return im


def destello(sz, col=BLANCO):
    """estrella de 4 puntas tipo brillo"""
    return estrella(sz, col, 4, 0.22)


def burbuja(s, sz=40):
    """burbuja de mensaje (gris clarito) con colita"""
    tx = texto(s, fi(sz, "Medium"), TINTA); px, py = 40, 24; w, h = tx.width + 2 * px, tx.height + 2 * py
    im = Image.new("RGBA", (w + 30, h + 30)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w, h), h // 2, fill=(238, 236, 242, 255))
    d.polygon([(w - 70, h - 4), (w - 20, h + 26), (w - 30, h - 20)], fill=(238, 236, 242, 255))
    im.alpha_composite(tx, (px, py)); return sombra(im, 10, 70, 6)


def corazon_mascara(sz):
    m = Image.new("L", (sz * 4, sz * 4), 0); d = ImageDraw.Draw(m); s = sz * 4; r = s * 0.27
    d.ellipse((s * 0.04, s * 0.06, s * 0.04 + 2 * r, s * 0.06 + 2 * r), fill=255)
    d.ellipse((s * 0.96 - 2 * r, s * 0.06, s * 0.96, s * 0.06 + 2 * r), fill=255)
    d.polygon([(s * 0.055, s * 0.36), (s * 0.945, s * 0.36), (s * 0.5, s * 0.96)], fill=255)
    return m.resize((sz, sz), Image.LANCZOS)


def marco_corazon(foto, sz, centrado=(0.5, 0.45)):
    """foto dentro de un corazón con marco rosa de dos tonos"""
    im = ImageOps.fit(Image.open(os.path.join(FOTOS, foto)).convert("RGB"), (sz, sz), Image.LANCZOS, centering=centrado)
    out = Image.new("RGBA", (sz + 60, sz + 60)); m_ext = corazon_mascara(sz + 60)
    out.paste(Image.new("RGBA", out.size, ROSA + (255,)), (0, 0), m_ext)
    m_med = corazon_mascara(sz + 30); out.paste(Image.new("RGBA", (sz + 30, sz + 30), BLUSH + (255,)), (15, 15), m_med)
    m = corazon_mascara(sz - 10); out.paste(im.resize((sz - 10, sz - 10)), (35, 38), m)
    return sombra(out, 16, 110, 12)


def carpeta(w, h, col, giro=0):
    im = Image.new("RGBA", (w + 10, h + 60)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, int(w * 0.42), 80), 18, fill=tuple(max(0, c - 18) for c in col) + (255,))
    d.rounded_rectangle((0, 40, w, h + 50), 26, fill=col + (255,))
    d.rectangle((24, 30, int(w * 0.38), 48), fill=BLANCO + (220,))
    im = sombra(im, 14, 90, 10)
    return im.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else im


def titulo_marca(s, sz, col=BLANCO, sh=True):
    f = fm(sz); asc, desc = f.getmetrics()
    im = Image.new("RGBA", (int(f.getlength(s)) + 20, asc + desc + 20)); ImageDraw.Draw(im).text((10, 10), s, font=f, fill=col)
    im = im.crop(im.getbbox())
    return sombra(im, 12, 120, 6) if sh else im


def pastilla(s, sz, bg, fg, px=34, py=16, r=None):
    tx = texto(s, fi(sz, "Bold"), fg); w, h = tx.width + 2 * px, tx.height + 2 * py
    im = Image.new("RGBA", (w, h)); ImageDraw.Draw(im).rounded_rectangle((0, 0, w - 1, h - 1), h // 2 if r is None else r, fill=bg + (255,))
    im.alpha_composite(tx, (px, py)); return im


def foto_tarjeta(foto, ancho, alto, borde=14, r=26, centrado=(0.5, 0.45), fondo_blanco=False):
    im = Image.open(os.path.join(FOTOS, foto)).convert("RGB")
    if fondo_blanco: im = ImageOps.pad(im, (ancho - 2 * borde, alto - 2 * borde), Image.LANCZOS, color=(255, 255, 255), centering=(0.5, 0.5))
    else: im = ImageOps.fit(im, (ancho - 2 * borde, alto - 2 * borde), Image.LANCZOS, centering=centrado)
    c = Image.new("RGBA", (ancho, alto)); d = ImageDraw.Draw(c); d.rounded_rectangle((0, 0, ancho - 1, alto - 1), r, fill=BLANCO + (255,))
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r - 8, fill=255)
    c.paste(im, (borde, borde), m); return sombra(c, 12, 100, 8)


def adornos(L, pos, semilla=0):
    rnd = random.Random(semilla)
    for (x, y, sz) in pos:
        f = destello if rnd.random() < 0.5 else (lambda s, c: estrella(s, c, 5, 0.45, rnd.uniform(-0.3, 0.3)))
        pon(L, f(sz, rnd.choice([BLANCO, BLUSH, BLANCO])), x, y)


def pie(L, oscuro=False):
    p = pastilla("alpacca.mx", 30, BLANCO if not oscuro else ROSA_P, ROSA_I if not oscuro else BLANCO, 26, 12)
    pon(L, p, W / 2, H - 70)


def guardar(L, carpeta_, n):
    os.makedirs(os.path.join(AQUI, carpeta_), exist_ok=True)
    L.convert("RGB").save(os.path.join(AQUI, carpeta_, f"{n:02d}.jpg"), quality=93)


# ---------------- stickers de historia de Instagram (para las comparaciones) ----------------
def st_texto_negro(s, sz=40):
    return pastilla(s, sz, TINTA, BLANCO, 30, 18, r=6)
def st_encuesta(pregunta, opciones, ancho=430):
    f = fi(26, "Bold"); h = 70 + 70 * len(opciones) + 20
    im = Image.new("RGBA", (ancho, h)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, ancho - 1, h - 1), 22, fill=BLANCO + (255,))
    d.rounded_rectangle((0, 0, ancho - 1, 64), 22, fill=TINTA + (255,)); d.rectangle((0, 40, ancho - 1, 64), fill=TINTA + (255,))
    t = texto(pregunta.upper(), f, BLANCO); im.alpha_composite(t, ((ancho - t.width) // 2, 32 - t.height // 2))
    for k, op in enumerate(opciones):
        y = 80 + 70 * k; d.rounded_rectangle((18, y, ancho - 18, y + 56), 16, fill=(232, 232, 236, 255))
        t = texto(op, fi(24, "SemiBold"), TINTA); im.alpha_composite(t, (36, y + 28 - t.height // 2))
    return sombra(im, 10, 80, 6)
def st_pregunta(pregunta, ancho=440):
    t = parrafo(pregunta, fi(28, "SemiBold"), TINTA, ancho - 60); h = t.height + 150
    im = Image.new("RGBA", (ancho, h + 40)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 30, ancho - 1, h + 30), 24, fill=BLANCO + (255,))
    d.ellipse((ancho / 2 - 30, 0, ancho / 2 + 30, 60), fill=ROSA_P + (255,), outline=BLANCO + (255,), width=4)
    im.alpha_composite(texto("a", fi(30, "Bold"), BLANCO), (int(ancho / 2 - 9), 10))
    im.alpha_composite(t, (30, 76))
    d.rounded_rectangle((26, h - 60, ancho - 26, h + 10), 14, fill=(200, 200, 206, 255))
    e = texto("Escribe algo...", fi(22, "Medium"), (90, 90, 96)); im.alpha_composite(e, ((ancho - e.width) // 2, h - 25 - e.height // 2))
    return sombra(im, 10, 80, 6)
def st_link(s):
    t = texto("🔗 " + s.upper(), fi(30, "Bold"), TINTA); w, h = t.width + 50, t.height + 34
    im = Image.new("RGBA", (w, h)); ImageDraw.Draw(im).rounded_rectangle((0, 0, w - 1, h - 1), 14, fill=BLANCO + (255,))
    im.alpha_composite(t, (25, 17)); return sombra(im, 8, 80, 4)
def st_cuenta(titulo, cuando, ancho=430):
    im = Image.new("RGBA", (ancho, 200)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, ancho - 1, 199), 24, fill=ROSA_P + (255,))
    t = texto(titulo.upper(), fi(26, "Bold"), BLANCO); im.alpha_composite(t, ((ancho - t.width) // 2, 26))
    for k, (n, l) in enumerate([("02", "días"), ("14", "hrs"), ("30", "min")]):
        x = 40 + k * 125; d.rounded_rectangle((x, 72, x + 105, 150), 14, fill=BLANCO + (255,))
        d.text((x + 52, 111), n, font=fi(44, "Bold"), fill=ROSA_I, anchor="mm")
        d.text((x + 52, 172), l, font=fi(20, "SemiBold"), fill=BLANCO, anchor="mm")
    return sombra(im, 10, 80, 6)
def st_slider(pregunta, emoji="😍", ancho=430):
    im = Image.new("RGBA", (ancho, 190)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, ancho - 1, 189), 24, fill=BLANCO + (255,))
    t = texto(pregunta, fi(28, "Bold"), TINTA); im.alpha_composite(t, ((ancho - t.width) // 2, 30))
    d.rounded_rectangle((40, 122, ancho - 40, 138), 8, fill=(225, 225, 230, 255)); d.rounded_rectangle((40, 122, int(ancho * 0.7), 138), 8, fill=ROSA + (255,))
    e = b.emoji(emoji, 64); im.alpha_composite(e, (int(ancho * 0.7) - 32, 98))
    return sombra(im, 10, 80, 6)


def comparacion(foto, aburre, vende, porque, n, carpeta_, centrado=(0.5, 0.45)):
    """slide dividido: izquierda «aburre» (lila) y derecha «vende» (blush), cada lado con su historia"""
    L = Image.new("RGBA", (W, H)); L.paste(papel(LILA, n)[0:0] if False else papel(LILA, n).crop((0, 0, W // 2, H)), (0, 0))
    L.paste(papel(BLUSH, n + 10).crop((W // 2, 0, W, H)), (W // 2, 0))
    for k, (cx, et, col_bg, col_tx, contenido) in enumerate([(W / 4, "aburre", BLUSH, LILA, aburre), (3 * W / 4, "vende", ROSA_P, BLANCO, vende)]):
        tarjeta = foto_tarjeta(foto, 450, 760, borde=0, r=26, centrado=centrado)
        pon(L, tarjeta, cx, 640)
        for st, (dx, dy) in contenido: pon(L, st, cx + dx, 640 + dy)
        lab = titulo_marca(et, 92, col_tx, sh=False); bx = Image.new("RGBA", (lab.width + 70, lab.height + 50), col_bg + (255,))
        bx.alpha_composite(lab, (35, 25)); pon(L, sombra(bx, 8, 60, 4), cx, 250)
    p = parrafo(porque, fi(34, "SemiBold"), TINTA, 900)
    caja = Image.new("RGBA", (960, p.height + 50)); ImageDraw.Draw(caja).rounded_rectangle((0, 0, 959, p.height + 49), 30, fill=BLANCO + (240,))
    caja.alpha_composite(p, (30, 25)); pon(L, sombra(caja, 10, 60, 6), W / 2, 1170)
    guardar(L, carpeta_, n)


def cierre_grupo(carpeta_, n, titulo, sub, semilla=5):
    sys.path.insert(0, os.path.dirname(AQUI)); import whatsapp
    L = papel(ROSA, semilla)
    adornos(L, [(120, 150, 70), (960, 190, 90), (110, 980, 60), (980, 900, 70), (180, 1180, 46)], semilla)
    pon(L, titulo_marca(titulo, 96), W / 2, 200)
    pon(L, parrafo(sub, fi(38, "SemiBold"), BLANCO, 900), W / 2, 330)
    pon(L, whatsapp.tarjeta(380), W / 2, 680)
    pon(L, pastilla("Únete a mi grupo de WhatsApp 💬", 42, BLANCO, ROSA_I), W / 2, 960)
    pon(L, pastilla("📦 Precio de mayoreo   🔥 Ofertas exclusivas", 32, ROSA_P, BLANCO), W / 2, 1070)
    pon(L, texto("Link en alpacca.mx 👆", fi(36, "Bold"), BLANCO), W / 2, 1170)
    guardar(L, carpeta_, n)


# ======================= 1 · ¿Tus historias venden o aburren? (para revendedoras) =======================
def historias():
    c = "historias"
    L = papel(ROSA, 3)
    adornos(L, [(150, 190, 80), (920, 200, 110), (990, 1000, 70), (90, 1010, 56)], 3)
    pon(L, burbuja("Si revendes, guarda esto 📌"), W / 2 + 20, 170)
    pon(L, titulo_marca("Historias", 190), W / 2, 330)
    pon(L, titulo_marca("que venden", 120, BLUSH), W / 2, 480)
    pon(L, carpeta(470, 300, BLUSH, -4), 300, 760); pon(L, carpeta(470, 300, LILA_CLARO, 3), 560, 960)
    pon(L, marco_corazon("p6107.jpg", 330), 820, 740)
    pon(L, destello(130, BLUSH), 470, 850)
    pon(L, titulo_marca("¿vende", 110, ROSA_I, sh=False), 300, 770)
    pon(L, titulo_marca("o", 90, ROSA_I, sh=False), 470, 850)
    pon(L, titulo_marca("aburre?", 110, LILA, sh=False), 560, 990)
    pon(L, parrafo("La misma pijama, dos historias: una se ignora y la otra te llena el inbox.", fi(36, "SemiBold"), BLANCO, 900), W / 2, 1200)
    pie(L); guardar(L, c, 1)
    comparacion("p6107.jpg", [(st_texto_negro("Pijamas disponibles 😍"), (0, -120))],
                [(st_encuesta("¿Juicy o True Religion?", ["💗 Juicy Couture", "🖤 True Religion"], 400), (0, -60))],
                "La encuesta hace que tus clientas toquen tu historia, y te dice cuál pijama pedir más.", 2, c)
    comparacion("carrito-daise.jpg", [(st_texto_negro("Nuevo en stock"), (0, -60))],
                [(st_pregunta("¿Cuánto crees que cuesta este trío? 👀", 400), (0, -40))],
                "Adivinar el precio da curiosidad: te escriben para saber si le atinaron.", 3, c, centrado=(0.5, 0.35))
    comparacion("p6109.jpg", [(st_texto_negro("Precio por inbox"), (0, 120))],
                [(st_cuenta("Cierra el apartado", ""), (0, -180)), (st_link("Apártala aquí"), (0, 250))],
                "«Precio por inbox» da flojera. Una fecha límite real y un link para apartar hacen que decidan ya.", 4, c)
    comparacion("p6113.jpg", [(st_texto_negro("Tallas S, M y L"), (0, 120))],
                [(st_slider("¿Qué tan suavecita se ve?"), (0, -120))],
                "El slider es el sticker más fácil de contestar: un dedo y listo, y el algoritmo te muestra a más gente.", 5, c)
    cierre_grupo(c, 6, "¿Revendes?", "Pijamas Juicy y True Religion, DAISE, mists y más, por mayoreo desde 1 pieza.")


# ---------------- piezas comunes a los estilos nuevos ----------------
def plano(col): return Image.new("RGBA", (W, H), col + (255,))


def lunares(bg, dot, sep=96, r=7):
    """papel de regalo: fondo liso con lunares en tresbolillo"""
    L = plano(bg); d = ImageDraw.Draw(L)
    for j, y in enumerate(range(-sep, H + sep, sep)):
        for x in range(-sep, W + sep, sep):
            x2 = x + (sep // 2 if j % 2 else 0); d.ellipse((x2 - r, y - r, x2 + r, y + r), fill=dot + (255,))
    return L


def cuadricula_puntos(bg, col, sep=54, r=3, a=70):
    L = plano(bg); capa = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(capa)
    for y in range(sep // 2, H, sep):
        for x in range(sep // 2, W, sep): d.ellipse((x - r, y - r, x + r, y + r), fill=col + (a,))
    L.alpha_composite(capa); return L


def espaciado(s, sz, col, track=0.16, peso="SemiBold"):
    f = fi(sz, peso); sp = sz * track; w = sum(f.getlength(ch) for ch in s) + sp * (len(s) - 1); asc, desc = f.getmetrics()
    im = Image.new("RGBA", (int(w) + 6, asc + desc + 6)); d = ImageDraw.Draw(im); x = 3
    for ch in s: d.text((x, 3 + asc), ch, font=f, fill=col, anchor="ls"); x += f.getlength(ch) + sp
    return im.crop(im.getbbox() or (0, 0, 1, 1))


def izq(L, im, x, cy): L.alpha_composite(im, (int(x), int(cy - im.height / 2)))
def der(L, im, x, cy): L.alpha_composite(im, (int(x - im.width), int(cy - im.height / 2)))


def recorte(foto, w, h, centrado=(0.5, 0.45), blanco=False):
    im = Image.open(os.path.join(FOTOS, foto)).convert("RGB")
    im = ImageOps.pad(im, (w, h), Image.LANCZOS, color=(255, 255, 255)) if blanco else ImageOps.fit(im, (w, h), Image.LANCZOS, centering=centrado)
    return im.convert("RGBA")


def contorno(s, sz, col, grosor=6, a=255):
    f = fm(sz); asc, desc = f.getmetrics(); im = Image.new("RGBA", (int(f.getlength(s)) + 40, asc + desc + 40))
    ImageDraw.Draw(im).text((20, 20), s, font=f, fill=(0, 0, 0, 0), stroke_width=grosor, stroke_fill=col + (a,))
    return im.crop(im.getbbox())


def cierre(c, n, L, titulo, sub, col_tit=BLANCO, col_sub=BLANCO, p1=(BLANCO, ROSA_I), p2=(ROSA_P, BLANCO), col_link=BLANCO, y_tit=200, extra=None):
    """invitación al grupo: QR grande arriba y la pastilla rosa «Únete a mi grupo de WhatsApp» abajo"""
    sys.path.insert(0, os.path.dirname(AQUI)); import whatsapp
    pon(L, titulo_marca(titulo, 96, col_tit, sh=col_tit == BLANCO), W / 2, y_tit)
    pon(L, parrafo(sub, fi(38, "SemiBold"), col_sub, 900), W / 2, 330)
    pon(L, whatsapp.tarjeta(380), W / 2, 680)
    if extra: extra(L)
    pon(L, pastilla("Únete a mi grupo de WhatsApp 💬", 42, *p1), W / 2, 960)
    pon(L, pastilla("📦 Precio de mayoreo   🔥 Ofertas exclusivas", 32, *p2), W / 2, 1070)
    pon(L, texto("Link en alpacca.mx 👆", fi(36, "Bold"), col_link), W / 2, 1170)
    guardar(L, c, n)


# ======================= 2 · Regalos por presupuesto — estilo «etiquetas de regalo» =======================
def etiqueta(foto, nombre, precio, w=420, h=440, cuerda=44):
    im = Image.new("RGBA", (w, h + cuerda)); d = ImageDraw.Draw(im); y0 = cuerda; ch = 56
    d.polygon([(ch, y0), (w - ch, y0), (w - 1, y0 + ch), (w - 1, y0 + h - 1), (0, y0 + h - 1), (0, y0 + ch)], fill=BLANCO + (255,), outline=BLUSH + (255,), width=6)
    hx, hy = w // 2, y0 + 34
    d.line((hx, 0, hx, hy), fill=ROSA_P + (255,), width=5)
    d.ellipse((hx - 15, hy - 15, hx + 15, hy + 15), fill=BLUSH + (255,), outline=LILA + (255,), width=5)
    if foto:
        f = recorte(foto, w - 70, 205, blanco=True); im.alpha_composite(f, (35, y0 + 62))
        t = parrafo(nombre, fi(26, "Bold"), TINTA, w - 50); im.alpha_composite(t, (25, y0 + 277))
        p = titulo_marca(precio, 54, ROSA_P, sh=False); im.alpha_composite(p, ((w - p.width) // 2, y0 + h - p.height - 18))
    return im


def colgar(L, tags, y_cuerda, xs, giros):
    d = ImageDraw.Draw(L)
    for t, x, g in zip(tags, xs, giros):
        r = sombra(t.rotate(g, expand=True, resample=Image.BICUBIC, center=(t.width / 2, 0)), 12, 90, 10)
        L.alpha_composite(r, (int(x - r.width / 2), int(y_cuerda - 24)))
        d.ellipse((x - 10, y_cuerda - 6, x + 10, y_cuerda + 14), fill=ROSA_I + (255,))


def mono(sz):
    """moño de listón (rosa con orilla rosa profundo)"""
    im = Image.new("RGBA", (sz, sz)); c = sz / 2
    for lado in (-1, 1):
        lazo = Image.new("RGBA", (sz, sz)); d = ImageDraw.Draw(lazo)
        d.ellipse((c - sz * 0.24, c - sz * 0.15, c + sz * 0.24, c + sz * 0.15), fill=ROSA + (255,), outline=ROSA_P + (255,), width=max(4, sz // 45))
        lazo = lazo.rotate(-lado * 28, resample=Image.BICUBIC); im.alpha_composite(lazo, (int(lado * sz * 0.2), int(-sz * 0.06)))
        d = ImageDraw.Draw(im); d.polygon([(c, c), (c + lado * sz * 0.13, c + sz * 0.42), (c + lado * sz * 0.26, c + sz * 0.36)], fill=ROSA_P + (255,))
    d = ImageDraw.Draw(im); d.ellipse((c - sz * 0.08, c - sz * 0.1, c + sz * 0.08, c + sz * 0.06), fill=ROSA_I + (255,))
    return im


def regalos():
    c = "regalos"
    L = lunares(BLANCO, BLUSH)
    d = ImageDraw.Draw(L)
    d.rectangle((690, 0, 800, H), fill=ROSA + (255,)); d.rectangle((0, 820, W, 930), fill=ROSA + (255,))
    for x in (702, 788): d.line((x, 0, x, H), fill=BLANCO + (255,), width=4)
    for y in (832, 918): d.line((0, y, W, y), fill=BLANCO + (255,), width=4)
    pon(L, sombra(mono(380), 12, 80, 8), 745, 840)
    izq(L, espaciado("GUÍA DE NAVIDAD", 30, LILA), 70, 110)
    izq(L, titulo_marca("Regalos", 190, ROSA_I, sh=False), 60, 250)
    izq(L, titulo_marca("por", 110, LILA, sh=False), 66, 410); izq(L, titulo_marca("presupuesto", 110, LILA, sh=False), 66, 520)
    t = etiqueta(None, "", ""); dt = ImageDraw.Draw(t)
    tx = titulo_marca("Desde", 70, LILA, sh=False); t.alpha_composite(tx, ((t.width - tx.width) // 2, 140))
    tx = titulo_marca("$149", 140, ROSA_P, sh=False); t.alpha_composite(tx, ((t.width - tx.width) // 2, 230))
    tx = parrafo("Todo ya está en México 🇲🇽", fi(28, "Bold"), TINTA, 400); t.alpha_composite(tx, ((t.width - tx.width) // 2, 395))
    r = sombra(t.rotate(5, expand=True, resample=Image.BICUBIC), 12, 90, 10); pon(L, r, 330, 980)
    pon(L, pastilla("Desliza y elige tu presupuesto →", 34, ROSA_P, BLANCO), W / 2, 1270)
    guardar(L, c, 1)
    rangos = [("Menos de $200", [("jcb.webp", "Body mist Bath & Body Works", "$150"), ("lip-bv.jpg", "Bálsamo DAISE", "$189"),
                                 ("rt-midi.jpg", "Duo de brochas Real Techniques", "$149"), ("peppermint.jpg", "Mist Twisted Peppermint", "$150")]),
              ("De $300 a $400", [("pocketbac10.jpg", "10 geles PocketBac navideños", "$300"), ("daise-lip.jpg", "Trío de bálsamos DAISE", "$399"),
                                  ("daise-mist.jpg", "Trío de mists DAISE", "$399")]),
              ("De $500 a $600", [("starface.jpg", "Starface Big Lil", "$529"), ("gm.jpg", "Good Molecules Merry & Glow", "$529"),
                                  ("skin-advent.jpg", "Calendario Skincare (12 días)", "$599"), ("spa-advent.jpg", "Calendario Spa (12 días)", "$599")]),
              ("De $650 a $800", [("p6108.jpg", "Pijama Juicy Couture", "$699"), ("byoma.jpg", "BYOMA Lab Kit (5 pzs)", "$659"),
                                  ("rhode-pink.jpg", "rhode Pocket Pair", "$799"), ("unlockt.jpg", "Unlockt K-Beauty (8 pzs)", "$789")])]
    for k, (rango, prods) in enumerate(rangos):
        L = lunares(BLANCO, BLUSH)
        izq(L, espaciado(f"PRESUPUESTO {k + 1} DE 4", 26, LILA), 60, 70)
        izq(L, titulo_marca(rango, 104, ROSA_I, sh=False), 56, 145)
        tags = [etiqueta(*p) for p in prods]
        d = ImageDraw.Draw(L)
        for yc in (215, 760): d.line([(x, yc + 10 * math.sin(math.pi * x / W)) for x in range(0, W + 20, 20)], fill=ROSA_P + (255,), width=5)
        colgar(L, tags[:2], 215, [280, 800], [-3, 3])
        fila2 = tags[2:]
        if len(fila2) == 2: colgar(L, fila2, 760, [280, 800], [2, -2])
        else: colgar(L, fila2, 760, [W / 2], [2])
        pon(L, pastilla("alpacca.mx", 30, ROSA_P, BLANCO, 26, 12), W / 2, 1300)
        guardar(L, c, 2 + k)
    L = lunares(BLANCO, BLUSH)
    cierre(c, 6, L, "¿Cuál regalas?", "Todo ya está en México y te lo mando de inmediato (las pijamas se apartan con la mitad).",
           col_tit=ROSA_I, col_sub=TINTA, p1=(ROSA_P, BLANCO), p2=(LILA, BLANCO), col_link=ROSA_I,
           extra=lambda L: pon(L, mono(150), W / 2 + 380, 195))


# ======================= 3 · ¿Juicy o True Religion? — estilo «revista» =======================
def cabecera_revista(L, col, num, total):
    izq(L, espaciado("ALPACCA · EDICIÓN DE NAVIDAD", 22, col), 60, 58)
    der(L, espaciado(f"N° {num}/{total}", 22, col), W - 60, 58)
    ImageDraw.Draw(L).line((60, 88, W - 60, 88), fill=col + (255,), width=2)


def pijamas():
    c = "pijamas"; T = 6
    L = plano(TINTA)
    L.alpha_composite(recorte("p6107.jpg", 540, H, (0.5, 0.5)), (0, 0)); L.alpha_composite(recorte("p6109.jpg", 540, H, (0.5, 0.5)), (540, 0))
    g = Image.new("L", (1, H)); [g.putpixel((0, y), int(200 * max(0, 1 - y / 640) ** 1.4)) for y in range(H)]
    sombra_sup = Image.new("RGBA", (W, H), (40, 12, 30, 255)); sombra_sup.putalpha(g.resize((W, H))); L.alpha_composite(sombra_sup)
    ImageDraw.Draw(L).line((540, 640, 540, 1150), fill=BLANCO + (255,), width=4)
    cabecera_revista(L, BLANCO, 1, T)
    izq(L, titulo_marca("¿Juicy", 220), 50, 270)
    izq(L, titulo_marca("o True Religion?", 112, BLUSH), 60, 440)
    pon(L, titulo_marca("vs", 130), 540, 900)
    ImageDraw.Draw(L).rectangle((0, 1170, W, H), fill=LILA + (255,))
    pon(L, espaciado("TODAS A $699 · APÁRTALA CON LA MITAD", 32, BLANCO, 0.08, "Bold"), W / 2, 1230)
    pon(L, espaciado("ALPACCA.MX", 24, BLUSH), W / 2, 1290)
    guardar(L, c, 1)
    # 2 · Juicy Couture
    L = plano(BLUSH); cabecera_revista(L, ROSA_I, 2, T)
    izq(L, titulo_marca("Juicy Couture", 110, ROSA_I, sh=False), 56, 175)
    izq(L, espaciado("6 SETS · DE 2 Y 3 PIEZAS", 24, LILA), 62, 255)
    juicy = [("p6107.jpg", "Coronas", "3 piezas"), ("p6108.jpg", "Rayas", "2 piezas"), ("p6111.jpg", "Fucsia de letras", "2 piezas"),
             ("p6112.jpg", "Afelpada beige", "2 piezas"), ("p6113.jpg", "Afelpada blanca", "2 piezas"), ("p6115.jpg", "Brillitos", "2 piezas")]
    for k, (f, nom, pz) in enumerate(juicy):
        x = 60 + (k % 3) * 325; y = 300 + (k // 3) * 490
        L.alpha_composite(recorte(f, 310, 380), (x, y))
        L.alpha_composite(titulo_marca(str(k + 1), 96), (x + 8, y + 380 - 120))
        L.alpha_composite(texto(nom, fi(28, "Bold"), ROSA_I), (x, y + 395)); L.alpha_composite(texto(pz, fi(24, "Medium"), TINTA), (x, y + 438))
    pon(L, espaciado("ALPACCA.MX", 24, ROSA_I), W / 2, 1300)
    guardar(L, c, 2)
    # 3 · True Religion
    L = plano(LILA); cabecera_revista(L, BLANCO, 3, T)
    izq(L, titulo_marca("True Religion", 110, BLANCO, sh=False), 56, 175)
    izq(L, espaciado("3 SETS · TODAS DE 3 PIEZAS", 24, BLUSH), 62, 255)
    tr = [("p6106.jpg", "Rosa con corazón"), ("p6109.jpg", "Gris con herraduras"), ("p6110.jpg", "Gris con ribete negro")]
    for k, (f, nom) in enumerate(tr):
        x = 60 + k * 325; y = 300
        L.alpha_composite(recorte(f, 310, 600), (x, y)); L.alpha_composite(titulo_marca(str(k + 7), 96), (x + 8, y + 600 - 120))
        L.alpha_composite(parrafo(nom, fi(28, "Bold"), BLANCO, 300, centrado=False), (x, y + 615))
    izq(L, parrafo("Traen camisa, short y pantalón: tres prendas en un solo regalo.", fi(36, "SemiBold"), BLANCO, 960, centrado=False), 60, 1110)
    pon(L, espaciado("ALPACCA.MX", 24, BLUSH), W / 2, 1300)
    guardar(L, c, 3)
    # 4 · 2 piezas vs 3 piezas
    L = plano(BLANCO); cabecera_revista(L, ROSA_I, 4, T); d = ImageDraw.Draw(L)
    for k, (f, et, lista) in enumerate([("p6108.jpg", "2 piezas", ["Camisa", "Pantalón"]), ("p6107.jpg", "3 piezas", ["Camisa", "Short", "Pantalón"])]):
        y = 130 + k * 545; fx = 60 if k == 0 else 550; tx = 590 if k == 0 else 60
        L.alpha_composite(recorte(f, 470, 515), (fx, y))
        izq(L, titulo_marca(et, 110, ROSA_P if k else LILA, sh=False), tx, y + 90)
        for j, p in enumerate(lista):
            yy = y + 210 + j * 70; d.rectangle((tx, yy - 4, tx + 26, yy + 4), fill=(ROSA_P if k else LILA) + (255,))
            izq(L, texto(p, fi(40, "SemiBold"), TINTA), tx + 46, yy)
    d.rectangle((0, 1225, W, H), fill=ROSA_P + (255,))
    pon(L, titulo_marca("Mismo precio: $699", 76, BLANCO, sh=False), W / 2, 1287)
    guardar(L, c, 4)
    # 5 · cuánto te ahorras
    L = plano(BLUSH); cabecera_revista(L, ROSA_I, 5, T); d = ImageDraw.Draw(L)
    izq(L, titulo_marca("¿Cuánto te ahorras?", 100, ROSA_I, sh=False), 56, 185)
    for k, (pz, usd, mxn, ahorro) in enumerate([("2 PIEZAS", "$58 USD", "$1,076", "$377"), ("3 PIEZAS", "$68 USD", "$1,261", "$562")]):
        y = 300 + k * 420
        d.rectangle((60, y, W - 60, y + 380), fill=BLANCO + (255,))
        izq(L, espaciado(pz, 26, LILA, 0.16, "Bold"), 100, y + 50)
        izq(L, texto("Precio de etiqueta en EE. UU.", fi(28, "Medium"), TINTA), 100, y + 105)
        a1 = titulo_marca(usd, 74, LILA, sh=False); a2 = texto(f"≈ {mxn} pesos", fi(36, "Bold"), LILA)
        izq(L, a1, 100, y + 180); izq(L, a2, 100 + a1.width + 24, y + 185)
        d.line((92, y + 188, 124 + a1.width + a2.width + 10, y + 176), fill=ROSA_P + (255,), width=6)
        izq(L, texto("Conmigo", fi(30, "Bold"), ROSA_I), 100, y + 275)
        izq(L, titulo_marca("$699", 110, ROSA_P, sh=False), 260, y + 285)
        der(L, pastilla("Te ahorras " + ahorro, 34, ROSA_P, BLANCO), W - 100, y + 285)
    izq(L, parrafo("Precios de etiqueta de las Juicy en EE. UU. Tipo de cambio FIX de Banxico del 15 de noviembre de 2026: $18.55 por dólar.", fi(25, "Medium"), TINTA, 960, centrado=False), 60, 1200)
    guardar(L, c, 5)
    L = plano(LILA); cabecera_revista(L, BLANCO, 6, T)
    cierre(c, 6, L, "¿Cuál es la tuya?", "Comenta el número de tu favorita. Todas a $699 y la apartas con la mitad.",
           col_sub=BLANCO, p1=(BLANCO, ROSA_I), p2=(ROSA_P, BLANCO), col_link=BLUSH, y_tit=200)


# ======================= 4 · Calendarios de adviento — estilo «hoja de calendario» =======================
def hoja_diciembre(w, marcado=1):
    """hoja de calendario de diciembre de 2026 (el 1 cae en martes)"""
    cab = int(w * 0.2); celda = (w - 60) / 7; h = int(cab + 70 + celda * 5 + 40)
    im = Image.new("RGBA", (w, h)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 30, fill=BLANCO + (255,)); d.rounded_rectangle((0, 0, w - 1, cab), 30, fill=ROSA_P + (255,)); d.rectangle((0, cab - 30, w - 1, cab), fill=ROSA_P + (255,))
    t = titulo_marca("Diciembre", int(cab * 0.62), BLANCO, sh=False); im.alpha_composite(t, ((w - t.width) // 2, (cab - t.height) // 2))
    for k in range(2): x = int(w * (0.25 + 0.5 * k)); d.rounded_rectangle((x - 12, -20, x + 12, 40), 12, fill=LILA + (255,))
    for j, l in enumerate("LMMJVSD"): d.text((30 + celda * (j + 0.5), cab + 38), l, font=fi(int(celda * 0.32), "Bold"), fill=LILA, anchor="mm")
    for dia in range(1, 32):
        pos = dia + 0; col = (pos) % 7; fila = (pos) // 7
        cx, cy = 30 + celda * (col + 0.5), cab + 70 + celda * (fila + 0.5)
        d.rounded_rectangle((cx - celda * 0.44, cy - celda * 0.44, cx + celda * 0.44, cy + celda * 0.44), 12, fill=BLUSH + (110,) if dia > 24 else BLUSH + (255,))
        d.text((cx, cy), str(dia), font=fi(int(celda * 0.36), "Bold"), fill=ROSA_I, anchor="mm")
        if dia == marcado:
            d.ellipse((cx - celda * 0.56, cy - celda * 0.56, cx + celda * 0.56, cy + celda * 0.56), outline=ROSA_P + (255,), width=7)
    return im


def cabecera_cal(L, titulo, sub):
    d = ImageDraw.Draw(L); d.rectangle((0, 0, W, 230), fill=ROSA_P + (255,))
    for x in range(90, W, 150): d.ellipse((x - 14, 216, x + 14, 244), fill=BLANCO + (255,), outline=LILA + (255,), width=4)
    izq(L, espaciado(sub, 24, BLUSH), 60, 62)
    izq(L, titulo_marca(titulo, 96, BLANCO, sh=False), 56, 140)


def calendarios():
    c = "calendarios"
    L = plano(LILA_CLARO)
    izq(L, espaciado("EL 1 DE DICIEMBRE YA ES TARDE ⏰".replace(" ⏰", ""), 26, LILA), 62, 90)
    izq(L, titulo_marca("Calendarios", 170, ROSA_I, sh=False), 52, 210)
    izq(L, titulo_marca("de adviento", 110, LILA, sh=False), 60, 350)
    hoja = hoja_diciembre(720)
    pon(L, sombra(hoja.rotate(-3, expand=True, resample=Image.BICUBIC), 14, 90, 10), W / 2 + 40, 880)
    nota = Image.new("RGBA", (290, 170), BLUSH + (255,))
    nota.alpha_composite(parrafo("El 1 se abre la primera sorpresa", fi(32, "Bold"), ROSA_I, 250), (20, 30))
    pon(L, sombra(nota.rotate(6, expand=True, resample=Image.BICUBIC), 10, 80, 6), 870, 415)
    pon(L, pastilla("¿Cuál te conviene? Te saco la cuenta 🧮", 36, ROSA_P, BLANCO), W / 2, 1280)
    guardar(L, c, 1)
    cals = [("skin-advent.jpg", "Skincare de Target", "12 sorpresas de skincare: La Roche-Posay, BYOMA, TONYMOLY y más.", 599, 12),
            ("spa-advent.jpg", "Spa de Target", "12 sorpresas de spa: Hero, Pixi, Aquaphor, Palmer's y La Roche-Posay.", 599, 12),
            ("rt-cal.jpg", "Real Techniques", "25 días de brochas y accesorios de maquillaje. Solo me quedan 2.", 789, 25),
            ("daise-advent.jpg", "DAISE Dreamhouse", "7 sorpresas de baño y cuerpo, una para cada día de la semana.", 789, 7)]
    for k, (f, nom, desc, precio, n) in enumerate(cals):
        L = plano(BLANCO); cabecera_cal(L, nom, f"CALENDARIO {k + 1} DE 4")
        L.alpha_composite(sombra(recorte(f, 460, 540, blanco=True), 12, 70, 8), (60 - 24, 290 - 24))
        x = 580
        izq(L, texto(f"${precio} ÷ {n} sorpresas", fi(32, "Bold"), TINTA), x, 330)
        izq(L, titulo_marca(f"${round(precio / n)}", 210, ROSA_P, sh=False), x - 6, 500)
        izq(L, texto("por sorpresa (aprox.)", fi(32, "SemiBold"), LILA), x, 640)
        izq(L, parrafo(desc, fi(30, "Medium"), TINTA, 450, centrado=False), x, 780)
        cols = {12: 6, 25: 9}.get(n, n); gap = 12; tam = min(120, (960 - gap * (cols - 1)) / cols)
        x0 = (W - (cols * tam + gap * (cols - 1))) / 2; y0 = 950
        d = ImageDraw.Draw(L)
        for i in range(n):
            cx = x0 + (i % cols) * (tam + gap); cy = y0 + (i // cols) * (tam + gap)
            d.rounded_rectangle((cx, cy, cx + tam, cy + tam), 10, fill=BLUSH + (255,))
            d.text((cx + tam / 2, cy + tam / 2), str(i + 1), font=fi(int(tam * 0.4), "Bold"), fill=ROSA_I, anchor="mm")
        izq(L, espaciado(f"{n} SORPRESAS", 24, LILA, 0.16, "Bold"), x0, y0 - 40)
        pon(L, pastilla("alpacca.mx", 28, ROSA_P, BLANCO, 24, 10), W / 2, 1310)
        guardar(L, c, 2 + k)
    L = plano(BLANCO); cabecera_cal(L, "El más rendidor", "PRECIO POR SORPRESA")
    filas = [("rt-cal.jpg", "Real Techniques", "$32", "25 sorpresas · $789"), ("skin-advent.jpg", "Skincare de Target", "$50", "12 sorpresas · $599"),
             ("spa-advent.jpg", "Spa de Target", "$50", "12 sorpresas · $599"), ("daise-advent.jpg", "DAISE Dreamhouse", "$113", "7 sorpresas · $789")]
    d = ImageDraw.Draw(L)
    for k, (f, nom, por, det) in enumerate(filas):
        y = 290 + k * 215
        d.rounded_rectangle((60, y, W - 60, y + 190), 26, fill=(BLUSH if k == 0 else LILA_CLARO) + (255,))
        pon(L, titulo_marca(str(k + 1), 100, ROSA_P if k == 0 else LILA, sh=False), 120, y + 95)
        L.alpha_composite(recorte(f, 150, 150, blanco=True), (180, y + 20))
        izq(L, texto(nom, fi(36, "Bold"), TINTA), 360, y + 70); izq(L, texto(det, fi(26, "Medium"), (90, 90, 96)), 360, y + 122)
        der(L, titulo_marca(por, 84, ROSA_P if k == 0 else LILA, sh=False), W - 95, y + 95)
    pon(L, parrafo("Real Techniques es el que más rinde por sorpresa, y solo me quedan 2.", fi(34, "SemiBold"), TINTA, 940), W / 2, 1200)
    guardar(L, c, 6)
    L = plano(BLANCO); d = ImageDraw.Draw(L); d.rectangle((0, 0, W, 230), fill=ROSA_P + (255,))
    for x in range(90, W, 150): d.ellipse((x - 14, 216, x + 14, 244), fill=BLANCO + (255,), outline=LILA + (255,), width=4)
    cierre(c, 7, L, "¿Cuál abrirías tú?", "Todos ya están en México y te los mando de inmediato.", col_sub=TINTA,
           p1=(ROSA_P, BLANCO), p2=(LILA, BLANCO), col_link=ROSA_I, y_tit=115)


# ======================= 5 · Cómo comprar — estilo «tutorial lila» =======================
TAPAR = {"14.png": [(276, 732, 1010, 938)]}  # titular, CLABE y número de cuenta: no deben quedar en un post


def tapa_datos(im, nombre):
    """pixela y difumina los datos bancarios para que no se puedan leer"""
    im = im.convert("RGB")
    for caja in TAPAR.get(nombre, []):
        r = im.crop(caja); w, h = r.size
        r = r.resize((max(1, w // 28), max(1, h // 28)), Image.BILINEAR).resize((w, h), Image.NEAREST).filter(ImageFilter.GaussianBlur(14))
        im.paste(r, caja[:2])
    return im


def como_comprar():
    sys.path.insert(0, os.path.join(RAIZ, "video-tutorial-stock")); from iphone import Iphone
    c = "como-comprar"; tel = Iphone(820); pant = os.path.join(RAIZ, "video-tutorial-stock", "pantallas")
    def telefono(img, alto, giro=0):
        t = tel.con(tapa_datos(Image.open(os.path.join(pant, img)), img)); e = alto / t.height
        t = t.resize((int(t.width * e), int(t.height * e)), Image.LANCZOS)
        return t.rotate(giro, expand=True, resample=Image.BICUBIC) if giro else t
    L = cuadricula_puntos(LILA, BLANCO)
    izq(L, espaciado("TUTORIAL · 6 PASOS", 26, BLUSH), 62, 90)
    izq(L, titulo_marca("Así compras", 170, BLANCO), 50, 220)
    izq(L, titulo_marca("en alpacca.mx", 110, BLUSH), 58, 370)
    pon(L, telefono("07.png", 760, 7), 330, 900); pon(L, telefono("02.png", 820, -5), 740, 870)
    guardar(L, c, 1)
    pasos = [("Toca «Stock en México»", "02.png", "Ahí está todo lo que ya tengo aquí, listo para enviarse."),
             ("Elige y toca «Agregar»", "05.png", "Puedes filtrar por categoría y ver cuántas piezas quedan."),
             ("Revisa tu carrito", "07.png", "Ves el total, y si revendes, cuánto ganas por pieza."),
             ("Inicia sesión o crea tu cuenta", "09.png", "Es gratis y así puedes ver tus pedidos."),
             ("Llena tus datos de envío", "11.png", "El envío se calcula con tu código postal. En Juárez puedes elegir entrega personal."),
             ("Elige cómo pagar y envía tu pedido", "14.png", "Transferencia (subes tu comprobante) o tarjeta con Mercado Pago.")]
    for k, (tit, img, desc) in enumerate(pasos):
        L = cuadricula_puntos(LILA, BLANCO); d = ImageDraw.Draw(L)
        izq(L, espaciado(f"PASO {k + 1} DE 6", 26, BLUSH, 0.16, "Bold"), 62, 70)
        for j in range(6):
            x = W - 70 - (5 - j) * 40; d.ellipse((x - 11, 59, x + 11, 81), fill=(BLUSH if j <= k else LILA) + (255,), outline=BLUSH + (255,), width=3)
        izq(L, parrafo(tit, fm(84), BLANCO, 960, centrado=False, inter=1.05), 56, 185 if len(tit) > 26 else 160)
        pon(L, contorno(str(k + 1), 640, BLUSH, 8, 150), 250, 760)
        pon(L, telefono(img, 820, -3), 650, 735)
        caja = parrafo(desc, fi(34, "SemiBold"), TINTA, 900); fondo = Image.new("RGBA", (960, caja.height + 44)); ImageDraw.Draw(fondo).rounded_rectangle((0, 0, 959, caja.height + 43), 28, fill=BLANCO + (255,))
        fondo.alpha_composite(caja, (30, 22)); pon(L, fondo, W / 2, 1230)
        guardar(L, c, 2 + k)
    L = cuadricula_puntos(LILA, BLANCO)
    cierre(c, 8, L, "¡Así de fácil!", "Lo que está en Stock en México te lo mando de inmediato. Guarda este carrusel para cuando lo necesites.",
           col_sub=BLANCO, p1=(BLANCO, ROSA_I), p2=(ROSA_P, BLANCO), col_link=BLUSH)


if __name__ == "__main__":
    que = [q for q in os.environ.get("SOLO", "historias regalos pijamas calendarios como_comprar").split()]
    for q in que: globals()[q](); print("ok", q)
