"""Tutorial "Cómo comprar stock en alpacca.mx": capturas reales de la página en un celular (captura.js), un dedo y un
aro que marcan dónde tocar en cada paso, el título del paso arriba y la voz de Mae. Los datos del banco salen
difuminados (el video es público). 1080x1920, 30 fps.
Uso: node captura.js; python3 voz.py tutorial; python3 build.py  -> Tutorial-stock-voz.mp4 y portada-tutorial.jpg"""
import json, math, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(RAIZ, "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
ROSA, NEGRO, WHITE = (232, 70, 120), (20, 20, 22), (255, 255, 255)
T = json.load(open(os.path.join(AQUI, "tiempos-tutorial.json")))
TOQUES = json.load(open(os.path.join(AQUI, "pantallas", "toques.json")))
OUT = os.path.join(AQUI, "Tutorial-stock.mp4")
INI = [0.0]
for e in T: INI.append(INI[-1] + e["dur"])
def marca(e, m=None): return INI[e] + (0 if m is None else T[e]["marcas"][m])

# por frase de la voz: título del paso y [(pantalla, marca en la que se toca o None)]; la pantalla cambia
# un momento después de cada toque
PASOS = [
    ("Cómo comprar stock 🛍️", [("01", None)]),
    ("1. Toca «Stock en México»", [("02", 1)]),
    ("2. Elige tu producto", [("03", 1)]),
    ("3. Agrégalo al carrito", [("04", 0), ("05", 1)]),
    ("4. Revisa tu carrito", [("06", None), ("07", 1)]),
    ("5. Inicia sesión o crea tu cuenta", [("08", 0), ("09", 1)]),
    ("6. Llena tus datos de envío", [("10", None), ("11", 1)]),
    ("7. Elige cómo pagar", [("12", None), ("13", 1)]),
    ("8. Envía tu pedido", [("14", 1)]),
    ("¡Listo! 📦", []),
]

# teléfono en pantalla
TEL_ALTO = 1420
_cache = {}


def pantalla(n):
    """captura en un marco de celular (con lo del banco difuminado)"""
    if n in _cache: return _cache[n]
    im = Image.open(os.path.join(AQUI, "pantallas", n + ".png")).convert("RGB")
    tp = TOQUES[n].get("tapar")
    if tp:
        x, y, w, h = [int(v) for v in tp]
        im.paste(im.crop((x, y, x + w, y + h)).filter(ImageFilter.GaussianBlur(26)), (x, y))
    k = TEL_ALTO / im.height; iw, ih = int(im.width * k), TEL_ALTO
    im = im.resize((iw, ih), Image.LANCZOS)
    borde = 18; c = Image.new("RGBA", (iw + 2 * borde + 60, ih + 2 * borde + 60))
    sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 46, iw + 2 * borde + 30, ih + 2 * borde + 46), 70, fill=130)
    c.putalpha(sh.filter(ImageFilter.GaussianBlur(22)))
    ImageDraw.Draw(c).rounded_rectangle((30, 30, iw + 2 * borde + 30, ih + 2 * borde + 30), 70, fill=NEGRO)
    m = Image.new("L", (iw, ih), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, iw - 1, ih - 1), 54, fill=255)
    c.paste(im, (30 + borde, 30 + borde), m)
    _cache[n] = (c, k, 30 + borde)
    return _cache[n]


TEL_Y = 340  # arriba del teléfono


def toque(L, n, t, t0, x0, y0):
    """aro rosa que crece y un dedo en el centro de lo que hay que tocar"""
    tq = TOQUES[n].get("toque")
    if not tq or not (t0 - 0.35 <= t < t0 + 1.1): return
    _, k, off = pantalla(n)
    x, y, w, h = tq; cx = x0 + off + (x + w / 2) * k; cy = y0 + off + (y + h / 2) * k
    # recuadro rosa alrededor del elemento
    d = ImageDraw.Draw(L)
    a = min(1, (t - t0 + 0.35) / 0.2)
    d.rounded_rectangle((x0 + off + x * k - 8, y0 + off + y * k - 8, x0 + off + (x + w) * k + 8, y0 + off + (y + h) * k + 8), 18,
                        outline=ROSA + (int(255 * a),), width=7)
    if t >= t0:
        r = 30 + 70 * min(1, (t - t0) / 0.5); al = int(220 * max(0, 1 - (t - t0) / 0.9))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=ROSA + (al,), width=9)
    dedo = b.linea("👆", "Bold", 110, WHITE)
    dy = 0 if t >= t0 else 40 * (t0 - t) / 0.35
    b.pon(L, dedo, cx + 30, cy + 70 + dy)


