"""Genera la voz con ElevenLabs (la clave la pone el proxy) y guarda audio + tiempos por palabra."""
import base64, json, os, sys, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__))
g = json.load(open(os.path.join(AQUI, "guion.json")))
nombre = sys.argv[1] if len(sys.argv) > 1 else "toma"
cuerpo = {"text": g["texto"], "model_id": g["model_id"], "voice_settings": g["voice_settings"]}
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{g['voice_id']}/with-timestamps?output_format=mp3_44100_192",
                             data=json.dumps(cuerpo).encode(), headers={"Content-Type": "application/json"})
r = json.load(urllib.request.urlopen(req, timeout=180))
open(os.path.join(AQUI, nombre + ".mp3"), "wb").write(base64.b64decode(r["audio_base64"]))
al = r["alignment"]; chars, ini, fin = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
palabras = []; cur = ""; t0 = None
for c, a, z in zip(chars, ini, fin):
    if c.isspace():
        if cur: palabras.append({"w": cur, "a": t0, "z": prev}); cur = ""
        continue
    if not cur: t0 = a
    cur += c; prev = z
if cur: palabras.append({"w": cur, "a": t0, "z": prev})
json.dump({"palabras": palabras, "dur": fin[-1]}, open(os.path.join(AQUI, nombre + ".json"), "w"), ensure_ascii=False, indent=0)
print(nombre, "dur", round(fin[-1], 2), "palabras", len(palabras))
