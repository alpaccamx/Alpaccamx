"""Animación "¿Cómo llega tu pedido?": los 5 pasos del envío (Corea → USA → México → tu casa)
con los dibujos de la alpaca de Mae, una barra con la ruta y la cajita 📦 avanzando.
1080x1920, 30 fps. Si ya corriste voz.py, se le pone la voz de Mae (Envio-voz.mp4);
la música se pone en TikTok/Instagram.

Uso: python3 build.py [salida.mp4]"""
import json, math, os, random, subprocess, sys
import numpy as np
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "Envio.mp4")
FONTS = os.path.join(RAIZ, "video-sephora", "fonts")
RAIZ_EMOJI = os.path.join(RAIZ, "video-ulta", "emoji")
SFX_DIR = os.path.join(RAIZ, "video-ulta-2", "sfx")
W, H, FPS = 1080, 1920, 30

INK = (17, 17, 17); GREY = (120, 120, 128); PINK = (238, 108, 146); DEEP = (196, 70, 110); WHITE = (255, 255, 255)

_tj = os.path.join(AQUI, "tiempos.json")
TIEMPOS = json.load(open(_tj))

# título, tiempo, color, dibujo, texto de abajo, extra (sale en la 2a marca), ruta (de, a) en la barra
PASOS = [
    ("Orden", "1–2 días hábiles", (238, 108, 146), "empacando", "Lo preparamos en Corea 🇰🇷", "📅 Sáb y dom no se trabaja", (0, 0)),
    ("Envío a USA", "2–3 días hábiles", (74, 144, 226), "avion", "En avión por DHL Express ✈️", "Ahorras en gastos de aduana 💗", (0, 1)),
    ("Cruce a México", "1–2 días hábiles", (150, 110, 220), "camion", "Por tierra a México 🇲🇽", None, (1, 2)),
    ("Envío", "1 día hábil", (40, 170, 150), "revisando", "Revisamos y reempaquetamos 📦", None, (2, 2)),
    ("Entrega", "2–5 días hábiles", (238, 108, 146), "entregando", "¡Llega a tu casa! 🏠", "⚡ Express: 1–2 días hábiles", (2, 3)),
]
RUTA = [("🇰🇷", "Corea"), ("🇺🇸", "USA"), ("🇲🇽", "México"), ("🏠", "Tu casa")]
assert len(TIEMPOS) == len(PASOS) + 2  # gancho, 5 pasos, total

_fc = {}
def F(n, s):
    if (n, s) not in _fc: _fc[n, s] = ImageFont.truetype(f"{FONTS}/Poppins-{n}.ttf", s)
    return _fc[n, s]

def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3
def back(x): x = max(0.0, min(1.0, x)); c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def mezcla(a, b, k): return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))

SFX = []  # (segundo, sonido): click, glitter y pop (los de Mae, en video-ulta-2/sfx)

# ---------- emojis (diseño de iPhone) y texto con emojis ----------
@lru_cache(None)
def emoji(ch, size):
    """emoji con el diseño de iPhone (PNG en video-ulta/emoji); si falta, el de Noto.
    Las banderas son dos letras: el archivo se llama con los dos códigos (1f1f0-1f1f7.png)."""
    png = os.path.join(RAIZ_EMOJI, "-".join("%x" % ord(c) for c in ch if ord(c) != 0xfe0f) + ".png")
    if os.path.exists(png):
        im = Image.open(png).convert("RGBA")
    else:
        f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
        im = Image.new("RGBA", (220, 220)); ImageDraw.Draw(im).text((110, 110), ch, font=f, embedded_color=True, anchor="mm")
    im = im.crop(im.getbbox())  # se escala por la altura, sin deformar
    return im.resize((max(1, round(im.width * size / im.height)), size), Image.LANCZOS)

def es_emoji(c): o = ord(c); return o >= 0x1F000 or 0x2300 <= o < 0x2C00

