"""Versión "story time" de la historia de tu pedido: los clips animados con Seedance (Dreamina) +
la voz de Mae como narradora + títulos de cada paso + el cierre con los tiempos totales (de build.py).
1080x1920, 30 fps. Uso: python3 final.py  -> Historia-pedido.mp4 y Historia-pedido-voz.mp4"""
import json, os, subprocess, sys
sys.argv = [sys.argv[0], os.path.join(os.path.dirname(os.path.abspath(__file__)), "Historia-pedido.mp4")]
import build as b
from PIL import Image, ImageFilter

AQUI, W, H, FPS = b.AQUI, b.W, b.H, b.FPS
OUT = sys.argv[1]
T = b.TIEMPOS
WHITE, INK = b.WHITE, b.INK

# clip, segundo de inicio y fin que se usan (se ajusta la velocidad para que dure lo mismo que la frase)
CLIPS = [("1-seul", 0.0, 15.0), ("2-bodega", 0.0, 15.0), ("3-avion", 0.0, 15.0),
         ("4-camion", 0.0, 8.0), ("5-revision", 1.5, 11.5), ("6-entrega", 5.5, 15.0)]
# paso, título, días, color, extra (sale en la 2a marca)
PASOS = [(1, "Orden", "1–2 días hábiles", (238, 108, 146), "📅 Sáb y dom no se trabaja"),
         (2, "Envío a USA", "2–3 días hábiles", (74, 144, 226), "Ahorras en gastos de aduana 💗"),
         (3, "Cruce a México", "1–2 días hábiles", (150, 110, 220), None),
         (4, "Revisión y envío", "1 día hábil", (40, 170, 150), None),
         (5, "Entrega", "2–5 días hábiles", (238, 108, 146), "⚡ Express: 1–2 días hábiles")]


def clip(nombre, ini, fin, n):
    """n cuadros del pedazo [ini, fin] del clip, acelerado o frenado para que quepa justo"""
    vel = (fin - ini) / (n / FPS)
    vf = f"trim={ini}:{fin},setpts=(PTS-STARTPTS)/{vel},fps={FPS},scale={W}:{H}:flags=lanczos"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", os.path.join(AQUI, "clips", nombre + ".mp4"), "-vf", vf,
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last
    p.stdout.close(); p.wait()


def titulo(s, sz, color):  # texto grande con borde blanco para que se lea sobre el video
    return b.linea(s, "ExtraBold", sz, color, stroke=10, sfill=WHITE)


def escena_gancho(n, e):
    for f, L in enumerate(clip(*CLIPS[0], n)):
        t = f / FPS
        a = 1.0 if t < 4.2 else max(0.0, 1 - (t - 4.2) / 0.4)  # el título se va cuando ya entró la historia
        b.pon(L, titulo("La historia", 96, INK), W / 2, 250, 1, a)
        b.pon(L, titulo("de tu pedido 📦", 96, b.PINK), W / 2, 370, 1, a)
        yield L


def escena_paso(k, n, e, f0):
    num, nom, dias, color, extra = PASOS[k]; m = e["marcas"]
    b.SFX.append((f0 / FPS + 0.05, "pop")); b.SFX.append((f0 / FPS + m[0], "click"))
    if extra: b.SFX.append((f0 / FPS + m[1], "click"))
    if num == 5: b.SFX.append((f0 / FPS + 0.4, "glitter"))
    suave = b.mezcla(color, WHITE, 0.82)
    for f, L in enumerate(clip(*CLIPS[k + 1], n)):
        t = f / FPS
        b.pon(L, b.pastilla(f"Paso {num} de 5 · {nom}", "Bold", 44, WHITE, color), W / 2, 175, *b.entra(t, 0.0, 0.35))
        b.pon(L, b.pastilla("⏱ " + dias, "Bold", 52, color, WHITE), W / 2, 285, *b.entra(t, m[0]))
        if extra:
            b.pon(L, b.pastilla(extra, "Bold", 40, suave, b.mezcla(color, INK, 0.25)), W / 2, 1290, *b.entra(t, m[1]))
        yield L


