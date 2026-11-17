"""Voz de Mae («Mae v4», como en los videos pasados) con tiempos por palabra; marca a qué línea del guion pertenece cada palabra."""
import base64, json, os, sys, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__))
g = json.load(open(os.path.join(AQUI, "guion.json"))); nombre = sys.argv[1]
texto = " ".join(g["lineas"])
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{g['voice_id']}/with-timestamps?output_format=mp3_44100_192",
                             data=json.dumps({"text": texto, "model_id": g["model_id"], "voice_settings": g["voice_settings"]}).encode(), headers={"Content-Type": "application/json"})
r = json.load(urllib.request.urlopen(req, timeout=240))
open(os.path.join(AQUI, nombre + ".mp3"), "wb").write(base64.b64decode(r["audio_base64"]))
al = r["alignment"]; pal = []; cur = ""
for c, a, z in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
    if c.isspace():
        if cur: pal.append({"w": cur, "a": t0, "z": prev}); cur = ""
        continue
    if not cur: t0 = a
    cur += c; prev = z
if cur: pal.append({"w": cur, "a": t0, "z": prev})
i = 0
for k, l in enumerate(g["lineas"]):
    for _ in l.split(): pal[i]["l"] = k; i += 1
assert i == len(pal), (i, len(pal))
json.dump({"palabras": pal, "dur": al["character_end_times_seconds"][-1]}, open(os.path.join(AQUI, nombre + ".json"), "w"), ensure_ascii=False, indent=0)
print(nombre, "dur", round(al["character_end_times_seconds"][-1], 2), "palabras", len(pal))
