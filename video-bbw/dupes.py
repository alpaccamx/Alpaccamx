"""Video "Dupes de perfumes de lujo en Bath & Body Works": Mae sostiene cada mist en la tienda y arriba sale una
tarjeta pop-up con el perfume al que se parece (nombre y marca). Voz de Mae (python3 voz.py dupes antes).
1080x1920, 30 fps. Uso: python3 dupes.py CARPETA_DE_VIDEOS -> BBW-dupes-voz.mp4"""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter

W, H, FPS = 1080, 1920, 30
PINK, WHITE, INK, GREY = b.PINK, b.WHITE, b.INK, (120, 120, 128)
T = json.load(open(os.path.join(AQUI, "tiempos-dupes.json")))
OUT = os.path.join(AQUI, "BBW-dupes.mp4")

# por escena: las tomas (video, inicio, segundos o None = lo que falte, velocidad) y el dupe (mist, perfume, marca)
ESCENAS = [
    ([("4704", 11.0, 1.6, 2.2), ("4705", 87, 1.5, 1.3), ("4705", 222, 1.3, 1.3), ("4705", 105, None, 1.2)], None),
    ([("4705", 92.6, None, 0.8)], ("Pink Obsessed", "Donna Born in Roma", "Valentino")),
    ([("4705", 21.5, None, 0.95)], ("Gingham Gorgeous", "Miss Dior Blooming Bouquet", "Dior")),
    ([("4705", 29.8, None, 1.0)], ("Strawberry Pound Cake", "Very Good Girl", "Carolina Herrera")),
    ([("4705", 68.5, None, 1.0)], ("Into the Night", "Black Opium", "Yves Saint Laurent")),
    ([("4705", 188.0, None, 1.0)], ("Platinum", "Vanilla 28", "Kayali")),
    ([("4705", 58.8, None, 1.0)], ("In the Stars", "Sweet Like Candy", "Ariana Grande")),
    ([("4705", 228, 1.5, 1.0), ("4705", 198, 1.5, 1.3), ("4705", 99, 1.5, 1.2), ("4705", 162, 1.5, 1.2), ("4705", 216, None, 1.2)], None),
]


def video(vid, ini, n, vel):
    vf = f"setpts=PTS/{vel},fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"IMG_{vid}.MOV"), "-t", f"{n * vel / FPS + 0.3:.2f}",
                          "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


def tarjeta(perfume, marca):
    """tarjeta blanca: 'Dupe de' + perfume + marca"""
    fp = b.F("ExtraBold", 50)
    while fp.getlength(perfume) > 620: fp = b.F("ExtraBold", fp.size - 4)
    w = int(max(fp.getlength(perfume), b.F("SemiBold", 34).getlength(marca))) + 90
    card = Image.new("RGBA", (w + 60, 230 + 60))
    sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 40, w + 30, 270), 34, fill=120)
    card.putalpha(sh.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(card); d.rounded_rectangle((30, 30, w + 30, 260), 34, fill=WHITE)
    cx = 30 + w / 2
    d.text((cx, 78), "DUPE DE", font=b.F("Bold", 28), fill=PINK, anchor="mm")
    d.text((cx, 145), perfume, font=fp, fill=INK, anchor="mm")
    d.text((cx, 210), marca, font=b.F("SemiBold", 34), fill=GREY, anchor="mm")
    return card


def titulo(s, sz=70):
    while b.F("ExtraBold", sz).getlength(s) > 940: sz -= 4
    return b.linea(s, "ExtraBold", sz, WHITE, stroke=8, sfill=(20, 20, 20))


def cuadros():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    q = lambda s: int(round(s * FPS))
    for k, (tomas, dupe) in enumerate(ESCENAS):
        n_esc = q(ini[k + 1]) - q(ini[k]); m = T[k]["marcas"]; f = 0
        SFX.extend((ini[k] + max(0, x), "pop") for x in m)
        for j, (vid, s, dur, vel) in enumerate(tomas):
            n = n_esc - f if dur is None or j == len(tomas) - 1 else min(int(dur * FPS), n_esc - f)
            for i, L in zip(range(n), video(vid, s, n, vel)):
                t = (f + i) / FPS
                if k == 0:
                    b.pon(L, titulo("Dupes de perfumes de lujo"), W / 2, 560, *b.entra(t, 0, 0.35))
                    b.pon(L, titulo("en Bath & Body Works 💗", 62), W / 2, 650, *b.entra(t, 0.15, 0.35))
                    if t >= m[1]: b.pon(L, b.pastilla("$150 c/u", "ExtraBold", 110, PINK, WHITE, padx=50, pady=24), W / 2, 820, *b.entra(t, m[1], 0.4))
                elif dupe:
                    b.pon(L, titulo(dupe[0]), W / 2, 230, *b.entra(t, 0, 0.3))
                    if t >= m[1]: b.pon(L, tarjeta(dupe[1], dupe[2]), W / 2, 430, *b.entra(t, m[1], 0.4))
                else:
                    b.pon(L, b.pastilla("Todos a $150 c/u", "ExtraBold", 80, PINK, WHITE, padx=44, pady=20), W / 2, 600, *b.entra(t, 0, 0.4))
                    b.pon(L, b.pastilla("Mayoreo desde 1 pieza", "Bold", 52, WHITE, INK), W / 2, 760, *b.entra(t, 0.6, 0.35))
                    if t >= m[1]: b.pon(L, b.pastilla("Pídelos en alpacca.mx 🛍️", "ExtraBold", 60, PINK, WHITE), W / 2, 900, *b.entra(t, m[1], 0.4))
                yield L
            f += n


SFX = [(0.05, "glitter")]

if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in cuadros():
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait()
    final = OUT.replace(".mp4", "-voz.mp4")
    ins, fil = ["-i", OUT, "-i", os.path.join(AQUI, "voz-dupes", "narracion.wav")], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=0.3[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final, f"{cnt / FPS:.1f}s")
