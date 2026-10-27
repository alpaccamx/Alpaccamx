"""Videos cortos de los mists de Bath & Body Works: cortes rápidos de la tienda (videos del iPhone), una frase en
pantalla y la voz de Mae. Las fotos de las bolsas llenas salen como tarjeta pop-up (nunca a pantalla completa) y
sale Mae en el espejo (solo las tomas que eligió). El audio de la tienda trae música con derechos: no se usa.
1080x1920, 30 fps.

Uso: python3 build.py VARIANTE CARPETA_DE_VIDEOS CARPETA_DE_FOTOS
     VARIANTE = restock | pov | reventa | aromas  (antes: python3 voz.py [pov|reventa|aromas]; restock usa la voz base)
-> BBW-voz.mp4, BBW-pov-voz.mp4, ..."""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
VAR, CRUDO, FOTOS = sys.argv[1], sys.argv[2], sys.argv[3]
SUF = "" if VAR == "restock" else "-" + VAR
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter, ImageOps

W, H, FPS = 1080, 1920, 30
PINK, WHITE, INK = b.PINK, b.WHITE, b.INK
T = json.load(open(os.path.join(AQUI, f"tiempos{SUF}.json")))
OUT = os.path.join(AQUI, f"BBW{SUF}.mp4")
ESPEJO = (0.04, 0.04, 0.6)  # acercamiento al espejo donde Mae saluda (x, y, tamaño, en fracción del cuadro)
# tomas del espejo que sí le gustan a Mae: 122.8-124.6 s (amor y paz, saludo), 127.0-128.7 s y 142.2-143.6 s.
# NO usar 124.7-126.6 (se está peinando) ni 141.3-142.1. Estas tomas duran lo que dicen: no se estiran.

