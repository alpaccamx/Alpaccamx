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


# ======================= 2 · Regalos de Navidad por presupuesto =======================
def slide_rango(c, n, rango, productos, semilla):
    L = papel(BLUSH, semilla)
    adornos(L, [(90, 120, 60), (990, 130, 70), (1000, 1150, 56)], semilla)
    pon(L, titulo_marca(rango, 120, ROSA_P), W / 2, 150)
    cols = 2; aw, ah = 440, 470
    for k, (foto, nom, precio) in enumerate(productos):
        cx = W / 2 + (k % cols - 0.5) * (aw + 40) if len(productos) > 1 else W / 2; cy = 470 + (k // cols) * (ah + 70)
        pon(L, foto_tarjeta(foto, aw, ah - 60, fondo_blanco=True), cx, cy - 20)
        pon(L, pastilla(nom, 26, BLANCO, TINTA, 20, 10), cx, cy + ah / 2 - 50)
        pon(L, pastilla(precio, 34, ROSA_P, BLANCO, 22, 10), cx + aw / 2 - 70, cy - ah / 2 + 30)
    pie(L, True); guardar(L, c, n)


def regalos():
    c = "regalos"
    L = papel(ROSA, 21)
    adornos(L, [(150, 170, 90), (930, 190, 100), (130, 1060, 70), (960, 1100, 80)], 21)
    pon(L, burbuja("Guía para no fallar 🎁"), W / 2, 170)
    pon(L, titulo_marca("Regalos", 200), W / 2, 330)
    pon(L, titulo_marca("por presupuesto", 96, BLUSH), W / 2, 480)
    for k, (f, x, g) in enumerate([("jcb.webp", 230, -6), ("daise-lip.jpg", 540, 2), ("p6106.jpg", 850, 6)]):
        pon(L, foto_tarjeta(f, 300, 360, fondo_blanco=f != "p6106.jpg").rotate(g, expand=True, resample=Image.BICUBIC), x, 780 + (0 if k == 1 else 40))
    pon(L, pastilla("Desde $149 · todo ya está en México 🇲🇽", 36, BLANCO, ROSA_I), W / 2, 1070)
    pon(L, parrafo("Desliza y elige según lo que quieras gastar →", fi(32, "SemiBold"), BLANCO, 900), W / 2, 1170)
    pie(L); guardar(L, c, 1)
    slide_rango(c, 2, "Menos de $200", [("jcb.webp", "Body mist Bath & Body Works", "$150"), ("lip-bv.jpg", "Bálsamo DAISE", "$189"),
                                         ("rt-midi.jpg", "Duo de brochas Real Techniques", "$149"), ("peppermint.jpg", "Mist Twisted Peppermint", "$150")], 22)
    slide_rango(c, 3, "De $300 a $400", [("pocketbac10.jpg", "10 geles PocketBac navideños", "$300"), ("daise-lip.jpg", "Trío de bálsamos DAISE", "$399"),
                                          ("daise-mist.jpg", "Trío de mists DAISE", "$399")], 23)
    slide_rango(c, 4, "De $500 a $600", [("starface.jpg", "Starface Big Lil", "$529"), ("gm.jpg", "Good Molecules Merry & Glow", "$529"),
                                          ("skin-advent.jpg", "Calendario Skincare (12 días)", "$599"), ("spa-advent.jpg", "Calendario Spa (12 días)", "$599")], 24)
    slide_rango(c, 5, "De $650 a $800", [("p6108.jpg", "Pijama Juicy Couture", "$699"), ("byoma.jpg", "BYOMA Lab Kit (5 pzs)", "$659"),
                                          ("rhode-pink.jpg", "rhode Pocket Pair", "$799"), ("unlockt.jpg", "Unlockt K-Beauty (8 pzs)", "$789")], 25)
    cierre_grupo(c, 6, "¿Cuál regalas?", "Todo ya está en México y te lo mando de inmediato (las pijamas se apartan con la mitad).")


# ======================= 3 · ¿Juicy o True Religion? =======================
def pijamas():
    c = "pijamas"
    L = papel(ROSA, 31)
    adornos(L, [(140, 160, 80), (950, 170, 100), (120, 1150, 60), (980, 1120, 70)], 31)
    pon(L, burbuja("Comparación directa 🤯"), W / 2, 160)
    pon(L, titulo_marca("¿Juicy", 190), W / 2, 320)
    pon(L, titulo_marca("o True Religion?", 110, BLUSH), W / 2, 480)
    pon(L, foto_tarjeta("p6107.jpg", 400, 520).rotate(-5, expand=True, resample=Image.BICUBIC), 290, 840)
    pon(L, foto_tarjeta("p6109.jpg", 400, 520).rotate(5, expand=True, resample=Image.BICUBIC), 790, 840)
    vs = Image.new("RGBA", (150, 150)); ImageDraw.Draw(vs).ellipse((0, 0, 149, 149), fill=ROSA_P + (255,)); pon(vs, titulo_marca("vs", 76, BLANCO, sh=False), 75, 70)
    pon(L, sombra(vs, 10, 90, 6), W / 2, 830)
    pon(L, pastilla("Todas a $699 · apártala con la mitad", 36, BLANCO, ROSA_I), W / 2, 1180)
    pie(L); guardar(L, c, 1)
    # 2 · Juicy Couture
    L = papel(BLUSH, 32); pon(L, titulo_marca("Juicy Couture", 120, ROSA_P), W / 2, 140)
    juicy = [("p6107.jpg", "Coronas · 3 piezas"), ("p6108.jpg", "Rayas · 2 piezas"), ("p6111.jpg", "Fucsia de letras · 2 piezas"),
             ("p6112.jpg", "Afelpada beige · 2 piezas"), ("p6113.jpg", "Afelpada blanca · 2 piezas"), ("p6115.jpg", "Brillitos · 2 piezas")]
    for k, (f, t) in enumerate(juicy):
        cx = 190 + (k % 3) * 350; cy = 470 + (k // 3) * 480
        pon(L, foto_tarjeta(f, 310, 380), cx, cy); pon(L, pastilla(t, 22, BLANCO, ROSA_I, 14, 8), cx, cy + 215)
        pon(L, pastilla(str(k + 1), 30, ROSA_P, BLANCO, 18, 6), cx - 120, cy - 165)
    pie(L, True); guardar(L, c, 2)
    # 3 · True Religion
    L = papel(LILA_CLARO, 33); pon(L, titulo_marca("True Religion", 120, LILA), W / 2, 140)
    pon(L, pastilla("3 piezas: camisa, short y pantalón", 36, LILA, BLANCO), W / 2, 260)
    tr = [("p6106.jpg", "Rosa con corazón"), ("p6109.jpg", "Gris con herraduras"), ("p6110.jpg", "Gris con ribete negro")]
    for k, (f, t) in enumerate(tr):
        cx = 190 + k * 350; pon(L, foto_tarjeta(f, 320, 520), cx, 640); pon(L, pastilla(t, 24, BLANCO, LILA, 16, 8), cx, 930)
        pon(L, pastilla(str(k + 7), 30, LILA, BLANCO, 18, 6), cx - 125, 410)
    pon(L, parrafo("Las de True Religion traen short además del pantalón: tres prendas en un solo regalo.", fi(34, "SemiBold"), TINTA, 900), W / 2, 1110)
    pie(L, True); guardar(L, c, 3)
    # 4 · 2 piezas vs 3 piezas (dividido)
    L = Image.new("RGBA", (W, H)); L.paste(papel(LILA, 34).crop((0, 0, W // 2, H)), (0, 0)); L.paste(papel(BLUSH, 35).crop((W // 2, 0, W, H)), (W // 2, 0))
    for cx, et, f, lista, col in [(W / 4, "2 piezas", "p6108.jpg", ["Camisa", "Pantalón"], BLUSH), (3 * W / 4, "3 piezas", "p6107.jpg", ["Camisa", "Short", "Pantalón"], ROSA_P)]:
        lab = titulo_marca(et, 90, BLANCO if col == ROSA_P else LILA, sh=False); bx = Image.new("RGBA", (lab.width + 60, lab.height + 40), col + (255,)); bx.alpha_composite(lab, (30, 20))
        pon(L, sombra(bx, 8, 60, 4), cx, 170); pon(L, foto_tarjeta(f, 470, 640), cx, 600)
        for k, p in enumerate(lista): pon(L, pastilla("✓ " + p, 40, BLANCO, TINTA, 30, 12), cx, 980 + k * 92)
    pon(L, pastilla("Mismo precio: $699", 46, ROSA_P, BLANCO), W / 2, 1255)
    guardar(L, c, 4)
    # 5 · precio de etiqueta vs conmigo
    L = Image.new("RGBA", (W, H)); L.paste(papel(LILA, 36).crop((0, 0, W // 2, H)), (0, 0)); L.paste(papel(BLUSH, 37).crop((W // 2, 0, W, H)), (W // 2, 0))
    pon(L, pastilla("Precio de etiqueta en EE. UU.", 32, BLANCO, LILA), W / 4, 180); pon(L, pastilla("Conmigo", 40, ROSA_P, BLANCO), 3 * W / 4, 180)
    for k, (pz, usd, mxn, ahorro) in enumerate([("2 piezas", "$58 USD", "≈ $1,076 pesos", "$377"), ("3 piezas", "$68 USD", "≈ $1,261 pesos", "$562")]):
        y = 420 + k * 380
        pon(L, texto(pz.upper(), fi(30, "Bold"), BLANCO), W / 4, y - 110); pon(L, titulo_marca(usd, 96, BLANCO), W / 4, y)
        pon(L, pastilla(mxn, 34, BLANCO, LILA), W / 4, y + 100)
        pon(L, texto(pz.upper(), fi(30, "Bold"), ROSA_I), 3 * W / 4, y - 110); pon(L, titulo_marca("$699", 110, ROSA_P, sh=False), 3 * W / 4, y)
        pon(L, pastilla("Te ahorras " + ahorro, 34, ROSA_P, BLANCO), 3 * W / 4, y + 100)
    nota = parrafo("Precios de etiqueta de las Juicy en EE. UU. Tipo de cambio FIX de Banxico del 15 de noviembre de 2026: $18.55 por dólar.", fi(26, "Medium"), TINTA, 880)
    caja = Image.new("RGBA", (940, nota.height + 40)); ImageDraw.Draw(caja).rounded_rectangle((0, 0, 939, nota.height + 39), 26, fill=BLANCO + (240,))
    caja.alpha_composite(nota, (30, 20)); pon(L, sombra(caja, 10, 60, 6), W / 2, 1200)
    guardar(L, c, 5)
    cierre_grupo(c, 6, "¿Cuál es la tuya?", "Comenta el número de tu favorita. Todas a $699 y la apartas con la mitad.")


# ======================= 4 · ¿Qué calendario de adviento te conviene? =======================
def calendarios():
    c = "calendarios"
    L = papel(ROSA, 41)
    adornos(L, [(150, 170, 90), (940, 190, 100), (130, 1080, 60), (960, 1120, 80)], 41)
    pon(L, burbuja("El 1 de diciembre ya es tarde ⏰"), W / 2, 160)
    pon(L, titulo_marca("Calendarios", 170), W / 2, 320)
    pon(L, titulo_marca("de adviento", 110, BLUSH), W / 2, 460)
    for k, (f, x, g) in enumerate([("skin-advent.jpg", 210, -6), ("rt-cal.jpg", 420, 3), ("daise-advent.jpg", 650, -3), ("spa-advent.jpg", 870, 6)]):
        pon(L, foto_tarjeta(f, 240, 300, fondo_blanco=True).rotate(g, expand=True, resample=Image.BICUBIC), x, 780 + (30 if k in (0, 3) else 0))
    pon(L, pastilla("¿Cuánto te sale cada sorpresa? 🧮", 38, BLANCO, ROSA_I), W / 2, 1080)
    pie(L); guardar(L, c, 1)
    cals = [("skin-advent.jpg", "Skincare de Target", "12 sorpresas de skincare: La Roche-Posay, BYOMA, TONYMOLY y más", "$599", 12),
            ("spa-advent.jpg", "Spa de Target", "12 sorpresas de spa: Hero, Pixi, Aquaphor, Palmer's y La Roche-Posay", "$599", 12),
            ("rt-cal.jpg", "Real Techniques", "25 días de brochas y accesorios de maquillaje", "$789", 25),
            ("daise-advent.jpg", "DAISE Dreamhouse", "7 sorpresas de baño y cuerpo (una para cada día de la semana)", "$789", 7)]
    for k, (f, nom, desc, precio, n) in enumerate(cals):
        L = papel(BLUSH if k % 2 == 0 else LILA_CLARO, 42 + k)
        pon(L, titulo_marca(nom, 100, ROSA_P if k % 2 == 0 else LILA), W / 2, 150)
        pon(L, foto_tarjeta(f, 560, 620, fondo_blanco=True), W / 2, 580)
        pon(L, parrafo(desc, fi(34, "SemiBold"), TINTA, 880), W / 2, 960)
        por = round(int(precio[1:]) / n)
        pon(L, pastilla(f"{precio} ÷ {n} = unos ${por} por sorpresa", 40, ROSA_P, BLANCO), W / 2, 1110)
        pie(L, True); guardar(L, c, 2 + k)
    # resumen
    L = papel(ROSA, 47); pon(L, titulo_marca("El más rendidor", 120), W / 2, 150)
    filas = [("rt-cal.jpg", "Real Techniques", "$32", "25 días"), ("skin-advent.jpg", "Skincare de Target", "$50", "12 días"),
             ("spa-advent.jpg", "Spa de Target", "$50", "12 días"), ("daise-advent.jpg", "DAISE Dreamhouse", "$113", "7 días")]
    for k, (f, nom, por, dias) in enumerate(filas):
        y = 340 + k * 210; card = Image.new("RGBA", (920, 180)); ImageDraw.Draw(card).rounded_rectangle((0, 0, 919, 179), 30, fill=BLANCO + (255,))
        im = ImageOps.pad(Image.open(os.path.join(FOTOS, f)).convert("RGB"), (150, 150), color=(255, 255, 255)); card.paste(im, (20, 15))
        card.alpha_composite(texto(nom, fi(38, "Bold"), TINTA), (200, 40)); card.alpha_composite(texto(dias, fi(28, "Medium"), (110, 110, 116)), (200, 100))
        p = pastilla(por + " c/u", 40, ROSA_P if k == 0 else LILA, BLANCO); card.alpha_composite(p, (900 - p.width, 90 - p.height // 2))
        pon(L, sombra(card, 10, 80, 6), W / 2, y)
    pon(L, parrafo("Por sorpresa, el de Real Techniques es el que más rinde, y solo me quedan 2.", fi(34, "SemiBold"), BLANCO, 900), W / 2, 1170)
    guardar(L, c, 6)
    cierre_grupo(c, 7, "¿Cuál abrirías tú?", "Todos ya están en México y te los mando de inmediato.")


# ======================= 5 · Cómo comprar en alpacca.mx =======================
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
    L = papel(ROSA, 51)
    adornos(L, [(150, 170, 90), (940, 200, 100), (120, 1060, 60), (980, 1100, 80)], 51)
    pon(L, burbuja("¿Cómo le hago para comprar? 🤔"), W / 2, 170)
    pon(L, titulo_marca("Así compras", 170), W / 2, 330)
    pon(L, titulo_marca("en alpacca.mx", 110, BLUSH), W / 2, 470)
    t = tel.con(Image.open(os.path.join(pant, "02.png"))); e = 660 / t.height
    pon(L, t.resize((int(t.width * e), int(t.height * e)), Image.LANCZOS), W / 2, 880)
    pie(L); guardar(L, c, 1)
    pasos = [("1", "Toca «Stock en México»", "02.png", "Ahí está todo lo que ya tengo aquí, listo para enviarse."),
             ("2", "Elige y toca «Agregar»", "05.png", "Puedes filtrar por categoría y ver cuántas piezas quedan."),
             ("3", "Revisa tu carrito", "07.png", "Ves el total, y si revendes, cuánto ganas por pieza."),
             ("4", "Inicia sesión o crea tu cuenta", "09.png", "Es gratis y así puedes ver tus pedidos."),
             ("5", "Llena tus datos de envío", "11.png", "El envío se calcula con tu código postal. En Juárez puedes elegir entrega personal."),
             ("6", "Elige cómo pagar y envía tu pedido", "14.png", "Transferencia (sube tu comprobante) o tarjeta con Mercado Pago.")]
    for k, (n, tit, img, desc) in enumerate(pasos):
        L = papel(BLUSH if k % 2 == 0 else LILA_CLARO, 52 + k)
        num = pastilla(n, 60, ROSA_P, BLANCO, 34, 10); pon(L, num, 110, 140)
        pon(L, parrafo(tit, fm(78), ROSA_P if k % 2 == 0 else LILA, 840, centrado=False), 600, 150)
        t = tel.con(tapa_datos(Image.open(os.path.join(pant, img)), img)); e = 830 / t.height; t = t.resize((int(t.width * e), int(t.height * e)), Image.LANCZOS)
        pon(L, t, W / 2, 690)
        pon(L, parrafo(desc, fi(36, "SemiBold"), TINTA, 900), W / 2, 1165)
        pie(L, True); guardar(L, c, 2 + k)
    cierre_grupo(c, 8, "¡Así de fácil!", "Lo que está en Stock en México te lo mando de inmediato. Guarda este carrusel para cuando lo necesites.")


if __name__ == "__main__":
    que = sys.argv[1:] if len(sys.argv) > 1 and False else ["historias", "regalos", "pijamas", "calendarios", "como_comprar"]
    for q in que: globals()[q](); print("ok", q)
