"""Junta las capturas de graba.js en grabacion/pantalla.mp4 a 30 fps exactos: para cada cuadro del video toma la
captura más cercana en el tiempo (grabacion/cuadros.txt trae la duración de cada una). Con el demuxer concat de
ffmpeg los tiempos se redondeaban a 1/25 s y al pasar a 30 fps se repetía un cuadro de cada seis (se veía trabado).
Uso: python3 juntar.py"""
import os, re, subprocess, bisect

AQUI = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(AQUI, "grabacion")
txt = open(os.path.join(G, "cuadros.txt")).read()
archivos = re.findall(r"file '([^']+)'\nduration", txt)
dur = [float(x) for x in re.findall(r"duration ([\d.]+)", txt)]
t, ini = 0.0, []
for d in dur: ini.append(t); t += d
fin, FPS = t, 30
# la captura i se ve desde ini[i]; el centro de su tramo es ini[i] + dur[i]/2
centro = [a + d / 2 for a, d in zip(ini, dur)]
p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
                      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium",
                      "-r", str(FPS), os.path.join(G, "pantalla.mp4")], stdin=subprocess.PIPE)
n = int(fin * FPS); usados = set()
for k in range(n):
    tk = k / FPS
    j = bisect.bisect_left(centro, tk)
    if j > 0 and (j == len(centro) or tk - centro[j - 1] < centro[j] - tk): j -= 1
    usados.add(j)
    p.stdin.write(open(os.path.join(G, archivos[j]), "rb").read())
p.stdin.close(); p.wait()
print("pantalla.mp4", n, "cuadros de", len(archivos), "capturas")