# tomas en orden: (video, inicio, segundos, velocidad[, acercamiento])
# textos: (escena, marca o None = inicio de la escena, tipo, texto); solo uno a la vez en pantalla
# popups: (escena, marca o None, segundos, foto): las fotos de las bolsas en tarjeta chica
VARIANTES = {
    "restock": dict(
        tomas=[("4705", 122.9, 1.7, 1.0, ESPEJO), ("4704", 11.0, 1.4, 2.2), ("4705", 21, 1.4, 1.2), ("4705", 30, 1.4, 1.2), ("4705", 93, 1.5, 1.2),
               ("4705", 156, 1.4, 1.2), ("4705", 162, 1.4, 1.2), ("4705", 222, 1.3, 1.3), ("4705", 42, 1.4, 1.2), ("4705", 216, 1.4, 1.2),
               ("4705", 99, 1.5, 1.2), ("4705", 127.0, 1.7, 1.0, ESPEJO), ("4705", 228, 2.6, 1.0)],
        textos=[(0, None, "grande", "¡RESTOCK! 🚨"), (0, 1, "texto", "Mists Bath & Body Works\nya en mi página ✨"),
                (1, 0, "precio", "$150 c/u"), (1, 1, "precio2", "Mayoreo desde 1 pieza"),
                (2, 0, "texto", "Un montón de aromas ✨"), (2, 1, "texto", "…pero se acaban rápido 🔥"), (3, 0, "cta", "Pide en alpacca.mx 🛍️")],
        popups=[(0, 1, 2.4, "IMG_4708"), (3, 0, 4.4, "IMG_4707")]),
    "pov": dict(
        tomas=[("4704", 0.5, 1.5, 3.0), ("4704", 11.0, 1.4, 2.2), ("4705", 122.8, 1.8, 1.0, ESPEJO), ("4705", 21, 1.3, 1.2),
               ("4705", 57, 1.3, 1.2), ("4705", 93, 1.3, 1.2), ("4705", 162, 1.3, 1.2), ("4705", 210, 1.3, 1.2), ("4705", 75, 1.2, 1.5),
               ("4705", 190, 2.3, 1.0), ("4705", 127.0, 1.7, 1.0, ESPEJO)],
        textos=[(0, None, "texto", "POV: fui a Bath & Body Works\npor tus mists 🛍️"), (1, 0, "texto", "Los elijo uno por uno 💗"),
                (1, 1, "texto", "Originales, directo de la tienda ✅"), (2, 0, "precio", "$150 c/u"), (3, 0, "cta", "Nos vemos en alpacca.mx 👋")],
        popups=[(2, 0, 2.6, "IMG_4708")]),
    "reventa": dict(
        tomas=[("4705", 222, 1.4, 1.3), ("4705", 228, 1.4, 1.3), ("4705", 30, 1.4, 1.2), ("4705", 93, 1.4, 1.2), ("4705", 87, 1.3, 1.3),
               ("4705", 156, 1.3, 1.2), ("4705", 42, 1.4, 1.2), ("4705", 198, 1.3, 1.3), ("4705", 216, 1.4, 1.2),
               ("4705", 210, 2.4, 1.2), ("4705", 127.0, 1.7, 1.0, ESPEJO)],
        textos=[(0, None, "texto", "¿Vendes perfumes? 👀"), (1, 0, "texto", "Mists Bath & Body Works\noriginales ✅"),
                (1, 1, "precio", "$150 c/u"), (2, 0, "precio2", "Mayoreo desde 1 pieza"), (2, 1, "texto", "Tú le pones tu precio 💸"),
                (3, 0, "cta", "Comenta “Me quiero unir” 👇")],
        popups=[(2, 1, 2.2, "IMG_4707")]),
    "aromas": dict(
        tomas=[("4705", 27, 1.6, 1.2), ("4705", 87, ("hasta", 1, 0), 1.3), ("4705", 21.6, ("hasta", 1, 1), 1.0),
               ("4705", 29.8, ("hasta", 1, 2), 1.0), ("4705", 68.5, ("hasta", 2, 0), 1.0),
               ("4705", 156.5, 1.4, 1.2), ("4705", 162.5, 1.4, 1.2), ("4705", 210, 1.4, 1.2), ("4705", 93, 1.4, 1.2), ("4705", 127.0, 1.7, 1.0, ESPEJO)],
        textos=[(0, None, "texto", "¿Cuál es tu aroma favorito? 💭"), (1, 0, "grande", "Gingham Gorgeous"), (1, 1, "grande", "Strawberry Pound Cake"),
                (1, 2, "grande", "Into the Night"), (2, 0, "precio", "$150 c/u"), (2, 1, "precio2", "Mayoreo desde 1 pieza"),
                (3, 0, "cta", "Déjamelo en comentarios 👇")],
        popups=[(2, 1, 2.0, "IMG_4708")]),
}
CFG = VARIANTES[VAR]


def video(vid, ini, n, vel, zoom=None):
    vf = f"setpts=PTS/{vel},fps={FPS}"
    if zoom: vf += f",crop=iw*{zoom[2]}:ih*{zoom[2]}:iw*{zoom[0]}:ih*{zoom[1]}"
    vf += f",scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"IMG_{vid}.MOV"), "-t", f"{n * vel / FPS + 0.3:.2f}",
                          "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


_cards = {}
def popup(nombre):
    """foto en tarjeta blanca chica con sombra"""
    if nombre not in _cards:
        im = ImageOps.fit(Image.open(os.path.join(FOTOS, nombre + ".jpg")).convert("RGB"), (400, 520))
        card = Image.new("RGBA", (400 + 24 + 60, 520 + 24 + 60))
        sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 40, 454, 584), 30, fill=130)
        card.putalpha(sh.filter(ImageFilter.GaussianBlur(16)))
        ImageDraw.Draw(card).rounded_rectangle((30, 30, 454, 574), 30, fill=WHITE)
        m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 399, 519), 22, fill=255)
        card.paste(im, (42, 42), m); _cards[nombre] = card
    return _cards[nombre]


