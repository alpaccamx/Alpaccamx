"""Videos del Sephora Sale (preventa en alpacca.mx/?ver=preventa): cortes rápidos de Mae empacando pedidos de Sephora
(videos del iPhone ya pasados a 1080p), una frase en pantalla, tarjetas de producto con el precio de la preventa y la
voz de Mae. 1080x1920, 30 fps.

Uso: python3 build.py VARIANTE CARPETA_DE_VIDEOS   (antes: python3 voz.py VARIANTE)
     VARIANTE = anuncio | emprende | empaque | top  -> Sephora-VARIANTE-voz.mp4
Los videos de la carpeta se llaman IMG_xxxx.mp4. IMG_2510 es de e.l.f. (no es de Sephora): no se usa."""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
VAR, CRUDO = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter

W, H, FPS = 1080, 1920, 30
PINK, WHITE, INK, GREY = b.PINK, b.WHITE, b.INK, (120, 120, 128)
T = json.load(open(os.path.join(AQUI, f"tiempos-{VAR}.json")))
OUT = os.path.join(AQUI, f"Sephora-{VAR}.mp4")
# los videos del iPhone vienen en HDR (HLG, BT.2020): sin esto se ven pálidos y deslavados. Se pasan a color normal (SDR)
SDR = ("zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,"
       "tonemap=reinhard:param=0.6:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24")

# precios de la preventa (Precio = con descuento; Antes = "Precio Sephora" que sale tachado en la página)
PRODUCTOS = {
    "rare": ("Rare Beauty", "Soft Pinch Liquid Blush", 316, 395),
    "patrick": ("Patrick Ta", "Major Headlines Blush Duo", 493, 617),
    "huda": ("Huda Beauty", "Easy Bake Setting Powder", 474, 592),
    "calendario": ("Sephora Favorites", "Calendario de adviento 2026", 2071, 2589),
}
# todas las tomas son de los pedidos del Sephora Sale del año pasado: se aclara con esta etiqueta para no confundir
ETIQUETA = "📦 Pedidos del Sephora Sale 2025"

