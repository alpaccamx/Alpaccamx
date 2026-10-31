"""Videos del Sephora Sale con lo que Mae grabó el 30 de octubre con sus lentes Meta (carpeta Sephora del Drive):
v45 = manejando a Sephora y entrando, v69 = recorrido por la tienda, v62 = Rare Beauty, Charlotte Tilbury y salida,
fotos/bolsa.jpg = su bolsa llena (IMG_5355, con el ticket difuminado).
Los videos se pasan antes a color normal y se estabilizan (est_vNN.mp4, con scratchpad/sale/estabiliza.sh).

Formatos que no se repiten con los de BBW, Victoria's Secret ni los de Sephora anteriores:
  lista  = la lista de pedidos de sus clientas que se va palomeando
  juego  = ¿adivinas cuánto cuesta en México? (precio de México y luego el de Mae)
  cierre = la preventa cierra el 8 de noviembre: línea de tiempo de cómo funciona
Uso: python3 build.py VARIANTE CARPETA_CON_est_vNN.mp4   (antes: python3 voz.py VARIANTE) -> Sale-VARIANTE-voz.mp4"""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
VAR, CRUDO = sys.argv[1], sys.argv[2]
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(RAIZ, "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter, ImageOps

W, H, FPS = 1080, 1920, 30
WHITE, INK = b.WHITE, b.INK
ROSA, NEGRO, VERDE, GRIS = (232, 70, 120), (20, 20, 22), (22, 150, 80), (110, 110, 116)
T = json.load(open(os.path.join(AQUI, f"tiempos-{VAR}.json")))
OUT = os.path.join(AQUI, f"Sale-{VAR}.mp4")
INI = [0.0]
for e in T: INI.append(INI[-1] + e["dur"])
def marca(e, m=None): return INI[e] + (0 if m is None else T[e]["marcas"][m])

# tomas en orden: (fuente, inicio, segundos, velocidad); se estiran parejo para llenar lo que dura la voz.
# cada renglón es una frase de la voz. fuente "bolsa" = la foto de la bolsa (con un zoom lento)
TOMAS = {
    "lista": [("v45", 0.8, 1.3, 1.0), ("v45", 62, 1.0, 3.0), ("v45", 262, 1.0, 2.0), ("v45", 286, 1.0, 1.5),
              ("v69", 15, 1.6, 1.0), ("v69", 128, 1.2, 1.0),
              ("v69", 166, 2.0, 1.0), ("v62", 8, 1.6, 1.0),
              ("v62", 78.5, 2.8, 1.0),
              ("bolsa", 0, 3.2, 1.0),
              ("v69", 215, 2.4, 1.2), ("v69", 256, 2.2, 1.0), ("v69", 278, 2.2, 1.0), ("v62", 96, 2.5, 1.2)],
    "juego": [("v69", 186, 1.6, 1.3), ("v62", 90, 1.6, 1.3),
              ("v69", 100, 2.8, 1.0), ("v69", 130, 2.7, 1.0), ("v69", 145, 2.7, 1.0),
              ("v62", 6, 2.8, 1.0), ("v62", 16, 2.7, 1.0), ("v62", 26, 2.7, 1.0),
              ("v69", 253, 4.0, 0.8), ("v69", 260, 3.3, 0.8),
              ("v69", 215, 3.0, 1.2), ("v62", 72, 3.0, 1.0), ("v62", 104, 2.9, 1.2)],
    "cierre": [("v62", 100, 2.6, 1.2), ("v69", 190, 2.6, 1.2),
               ("v69", 15, 2.0, 1.0), ("v69", 60, 2.0, 1.0), ("v69", 166, 2.1, 1.0),
               ("v69", 280, 2.0, 1.0),
               ("v45", 286, 2.7, 1.2),
               ("bolsa", 0, 2.3, 1.0), ("v62", 112, 2.0, 1.0),
               ("v69", 220, 2.9, 1.2), ("v62", 72, 2.8, 1.0)],
}[VAR]


def video(fuente, ini, n, vel):
    if fuente == "bolsa":  # foto fija con acercamiento lento
        im = ImageOps.fit(Image.open(os.path.join(AQUI, "fotos", "bolsa.jpg")).convert("RGB"), (W, H))
        for k in range(n):
            z = 1 + 0.08 * k / max(1, n - 1); w, h = int(W / z), int(H / z)
            yield im.crop(((W - w) // 2, (H - h) // 2, (W - w) // 2 + w, (H - h) // 2 + h)).resize((W, H), Image.BILINEAR).convert("RGBA")
        return
    vf = f"setpts=PTS/{vel},fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"est_{fuente}.mp4"),
                          "-t", f"{n * vel / FPS + 0.3:.2f}", "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


_cache = {}
def qr():
    if "qr" not in _cache:
        sys.path.insert(0, os.path.join(RAIZ, "carruseles"))
        import whatsapp
        _cache["qr"] = whatsapp.tarjeta(420)
    return _cache["qr"]


def producto(nombre, alto=440):
    """recorte del producto en tarjeta blanca redonda con sombra"""
    if nombre not in _cache:
        im = Image.open(os.path.join(RAIZ, "carruseles", "recortes", nombre + ".png")).convert("RGBA")
        im.thumbnail((440, alto - 80), Image.LANCZOS)
        c = Image.new("RGBA", (560, alto + 60))
        sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 42, 530, alto + 42), 50, fill=120)
        c.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
        ImageDraw.Draw(c).rounded_rectangle((30, 30, 530, alto + 30), 50, fill=WHITE)
        c.alpha_composite(im, ((560 - im.width) // 2, 30 + (alto - im.height) // 2))
        _cache[nombre] = c
    return _cache[nombre]


def pas(L, s, cy, n="ExtraBold", sz=56, bg=ROSA, fg=WHITE, t=99, t0=0, maxw=1000):
    if t < t0: return
    while b.pastilla(s, n, sz, bg, fg).width > maxw and sz > 30: sz -= 3
    b.pon(L, b.pastilla(s, n, sz, bg, fg), W / 2, cy, *b.entra(t, t0, 0.35))


def cta(L, tg, e):
    """últimas frases: QR del grupo y la invitación"""
    m = len(T[e]["marcas"]) - 1
    if tg >= marca(e, m):
        b.pon(L, qr(), W / 2, 560, *b.entra(tg, marca(e, m), 0.45))
        pas(L, "Únete a mi grupo de WhatsApp 💬", 920, sz=52, t=tg, t0=marca(e, m) + 0.2)


# ---------------- lista: la libreta de pedidos que se va palomeando ----------------
LISTA = [("Saie", (1, 0)), ("Rhode", (1, 1)), ("Sol de Janeiro", (2, 0)), ("Rare Beauty", (2, 1)), ("Charlotte Tilbury", (3, 0))]

def libreta(tg):
    w, h = 560, 120 + 78 * len(LISTA)
    im = Image.new("RGBA", (w + 40, h + 40))
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((20, 28, w + 20, h + 28), 30, fill=110)
    im.putalpha(sh.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(im); d.rounded_rectangle((20, 20, w + 20, h + 20), 30, fill=(255, 253, 247))
    d.line((92, 20, 92, h + 20), fill=(240, 160, 180), width=3)  # margen de libreta
    im.alpha_composite(b.linea("Pedidos de mis clientas 📝", "ExtraBold", 38, NEGRO), (110, 40))
    for i, (s, (e, m)) in enumerate(LISTA):
        y = 130 + 78 * i
        d.line((92, y + 62, w + 10, y + 62), fill=(225, 225, 232), width=2)
        hecho = tg >= marca(e, m)
        d.rounded_rectangle((40, y + 12, 78, y + 50), 8, outline=ROSA, width=4, fill=ROSA if hecho else None)
        if hecho: d.line([(48, y + 31), (57, y + 41), (71, y + 20)], fill=WHITE, width=6, joint="curve")
        tx = b.linea(s, "Bold" if hecho else "SemiBold", 40, NEGRO if hecho else GRIS)
        im.alpha_composite(tx, (110, y + 6))
    return im


def sello(s):
    im = b.pastilla(s, "ExtraBold", 84, ROSA, WHITE, padx=50, pady=26)
    ImageDraw.Draw(im).rounded_rectangle((8, 8, im.width - 9, im.height - 9), im.height // 2 - 8, outline=WHITE, width=6)
    return im.rotate(-8, expand=True, resample=Image.BICUBIC)


def capa_lista(L, tg):
    if tg < INI[1]:
        pas(L, "Hoy: la lista de pedidos de mis clientas 📝", 420, "Bold", 46, (20, 20, 22, 220), WHITE, tg, 0.1)
    elif tg < INI[5]:
        lb = libreta(tg); s, a = b.entra(tg, INI[1] - 0.15, 0.4)
        b.pon(L, lb, 40 + lb.width / 2, 250 + lb.height / 2, s, a)
        if tg >= marca(4, 0): b.pon(L, sello("¡Lista completa! ✅"), W / 2, 1150, *b.entra(tg, marca(4, 0), 0.4))
    else:
        if tg < marca(5, 1): pas(L, "Mi preventa cierra el 8 de noviembre 🗓️", 700, sz=52, t=tg, t0=marca(5, 0))
        cta(L, tg, 5)


# ---------------- juego: ¿adivinas cuánto cuesta en México? ----------------
# (recorte, nombre, tienda de México, precio en México, precio de Mae) — de carruseles/precios-sephora-mx.csv:
# Rhode no está en Sephora México (Rhode México), y Rare Beauty y Huda son tamaño completo
JUEGO = {1: ("rhode-pocket", "Rhode Pocket Blush", "Rhode México", 575, 493),
         2: ("rare-blush", "Rare Beauty Soft Pinch", "Sephora México", 665, 493),
         3: ("huda-easybake", "Huda Beauty Easy Bake", "Sephora México", 950, 829)}

def etiqueta(arriba, precio, color):
    im = Image.new("RGBA", (620, 230)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 619, 229), 40, fill=(255, 255, 255, 240))
    d.text((310, 60), arriba, font=b.F("Bold", 40), fill=GRIS, anchor="mm")
    d.text((310, 150), precio, font=b.F("ExtraBold", 110), fill=color, anchor="mm")
    return im


def capa_juego(L, tg):
    e = next(i for i in range(len(T)) if tg < INI[i + 1] or i == len(T) - 1)
    if e == 0:
        pas(L, "¿Adivinas cuánto cuestan", 560, sz=70, bg=NEGRO, t=tg, t0=0.05)
        pas(L, "en México? 🤔", 690, sz=70, bg=NEGRO, t=tg, t0=0.3)
    elif e in JUEGO:
        rec, nom, tienda, mx, mio = JUEGO[e]
        b.pon(L, producto(rec, 420), W / 2, 420, *b.entra(tg, INI[e], 0.4))
        pas(L, nom, 730, "ExtraBold", 50, NEGRO, WHITE, tg, INI[e] + 0.2)
        if tg < marca(e, 0):  # todavía no se dice: signo de pregunta que late
            k = 1 + 0.06 * abs(((tg * 2) % 2) - 1)
            b.pon(L, etiqueta(f"En {tienda}", "$ ???", ROSA), W / 2, 940, k)
        else:
            b.pon(L, etiqueta(f"En {tienda}", f"${mx:,}", NEGRO), W / 2, 940, *b.entra(tg, marca(e, 0), 0.35))
        if tg >= marca(e, 1):
            pas(L, f"Conmigo: ${mio:,}", 1120, sz=78, t=tg, t0=marca(e, 1))
            pas(L, f"Ahorras ${mx - mio:,} 💸", 1250, "ExtraBold", 56, VERDE, WHITE, tg, marca(e, 1) + 0.5)
    else:
        if tg < marca(e, 1): pas(L, "Apártalos con el 50% antes del 8 de noviembre", 700, sz=48, t=tg, t0=max(0, marca(e, 0)))
        cta(L, tg, e)


# ---------------- cierre: calendario y línea de tiempo de la preventa ----------------
PASOS = [("🛍️", "Elige en alpacca.mx", "con 20% de descuento"), ("💳", "Aparta con el 50%", ""),
         ("🏬", "Yo lo compro en Sephora", ""), ("✅", "Liquida antes de que te lo envíe", ""), ("📦", "Te llega a tu casa", "")]

def calendario():
    im = Image.new("RGBA", (440, 470)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 439, 469), 44, fill=WHITE)
    d.rounded_rectangle((0, 0, 439, 120), 44, fill=ROSA); d.rectangle((0, 70, 439, 120), fill=ROSA)
    d.text((220, 62), "NOVIEMBRE", font=b.F("ExtraBold", 54), fill=WHITE, anchor="mm")
    d.text((220, 275), "8", font=b.F("ExtraBold", 230), fill=NEGRO, anchor="mm")
    d.text((220, 420), "cierra mi preventa", font=b.F("Bold", 38), fill=GRIS, anchor="mm")
    return im


def linea_tiempo(activo):
    im = Image.new("RGBA", (1000, 190)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 999, 189), 40, fill=(20, 20, 22, 215))
    xs = [110 + 195 * i for i in range(5)]
    d.line((xs[0], 80, xs[-1], 80), fill=(90, 90, 96), width=8)
    if activo > 0: d.line((xs[0], 80, xs[activo], 80), fill=ROSA, width=8)
    for i, x in enumerate(xs):
        r = 52 if i == activo else 40
        d.ellipse((x - r, 80 - r, x + r, 80 + r), fill=ROSA if i <= activo else (70, 70, 76), outline=WHITE if i == activo else None, width=5)
        em = b.linea(PASOS[i][0], "Bold", 44 if i == activo else 34, WHITE)
        im.alpha_composite(em, (int(x - em.width / 2), int(80 - em.height / 2)))
        d.text((x, 158), f"Paso {i + 1}", font=b.F("Bold", 26), fill=WHITE if i <= activo else (150, 150, 156), anchor="mm")
    return im


def capa_cierre(L, tg):
    pasos_t = [INI[1], INI[2], INI[3], INI[4], marca(4, 1)]  # cuándo empieza cada paso (se dice en la voz)
    if tg < INI[1]:
        b.pon(L, calendario(), W / 2, 640, *b.entra(tg, 0.05, 0.45))
        pas(L, "Así funciona 👇", 1000, sz=60, bg=NEGRO, t=tg, t0=marca(0, 1))
    elif tg < INI[5]:
        k = max(i for i, t0 in enumerate(pasos_t) if tg >= t0)
        b.pon(L, linea_tiempo(k), W / 2, 300)
        emo, tit, sub = PASOS[k]
        pas(L, f"{k + 1}. {tit} {emo}", 900, sz=64, t=tg, t0=pasos_t[k])
        if sub: pas(L, sub, 1030, "Bold", 48, WHITE, NEGRO, tg, pasos_t[k] + 0.3)
    else:
        cta(L, tg, 5)


CAPA = {"lista": capa_lista, "juego": capa_juego, "cierre": capa_cierre}[VAR]
SFX = []


def cuadros():
    total = int(round(INI[-1] * FPS))
    raw = [int(tm[2] * FPS) for tm in TOMAS]
    k = total / sum(raw); ns = [int(r * k) for r in raw]; ns[-1] += total - sum(ns)
    f = 0
    for tm, n in zip(TOMAS, ns):
        for j, L in zip(range(n), video(tm[0], tm[1], n, tm[3])):
            CAPA(L, (f + j) / FPS)
            yield L
        f += n


if __name__ == "__main__":
    # sonidos: un pop en cada marca de la voz y brillo al inicio
    SFX += [(0.05, "glitter")] + [(INI[e] + m, "pop") for e in range(len(T)) for m in T[e]["marcas"] if INI[e] + m > 0.3]
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
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
