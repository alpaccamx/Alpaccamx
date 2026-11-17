"""Audio final (voz + música original al ~13% + sonidos suaves) y src/datos.json con los tiempos reales.
Uso: python3 audio/prep.py voz/toma1"""
import json, os, subprocess, sys, wave
import numpy as np
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = sys.argv[1]; d = json.load(open(os.path.join(RAIZ, base + ".json"))); P = d["palabras"]
SR = 44100; OFF = 0.4; COLA = 2.6
def leer(ruta):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", ruta, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def escribir(ruta, x):
    with wave.open(ruta, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
def lufs(x):
    escribir("/tmp/_l.wav", x)
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", "/tmp/_l.wav", "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float([l for l in o.splitlines() if l.strip().startswith("I:")][-1].split()[1])
voz = leer(os.path.join(RAIZ, base + ".mp3"))
pal = [{"w": p["w"], "a": round(p["a"] + OFF, 3), "z": round(p["z"] + OFF, 3), "l": p["l"]} for p in P]
nl = max(p["l"] for p in pal) + 1
lineas = [{"a": min(p["a"] for p in pal if p["l"] == k), "z": max(p["z"] for p in pal if p["l"] == k)} for k in range(nl)]
total = pal[-1]["z"] + COLA; N = int(total * SR)
pista = np.zeros(N, np.float32); i0 = int(OFF * SR); pista[i0:i0 + len(voz)] = voz[:N - i0]
pista *= 10 ** ((-16 - lufs(pista)) / 20)
subprocess.run(["python3", os.path.join(RAIZ, "audio", "musica.py"), str(total)], cwd=os.path.join(RAIZ, "audio"), check=True)
mus = leer(os.path.join(RAIZ, "audio", "musica.wav"))[:N]; mus = np.pad(mus, (0, N - len(mus)))
mus *= 10 ** ((-16 - 17.5 - lufs(mus)) / 20)
sfx = np.zeros(N, np.float32)
def pop(t0, amp=0.06, f0=500):
    t = np.arange(int(0.12 * SR)) / SR; f = f0 + 900 * np.exp(-t * 40)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35); i = int(t0 * SR); seg = s[:max(0, N - i)] * amp; sfx[i:i + len(seg)] += seg
def ding(t0, amp=0.15):
    t = np.arange(int(0.9 * SR)) / SR
    s = np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 6) + 0.8 * np.sin(2 * np.pi * 1975.5 * (t - 0.11)) * np.exp(-np.maximum(0, t - 0.11) * 6) * (t > 0.11)
    i = int(t0 * SR); seg = s[:max(0, N - i)] * amp; sfx[i:i + len(seg)] += seg
for k in range(7): pop(0.15 + k * 0.5, 0.05, 700)  # mensajes del gancho (mismos tiempos que en Panel.tsx)
json.dump({"fps": 30, "total": round(total, 3), "lineas": lineas, "palabras": pal}, open(os.path.join(RAIZ, "src", "datos.json"), "w"), ensure_ascii=False, indent=0)
# «ding» cuando se confirma el pago: se calcula con los mismos planos del video (toque en el seg. 20.4 de la grabación)
L = lineas
a4, z4 = L[4]["a"] - 0.1, L[4]["a"] + (L[4]["z"] - L[4]["a"]) * 0.45
dur = z4 - a4; hasta = min(20.97, 17.0 + dur * 2.2)
t_toque = a4 + (20.4 - 17.0) / (hasta - 17.0) * dur
if 20.4 <= hasta: ding(t_toque + 0.05)
mezcla = pista + mus + sfx
mezcla *= 10 ** ((-20 - lufs(mezcla)) / 20); escribir("/tmp/_m.wav", mezcla)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "/tmp/_m.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2",
                os.path.join(RAIZ, "public", "audio", "mezcla.wav")], check=True)
print("total", round(total, 2), "s · toque «Ya me pagó» en", round(t_toque, 2), "s")