def trozos(s):
    """separa el texto en pedazos de texto y de emoji (las banderas son un par de letras)"""
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if es_emoji(c):
            j = i + 1
            if 0x1F1E6 <= ord(c) <= 0x1F1FF and j < len(s) and 0x1F1E6 <= ord(s[j]) <= 0x1F1FF: j += 1
            while j < len(s) and ord(s[j]) == 0xfe0f: j += 1
            out.append((True, s[i:j])); i = j
        else:
            j = i
            while j < len(s) and not es_emoji(s[j]): j += 1
            out.append((False, s[i:j])); i = j
    return out

@lru_cache(None)
def linea(s, n, sz, fill, stroke=0, sfill=WHITE):
    """una línea de texto con emojis, como imagen"""
    f = F(n, sz); es = round(sz * 1.05); partes = trozos(s)
    w = sum(emoji(t, es).width + 6 if e else f.getlength(t) for e, t in partes)
    im = Image.new("RGBA", (int(w) + 2 * stroke + 4, int(sz * 1.5) + 2 * stroke)); d = ImageDraw.Draw(im)
    x, cy = stroke + 2, im.height / 2
    for e, t in partes:
        if e:
            em = emoji(t, es); im.alpha_composite(em, (int(x + 3), int(cy - es / 2))); x += em.width + 6
        else:
            d.text((x, cy + sz * 0.06), t, font=f, fill=fill, anchor="lm", stroke_width=stroke, stroke_fill=sfill); x += f.getlength(t)
    return im

@lru_cache(None)
def pastilla(s, n, sz, bg, fg, padx=36, pady=16):
    t = linea(s, n, sz, fg)
    im = Image.new("RGBA", (t.width + 2 * padx, t.height + 2 * pady))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, im.width - 1, im.height - 1), im.height // 2, fill=bg)
    im.alpha_composite(t, (padx, pady)); return im

def pon(L, im, cx, cy, s=1.0, a=1.0):
    """pega centrado, con escala y transparencia (para que las cosas aparezcan con rebote)"""
    if s <= 0.01 or a <= 0.01: return
    if abs(s - 1) > 0.01: im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BILINEAR)
    if a < 0.99:
        im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a)))
    L.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

def entra(t, t0, dur=0.4):  # escala y opacidad de algo que aparece con rebote en t0
    if t < t0: return 0.0, 0.0
    return back((t - t0) / dur), min(1.0, (t - t0) / 0.15)

def titulo_ajustado(s, n, sz, fill, maxw=960):
    while F(n, sz).getlength(s) > maxw and sz > 40: sz -= 4
    return linea(s, n, sz, fill)

# ---------- fondo: rosita con corazones y brillitos que suben ----------
def _fondo():
    g = Image.new("RGBA", (1, H))
    for y in range(H): g.putpixel((0, y), mezcla((255, 244, 247), (252, 222, 233), y / H) + (255,))
    return g.resize((W, H))
FONDO = _fondo()
random.seed(7)
PARTICULAS = [(random.uniform(40, W - 40), random.uniform(0, H + 120), random.uniform(25, 60), random.uniform(0, 6.28),
               random.choice("💗✨"), random.randint(34, 62)) for _ in range(16)]
@lru_cache(None)
def particula(ch, sz):
    im = emoji(ch, sz).copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * 0.28))); return im

def fondo(tg):
    L = FONDO.copy()
    for x, y0, vel, fase, ch, sz in PARTICULAS:
        y = (y0 - vel * tg) % (H + 120) - 60
        pon(L, particula(ch, sz), x + 18 * math.sin(tg * 0.8 + fase), y)
    return L

# ---------- barra de la ruta ----------
RX = [150, 393, 637, 880]; RY = 1440

def ruta(L, pos, t):
    """pos: dónde va la cajita (0 = Corea ... 3 = tu casa), puede ser fraccionario"""
    d = ImageDraw.Draw(L)
    d.rounded_rectangle((RX[0], RY - 9, RX[-1], RY + 9), 9, fill=(246, 205, 218))
    xp = RX[0] + (RX[-1] - RX[0]) * pos / 3
    d.rounded_rectangle((RX[0], RY - 9, xp, RY + 9), 9, fill=PINK)
    for i, (x, (ch, nom)) in enumerate(zip(RX, RUTA)):
        listo = pos >= i - 0.02
        d.ellipse((x - 48, RY - 48, x + 48, RY + 48), fill=WHITE, outline=PINK if listo else (240, 200, 212), width=7)
        pon(L, emoji(ch, 50), x, RY)
        pon(L, linea(nom, "Bold", 30, DEEP if listo else GREY), x, RY + 82)
    pon(L, emoji("📦", 66), xp, RY - 95 - abs(math.sin(t * 5)) * 10)

