"""Video "True Religion": Mae empacando un pedido (videos del iPhone) + su voz contando lo fácil que es
pedirle por WhatsApp + fotos de la tienda con el precio normal contra el suyo. 1080x1920, 30 fps.

Uso: python3 build.py CARPETA_DE_VIDEOS   (la carpeta tiene IMG_4655.MOV e IMG_4656.MOV)
-> TrueReligion-voz.mp4 (y TrueReligion.mp4 sin audio)"""
import hashlib, json, os, re, subprocess, sys
from functools import lru_cache

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b  # textos con emojis de iPhone, pastillas, aparecer con rebote
from PIL import Image, ImageDraw, ImageFilter

W, H, FPS = 1080, 1920, 30
OUT = os.path.join(AQUI, "TrueReligion.mp4")
WHITE, INK, PINK, DEEP = b.WHITE, b.INK, b.PINK, b.DEEP
GREEN = (22, 150, 80); WA = (37, 211, 102); GREY = (120, 120, 128)
T = json.load(open(os.path.join(AQUI, "tiempos.json")))

# precio normal (etiqueta x 18.80) y el de Mae (oferta x 1.0825 tax x 1.15 comisión x 18.80), en pesos
PRODUCTOS = {
    "leopardo":     ("Leopardo rosa con cerezas", 4850, 3019),
    "cereza-rosa":  ("Cerezas de cristal · rosa", 4850, 3623),
    "cereza-negra": ("Cerezas de cristal · negro", 4850, 3623),
    "camo-azul":    ("Camo Groovy · azul", 4286, 2281),
    "camo-rojo":    ("Camo Groovy · rojo", 4286, 2281),
}
# (video, segundo de inicio) de cada escena: dónde se ve ese conjunto en la caja
TOMAS = [("4656", 300.0), ("4656", 7.0), ("4655", 62.0), ("4655", 88.0), ("4656", 168.0), ("4656", 345.0), ("4655", 204.0)]


def frames(vid, ini, n):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"IMG_{vid}.MOV"), "-t", f"{n / FPS + 0.3:.2f}",
                          "-vf", f"fps={FPS},scale={W}:{H}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


def mxn(v): return f"${v:,.0f}"


@lru_cache(None)
def foto(nombre):
    """foto de la tienda en tarjeta blanca con sombra"""
    im = Image.open(os.path.join(AQUI, "fotos", nombre + ".jpg")).convert("RGB")
    im = im.resize((430, int(im.height * 430 / im.width)), Image.LANCZOS).crop((0, 0, 430, 620))
    card = Image.new("RGBA", (430 + 24 + 60, 620 + 24 + 60))
    sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 40, 30 + 454, 40 + 644), 34, fill=120)
    card.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(card).rounded_rectangle((30, 30, 30 + 454, 30 + 644), 34, fill=WHITE)
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 429, 619), 24, fill=255)
    card.paste(im, (42, 42), m)
    return card


