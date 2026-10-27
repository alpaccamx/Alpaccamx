"""Videos cortos (15-20 s) al estilo de las cuentas de proveedores que funcionan en TikTok:
cortes rápidos de los videos de empaque y de las fotos de las cajas, una sola frase en pantalla
(letra blanca con borde, como la de TikTok) y la voz de Mae en tono casual. Sin música (se pone en la app).

Uso: python3 corto.py N CARPETA_DE_VIDEOS CARPETA_DE_FOTOS   (N = 1, 2 o 3; antes python3 voz.py cortoN)
-> TR-corto1-voz.mp4 ..."""
import json, os, random, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
N, CRUDO, FOTOS = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageOps

W, H, FPS = 1080, 1920, 30
T = json.load(open(os.path.join(AQUI, f"tiempos-corto{N}.json")))
OUT = os.path.join(AQUI, f"TR-corto{N}.mp4")

# tomas buenas: (video, segundo) con la caja llena o manos acomodando; ("foto", nombre) son las fotos de las cajas
TOMAS = {
    "caja": [("4656", 176), ("4656", 300), ("4656", 345), ("4656", 380), ("4655", 30), ("4655", 100), ("4655", 140), ("4656", 250)],
    "manos": [("4656", 8), ("4656", 32), ("4656", 120), ("4656", 168), ("4655", 16), ("4655", 64), ("4655", 168), ("4655", 212)],
    "fotos": ["IMG_4265", "IMG_4264", "IMG_4195", "IMG_4198", "IMG_4267", "IMG_4268", "IMG_4197", "IMG_4654", "IMG_4269"],
}
# frases en pantalla: (escena, marca o None = desde el inicio de la escena, texto)
TEXTOS = {
    "1": [(0, None, "Un día más en la oficina 📦"), (0, 0, "Armando un pedido True Religion\npara una emprendedora 💗"),
          (1, 0, "100% original, con etiqueta ✅"), (2, 0, "Ya saben dónde surtirse 😏")],
    "2": [(0, None, "Lo que puede ganar mi clienta\ncon 1 conjunto 💸"), (1, 0, "True Religion México:\nsolo la sudadera $6,026"),
          (2, 0, "Conmigo: el conjunto\ncompleto $3,019"), (3, 0, "Haz las cuentas 🤑"), (3, 1, "Comenta “Me quiero unir” 👇")],
    "3": [(0, None, "¿Quieres revender ropa original? 👀"), (1, 0, "Mayoreo desde 1 pieza 🛍️"),
          (1, 1, "True Religion original ✅"), (2, 0, "Comenta “Me quiero unir” 👇")],
}[N]
# en el video 2, la foto de la tienda del leopardo sale cuando se dicen los precios
FOTO_TIENDA = {"2": [(1, 0, 2.4), (2, 0, 2.6)]}.get(N, [])


def video(vid, ini, n, vel=1.25):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"IMG_{vid}.MOV"), "-t", f"{n * vel / FPS + 0.3:.2f}",
                          "-vf", f"setpts=PTS/{vel},fps={FPS},scale={W}:{H}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


def foto(nombre, n):
    """la foto de la caja con un acercamiento rápido (como cámara en mano)"""
    ruta = os.path.join(FOTOS, nombre + ".jpg")
    im = ImageOps.fit(Image.open(ruta).convert("RGB"), (int(W * 1.25), int(H * 1.25)))
    for f in range(n):
        k = 1.25 - 0.18 * f / max(1, n - 1); w, h = int(W * k), int(H * k)
        x0, y0 = (im.width - w) // 2, (im.height - h) // 2
        yield im.crop((x0, y0, x0 + w, y0 + h)).resize((W, H), Image.BILINEAR).convert("RGBA")


def tienda(n):
    im = ImageOps.fit(Image.open(os.path.join(AQUI, "fotos", "leopardo.jpg")).convert("RGB"), (W, H), centering=(0.5, 0.35))
    for f in range(n):
        k = 1 + 0.06 * f / max(1, n - 1); w, h = int(W / k), int(H / k)
        yield im.crop(((W - w) // 2, (H - h) // 2, (W - w) // 2 + w, (H - h) // 2 + h)).resize((W, H), Image.BILINEAR).convert("RGBA")


def texto(s):
    sz = 62
    while True:  # se achica hasta que la línea más larga quepa con margen
        lineas = [b.linea(l, "ExtraBold", sz, (255, 255, 255), stroke=7, sfill=(20, 20, 20)) for l in s.split("\n")]
        if max(l.width for l in lineas) <= 960 or sz <= 40: break
        sz -= 4
    im = Image.new("RGBA", (max(l.width for l in lineas), sum(l.height - 18 for l in lineas) + 18))
    y = 0
    for l in lineas: im.alpha_composite(l, ((im.width - l.width) // 2, y)); y += l.height - 18
    return im


def tiempos():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    return ini


def cuadros():
    ini = tiempos(); total = int(round(ini[-1] * FPS))
    # momentos (en cuadros) en que cambia la frase en pantalla y cuándo sale la foto de la tienda
    def momento(esc, marca): return ini[esc] + (0 if marca is None else T[esc]["marcas"][marca])
    cambios = sorted((int(momento(e, m) * FPS), s) for e, m, s in TEXTOS)
    tiendas = [(int(momento(e, m) * FPS), int(d * FPS)) for e, m, d in FOTO_TIENDA]
    # cortes: alterna caja / manos / foto, de 1.4 a 2.2 s, en orden fijo (sale igual cada vez)
    rnd = random.Random(int(N)); pools = {k: list(v) for k, v in TOMAS.items()}
    for v in pools.values(): rnd.shuffle(v)
    orden = ["caja", "manos", "fotos", "caja", "manos", "caja", "fotos", "manos"]
    f, j = 0, 0
    while f < total:
        tipo = orden[j % len(orden)]; n = int(rnd.uniform(1.4, 2.2) * FPS)
        t = next((t for t in tiendas if f <= t[0] < f + n), None)
        if t and t[0] == f: gen, n = tienda(t[1]), t[1]
        else:
            if t: n = t[0] - f  # se corta justo cuando entra la foto de la tienda
            if j == 0: gen = video("4656", 300, n)  # arranca con el leopardo en la caja
            elif tipo == "fotos": gen = foto(pools["fotos"][j % len(pools["fotos"])], n)
            else:
                vid, s = pools[tipo][j % len(pools[tipo])]; gen = video(vid, s, n)
        n = min(n, total - f)
        for k, L in zip(range(n), gen):
            g = f + k
            actual = [s for c, s in cambios if c <= g]
            if actual: b.pon(L, texto(actual[-1]), W / 2, 700)
            yield L
        f += n; j += 1


if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in cuadros():
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait()
    final = OUT.replace(".mp4", "-voz.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", OUT, "-i", os.path.join(AQUI, f"voz-corto{N}", "narracion.wav"),
                    "-filter_complex", "[1:a]aformat=channel_layouts=stereo,loudnorm=I=-14:TP=-1:LRA=11[a]", "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final, f"{cnt / FPS:.1f}s")
