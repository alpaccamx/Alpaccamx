# Video Sephora Sale (Alpacca) — agregar voz

- `SephoraSale-Alpacca.mp4`: video actual, sin audio (37 s, 9 escenas).
- `build.py`: lo genera. Fuentes en `../fonts/` (Poppins). Necesita Pillow e imageio-ffmpeg.
- `narracion.json`: el texto que dice Mae en cada una de las 9 escenas.
- `timings.json` (opcional): 10 números = segundo en que empieza cada escena + final.
  Si existe, `build.py` lo usa en vez de los tiempos por defecto.

Para agregar voz: generar cada frase con ElevenLabs (voz BSKpxzmNBPkRKNFMmKrv),
armar el audio con una pausa corta entre frases, calcular el inicio de cada escena
para que coincida con su frase, escribir `timings.json`, correr
`python3 build.py SephoraSale-Alpacca-voz-sinaudio.mp4` y mezclar el audio con ffmpeg.
