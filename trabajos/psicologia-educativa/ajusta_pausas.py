"""Acorta las pausas de la voz sin acelerarla: dentro de cada frase, los silencios de más de TOPE segundos se dejan en
TOPE (se quita la parte de en medio), y entre secciones va una pausa corta. Escribe voz-analisis/narracion-corta.wav y
tiempos-corta.json (duración de cada sección y los recortes, para mover los tiempos de las palabras)."""
import json, subprocess, wave
import numpy as np

TOPE, INICIO, PAUSA, COLA = 0.26, 0.3, 0.4, 0.8
SR = 44100
secciones = []; partes = []

def lee(f):
    w = wave.open(f); assert w.getframerate() == SR and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), np.int16)

def silencio(seg): return np.zeros(int(round(seg * SR)), np.int16)

n_frases = len(json.load(open("narracion-analisis.json")))
for n in range(1, n_frases + 1):
    x = lee(f"voz-analisis/frase{n:02d}.wav"); xf = x.astype(float) / 32768
    hop = int(SR * 0.01)
    rms = np.sqrt(np.convolve(xf ** 2, np.ones(hop) / hop, "same"))[::hop]
    sil = 20 * np.log10(rms + 1e-9) < -42
    cortes = []  # (inicio del pedazo quitado en s, segundos quitados), en el tiempo original de la frase
    i = 0
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]: j += 1
            d = (j - i) * 0.01
            if d > TOPE and i > 0 and j < len(sil):  # solo pausas entre palabras (no el principio ni el final)
                quita = d - TOPE; a = i * 0.01 + TOPE / 2
                cortes.append((round(a, 3), round(quita, 3)))
            i = j
        else: i += 1
    keep = []; ult = 0
    for a, q in cortes:
        keep.append(x[int(ult * SR):int(a * SR)]); ult = a + q
    keep.append(x[int(ult * SR):])
    y = np.concatenate(keep)
    voz = len(y) / SR
    dur = voz + (PAUSA if n < n_frases else COLA) + (INICIO if n == 1 else 0)
    secciones.append(dict(dur=round(dur, 3), cortes=cortes, voz_original=round(len(x) / SR, 3)))
    if n == 1: partes.append(silencio(INICIO))
    partes.append(y); partes.append(silencio(PAUSA if n < n_frases else COLA))

z = np.concatenate(partes)
with wave.open("voz-analisis/narracion-corta.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(z.tobytes())
json.dump(dict(inicio=INICIO, secciones=secciones), open("tiempos-corta.json", "w"), indent=1)
tot = len(z) / SR
print(f"total {tot:.1f} s = {int(tot // 60)}:{tot % 60:04.1f}  (antes 516.7 s)")