@lru_cache(None)
def precio_card(normal, mio):
    """columna de precios: normal tachado, conmigo, + envío y ahorras"""
    im = Image.new("RGBA", (470, 560)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 469, 559), 40, fill=(255, 255, 255, 235))
    d.text((235, 60), "Precio normal", font=b.F("Bold", 32), fill=GREY, anchor="mm")
    f = b.F("ExtraBold", 66); s = mxn(normal); w = f.getlength(s)
    d.text((235, 125), s, font=f, fill=GREY, anchor="mm"); d.line((235 - w / 2 - 6, 132, 235 + w / 2 + 6, 112), fill=(220, 60, 60), width=8)
    d.text((235, 225), "Conmigo", font=b.F("Bold", 36), fill=DEEP, anchor="mm")
    d.text((235, 310), mxn(mio), font=b.F("ExtraBold", 104), fill=PINK, anchor="mm")
    d.text((235, 385), "+ envío", font=b.F("SemiBold", 28), fill=GREY, anchor="mm")
    p = b.pastilla(f"Ahorras {mxn(normal - mio)}", "ExtraBold", 40, GREEN, WHITE)
    im.alpha_composite(p, ((470 - p.width) // 2, 440))
    return im


def tarjeta_producto(L, nombre, t, t_foto, t_normal, t_mio):
    tit, normal, mio = PRODUCTOS[nombre]
    b.pon(L, b.pastilla(tit, "Bold", 40, WHITE, DEEP), W / 2, 200, *b.entra(t, t_foto, 0.35))
    b.pon(L, foto(nombre), 300, 640, *b.entra(t, t_foto, 0.45))
    if t >= t_normal:
        s, a = b.entra(t, t_normal, 0.35)
        pc = precio_card(normal, mio)
        if t < t_mio:  # primero solo el precio normal
            pc = pc.crop((0, 0, pc.width, 170)); y = 330 + 85
        else:
            y = 330 + 280
        b.pon(L, pc, 800, y, s if t < t_mio else 1, a)


def pastilla_escena(L, t, t0, s, y, bg=WHITE, fg=INK, sz=46):
    b.pon(L, b.pastilla(s, "Bold", sz, bg, fg), W / 2, y, *b.entra(t, t0, 0.35))


SFX = []

def escena(k, n, f0):
    e = T[k]; m = e.get("marcas", []); vid, ini = TOMAS[k]
    for f, L in enumerate(frames(vid, ini, n)):
        t = f / FPS
        if k == 0:  # gancho: el leopardo, precio normal y el de Mae
            b.pon(L, b.linea("True Religion original 🇺🇸", "ExtraBold", 64, INK, stroke=10, sfill=WHITE), W / 2, 110)
            tarjeta_producto(L, "leopardo", t, -1.0, m[0], m[1])  # la foto ya está desde el primer cuadro
        elif k == 1:
            pastilla_escena(L, t, m[0], "🇺🇸 La tienda no envía a México", 420, WHITE, INK)
            pastilla_escena(L, t, m[1], "📦 Yo te lo traigo", 530, PINK, WHITE, 52)
        elif k == 2:
            pastilla_escena(L, t, m[0], "💬 Pídelo por WhatsApp", 420, WA, WHITE, 50)
            pastilla_escena(L, t, m[0] + 1.2, "🛍️ Soy tu personal shopper", 530, WHITE, INK)
            pastilla_escena(L, t, m[1], "✅ Original, con etiquetas", 640, WHITE, GREEN)
        elif k == 3:  # cerezas: rosa y luego negro
            nombre = "cereza-negra" if t >= m[0] else "cereza-rosa"
            tarjeta_producto(L, nombre, t, 0.0 if nombre == "cereza-rosa" else m[0], m[1], m[2])
        elif k == 4:  # camo: azul y luego rojo
            nombre = "camo-rojo" if t >= m[0] else "camo-azul"
            tarjeta_producto(L, nombre, t, 0.0 if nombre == "camo-azul" else m[0], m[1], m[2])
        elif k == 5:
            pastilla_escena(L, t, m[0], "🛍️ Mayoreo desde 1 pieza", 420, PINK, WHITE, 52)
            pastilla_escena(L, t, m[1], "💳 Transferencia o tarjeta", 530, WHITE, INK)
            pastilla_escena(L, t, m[2], "📦 ~1 semana a todo México", 640, WHITE, INK)
        elif k == 6:
            pastilla_escena(L, t, m[0], "💬 Escríbeme por WhatsApp", 560, WA, WHITE, 60)
            pastilla_escena(L, t, m[0] + 0.5, "alpacca.mx", 680, WHITE, DEEP, 44)
        yield L
    # sonidos: pop al salir cada cosa, click en los precios, brillo en "Conmigo"
    for i, tm in enumerate(m):
        SFX.append((f0 / FPS + tm, "glitter" if (k in (0, 3, 4) and i == len(m) - 1) else "pop"))


# ---------- subtítulos (palabra por palabra, la que se dice en rosa) ----------
def _palabras():
    frases = json.load(open(os.path.join(AQUI, "narracion.json"))); out = []; t0 = 0.0
    for n, (fr, e) in enumerate(zip(frases, T)):
        k = hashlib.sha1(f"eleven_v4|0.5|{fr['texto']}".encode()).hexdigest()[:12]
        a = json.load(open(os.path.join(AQUI, "voz", "cache", k + ".json")))["alignment"]
        ch, st = a["characters"], a["character_start_times_seconds"]
        ini = max(0.0, st[0] - 0.03); off = 0.25 if n == 0 else 0.0
        txt = "".join(ch); quitar = set()
        for mm in re.finditer(r"\[[^\]]*\]", txt): quitar.update(range(mm.start(), mm.end()))
        pal, tp = "", None
        for i, c in enumerate(ch):
            if i in quitar: continue
            if c.isspace():
                if pal: out.append((t0 + off + (tp - ini) / 1.1, pal)); pal = ""
                continue
            if not pal: tp = st[i]
            pal += c
        if pal: out.append((t0 + off + (tp - ini) / 1.1, pal))
        out.append((t0 + e["dur"] - 0.15, None)); t0 += e["dur"]
    return out

def _bloques():
    ws, bl, cur = _palabras(), [], []
    for t, w in ws:
        if w is None:
            if cur: bl.append(cur); cur = []
            continue
        cur.append((t, w))
        if len(cur) >= 4 or len(" ".join(x for _, x in cur)) > 20 or w[-1] in ".!?" or w[-1] in ",:;" and len(cur) >= 2:
            bl.append(cur); cur = []
    if cur: bl.append(cur)
    return [(c[0][0], min(bl[i + 1][0][0] if i + 1 < len(bl) else c[-1][0] + 1.0, c[-1][0] + 0.9), c) for i, c in enumerate(bl)]

SUBS = _bloques()

@lru_cache(None)
def _sub_img(k, activa):
    pal = [w for _, w in SUBS[k][2]]; sz = 62
    while True:
        f = b.F("ExtraBold", sz); esp = f.getlength(" ")
        w = sum(f.getlength(p) for p in pal) + esp * (len(pal) - 1)
        if w <= 900 or sz <= 40: break
        sz -= 4
    im = Image.new("RGBA", (int(w) + 40, int(sz * 1.6))); d = ImageDraw.Draw(im); x = 20
    for i, p in enumerate(pal):
        d.text((x, im.height / 2), p, font=f, anchor="lm", fill=(255, 182, 206) if i == activa else WHITE, stroke_width=9, stroke_fill=(45, 20, 35))
        x += f.getlength(p) + esp
    return im

def subtitula(L, tg):
    for k, (t0, t1, c) in enumerate(SUBS):
        if t0 <= tg < t1:
            activa = max(i for i, (tw, _) in enumerate(c) if tw <= tg) if tg >= c[0][0] else 0
            b.pon(L, _sub_img(k, activa), W / 2, 1430); return


def escenas():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    q = lambda s: int(round(s * FPS))
    for k in range(len(T)):
        yield from escena(k, q(ini[k + 1]) - q(ini[k]), q(ini[k]))


def portada():
    """portada: el leopardo en la caja con la foto de la tienda y los dos precios"""
    L = next(frames("4656", 310.0, 1))
    g = Image.new("L", (1, H)); [g.putpixel((0, y), int(150 * max(0, (y - 1300) / (H - 1300)) ** 1.3)) for y in range(H)]
    som = Image.new("RGBA", (W, H), (40, 15, 30, 255)); som.putalpha(g.resize((W, H))); L.alpha_composite(som)
    b.pon(L, b.linea("True Religion original 🇺🇸", "ExtraBold", 72, INK, stroke=12, sfill=WHITE), W / 2, 95)
    tarjeta_producto(L, "leopardo", 9, -1, 0, 0)
    b.pon(L, b.linea("Conjuntos desde $2,281", "ExtraBold", 66, WHITE, stroke=10, sfill=(45, 20, 35)), W / 2, 1180)
    b.pon(L, b.pastilla("💬 Pídelo por WhatsApp", "Bold", 50, WA, WHITE), W / 2, 1310)
    L.convert("RGB").save(os.path.join(AQUI, "portada.jpg"), quality=92); print("ok portada.jpg")


if __name__ == "__main__":
    portada()
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in escenas():
        subtitula(fr, cnt / FPS)
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait(); print("ok", OUT, f"{cnt / FPS:.1f}s")
    voz = os.path.join(AQUI, "voz", "narracion.wav"); final = OUT.replace(".mp4", "-voz.mp4")
    GAN = {"click": 0.3, "glitter": 0.35, "pop": 0.3}
    ins, fil = ["-i", OUT, "-i", voz], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume={GAN[s]}[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final)
