"""Videos cortos de los mists de Victoria's Secret (hoy a $155): cortes rápidos de la tienda (videos del iPhone de Mae,
carpeta Ross del Drive: IMG_1172 entrada, IMG_1198 pared de mists y bolsa, IMG_1199 caja, IMG_1200 bolsa rosa y letrero),
una frase en pantalla, la voz de Mae y el QR de su grupo de WhatsApp al final. El audio de la tienda no se usa.
Mismo motor que video-bbw/build.py. 1080x1920, 30 fps.

Uso: python3 build.py VARIANTE CARPETA_DE_VIDEOS   (VARIANTE = oferta | pedido | razones; antes: python3 voz.py VARIANTE)
-> VS-oferta-voz.mp4, VS-pedido-voz.mp4, VS-razones-voz.mp4
No repiten los de Bath & Body Works (POV y reventa): pedido es tipo vlog y razones es una lista con números grandes."""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
VAR, CRUDO = sys.argv[1], sys.argv[2]
FOTOS = os.path.join(AQUI, "fotos")
SUF = "-" + VAR
PRECIO = "$155 c/u"
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter, ImageOps

W, H, FPS = 1080, 1920, 30
PINK, WHITE, INK = b.PINK, b.WHITE, b.INK
T = json.load(open(os.path.join(AQUI, f"tiempos{SUF}.json")))
OUT = os.path.join(AQUI, f"VS{SUF}.mp4")
VSROSA, NEGRO = (236, 92, 140), (20, 20, 22)

# tomas en orden: (video, inicio, segundos, velocidad); se estiran o encogen parejo para llenar lo que dura la voz
# textos: (escena, marca o None = inicio de la escena, tipo, texto); solo uno a la vez en pantalla
# popups: (escena, marca o None, segundos, foto): fotos en tarjeta chica ("QR" = el grupo de WhatsApp)
VARIANTES = {
    "oferta": dict(
        tomas=[("1200", 27.4, 1.6, 1.0), ("1198", 0.3, 1.4, 1.2), ("1198", 2.6, 1.3, 1.2), ("1198", 10.2, 1.5, 1.0),
               ("1199", 3.4, 1.4, 1.0), ("1198", 14.6, 1.3, 1.2), ("1200", 0.5, 1.5, 1.2), ("1172", 12.0, 1.4, 1.5),
               ("1200", 31.5, 1.6, 1.2), ("1198", 0.8, 2.4, 1.0)],
        textos=[(0, None, "grande", "¡SOLO HOY! 🚨"), (0, 1, "precio", PRECIO), (1, 0, "texto", "Mists Victoria's Secret\noriginales ✅"),
                (1, 1, "texto", "Tú eliges tus aromas 💗"), (2, 0, "cta", "Apártalos hoy mismo 🛍️"),
                (3, 0, "cta", "Únete a mi grupo de WhatsApp 💬")],
        popups=[(3, 0, 99, "QR")]),
    "pedido": dict(  # vlog: acompáñame a recoger un pedido (cada renglón de tomas es una escena de la voz)
        tomas=[("1172", 2.0, 2.0, 1.5), ("1172", 12.0, 1.6, 1.5),
               ("1200", 27.4, 1.8, 1.0), ("1172", 18.6, 1.6, 1.0), ("1198", 0.3, 2.2, 1.2),
               ("1198", 2.6, 1.4, 1.2), ("1198", 9.8, 1.8, 1.0),
               ("1199", 3.4, 1.8, 1.0), ("1200", 0.5, 1.6, 1.2), ("1200", 13.5, 1.5, 1.2),
               ("1200", 31.5, 2.4, 1.2), ("1200", 18.5, 2.2, 1.2), ("1172", 19.0, 2.2, 1.0)],
        textos=[(0, None, "vlog", "📍 Recogiendo un pedido en Victoria's Secret"), (1, 0, "vlog", "🧾 Mis clientas me encargaron sus mists"),
                (1, 1, "precio", "HOY " + PRECIO), (2, 0, "vlog", "🔎 Los busco uno por uno"), (2, 1, "vlog", "🛍️ …y a la bolsa"),
                (3, 0, "vlog", "✅ Pagado y empacado"), (3, 1, "vlog", "✈️ ¡Van para México! 🇲🇽"),
                (4, 0, "cta", "Únete a mi grupo de WhatsApp 💬")],
        popups=[(4, 0, 99, "QR")]),
    "razones": dict(  # lista: 3 razones con número grande
        tomas=[("1200", 27.4, 1.6, 1.0), ("1198", 0.3, 1.5, 1.2), ("1172", 12.0, 1.5, 1.5),
               ("1198", 2.6, 1.5, 1.2), ("1198", 9.8, 1.5, 1.0), ("1199", 3.4, 1.4, 1.0),
               ("1198", 14.6, 1.6, 1.2), ("1198", 0.8, 1.6, 1.0), ("1200", 0.5, 1.5, 1.2),
               ("1198", 10.6, 1.7, 1.0), ("1200", 13.5, 1.7, 1.2), ("1172", 18.6, 1.7, 1.0),
               ("1200", 31.5, 2.0, 1.2), ("1200", 18.5, 2.0, 1.2), ("1172", 2.0, 1.75, 1.5)],
        textos=[(0, None, "texto", "3 razones para comprar tus\nmists Victoria's Secret conmigo 💗"),
                (1, 0, "numero", "1|Originales, directo de la tienda ✅"), (2, 0, "numero", "2|Hoy a " + PRECIO),
                (3, 0, "numero", "3|Mayoreo desde 1 pieza 🛍️"), (4, 0, "cta", "Únete a mi grupo de WhatsApp 💬")],
        popups=[(4, 0, 99, "QR")]),
}
CFG = VARIANTES[VAR]
SDR = ("scale=1080:-2,zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,"
       "tonemap=reinhard:param=0.6:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24,eq=saturation=0.75")  # 0.75: sin bajarle, se veía muy saturado