# tomas en orden: (video, inicio, segundos, velocidad); se estiran parejo para llenar la voz
# o escenas: una lista de tomas por escena (segundos None = lo que falte de la escena)
# textos: (escena, marca o None, tipo, texto); uno a la vez. tipo "nada" quita el texto
# tarjetas: (escena, marca o None, segundos, producto)
VARIANTES = {
    "anuncio": dict(
        escenas=[[("2452", 10, 1.4, 1.5), ("1828", 120, 1.2, 3.0), ("1881", 140, None, 3.0)],
                 [("1830", 0.5, 1.4, 1.3), ("1861", 31, None, 1.0)],
                 # las marcas salen como lista sobre tomas generales (no hay tomas de Dior, Fenty ni Charlotte Tilbury)
                 [("1881", 100, 0.8, 3.0), ("1830", 22, 1.1, 1.0), ("1828", 130, None, 3.0)],
                 [("1829", 75, 2.0, 1.0), ("2452", 340, None, 1.2)],
                 [("1695", 7.0, 1.4, 1.0), ("2453", 89, 1.4, 1.0), ("2452", 20, None, 1.0)]],
        textos=[(0, None, "texto", "Lo que pidieron mis clientas\nen el Sephora Sale 2025 👀"),
                (1, 0, "grande", "SEPHORA SALE 2026"), (1, 1, "precio", "20% OFF"),
                (2, 0, "texto", "+2,000 productos"), (2, 1, "lista", "Dior"), (2, 2, "lista", "Dior\nRare Beauty"),
                (2, 3, "lista", "Dior\nRare Beauty\nFenty Beauty"), (2, 4, "lista", "Dior\nRare Beauty\nFenty Beauty\nCharlotte Tilbury\n…y muchas más 💗"),
                (3, 0, "texto", "Aparta con el 50% 💳"), (3, 1, "texto", "…y el resto cuando\nte llegue 📦"),
                (4, 0, "cta", "Hasta el 8 de noviembre ⏰"), (4, 1, "cta", "Aparta en alpacca.mx 🛍️")],
        tarjetas=[]),
    "emprende": dict(
        tomas=[("1881", 100, 1.5, 3.0), ("1830", 22, 1.3, 1.0), ("1830", 35, 1.5, 1.2), ("2452", 30, 1.5, 3.0), ("1861", 31, 1.4, 1.0),
               ("1828", 130, 1.5, 3.0), ("1695", 56, 1.4, 1.0), ("2453", 75, 1.5, 1.0), ("2452", 330, 1.6, 1.2), ("1829", 187, 1.5, 1.0),
               ("1881", 230, 1.8, 2.0)],
        textos=[(0, None, "texto", "¿Vendes maquillaje? 👀"), (0, 1, "grande", "SEPHORA SALE 2026"),
                (1, 0, "texto", "100% original ✅"), (1, 1, "precio", "20% OFF"),
                (2, 0, "texto", "Apartas con el 50% 💳"), (2, 1, "texto", "Tú le pones tu precio 💸"),
                (3, 0, "cta", "Comenta “Me quiero unir” 👇")],
        tarjetas=[]),
    "empaque": dict(
        tomas=[("2452", 0, 1.6, 2.0), ("2452", 19, 1.4, 1.0), ("1828", 100, 1.6, 3.0), ("1828", 145, 1.4, 1.0), ("1881", 120, 1.5, 3.0),
               ("2453", 43, 1.5, 1.5), ("1695", 20, 1.5, 2.0), ("1695", 60, 1.4, 1.0), ("1828", 186, 1.6, 2.0), ("1881", 228, 1.6, 2.5),
               ("1695", 84, 1.5, 1.0), ("2452", 372, 1.6, 1.0)],
        textos=[(0, None, "texto", "POV: los pedidos de mis clientas\nen el Sephora Sale 2025 📦"), (1, 0, "texto", "100% original ✅"),
                (1, 1, "texto", "Bien protegido 🫧"), (2, 0, "grande", "SEPHORA SALE 2026"), (2, 1, "precio", "20% OFF"),
                (3, 0, "cta", "Aparta en alpacca.mx 🛍️"), (3, 1, "cta", "Hasta el 8 de noviembre ⏰")],
        tarjetas=[]),
    "top": dict(
        escenas=[[("2452", 20, 1.4, 2.0), ("1830", 22, 1.2, 1.0), ("1881", 140, None, 3.0)],
                 [("1830", 8.5, None, 1.0)],
                 [("1829", 73, None, 1.0)],
                 [("1861", 30.5, None, 1.0)],
                 [("2452", 15, None, 1.0)],
                 [("1828", 130, 1.6, 3.0), ("2453", 89, 1.5, 1.0), ("1881", 225, None, 2.0)]],
        textos=[(0, None, "texto", "Lo más pedido en el\nSephora Sale 2025 💗"), (1, None, "nada", ""),
                (5, 0, "texto", "Este año, con descuento 💸"), (5, 1, "cta", "Preventa hasta el 8 de noviembre ⏰")],
        tarjetas=[(1, None, 2.6, "rare"), (2, None, 2.8, "patrick"), (3, None, 2.7, "huda"), (4, None, 3.2, "calendario")]),
}
CFG = VARIANTES[VAR]


def video(vid, ini, n, vel):
    vf = f"{SDR},setpts=PTS/{vel},fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"IMG_{vid}.mp4"),
                          "-t", f"{n * vel / FPS + 0.3:.2f}", "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


