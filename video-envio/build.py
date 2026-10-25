"""Animación "¿Cómo llega tu pedido?": los 5 pasos del envío (Corea → USA → México → tu casa)
con los dibujos de la alpaca de Mae, una barra con la ruta y la cajita 📦 avanzando.
1080x1920, 30 fps. Si ya corriste voz.py, se le pone la voz de Mae (Envio-voz.mp4);
la música se pone en TikTok/Instagram.

Uso: python3 build.py [salida.mp4]"""
import json, math, os, random, subprocess, sys
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont

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

# ---------- dibujos ----------
@lru_cache(None)
def dibujo(nombre, alto, ancho_max=10_000):
    im = Image.open(os.path.join(AQUI, "dibujos", nombre + ".png")).convert("RGBA"); im = im.crop(im.getbbox())
    k = min(alto / im.height, ancho_max / im.width)
    return im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)

def sombra(L, cx, cy, w, a=60):
    if w < 20: return
    s = Image.new("RGBA", (int(w), int(w * 0.16))); ImageDraw.Draw(s).ellipse((0, 0, s.width - 1, s.height - 1), fill=(196, 70, 110, a))
    pon(L, s, cx, cy)

CY = 830  # centro de los dibujos

def anima_dibujo(L, i, t, n_dur, marcas):
    nombre = PASOS[i][3]
    if nombre == "avion":  # llega volando desde la derecha (el avión ve a la izquierda) entre nubes
        for k, (y, sz, v) in enumerate(((610, 120, 260), (1010, 150, 200), (760, 100, 320))):
            x = (W + 200 - (t * v + k * 420)) % (W + 400) - 200
            pon(L, emoji("☁️", sz), x, y)
        im = dibujo(nombre, 560)
        im = im.rotate(3 * math.sin(t * 2.6), resample=Image.BICUBIC, expand=True)
        x = W / 2 + 800 * (1 - ease(t / 0.9))
        pon(L, im, x, CY + 18 * math.sin(t * 3.0))
    elif nombre == "camion":  # entra manejando desde la izquierda, con la carretera moviéndose
        im = dibujo(nombre, 560, 860)
        piso = CY + im.height / 2 - 14
        d = ImageDraw.Draw(L)
        d.rounded_rectangle((0, piso - 6, W, piso + 34), 20, fill=(214, 200, 210))
        for k in range(8):
            x = (k * 180 - t * 420) % (W + 180) - 90
            d.rounded_rectangle((x, piso + 10, x + 90, piso + 20), 5, fill=WHITE)
        x = W / 2 - 900 * (1 - ease(t / 0.9))
        pon(L, im, x, CY - abs(math.sin(t * 7)) * 7)
    else:  # aparece con rebote y se mece
        im = dibujo(nombre, 560)
        s, a = entra(t, 0.05, 0.5)
        sombra(L, W / 2, CY + im.height / 2 - 10, im.width * 0.7 * s)
        pon(L, im, W / 2, CY + 10 * math.sin(t * 3.2), s, a)
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
    m = e["marcas"]
    SFX.append((m[0], "click")); SFX.append((m[1] + 0.8, "glitter"))
    for f in range(n):
        t = f / FPS; L = fondo((f0 + f) / FPS)
        pon(L, linea("¿Cómo llega", "ExtraBold", 112, INK), W / 2, 300)
        pon(L, linea("tu pedido? 📦", "ExtraBold", 112, PINK), W / 2, 430)
        im = dibujo_alpaca_surtir()
        sombra(L, W / 2, CY + im.height / 2 - 6, im.width * 0.6)
        pon(L, im, W / 2, CY + 10 * math.sin(t * 3.2))
        s, al = entra(t, m[0])
        pon(L, linea("De Corea 🇰🇷 hasta tu casa 🏠", "Bold", 52, INK), W / 2, 1160, s, al)
        s, al = entra(t, m[1] + 0.5)
        pon(L, pastilla("En 5 pasos", "Bold", 40, (252, 214, 226), DEEP), W / 2, 1250, s, al)
        ruta(L, 3 * ease((t - m[0]) / (m[1] + 0.8 - m[0])), t)
        yield L

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
        anima_dibujo(L, i, t, dur, m)
        s, al = entra(t, 0.5)
        pon(L, linea(texto, "Bold", 50, INK), W / 2, 1160, s, al)
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
        pon(L, pastilla("Pide en alpacca.mx 💗", "ExtraBold", 56, PINK, WHITE), W / 2, 1450, s, al)
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