def video(vid, ini, n, vel, zoom=None):
    vf = f"{SDR},setpts=PTS/{vel},fps={FPS}"  # el iPhone graba en HDR: sin esto se ve pálido
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
    """foto en tarjeta blanca chica con sombra ("QR" = el código del grupo de WhatsApp de Mae)"""
    if nombre == "QR" and nombre not in _cards:
        sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "carruseles"))
        import whatsapp
        _cards[nombre] = whatsapp.tarjeta(440)
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
        b.pon(L, b.pastilla(s, "ExtraBold", sz, NEGRO, WHITE, padx=50, pady=24), W / 2, y, *b.entra(t, 0, 0.35))
    elif tipo == "texto":
        b.pon(L, texto(s), W / 2, y, *b.entra(t, 0, 0.3))
    elif tipo == "precio":
        b.pon(L, b.pastilla(s, "ExtraBold", 130, VSROSA, WHITE, padx=56, pady=26), W / 2, y, *b.entra(t, 0, 0.4))
    elif tipo == "precio2":
        b.pon(L, b.pastilla(PRECIO, "ExtraBold", 130, VSROSA, WHITE, padx=56, pady=26), W / 2, y - 60)
        b.pon(L, b.pastilla(s, "Bold", 54, WHITE, INK), W / 2, y + 120, *b.entra(t, 0, 0.35))
    elif tipo == "vlog":  # renglón tipo vlog: caja negra a la izquierda que entra deslizándose
        c = b.pastilla(s, "SemiBold", 46, NEGRO + (215,), WHITE, padx=34, pady=18)
        while c.width > 1000: c = c.resize((1000, int(c.height * 1000 / c.width)), Image.LANCZOS)
        k = b.ease(t / 0.35)
        b.pon(L, c, 40 + c.width / 2 - 120 * (1 - k), y, 1, min(1, t / 0.2))
    elif tipo == "numero":  # "N|texto": número grande en círculo rosa y la razón abajo
        n, s = s.split("|")
        c = Image.new("RGBA", (260, 260)); d = ImageDraw.Draw(c); d.ellipse((0, 0, 259, 259), fill=VSROSA + (255,), outline=WHITE, width=10)
        d.text((130, 138), n, font=b.F("ExtraBold", 170), fill=WHITE, anchor="mm")
        b.pon(L, c, W / 2, y - 120, *b.entra(t, 0, 0.4))
        sz = 56
        while b.pastilla(s, "Bold", sz, WHITE, NEGRO).width > 1000 and sz > 36: sz -= 4
        b.pon(L, b.pastilla(s, "Bold", sz, WHITE, NEGRO), W / 2, y + 110, *b.entra(t, 0.25, 0.35))
    elif tipo == "cta":
        sz = 62
        while b.pastilla(s, "ExtraBold", sz, VSROSA, WHITE).width > 1000 and sz > 40: sz -= 4  # que no se salga
        b.pon(L, b.pastilla(s, "ExtraBold", sz, VSROSA, WHITE), W / 2, y, *b.entra(t, 0, 0.4))


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