def escena_total(n, e, f0):
    """cierre: el final de la entrega, desenfocado y con un velo rosita, con los tiempos totales encima"""
    m = e["marcas"]
    b.SFX.append((f0 / FPS + 0.05, "pop")); b.SFX.append((f0 / FPS + m[0], "click")); b.SFX.append((f0 / FPS + m[1], "click"))
    b.SFX.append((f0 / FPS + m[3], "glitter"))
    ult = next(clip("6-entrega", 14.9, 15.0, 1))
    for f in range(n):
        t = f / FPS; k = 1 + 0.06 * t / (n / FPS)  # acercamiento lento
        fondo = ult.resize((int(W * k), int(H * k)), Image.BILINEAR)
        fondo = fondo.crop(((fondo.width - W) // 2, (fondo.height - H) // 2, (fondo.width - W) // 2 + W, (fondo.height - H) // 2 + H))
        L = fondo.filter(ImageFilter.GaussianBlur(min(14, 4 + 30 * t))) if f < 20 else _borroso(fondo, f)
        L.alpha_composite(Image.new("RGBA", (W, H), (255, 240, 246, int(min(150, 300 * t)))))
        s_, al = b.entra(t, 0.0)
        b.pon(L, b.linea("¿Cuánto tarda", "ExtraBold", 104, INK), W / 2, 330, s_, al)
        b.pon(L, b.linea("en total? ⏱", "ExtraBold", 104, b.PINK), W / 2, 450, s_, al)
        b.pon(L, b.tarjeta("🚚", "Terrestre", "7–13 días hábiles", b.DEEP), W / 2, 680, *b.entra(t, m[0]))
        b.pon(L, b.tarjeta("⚡", "Express", "6–10 días hábiles", (74, 144, 226)), W / 2, 875, *b.entra(t, m[1]))
        _, al = b.entra(t, m[2], 0.3)
        b.pon(L, b.linea("Son tiempos estimados: pueden variar por", "SemiBold", 36, INK), W / 2, 1030, 1, al)
        b.pon(L, b.linea("días festivos, logística o paquetería.", "SemiBold", 36, INK), W / 2, 1082, 1, al)
        b.pon(L, b.pastilla("Nos vemos en alpacca.mx 💗", "ExtraBold", 58, b.PINK, WHITE), W / 2, 1290, *b.entra(t, m[3]))
        yield L

_cache = {}
def _borroso(fondo, f):  # el desenfoque pesado se recalcula cada 3 cuadros (el acercamiento es muy lento)
    if f // 3 not in _cache: _cache.clear(); _cache[f // 3] = fondo.filter(ImageFilter.GaussianBlur(14))
    return _cache[f // 3].copy()


def escenas():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    q = lambda s: int(round(s * FPS))
    n = [q(ini[j + 1]) - q(ini[j]) for j in range(len(T))]
    yield from escena_gancho(n[0], T[0])
    for k in range(5):
        yield from escena_paso(k, n[k + 1], T[k + 1], q(ini[k + 1]))
    yield from escena_total(n[6], T[6], q(ini[6]))


if __name__ == "__main__":
    b.SFX.clear()
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", OUT],
                         stdin=subprocess.PIPE)
    cnt = 0
    for fr in escenas():
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait(); print("ok", OUT, f"{cnt / FPS:.1f}s")
    voz = os.path.join(AQUI, "voz", "narracion.wav"); final = OUT.replace(".mp4", "-voz.mp4")
    GAN = {"click": 0.3, "glitter": 0.35, "pop": 0.35}
    ins, fil = ["-i", OUT, "-i", voz], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(b.SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume={GAN[s]}[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(b.SFX))) + f"amix=inputs={len(b.SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final)