_cards = {}
def tarjeta(k):
    """tarjeta blanca: marca, producto, precio de la preventa y el Precio Sephora tachado"""
    if k in _cards: return _cards[k]
    marca, nombre, precio, antes = PRODUCTOS[k]
    fn = b.F("ExtraBold", 54)
    while fn.getlength(nombre) > 760: fn = b.F("ExtraBold", fn.size - 4)
    pr = b.pastilla(f"${precio:,}", "ExtraBold", 76, PINK, WHITE, padx=34, pady=14)
    fa = b.F("SemiBold", 36); ta = f"Precio Sephora ${antes:,}"
    w = int(max(fn.getlength(nombre), 520)) + 110; h = 330
    card = Image.new("RGBA", (w + 60, h + 60))
    sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 40, w + 30, h + 40), 34, fill=120)
    card.putalpha(sh.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(card); d.rounded_rectangle((30, 30, w + 30, h + 30), 34, fill=WHITE)
    cx = 30 + w / 2
    d.text((cx, 82), marca.upper() + " · PREVENTA 2026", font=b.F("Bold", 30), fill=PINK, anchor="mm")
    d.text((cx, 142), nombre, font=fn, fill=INK, anchor="mm")
    card.alpha_composite(pr, (int(cx - pr.width / 2), 180))
    y = 180 + pr.height + 26
    d.text((cx, y), ta, font=fa, fill=GREY, anchor="mm")
    tw = fa.getlength(ta); d.line((cx - tw / 2 + fa.getlength("Precio Sephora "), y, cx + tw / 2, y), fill=(200, 40, 60), width=4)
    _cards[k] = card
    return card


_etq = []
def etiqueta():
    if not _etq: _etq.append(b.pastilla(ETIQUETA, "Bold", 36, (30, 30, 34), WHITE, padx=26, pady=10))
    return _etq[0]


def texto(s, sz=62):
    while True:
        lineas = [b.linea(l, "ExtraBold", sz, WHITE, stroke=7, sfill=(20, 20, 20)) for l in s.split("\n")]
        if max(l.width for l in lineas) <= 960 or sz <= 40: break
        sz -= 4
    im = Image.new("RGBA", (max(l.width for l in lineas), sum(l.height - 18 for l in lineas) + 18)); y = 0
    for l in lineas: im.alpha_composite(l, ((im.width - l.width) // 2, y)); y += l.height - 18
    return im


def pon_texto(L, tipo, s, t, y):
    if tipo == "grande":  # SEPHORA SALE: pastilla negra con letra blanca, como el logo
        sz = 104
        while b.F("ExtraBold", sz).getlength(s) > 880: sz -= 6
        b.pon(L, b.pastilla(s, "ExtraBold", sz, INK, WHITE, padx=50, pady=24), W / 2, y, *b.entra(t, 0, 0.35))
    elif tipo == "texto":
        b.pon(L, texto(s), W / 2, y, *b.entra(t, 0, 0.3))
    elif tipo == "precio":
        b.pon(L, b.pastilla(s, "ExtraBold", 120, PINK, WHITE, padx=56, pady=26), W / 2, y, *b.entra(t, 0, 0.4))
    elif tipo == "lista":  # marcas una debajo de otra; solo la nueva entra con rebote
        lineas = s.split("\n")
        for i, l in enumerate(lineas):
            anim = b.entra(t, 0, 0.3) if i == len(lineas) - 1 else ()
            b.pon(L, b.pastilla(l, "ExtraBold", 66, WHITE, INK, padx=40, pady=18), W / 2, y - 140 + i * 125, *anim)
    elif tipo == "cta":
        b.pon(L, b.pastilla(s, "ExtraBold", 58, PINK, WHITE), W / 2, y, *b.entra(t, 0, 0.4))


SFX = []

def cuadros():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    total = int(round(ini[-1] * FPS))
    def cuando(e, m): return max(0, int((ini[e] + (0 if m is None else T[e]["marcas"][m])) * FPS))
    cambios = sorted((cuando(e, m), tipo, s) for e, m, tipo, s in CFG["textos"])
    cards = [(cuando(e, m), int(d * FPS), k) for e, m, d, k in CFG["tarjetas"]]
    SFX.extend([(c / FPS, "pop") for c, tipo, _ in cambios[1:] if tipo != "nada"] + [(0.05, "glitter")] + [(c / FPS, "glitter") for c, _, _ in cards])
    if "escenas" in CFG:  # una lista de tomas por escena: la toma con None (o la última) llena lo que falte de esa escena
        tomas, ns = [], []
        for k, lista in enumerate(CFG["escenas"]):
            n_esc = cuando(k + 1, None) if k + 1 < len(T) else total
            n_esc -= cuando(k, None)
            fijos = sum(int(d * FPS) for _, _, d, _ in lista if d)
            for j, tm in enumerate(lista):
                tomas.append(tm)
                ns.append(max(0, n_esc - fijos) if tm[2] is None else int(tm[2] * FPS))
            ns[-1] += n_esc - sum(ns[-len(lista):])
    else:  # todas las tomas se estiran o encogen parejo para llenar lo que dura la voz
        tomas = CFG["tomas"]
        nom = [int(tm[2] * FPS) for tm in tomas]
        ns = [int(n * total / sum(nom)) for n in nom]
        ns[-1] += total - sum(ns)
    f = 0
    for tm, n in zip(tomas, ns):
        if n <= 0: continue
        for k, L in zip(range(n), video(tm[0], tm[1], n, tm[3])):
            g = f + k
            card = next(((g - c, d, kk) for c, d, kk in cards if c <= g < c + d), None)
            if card:  # tarjeta arriba con rebote; se desvanece al final
                s_, a_ = b.entra(card[0] / FPS, 0, 0.4)
                b.pon(L, tarjeta(card[2]), W / 2, 460, s_, min(a_, (card[1] - card[0]) / 6))
            b.pon(L, etiqueta(), W / 2, 270)
            act = [x for x in cambios if x[0] <= g]
            if act and act[-1][1] != "nada": pon_texto(L, act[-1][1], act[-1][2], (g - act[-1][0]) / FPS, 700)
            yield L
        f += n


if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
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