def texto(s, sz=62):
    while True:
        lineas = [b.linea(l, "ExtraBold", sz, WHITE, stroke=7, sfill=(20, 20, 20)) for l in s.split("\n")]
        if max(l.width for l in lineas) <= 960 or sz <= 40: break
        sz -= 4
    im = Image.new("RGBA", (max(l.width for l in lineas), sum(l.height - 18 for l in lineas) + 18)); y = 0
    for l in lineas: im.alpha_composite(l, ((im.width - l.width) // 2, y)); y += l.height - 18
    return im


def pon_texto(L, tipo, s, t, y):
    if tipo == "grande":
        sz = 110
        while b.F("ExtraBold", sz).getlength(s) > 880: sz -= 6  # los nombres largos se achican para caber
        b.pon(L, b.pastilla(s, "ExtraBold", sz, (226, 40, 60), WHITE, padx=50, pady=24), W / 2, y, *b.entra(t, 0, 0.35))
    elif tipo == "texto":
        b.pon(L, texto(s), W / 2, y, *b.entra(t, 0, 0.3))
    elif tipo == "precio":
        b.pon(L, b.pastilla(s, "ExtraBold", 130, PINK, WHITE, padx=56, pady=26), W / 2, y, *b.entra(t, 0, 0.4))
    elif tipo == "precio2":
        b.pon(L, b.pastilla("$150 c/u", "ExtraBold", 130, PINK, WHITE, padx=56, pady=26), W / 2, y - 60)
        b.pon(L, b.pastilla(s, "Bold", 54, WHITE, INK), W / 2, y + 120, *b.entra(t, 0, 0.35))
    elif tipo == "cta":
        b.pon(L, b.pastilla(s, "ExtraBold", 62, PINK, WHITE), W / 2, y, *b.entra(t, 0, 0.4))


SFX = []

def cuadros():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    total = int(round(ini[-1] * FPS))
    def cuando(e, m): return max(0, int((ini[e] + (0 if m is None else T[e]["marcas"][m])) * FPS))
    cambios = sorted((cuando(e, m), tipo, s) for e, m, tipo, s in CFG["textos"])
    pops = [(cuando(e, m), int(d * FPS), foto) for e, m, d, foto in CFG["popups"]]
    SFX.extend([(c / FPS, "pop") for c, _, _ in cambios[1:]] + [(0.05, "glitter")] + [(c / FPS, "pop") for c, _, _ in pops])
    # cuadros de cada toma: las que dicen ("hasta", escena, marca) terminan justo en esa marca (para que el nombre caiga
    # sobre el mist correcto); las demás se estiran o encogen parejo para llenar lo que dura la voz
    tomas, n_fijo, f = CFG["tomas"], {}, 0
    for i, tm in enumerate(tomas):
        if isinstance(tm[2], tuple): n_fijo[i] = cuando(*tm[2][1:]) - f; f = cuando(*tm[2][1:])
        elif len(tm) > 4: n_fijo[i] = int(tm[2] * FPS); f += n_fijo[i]  # espejo: duración exacta
        else: f += int(tm[2] * FPS)
    libres = [i for i in range(len(tomas)) if i not in n_fijo]
    k_libre = (total - sum(n_fijo.values())) / max(1, sum(int(tomas[i][2] * FPS) for i in libres))
    ns = [n_fijo.get(i) or int(tomas[i][2] * FPS * k_libre) for i in range(len(tomas))]
    ns[libres[-1]] += total - sum(ns)  # lo que sobre o falte va a la última toma que no es del espejo
    f = 0
    for tm, n in zip(tomas, ns):
        if n <= 0: continue
        for k, L in zip(range(n), video(*tm[:2], n, *tm[3:])):
            g = f + k
            pop = next(((g - c, d, foto) for c, d, foto in pops if c <= g < c + d), None)
            if pop:  # tarjeta arriba con rebote; se va desvaneciendo al final
                s_, a_ = b.entra(pop[0] / FPS, 0, 0.4)
                b.pon(L, popup(pop[2]), W / 2, 400, s_, min(a_, (pop[1] - pop[0]) / 6))
            act = [x for x in cambios if x[0] <= g]
            if act: pon_texto(L, act[-1][1], act[-1][2], (g - act[-1][0]) / FPS, 900 if pop else 700)
            yield L
        f += n


if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in cuadros():
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait()
    final = OUT.replace(".mp4", "-voz.mp4")
    ins, fil = ["-i", OUT, "-i", os.path.join(AQUI, f"voz{SUF}", "narracion.wav")], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=0.3[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final, f"{cnt / FPS:.1f}s")
