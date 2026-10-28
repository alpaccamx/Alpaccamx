"""Voz de Mae para los videos del Sephora Sale: genera las frases de narracion-SUF.json con ElevenLabs
(con tiempos por letra), las junta con una pausa y escribe tiempos-SUF.json para que build.py ponga
cada escena y cada texto cuando se dice. Uso: python3 voz.py anuncio|emprende|empaque|top"""
import base64, hashlib, json, os, re, shutil, subprocess, sys, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
SUF = ("-" + sys.argv[1]) if len(sys.argv) > 1 else ""  # p. ej. "python3 voz.py corto" usa narracion-corto.json
VOZ_DIR = os.path.join(AQUI, "voz" + SUF)
VOZ = "uf7lwaqO0yghLWPq8lJ7"  # "Mae v4": clon instantáneo con la grabación de Mae hablando como en sus videos (la que eligió)
# v4 con la voz "Mae v4" en modo natural (la muestra E que eligió Mae); las etiquetas de tono ([warm]...) no se leen
MODELO, ESTABILIDAD = "eleven_v4", 0.5
INICIO, PAUSA, COLA = 0.25, 0.28, 1.6
VEL = 1.0  # a su velocidad natural
SR = 44100


def clave(texto):  # las frases ya generadas se guardan por su texto: solo se piden a ElevenLabs las nuevas
    return hashlib.sha1(f"{VOZ}|{MODELO}|{ESTABILIDAD}|{texto}".encode()).hexdigest()[:12]


def tts(texto, n):
    os.makedirs(os.path.join(AQUI, "voz", "cache"), exist_ok=True)
    k = os.path.join(AQUI, "voz", "cache", clave(texto))
    if not os.path.exists(k + ".json"):
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOZ}/with-timestamps?output_format=mp3_44100_128",
            data=json.dumps({"text": texto, "model_id": MODELO, "voice_settings": {"stability": ESTABILIDAD}}).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req) as r: d = json.load(r)
        open(k + ".mp3", "wb").write(base64.b64decode(d.pop("audio_base64")))
        json.dump(d, open(k + ".json", "w"), ensure_ascii=False)
    shutil.copy(k + ".mp3", os.path.join(VOZ_DIR, f"frase{n:02d}.mp3"))
    return json.load(open(k + ".json"))


def cortar(n, ini, fin):  # solo la parte con voz, en wav
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(VOZ_DIR, f"frase{n:02d}.mp3"), "-ss", f"{ini:.3f}", "-to", f"{fin:.3f}",
                    "-af", f"atempo={VEL}", "-ar", str(SR), "-ac", "1", os.path.join(VOZ_DIR, f"frase{n:02d}.wav")], check=True)


def silencio(seg, ruta):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{seg:.3f}", ruta], check=True)


os.makedirs(VOZ_DIR, exist_ok=True)
frases = json.load(open(os.path.join(AQUI, f"narracion{SUF}.json")))
escenas, partes = [], []
silencio(INICIO, os.path.join(VOZ_DIR, "sil_ini.wav")); silencio(PAUSA, os.path.join(VOZ_DIR, "sil.wav"))
silencio(COLA, os.path.join(VOZ_DIR, "sil_fin.wav"))
partes.append("sil_ini.wav")
for n, f in enumerate(frases, 1):
    d = tts(f["texto"], n)["alignment"]
    chars, st, en = d["characters"], d["character_start_times_seconds"], d["character_end_times_seconds"]
    ini, fin = max(0.0, st[0] - 0.03), en[-1] + 0.08
    cortar(n, ini, fin)
    voz = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                         os.path.join(VOZ_DIR, f"frase{n:02d}.wav")]))
    esc = {"dur": voz + (PAUSA if n < len(frases) else COLA)}
    if n == 1: esc["dur"] += INICIO
    off = INICIO if n == 1 else 0.0
    texto = "".join(chars)
    # captura de Ulta: cuando empieza el primer precio; la de Alpacca: en "Conmigo"/"contra"
    if "ulta_en" in f:
        esc["ulta"] = round(off + (st[texto.index(f["ulta_en"])] - ini) / VEL - 0.12, 3)
        esc["alp"] = round(off + (st[texto.index(f["alp_en"])] - ini) / VEL - 0.12, 3)
    if "marcas" in f:  # momentos en que se dicen ciertas palabras (para que algo aparezca justo ahí)
        esc["marcas"] = [round(off + (st[texto.index(m)] - ini) / VEL - 0.1, 3) for m in f["marcas"]]
    escenas.append({k: (round(v, 3) if not isinstance(v, list) else v) for k, v in esc.items()})
    partes += [f"frase{n:02d}.wav"] + (["sil.wav"] if n < len(frases) else ["sil_fin.wav"])
    print(n, escenas[-1], f["texto"])

with open(os.path.join(VOZ_DIR, "lista.txt"), "w") as fh: fh.writelines(f"file '{p}'\n" for p in partes)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(VOZ_DIR, "lista.txt"),
                os.path.join(VOZ_DIR, "narracion.wav")], check=True)
json.dump(escenas, open(os.path.join(AQUI, f"tiempos{SUF}.json"), "w"), indent=1)
print("total", round(sum(e["dur"] for e in escenas), 2), "s")
