"""Arma el audio final (voz + música al ~13% + sonidos suaves) y datos.json con los tiempos de cada palabra.
Uso: python3 audio/prep.py voz/toma1"""
import json, os, subprocess, sys, wave
import numpy as np
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = sys.argv[1]; d = json.load(open(os.path.join(RAIZ, base + ".json"))); P = d["palabras"]
SR = 44100; OFF = 0.35; COLA = 2.8
PAUSAS = {21: 0.45, 28: 0.30, 42: 0.15}  # silencio extra después de esas palabras (para que las pantallas respiren)
def leer(ruta):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", ruta, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
voz = leer(os.path.join(RAIZ, base + ".mp3"))
# insertar silencios en medio de los huecos
cortes = []
for i, extra in sorted(PAUSAS.items()):
    medio = (P[i]["z"] + P[i + 1]["a"]) / 2; cortes.append((medio, extra))
trozos = []; prev = 0; corr = 0.0
for medio, extra in cortes:
    k = int(medio * SR); trozos += [voz[prev:k], np.zeros(int(extra * SR), np.float32)]; prev = k
trozos.append(voz[prev:]); voz = np.concatenate(trozos)
def mover(t):
    s = t
    for medio, extra in cortes:
        if t > medio: s += extra
    return s + OFF
palabras = [{"w": p["w"], "a": round(mover(p["a"]), 3), "z": round(mover(p["z"]), 3)} for p in P]
total = palabras[-1]["z"] + COLA
N = int(total * SR)
pista = np.zeros(N, np.float32); i0 = int(OFF * SR); pista[i0:i0 + len(voz)] = voz[:N - i0]
def lufs(x):
    tmp = "/tmp/_l.wav"; escribir(tmp, x)
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float([l for l in o.splitlines() if l.strip().startswith("I:")][-1].split()[1])
def escribir(ruta, x):
    x = np.clip(x, -1, 1)
    with wave.open(ruta, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
pista *= 10 ** ((-16 - lufs(pista)) / 20)
subprocess.run(["python3", os.path.join(RAIZ, "audio", "musica.py"), str(total)], cwd=os.path.join(RAIZ, "audio"), check=True)
mus = leer(os.path.join(RAIZ, "audio", "musica.wav"))[:N]
mus = np.pad(mus, (0, N - len(mus)))
mus *= 10 ** ((-16 - 17.5 - lufs(mus)) / 20)  # ~13% del volumen de la voz
# sonidos: «ding» del pedido y «pops» suaves de las tarjetas
def ding(t0, amp=0.18):
    t = np.arange(int(0.9 * SR)) / SR
    s = (np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 6) + 0.8 * np.sin(2 * np.pi * 1975.5 * (t - 0.11)) * np.exp(-np.maximum(0, t - 0.11) * 6) * (t > 0.11))
    i = int(t0 * SR); seg = s[:max(0, N - i)] * amp; sfx[i:i + len(seg)] += seg
def pop(t0, amp=0.07):
    t = np.arange(int(0.12 * SR)) / SR; f = 500 + 900 * np.exp(-t * 40)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)
    i = int(t0 * SR); seg = s[:max(0, N - i)] * amp; sfx[i:i + len(seg)] += seg
sfx = np.zeros(N, np.float32)
idx = {p["w"].strip("¡!¿?,.:…").lower() + str(k): k for k, p in enumerate(palabras)}
ding(palabras[26]["a"])  # «llega»
for k in (44, 49, 54, 57, 62, 67, 68, 70): pop(palabras[k]["a"] - 0.05)
mezcla = pista + mus + sfx
mezcla *= 10 ** ((-20 - lufs(mezcla)) / 20)
escribir("/tmp/_mezcla.wav", mezcla)
# volumen final para redes (-14 LUFS) con limitador de picos
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "/tmp/_mezcla.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2",
                os.path.join(RAIZ, "public", "audio", "mezcla.wav")], check=True)
mezcla = leer(os.path.join(RAIZ, "public", "audio", "mezcla.wav"))
json.dump({"fps": 30, "total": round(total, 3), "palabras": palabras}, open(os.path.join(RAIZ, "src", "datos.json"), "w"), ensure_ascii=False, indent=0)
print("total", round(total, 2), "s ·", "LUFS final", round(lufs(mezcla), 1))