# ---------- dibujos (animados: parpadean, respiran y se mecen; hélice y llantas giran) ----------
# en px del dibujo original: ojos (x, y, radio aprox.), y lo que se mueve en cada uno
ANIM = {
    "empacando":  dict(ojos=[(415, 520, 40), (645, 455, 40)], boca=(508, 540, 592, 607), menea=1.0),
    "avion":      dict(ojos=[(598, 375, 34), (778, 440, 34)], boca=(622, 450, 705, 508), helice=(232, 840, 215)),
    "camion":     dict(ojos=[(962, 365, 30), (1118, 333, 28)], boca=(1018, 386, 1095, 448), llantas=[(455, 845, 58), (968, 882, 62)]),
    "revisando":  dict(ojos=[(562, 458, 40), (742, 494, 34)], boca=(595, 526, 660, 603), menea=1.0),
    "entregando": dict(ojos=[(542, 575, 35), (725, 530, 35)], boca=(603, 591, 680, 658), menea=0.6, lampara=(245, 520),
                       zona=[(300, 270), (480, 260), (630, 185), (820, 185), (880, 380), (975, 680), (975, 960),
                             (900, 1175), (460, 1175), (395, 900), (305, 520)]),
}

def _original(nombre): return Image.open(os.path.join(AQUI, "dibujos", nombre + ".png")).convert("RGBA")

