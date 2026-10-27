"""Video corto "Restock Bath & Body Works": cortes rápidos de la tienda, los mists en mano y las bolsas llenas,
una frase en pantalla y la voz de Mae (el audio de la tienda trae música con derechos: no se usa).
1080x1920, 30 fps. Uso: python3 build.py CARPETA_DE_VIDEOS CARPETA_DE_FOTOS  -> BBW-voz.mp4"""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO, FOTOS = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageOps

W, H, FPS = 1080, 1920, 30
PINK, WHITE, INK = b.PINK, b.WHITE, b.INK
T = json.load(open(os.path.join(AQUI, "tiempos.json")))
OUT = os.path.join(AQUI, "BBW.mp4")

# tomas en orden: ("foto", nombre, segundos) o (video, inicio, segundos, velocidad)
TOMAS = [("foto", "IMG_4708", 1.5), ("4704", 11.0, 1.6, 2.2), ("4705", 0.5, 1.5, 1.2), ("4705", 18.0, 1.4, 1.2),
         ("4705", 27.0, 1.5, 1.2), ("4705", 90.0, 1.5, 1.2), ("4705", 198.0, 1.4, 1.3), ("4705", 225.0, 1.4, 1.3),
         ("4705", 108.0, 1.4, 1.3), ("foto", "IMG_4707", 1.6), ("4705", 207.0, 1.5, 1.2), ("foto", "IMG_4708", 9.0)]

# (escena, marca o None = desde el inicio de la escena, qué sale): solo una cosa a la vez en pantalla
TEXTOS = [(0, None, ("grande", "¡RESTOCK! 🚨")), (0, 1, ("texto", "Mists Bath & Body Works\nya en mi página ✨")),
          (1, 0, ("precio", "$150 c/u")), (1, 1, ("precio2", "Mayoreo desde 1 pieza")),
          (2, 0, ("texto", "Un montón de aromas ✨")), (2, 1, ("texto", "…pero vuelan 🔥")),
          (3, 0, ("cta", "Pide en alpacca.mx 🛍️"))]


def video(vid, ini, n, vel):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"IMG_{vid}.MOV"), "-t", f"{n * vel / FPS + 0.3:.2f}",
                          "-an", "-vf", f"setpts=PTS/{vel},fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


def foto(nombre, n):
    im = ImageOps.fit(Image.open(os.path.join(FOTOS, nombre + ".jpg")).convert("RGB"), (int(W * 1.2), int(H * 1.2)))
    for f in range(n):
        k = 1.2 - 0.15 * f / max(1, n - 1); w, h = int(W * k), int(H * k)
        x0, y0 = (im.width - w) // 2, (im.height - h) // 2
        yield im.crop((x0, y0, x0 + w, y0 + h)).resize((W, H), Image.BILINEAR).convert("RGBA")


def texto(s, sz=62):
    while True:
        lineas = [b.linea(l, "ExtraBold", sz, WHITE, stroke=7, sfill=(20, 20, 20)) for l in s.split("\n")]
        if max(l.width for l in lineas) <= 960 or sz <= 40: break
        sz -= 4
    im = Image.new("RGBA", (max(l.width for l in lineas), sum(l.height - 18 for l in lineas) + 18)); y = 0
    for l in lineas: im.alpha_composite(l, ((im.width - l.width) // 2, y)); y += l.height - 18
    return im


def pon_texto(L, cosa, t):
    tipo, s = cosa
    if tipo == "grande":
        b.pon(L, b.pastilla(s, "ExtraBold", 110, (226, 40, 60), WHITE, padx=50, pady=24), W / 2, 700, *b.entra(t, 0, 0.35))
    elif tipo == "texto":
        b.pon(L, texto(s), W / 2, 700, *b.entra(t, 0, 0.3))
    elif tipo == "precio":
        b.pon(L, b.pastilla(s, "ExtraBold", 130, PINK, WHITE, padx=56, pady=26), W / 2, 700, *b.entra(t, 0, 0.4))
    elif tipo == "precio2":
        b.pon(L, b.pastilla("$150 c/u", "ExtraBold", 130, PINK, WHITE, padx=56, pady=26), W / 2, 640)
        b.pon(L, b.pastilla(s, "Bold", 54, WHITE, INK), W / 2, 820, *b.entra(t, 0, 0.35))
    elif tipo == "cta":
        b.pon(L, b.pastilla(s, "ExtraBold", 66, PINK, WHITE), W / 2, 700, *b.entra(t, 0, 0.4))


def cuadros():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    total = int(round(ini[-1] * FPS))
    cambios = sorted((int((ini[e] + (0 if m is None else T[e]["marcas"][m])) * FPS), c) for e, m, c in TEXTOS)
    f = 0
    for tm in TOMAS:
        if f >= total: break
        n = min(int(tm[2] * FPS), total - f)
        gen = foto(tm[1], n) if tm[0] == "foto" else video(tm[0], tm[1], n, tm[3])
        for k, L in zip(range(n), gen):
            g = f + k
            act = [(c, x) for c, x in cambios if c <= g]
            if act: pon_texto(L, act[-1][1], (g - act[-1][0]) / FPS)
            yield L
        f += n
    SFX.extend([(c / FPS, "pop") for c, _ in cambios[1:]] + [(0.05, "glitter")])


SFX = []

if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in cuadros():
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait()
    final = OUT.replace(".mp4", "-voz.mp4")
    ins, fil = ["-i", OUT, "-i", os.path.join(AQUI, "voz", "narracion.wav")], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=0.3[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final, f"{cnt / FPS:.1f}s")
