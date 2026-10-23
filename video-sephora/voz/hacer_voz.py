"""Voz de Mae para el video Sephora Sale: genera las 9 frases con ElevenLabs,
las junta con una pausa, escribe sephora/timings.json, corre build.py y mezcla."""
import json, os, subprocess, sys, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
SEP = os.path.join(os.path.dirname(AQUI), "sephora")
VOZ = "BSKpxzmNBPkRKNFMmKrv"
PAUSA = 0.35     # segundos de silencio entre frases
INICIO = 0.3     # respiro antes de la primera frase
COLA = 1.2       # la última escena se queda un poco después de "Soy Mae, de Alpacca."


def tts(texto, ruta):
    if os.path.exists(ruta): return
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOZ}?output_format=mp3_44100_128",
        data=json.dumps({"text": texto, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r, open(ruta, "wb") as f: f.write(r.read())


def a_wav(mp3, wav):  # quita silencio de inicio y final para que la pausa sea pareja
    filtro = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-af", filtro, "-ar", "44100", "-ac", "1", wav], check=True)


def duracion(ruta):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", ruta]))


def silencio(seg, ruta):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", f"{seg:.3f}", ruta], check=True)


frases = json.load(open(os.path.join(SEP, "narracion.json")))
assert len(frases) == 9
partes, T, t = [], [], 0.0
silencio(INICIO, f"{AQUI}/sil_ini.wav"); silencio(PAUSA, f"{AQUI}/sil.wav"); silencio(COLA, f"{AQUI}/sil_fin.wav")
partes.append(f"{AQUI}/sil_ini.wav")
for i, frase in enumerate(frases, 1):
    tts(frase, f"{AQUI}/frase{i}.mp3"); a_wav(f"{AQUI}/frase{i}.mp3", f"{AQUI}/frase{i}.wav")
    T.append(0.0 if i == 1 else round(t, 3))   # la escena empieza cuando empieza su frase
    if i == 1: t = INICIO
    t += duracion(f"{AQUI}/frase{i}.wav"); partes.append(f"{AQUI}/frase{i}.wav")
    if i < 9: t += PAUSA; partes.append(f"{AQUI}/sil.wav")
    print(f"{i}: {T[-1]:6.2f}s  {frase}")
partes.append(f"{AQUI}/sil_fin.wav"); T.append(round(t + COLA, 3))
json.dump(T, open(os.path.join(SEP, "timings.json"), "w")); print("timings:", T)

with open(f"{AQUI}/lista.txt", "w") as f: f.writelines(f"file '{p}'\n" for p in partes)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{AQUI}/lista.txt", f"{AQUI}/narracion.wav"], check=True)

mudo = os.path.join(SEP, "SephoraSale-Alpacca-voz-sinaudio.mp4")
subprocess.run([sys.executable, os.path.join(SEP, "build.py"), mudo], check=True)
final = os.path.join(SEP, "SephoraSale-Alpacca-voz.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mudo, "-i", f"{AQUI}/narracion.wav", "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
print("ok", final)