def _cierra_ojos(im, ojos):
    """dibuja los ojos cerrados (‿) sobre la lana, para el parpadeo"""
    im = im.copy(); px = im.load(); d = ImageDraw.Draw(im)
    for cx, cy, r in ojos:
        # caja real del ojo: los pixeles oscuros alrededor del punto
        xs, ys = [], []
        for y in range(int(cy - 1.6 * r), int(cy + 1.6 * r)):
            for x in range(int(cx - 1.6 * r), int(cx + 1.6 * r)):
                p = px[x, y]
                if p[3] > 200 and (p[0] + p[1] + p[2]) / 3 < 95: xs.append(x); ys.append(y)
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        # color de la lana: el de arriba del ojo
        muestra = sorted((px[x, int(y0 - 0.5 * r)] for x in range(x0, x1)), key=lambda p: sum(p[:3]))
        lana = muestra[len(muestra) // 2]
        capa = Image.new("RGBA", im.size, lana[:3] + (255,))
        m = Image.new("L", im.size, 0); ImageDraw.Draw(m).ellipse((x0 - 6, y0 - 6, x1 + 6, y1 + 6), fill=255)
        im.paste(capa, (0, 0), m.filter(ImageFilter.GaussianBlur(3)))
        h = y1 - y0
        d.arc((x0 + 2, y0 + h * 0.15, x1 - 2, y0 + h * 0.75), 15, 165, fill=(58, 38, 34), width=max(7, (x1 - x0) // 7))
    return im

@lru_cache(None)
def dibujo(nombre, alto, ancho_max=10_000, cerrado=False):
    im = _original(nombre)
    if cerrado: im = _cierra_ojos(im, ANIM[nombre]["ojos"])
    k = min(alto / im.height, ancho_max / im.width)
    return im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)

def escala(nombre, alto, ancho_max=10_000):
    o = _tam(nombre); return min(alto / o[1], ancho_max / o[0])

@lru_cache(None)
def _tam(nombre): return _original(nombre).size

def parpadea(t, fase=0.0):  # cierra los ojos ~0.13 s cada 2.7 s (y a veces dos veces seguidas)
    c = (t + fase) % 2.7
    return c < 0.13 or 0.3 < c < 0.4 and int((t + fase) / 2.7) % 3 == 1

def menea(im, sway, sy):
    """se mece desde los pies (la punta se mueve 'sway' px) y se estira/aplasta (sy) sin cambiar el volumen"""
    P = int(abs(sway)) + 6
    w, h = im.size; c = Image.new("RGBA", (w + 2 * P, h)); c.alpha_composite(im, (P, 0)); W2 = c.width
    malla, tiras = [], 16
    for j in range(tiras):
        y0, y1 = h * j / tiras, h * (j + 1) / tiras
        d0, d1 = sway * ((h - y0) / h) ** 1.6, sway * ((h - y1) / h) ** 1.6
        malla.append(((0, int(y0), W2, int(y1)), (-d0, y0, -d1, y1, W2 - d1, y1, W2 - d0, y0)))
    c = c.transform(c.size, Image.MESH, malla, Image.BILINEAR)
    return c.resize((max(1, int(W2 / sy)), max(1, int(h * sy))), Image.BILINEAR)

def gira_llantas(im, k, llantas, ang):
    for cx, cy, r in llantas:
        R = int(r * k) + 2; x, y = int(cx * k), int(cy * k)
        pedazo = im.crop((x - R, y - R, x + R, y + R)).rotate(ang, resample=Image.BICUBIC)
        m = Image.new("L", (2 * R, 2 * R), 0); ImageDraw.Draw(m).ellipse((2, 2, 2 * R - 3, 2 * R - 3), fill=255)
        im.paste(pedazo, (x - R, y - R), m.filter(ImageFilter.GaussianBlur(1)))
    return im

def gira_helice(im, k, helice, t):
    """disco borroso + aspas girando encima de la hélice"""
    cx, cy, r = helice; cx, cy, R = cx * k, cy * k, r * k
    capa = Image.new("RGBA", im.size); d = ImageDraw.Draw(capa)
    d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=(255, 228, 238, 120))
    for estela, a in ((0, 200), (0.18, 110), (0.36, 50)):  # aspas con estela
        for b in range(3):
            ang = -t * 21 - estela + b * 2 * math.pi / 3
            ex, ey = cx + math.cos(ang) * R * 0.92, cy + math.sin(ang) * R * 0.92
            pts = [(cx + math.cos(ang + s) * R * 0.25, cy + math.sin(ang + s) * R * 0.25) for s in (-0.5, 0.5)]
            d.polygon([pts[0], (ex + math.cos(ang + 1.57) * R * 0.16, ey + math.sin(ang + 1.57) * R * 0.16),
                       (ex - math.cos(ang + 1.57) * R * 0.16, ey - math.sin(ang + 1.57) * R * 0.16), pts[1]], fill=(246, 150, 180, a))
    capa = capa.filter(ImageFilter.GaussianBlur(2))
    d = ImageDraw.Draw(capa); d.ellipse((cx - R * 0.2, cy - R * 0.2, cx + R * 0.2, cy + R * 0.2), fill=(226, 180, 90, 255))
    im = im.copy(); im.alpha_composite(capa); return im

def sombra(L, cx, cy, w, a=60):
    if w < 20: return
    s = Image.new("RGBA", (int(w), int(w * 0.16))); ImageDraw.Draw(s).ellipse((0, 0, s.width - 1, s.height - 1), fill=(196, 70, 110, a))
    pon(L, s, cx, cy)

CY = 830  # centro de los dibujos

def _envolvente():
    """qué tan fuerte habla Mae en cada cuadro (0 a 1): con eso la alpaca abre y cierra la boca"""
    voz = os.path.join(AQUI, "voz", "narracion.wav")
    if not os.path.exists(voz): return np.zeros(1)
    x = np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", voz, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]),
                      np.int16).astype(float) / 32768
    n = int(len(x) * FPS / 16000)
    r = np.array([np.sqrt(np.mean(x[int(i * 16000 / FPS):int((i + 1) * 16000 / FPS)] ** 2) + 1e-12) for i in range(n)])
    r = np.clip(r / np.percentile(r, 95), 0, 1) ** 0.8
    r[r < 0.12] = 0
    a = np.zeros(n)
    for i in range(n): a[i] = max(r[i], a[i - 1] * 0.55 if i else 0)  # abre rápido, cierra suave
    return a