def titulo(L, s, t, t0):
    sz = 64
    while b.pastilla(s, "ExtraBold", sz, ROSA, WHITE).width > 1000 and sz > 36: sz -= 3
    b.pon(L, b.pastilla(s, "ExtraBold", sz, ROSA, WHITE, padx=40, pady=18), W / 2, 200, *b.entra(t, t0, 0.35))


def fondo():
    g = Image.new("RGBA", (W, H))
    for y in range(H):
        k = y / H; ImageDraw.Draw(g).line((0, y, W, y), fill=(int(255 - 10 * k), int(232 - 20 * k), int(240 - 14 * k), 255))
    return g
FONDO = fondo()


def final(L, t, t0):
    """cierre: entrega inmediata y Comenta GRUPO"""
    b.pon(L, b.pastilla("📦 Stock en México = envío inmediato", "ExtraBold", 52, NEGRO, WHITE, padx=36, pady=18), W / 2, 520, *b.entra(t, t0, 0.35))
    im = Image.new("RGBA", (860, 360)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 859, 359), 50, fill=WHITE)
    tt = b.linea("💬 ¿Dudas? Comenta", "Bold", 56, (110, 110, 116)); im.alpha_composite(tt, ((860 - tt.width) // 2, 34))
    d.text((430, 200), "GRUPO", font=b.F("ExtraBold", 140), fill=ROSA, anchor="mm")
    tt = b.linea("y te ayudo 👇", "Bold", 50, NEGRO); im.alpha_composite(tt, ((860 - tt.width) // 2, 278))
    tm = marca(len(T) - 1, 1)
    if t >= tm - 0.3: b.pon(L, im, W / 2, 900, *b.entra(t, tm - 0.3, 0.4))
    b.pon(L, b.pastilla("alpacca.mx", "ExtraBold", 70, ROSA, WHITE, padx=44, pady=18), W / 2, 1300, *b.entra(t, t0 + 0.6, 0.35))


def cuadro(tg):
    L = FONDO.copy()
    e = next(i for i in range(len(T)) if tg < INI[i + 1] or i == len(T) - 1)
    tit, pantallas = PASOS[e]
    titulo(L, tit, tg, INI[e])
    if not pantallas:
        final(L, tg, INI[e]); return L
    # qué pantalla toca ahora: la siguiente entra 0.7 s después del toque de la anterior
    act = 0
    for j in range(1, len(pantallas)):
        m = pantallas[j - 1][1]
        cambio = (marca(e, m) + 0.7) if m is not None else (INI[e] + (marca(e, pantallas[j][1]) - INI[e]) * 0.45)
        if tg >= cambio: act = j
    n, m = pantallas[act]
    tel, _, _ = pantalla(n)
    x0, y0 = int(W / 2 - tel.width / 2), TEL_Y
    L.alpha_composite(tel, (x0, y0))
    if m is not None: toque(L, n, tg, marca(e, m), x0, y0)
    return L


SFX = []

if __name__ == "__main__":
    total = int(round(INI[-1] * FPS))
    for e, (_, ps) in enumerate(PASOS):
        SFX.append((INI[e] + 0.05, "pop"))
        for _, m in ps:
            if m is not None: SFX.append((marca(e, m), "click"))
    SFX.append((marca(len(T) - 1, 1), "glitter"))
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    for f in range(total):
        p.stdin.write(cuadro(f / FPS).convert("RGB").tobytes())
    p.stdin.close(); p.wait()
    final_ = OUT.replace(".mp4", "-voz.mp4")
    ins, fil = ["-i", OUT, "-i", os.path.join(AQUI, "voz-tutorial", "narracion.wav")], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=0.3[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final_], check=True)
    # portada: el paso 1 con el título
    L = FONDO.copy(); tel, _, _ = pantalla("02"); L.alpha_composite(tel, (int(W / 2 - tel.width / 2), TEL_Y + 60))
    b.pon(L, b.pastilla("Cómo comprar stock", "ExtraBold", 84, ROSA, WHITE, padx=46, pady=22), W / 2, 210)
    b.pon(L, b.pastilla("en alpacca.mx · paso a paso 👆", "Bold", 52, NEGRO, WHITE, padx=36, pady=16), W / 2, 340)
    L.convert("RGB").save(os.path.join(AQUI, "portada-tutorial.jpg"), quality=92)
    print("ok", final_, f"{total / FPS:.1f}s")
