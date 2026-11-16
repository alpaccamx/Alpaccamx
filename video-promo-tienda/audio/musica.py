"""Música de fondo original (generada aquí, sin samples ni derechos de terceros):
pop suave en Fa mayor, 104 bpm, piano eléctrico + pad + bajo + percusión ligera."""
import numpy as np, sys, wave
SR = 44100; BPM = 104; BEAT = 60 / BPM; BAR = 4 * BEAT
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 40.0
N = int(DUR * SR); t_all = np.arange(N) / SR
rng = np.random.default_rng(7)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
out_ep, out_pad, out_bass, out_drm = (np.zeros(N) for _ in range(4))
def add(buf, start, sig):
    i = int(start * SR)
    if i >= N: return
    sig = sig[:N - i]; buf[i:i + len(sig)] += sig
def ep(m, dur=0.9, vel=1.0):
    t = np.arange(int(dur * SR)) / SR; f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 9)
    env = (1 - np.exp(-t * 400)) * np.exp(-t * 3.2)
    return vel * s * env
def pad(ms, dur):
    t = np.arange(int(dur * SR)) / SR; s = np.zeros_like(t)
    for m in ms:
        for d in (-0.08, 0, 0.08):
            s += np.sin(2 * np.pi * hz(m + d) * t + rng.uniform(0, 6))
    env = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.6)
    return s * env / (3 * len(ms))
def bass(m, dur):
    t = np.arange(int(dur * SR)) / SR; f = hz(m)
    s = np.tanh(1.6 * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)))
    return s * (1 - np.exp(-t * 200)) * np.exp(-t * 2.5)
def kick():
    t = np.arange(int(0.35 * SR)) / SR; f = 50 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
def snap():
    t = np.arange(int(0.18 * SR)) / SR; n = rng.standard_normal(len(t))
    n = np.diff(np.concatenate([[0], n]))  # brillante
    return n * np.exp(-t * 28) * 0.5
def shaker():
    t = np.arange(int(0.08 * SR)) / SR; n = np.diff(np.concatenate([[0], rng.standard_normal(len(t))]))
    return n * np.exp(-t * 60) * (1 - np.exp(-t * 300))
# Fa – Rem – Sib – Do
acordes = [(53, [65, 69, 72, 77]), (50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (48, [64, 67, 72, 76])]
patron = [0, 2, 1, 3, 2, 1, 3, 2]  # arpegio en octavos
nbar = int(np.ceil(DUR / BAR))
for b in range(nbar):
    raiz, notas = acordes[b % 4]; t0 = b * BAR
    add(out_pad, t0, pad(notas[:3], BAR + 0.3))
    for k, idx in enumerate(patron):
        vel = 0.9 if k % 2 == 0 else 0.6
        add(out_ep, t0 + k * BEAT / 2, ep(notas[idx] + (12 if (b % 2 and k == 6) else 0), 0.9, vel))
    add(out_bass, t0, bass(raiz - 12, BEAT * 1.4)); add(out_bass, t0 + 1.5 * BEAT, bass(raiz - 12, BEAT * 0.9) * 0.7); add(out_bass, t0 + 3 * BEAT, bass(raiz, BEAT * 0.8) * 0.6)
    if b >= 1:
        for k in (0, 2): add(out_drm, t0 + k * BEAT, kick() * 0.9)
        for k in (1, 3): add(out_drm, t0 + k * BEAT, snap() * 0.45)
        for k in range(16): add(out_drm, t0 + k * BEAT / 4, shaker() * (0.18 if k % 2 == 0 else 0.1))
mezcla = 0.55 * out_ep + 0.45 * out_pad + 0.5 * out_bass + 0.6 * out_drm
# reverb sencilla
ir_t = np.arange(int(1.2 * SR)) / SR; ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 4.5); ir /= np.sqrt((ir ** 2).sum())
from numpy.fft import rfft, irfft
L = len(mezcla) + len(ir); n2 = 1 << (L - 1).bit_length()
rev = irfft(rfft(mezcla, n2) * rfft(ir, n2), n2)[:len(mezcla)]
mezcla = mezcla + 0.25 * rev
# entrada y salida suaves
fade = np.minimum(1, t_all / 0.8) * np.minimum(1, (DUR - t_all) / 2.5)
mezcla *= fade
mezcla = mezcla / np.max(np.abs(mezcla)) * 0.8
est = np.stack([mezcla, mezcla], 1)
with wave.open("musica.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((est * 32767).astype(np.int16).tobytes())
print("ok", DUR)