BOCA = _envolvente()
def boca(fg): return float(BOCA[fg]) if 0 <= fg < len(BOCA) else 0.0

def habla(im, k, caja, a):
    """abre la boca: estira hacia abajo lo que está bajo el labio (más abierta mientras más fuerte habla)"""
    x0, y0, x1, y1 = (v * k for v in caja); w, h = x1 - x0, y1 - y0
    rx0, rx1, ry0, ry1 = int(x0 - 0.25 * w), int(x1 + 0.25 * w), int(y0), int(y1 + 1.3 * h)
    reg = im.crop((rx0, ry0, rx1, ry1))
    est = reg.resize((reg.width, max(1, int(reg.height * (0.74 + 0.6 * a)))), Image.BICUBIC)
    m = Image.new("L", est.size, 0)
    ImageDraw.Draw(m).ellipse((0.1 * est.width, -0.6 * est.height, 0.9 * est.width, 0.97 * est.height), fill=255)
    im = im.copy(); im.paste(est, (rx0, ry0), m.filter(ImageFilter.GaussianBlur(max(2, w * 0.12))))
    return im

def anima_dibujo(L, i, t, n_dur, marcas, voz=0.0):
    nombre = PASOS[i][3]; A = ANIM[nombre]; ojos = parpadea(t, i * 0.9)
    if nombre == "avion":  # llega volando desde la derecha (el avión ve a la izquierda) entre nubes
        for k, (y, sz, v) in enumerate(((610, 120, 260), (1010, 150, 200), (760, 100, 320))):
            x = (W + 200 - (t * v + k * 420)) % (W + 400) - 200
            pon(L, emoji("☁️", sz), x, y)
        im = habla(dibujo(nombre, 560, cerrado=ojos), escala(nombre, 560), A["boca"], voz)
        im = gira_helice(im, escala(nombre, 560), A["helice"], t)
        im = im.rotate(4 * math.sin(t * 2.6), resample=Image.BICUBIC, expand=True)
        x = W / 2 + 800 * (1 - ease(t / 0.9)) + 14 * math.sin(t * 1.3)
        pon(L, im, x, CY + 22 * math.sin(t * 3.0))
    elif nombre == "camion":  # entra manejando desde la izquierda, con la carretera moviéndose y las llantas girando
        im = habla(dibujo(nombre, 560, 860, cerrado=ojos), escala(nombre, 560, 860), A["boca"], voz)
        im = gira_llantas(im, escala(nombre, 560, 860), A["llantas"], -t * 520)
        piso = CY + im.height / 2 - 14
        d = ImageDraw.Draw(L)
        d.rounded_rectangle((0, piso - 6, W, piso + 34), 20, fill=(214, 200, 210))
        for k in range(8):
            x = (k * 180 - t * 420) % (W + 180) - 90
            d.rounded_rectangle((x, piso + 10, x + 90, piso + 20), 5, fill=WHITE)
        x = W / 2 - 900 * (1 - ease(t / 0.9))
        sy = 1 + 0.025 * math.sin(t * 14)  # el camión rebota y se aplasta un poquito
        im = im.resize((int(im.width / sy), int(im.height * sy)), Image.BILINEAR)
        pon(L, im, x, piso + 14 - im.height / 2 - abs(math.sin(t * 7)) * 8)
    else:  # aparece con rebote, se mece desde los pies y respira
        base = habla(dibujo(nombre, 560, cerrado=ojos), escala(nombre, 560), A["boca"], voz)
        s, a = entra(t, 0.05, 0.5)
        f = A.get("menea", 1.0)
        mov = menea(base, f * 22 * math.sin(t * 3.4), 1 + f * 0.035 * math.sin(t * 6.8))
        if "zona" in A:  # solo se mueve la alpaca; la casita se queda quieta
            k = escala(nombre, 560)
            c = Image.new("RGBA", base.size); c.paste(mov, (-((mov.width - base.width) // 2), base.height - mov.height)); mov = c
            m = Image.new("L", base.size, 0); ImageDraw.Draw(m).polygon([(x * k, y * k) for x, y in A["zona"]], fill=255)
            out = base.copy(); out.paste(mov, (0, 0), m.filter(ImageFilter.GaussianBlur(8))); mov = out
            lx, ly = (v * k for v in A["lampara"])  # la lamparita brilla
            brillo = Image.new("RGBA", base.size); ImageDraw.Draw(brillo).ellipse((lx - 70, ly - 70, lx + 70, ly + 70),
                                                                               fill=(255, 226, 150, int(70 + 60 * math.sin(t * 5))))
            mov.alpha_composite(brillo.filter(ImageFilter.GaussianBlur(25)))
        bot = CY + base.height / 2
        sombra(L, W / 2, bot - 10, base.width * 0.7 * s)
        pon(L, mov, W / 2, bot - mov.height * s / 2, s, a)
        if nombre == "revisando" and len(marcas) > 1:  # sello de "Revisado" cuando lo dice
            s2, a2 = entra(t, marcas[1], 0.45)
            sello = pastilla("✅ Revisado", "ExtraBold", 46, (40, 170, 150), WHITE)
            pon(L, sello.rotate(-8, resample=Image.BICUBIC, expand=True), W / 2 + 270, CY - 160, s2, a2)
        if nombre == "entregando":  # corazones que salen de la casita
            random.seed(3)
            for _ in range(10):
                ang, vel, ret = random.uniform(-2.6, -0.5), random.uniform(380, 560), random.uniform(0.25, 0.7)
                k = t - ret
                if 0 < k < 1.4:
                    pon(L, emoji(random.choice("💗✨"), 64), W / 2 + math.cos(ang) * vel * k, CY - 60 + math.sin(ang) * vel * k + 160 * k * k,
                        a=1 - k / 1.4)

# ---------- escenas ----------
def escena_gancho(n, e, f0):
    m = e["marcas"]; dur = n / FPS
    SFX.append((0.3, "pop")); SFX.append((m[0], "click")); SFX.append((m[1], "click")); SFX.append((dur - 0.4, "glitter"))
    for f in range(n):
        t = f / FPS; L = fondo((f0 + f) / FPS)
        pon(L, linea("La historia", "ExtraBold", 112, INK), W / 2, 300)  # desde el primer cuadro (es la portada)
        pon(L, linea("de tu pedido 📦", "ExtraBold", 112, PINK), W / 2, 430)
        im = surtir_hablando(boca(f0 + f))
        sombra(L, W / 2, CY + im.height / 2 - 6, im.width * 0.6)
        pon(L, im, W / 2 + 6 * math.sin(t * 1.7), CY + 10 * math.sin(t * 3.2))
        pon(L, emoji("👋", 110).rotate(18 * math.sin(t * 9), resample=Image.BICUBIC, expand=True), W / 2 + 250, CY - 170, *entra(t, 0.2))
        pon(L, globo("¡Hola! Soy Mae de Alpacca 👋"), W / 2, 1165, *entra(t, 0.3))
        s, al = entra(t, m[1])
        pon(L, pastilla("De Corea 🇰🇷 hasta tu casa 🏠", "Bold", 40, (252, 214, 226), DEEP), W / 2, 1262, s, al)
        ruta(L, 3 * ease((t - m[1]) / max(0.5, dur - 0.4 - m[1])), t)
        yield L

def surtir_hablando(a):
    """la alpaca del gancho tiene la boca cerrada: se le dibuja una boquita (suavizada) que se abre al hablar"""
    im = dibujo_alpaca_surtir()
    if a <= 0.05: return im
    k = 540 / 480; bx, by = (207 - 28) * k, 175 * k  # bajo la sonrisa (px del dibujo ya recortado)
    S = 4; w, h = 12 * k * (0.8 + 0.3 * a), 16 * k * a + 4
    capa = Image.new("RGBA", (int(4 * w * S), int(4 * h * S) + 8)); d = ImageDraw.Draw(capa)
    cx, cy = capa.width / 2, 4
    d.ellipse((cx - w * S, cy, cx + w * S, cy + h * S), fill=(112, 36, 50, 255))
    d.ellipse((cx - w * 0.62 * S, cy + h * 0.45 * S, cx + w * 0.62 * S, cy + h * 0.98 * S), fill=(238, 118, 140, 255))
    capa = capa.resize((capa.width // S, capa.height // S), Image.LANCZOS)
    im = im.copy(); im.alpha_composite(capa, (int(bx - capa.width / 2), int(by - 1))); return im

@lru_cache(None)
def globo(s, sz=46):
    """globo de diálogo blanco con la colita hacia la alpaca"""
    t = linea(s, "Bold", sz, INK); pw, ph = 40, 18
    im = Image.new("RGBA", (t.width + 2 * pw, t.height + 2 * ph + 26)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 26, im.width - 1, im.height - 1), (im.height - 26) // 2, fill=WHITE)
    c = im.width / 2; d.polygon([(c - 26, 30), (c + 2, 0), (c + 20, 30)], fill=WHITE)
    im.alpha_composite(t, (pw, 26 + ph))
    sh = Image.new("RGBA", (im.width + 40, im.height + 40)); sh.alpha_composite(im, (20, 26))
    a = sh.getchannel("A").point(lambda v: int(v * 0.14)).filter(ImageFilter.GaussianBlur(10))
    out = Image.new("RGBA", sh.size, (196, 70, 110, 0)); out.putalpha(a); out.alpha_composite(im, (20, 20))
    return out

@lru_cache(None)
def dibujo_alpaca_surtir():
    im = Image.open(os.path.join(RAIZ, "assets", "alpaca-surtir.webp")).convert("RGBA"); im = im.crop(im.getbbox())
    return im.resize((int(im.width * 540 / im.height), 540), Image.LANCZOS)

def escena_paso(i, n, e, f0):
    nom, tiempo, color, _, texto, extra, (de, a) = PASOS[i]
    m = e["marcas"]; dur = n / FPS
    SFX.append((f0 / FPS + 0.05, "pop")); SFX.append((f0 / FPS + m[0], "click"))
    if extra: SFX.append((f0 / FPS + m[1], "click"))
    if PASOS[i][3] == "revisando": SFX.append((f0 / FPS + m[1], "pop"))
    if PASOS[i][3] == "entregando": SFX.append((f0 / FPS + 0.35, "glitter"))
    suave = mezcla(color, WHITE, 0.82)
    for f in range(n):
        t = f / FPS; L = fondo((f0 + f) / FPS)
        s, al = entra(t, 0.0, 0.35)
        pon(L, pastilla(f"Paso {i + 1} de 5", "Bold", 38, WHITE, color), W / 2, 215, s, al)
        s, al = entra(t, 0.08, 0.4)
        pon(L, titulo_ajustado(nom, "ExtraBold", 112, INK), W / 2, 330, s, al)
        s, al = entra(t, m[0])
        pon(L, pastilla("⏱ " + tiempo, "Bold", 54, color, WHITE), W / 2, 480, s, al)
        anima_dibujo(L, i, t, dur, m, boca(f0 + f))
        s, al = entra(t, 0.5)
        pon(L, globo(texto), W / 2, 1165, s, al)
        if extra:
            s, al = entra(t, m[1])
            pon(L, pastilla(extra, "Bold", 40, suave, mezcla(color, INK, 0.25)), W / 2, 1250, s, al)
        # la cajita avanza en la ruta mientras se dice el paso
        ruta(L, de + (a - de) * ease((t - 0.3) / max(0.5, dur * 0.6)), t)
        yield L

@lru_cache(None)
def tarjeta(ch, etiqueta, dias, color):
    im = Image.new("RGBA", (860, 170)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 859, 169), 44, fill=WHITE, outline=mezcla(color, WHITE, 0.6), width=5)
    im.alpha_composite(emoji(ch, 96), (60, 37))
    d.text((210, 52), etiqueta, font=F("Bold", 40), fill=GREY, anchor="lm")
    d.text((210, 112), dias, font=F("ExtraBold", 62), fill=color, anchor="lm")
    return im

def escena_total(n, e, f0):
    m = e["marcas"]
    SFX.append((f0 / FPS + 0.05, "pop")); SFX.append((f0 / FPS + m[0], "click")); SFX.append((f0 / FPS + m[1], "click"))
    SFX.append((f0 / FPS + m[3], "glitter"))
    bolsa = Image.open(os.path.join(RAIZ, "video-ulta-2", "alpaca.png")).convert("RGBA")
    bolsa = bolsa.resize((int(bolsa.width * 330 / bolsa.height), 330), Image.LANCZOS)
    for f in range(n):
        t = f / FPS; L = fondo((f0 + f) / FPS)
        s, al = entra(t, 0.0)
        pon(L, linea("¿Cuánto tarda", "ExtraBold", 104, INK), W / 2, 270, s, al)
        pon(L, linea("en total? ⏱", "ExtraBold", 104, PINK), W / 2, 390, s, al)
        s, al = entra(t, m[0])
        pon(L, tarjeta("🚚", "Terrestre", "7–13 días hábiles", DEEP), W / 2, 590, s, al)
        s, al = entra(t, m[1])
        pon(L, tarjeta("⚡", "Express", "6–10 días hábiles", (74, 144, 226)), W / 2, 785, s, al)
        s, al = entra(t, m[2], 0.3)
        pon(L, linea("Son tiempos estimados: pueden variar por", "Medium", 34, GREY), W / 2, 935, 1, al)
        pon(L, linea("días festivos, logística o paquetería.", "Medium", 34, GREY), W / 2, 985, 1, al)
        y = 1200 + 500 * (1 - ease((t - 0.3) / 0.7))
        sombra(L, W / 2, 1200 + bolsa.height / 2 - 6, bolsa.width * 0.7)
        pon(L, bolsa, W / 2, y + 8 * math.sin(t * 3.2))
        s, al = entra(t, m[3])
        pon(L, pastilla("Te espero en alpacca.mx 💗", "ExtraBold", 56, PINK, WHITE), W / 2, 1450, s, al)
        yield L

def escenas():
    # cuadros por escena sobre una línea de tiempo acumulada (así no se desfasa del audio)
    ini = [0.0]
    for e in TIEMPOS: ini.append(ini[-1] + e["dur"])
    q = lambda s: int(round(s * FPS))
    n = [q(ini[j + 1]) - q(ini[j]) for j in range(len(TIEMPOS))]
    yield from escena_gancho(n[0], TIEMPOS[0], 0)
    for i in range(len(PASOS)):
        yield from escena_paso(i, n[i + 1], TIEMPOS[i + 1], q(ini[i + 1]))
    yield from escena_total(n[-1], TIEMPOS[-1], q(ini[-2]))

if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", OUT],
                         stdin=subprocess.PIPE)
    n = 0
    for fr in escenas():
        p.stdin.write(fr.convert("RGB").tobytes()); n += 1
    p.stdin.close(); p.wait(); print("ok", OUT, f"{n / FPS:.1f}s")
    voz = os.path.join(AQUI, "voz", "narracion.wav")
    if os.path.exists(voz):  # se le pone la voz
        final = OUT.replace(".mp4", "-voz.mp4")
        # voz + clicks/brillos/pops (cada sonido entra con su retraso, más bajito que la voz)
        GAN = {"click": 0.3, "glitter": 0.35, "pop": 0.35}
        ins, fil = ["-i", OUT, "-i", voz], ["[1:a]aformat=channel_layouts=stereo[v]"]
        for j, (t, s) in enumerate(SFX):
            ins += ["-i", os.path.join(SFX_DIR, s + ".wav")]
            ms = int(t * 1000)
            fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume={GAN[s]}[s{j}]")
        fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")  # -14 LUFS, como piden TikTok/Instagram
        subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
        print("ok", final)
    else:
        print("OJO: sin voz/narracion.wav; corre primero python3 voz.py (usa las frases guardadas)")
