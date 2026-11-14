"""Arma video/src/datos.json para Remotion: inicio y duración de cada diapositiva (de tiempos-analisis.json), las
palabras con su tiempo (de la caché de ElevenLabs) para los subtítulos, y el momento en que aparece cada idea (cuando
la voz dice su palabra clave)."""
import hashlib, json, re, unicodedata

FPS = 30
VOZ = "uf7lwaqO0yghLWPq8lJ7"; INICIO = 0.6
T = json.load(open("tiempos-analisis.json"))
SEC = json.load(open("secciones.json"))
NAR = json.load(open("narracion-analisis.json"))

def norm(w): return unicodedata.normalize("NFD", w.lower()).encode("ascii", "ignore").decode().strip(".,:;¿?¡!«»\"'()")

# contenido de cada diapositiva: título, autor/enfoque, frase clave de la teoría, ideas de la maestra (texto, palabra clave)
DIAS = [
 dict(tipo="intro", titulo="Análisis posterior de la entrevista", autor="Psicología Educativa",
      frase="Objetivo: comprender sus prácticas desde la psicología, no diagnosticar.",
      ideas=[("Mtra. Laura (seudónimo) · 48 años", "identidad"), ("Lic. en Educación Preescolar · Maestría en Educación", "licenciada"),
             ("24 años de experiencia: 16 frente a grupo y 8 como directora", "lleva"), ("Jardín de niños público · Cd. Juárez", "jardin")]),
 dict(tipo="autor", titulo="Conductismo", autor="Aprendizaje por consecuencias (Skinner)", frase="Lo que se refuerza tiende a repetirse.",
      ideas=[("Reconocimiento verbal, sellos, caritas felices y tablero de estrellas", "reconocimiento"),
             ("«Tiempo para pensar» y consecuencias lógicas en lugar de castigos", "lugar"), ("Repetición con canciones y rutinas", "repeticion")]),
 dict(tipo="autor", titulo="Cognitivismo", autor="Procesamiento de la información", frase="Aprender es atender, guardar y recuperar la información.",
      ideas=[("Juegos de memoria y «Simón dice»", "juegos"), ("Adivinanzas y rompecabezas", "adivinanzas"), ("Preguntas después de los cuentos", "preguntas")]),
 dict(tipo="autor", titulo="Desarrollo cognoscitivo", autor="Jean Piaget · Teoría psicogenética",
      frase="Etapa preoperacional (2 a 7 años): el pensamiento depende de la acción y de lo que se percibe.",
      ideas=[("1°: egocéntricos y concretos; necesitan tocar y manipular", "egocentricos"), ("3°: clasifican, comparan y siguen instrucciones de varios pasos", "tercero"),
             ("Diagnóstico al inicio del ciclo y actividades cortas según la edad", "diagnostico")]),
 dict(tipo="autor", titulo="Interacción social", autor="Lev Vygotsky",
      frase="Zona de desarrollo próximo: lo que el niño logra con ayuda de alguien más capaz.",
      ideas=[("Los que ya dominan algo ayudan a sus compañeros", "aprovecha"), ("Apoya de cerca y retira la ayuda: andamiaje (Wood, Bruner y Ross)", "apoya"),
             ("El juego entre compañeros desarrolla lenguaje y convivencia", "reconoce")]),
 dict(tipo="autor", titulo="Aprendizaje significativo", autor="David Ausubel",
      frase="Lo que más influye en el aprendizaje es lo que el alumno ya sabe.",
      ideas=[("Inicia con experiencias previas: «¿Quién ha ido al mercado?»", "empieza"), ("«¿En qué trabajan tus papás?»", "trabajan"),
             ("Dramatizaciones como «la tiendita»", "dramatizaciones")]),
 dict(tipo="autor", titulo="Aprendizaje social", autor="Albert Bandura", frase="Aprendemos observando e imitando modelos.",
      ideas=[("Imitan a sus compañeros «lo bueno y lo malo»: cuidan los modelos", "imitan"), ("Un niño tímido participa porque su amigo lo anima", "timido"),
             ("Modelado y autoeficacia", "modelado")]),
 dict(tipo="autor", titulo="Inteligencias múltiples", autor="Howard Gardner",
      frase="No hay una sola inteligencia: musical, corporal, espacial, lingüística…",
      ideas=[("Facilidad para la música, el movimiento, el dibujo o armar cosas", "observa"),
             ("Un mismo tema: cantando, con cuento, en el patio y con manualidad", "cantando"), ("Más de una puerta de entrada al contenido", "puerta")]),
 dict(tipo="autor", titulo="Aprendizaje por descubrimiento", autor="Jerome Bruner · Constructivismo",
      frase="El niño construye el conocimiento explorando; el docente guía.",
      ideas=[("Experimentos: qué flota y qué se hunde, mezclar colores", "experimentos"), ("Antes pregunta: «¿Qué creen que va a pasar?»", "antes"),
             ("Se ve como guía, no como la que dicta", "describe")]),
 dict(tipo="autor", titulo="Estilos cognitivos", autor="Kagan · Witkin", frase="Diferencias en la forma de procesar la información.",
      ideas=[("Rápidos e impulsivos / lentos y reflexivos: reflexividad-impulsividad (Kagan)", "rapidos"), ("Detalles (analítico) / lo general (global)", "detalles"),
             ("Independientes / buscan aprobación: dependencia-independencia de campo (Witkin)", "independientes"),
             ("Combinar canales, no etiquetar a cada niño con uno", "precision")]),
 dict(tipo="autor", titulo="Motivación", autor="Deci y Ryan · Autodeterminación",
      frase="Necesidades básicas: sentirse capaz, tener autonomía y sentirse vinculado.",
      ideas=[("Caja sorpresa, títeres y canciones", "caja"), ("Los mueve el juego, sentirse queridos, retos alcanzables y la familia", "observa"),
             ("Extrínseca: sellos y estrellas · Intrínseca: juego, curiosidad, sentirse capaz", "distinguir")]),
 dict(tipo="autor", titulo="Contexto y retos", autor="Lo que rodea a los niños y a la escuela",
      frase="Canaliza a USAER, DIF o apoyo psicológico cuando hace falta.",
      ideas=[("Turnos largos en la maquila, abuelos cuidadores, divorcios, duelos, familias de otros estados", "muchos"),
             ("Experiencia buena con USAER y practicantes, pero apoyo limitado", "trabajado"),
             ("Retos: padres, grupos numerosos, carga administrativa, pandemia y pantallas", "retos"),
             ("Pide capacitación práctica y acompañamiento de especialistas", "pide")]),
 dict(tipo="propuestas", titulo="Propuestas de mejora", autor="Alternativas a partir del análisis", frase="",
      ideas=[("Familias: actividades de 10 minutos en casa y talleres en horarios flexibles o grabados", "primero"),
             ("De recompensas externas a motivación intrínseca: retirar sellos poco a poco, comentar el esfuerzo y dar opciones", "segundo"),
             ("Más apoyo psicológico: convenios con universidades y talleres socioemocionales", "tercero"),
             ("Grupos numerosos: rincones o estaciones y tutoría entre compañeros planeada", "cuarto")]),
 dict(tipo="conclusion", titulo="Conclusión", autor="La práctica de la maestra Laura integra varios enfoques", frase="Fortalecer: la relación con las familias y el apoyo especializado.",
      ideas=[("Refuerza conductas positivas", "refuerza"), ("Respeta el nivel de desarrollo", "respeta"), ("Aprovecha la interacción", "aprovecha"),
             ("Parte de lo que ya saben", "parte"), ("Varias formas de aprender", "ofrece"), ("Los deja descubrir", "deja")]),
]
assert len(DIAS) == len(SEC) == len(T)

ini_s = 0.0; out = []; palabras = []
for n, (d, t, fr) in enumerate(zip(DIAS, T, NAR)):
    k = hashlib.sha1(f"{VOZ}|eleven_v4|0.5|{fr['texto']}".encode()).hexdigest()[:12]
    a = json.load(open(f"voz/cache/{k}.json"))["alignment"]
    ch, st, en = a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]
    cut = max(0.0, st[0] - 0.03); off = INICIO if n == 0 else 0.0
    ws = []; pal = ""; t0 = None; t1 = None
    for c, s0, e0 in zip(ch + [" "], st + [st[-1]], en + [en[-1]]):
        if c.isspace():
            if pal: ws.append((pal, ini_s + off + t0 - cut, ini_s + off + t1 - cut))
            pal = ""; continue
        if not pal: t0 = s0
        pal += c; t1 = e0
    # en pantalla, las siglas como se escriben
    ws = [(w.replace("Usaer", "USAER").replace("Dif", "DIF"), a_, b_) for w, a_, b_ in ws]
    def cuando(clave):
        for w, a_, b_ in ws:
            if norm(w).startswith(clave): return a_
        raise SystemExit(f"no encontré «{clave}» en la sección {n + 1}")
    ideas = [dict(texto=tx, f=round((cuando(cl) - ini_s) * FPS)) for tx, cl in d["ideas"]]
    out.append(dict(n=n + 1, tipo=d["tipo"], titulo=d["titulo"], autor=d["autor"], frase=d["frase"], ideas=ideas,
                    desde=round(ini_s * FPS), dura=round(t["dur"] * FPS)))
    palabras += [dict(w=w, a=round(a_ * FPS), b=round(b_ * FPS)) for w, a_, b_ in ws]
    ini_s += t["dur"]

# subtítulos por renglones de hasta ~44 letras, cortando en puntuación
lineas = []; cur = []
for p in palabras:
    cur.append(p)
    largo = sum(len(x["w"]) + 1 for x in cur)
    if p["w"][-1] in ".,:;?!»" and largo > 18 or largo > 44:
        lineas.append(cur); cur = []
if cur: lineas.append(cur)
subs = []
for i, ln in enumerate(lineas):
    fin = lineas[i + 1][0]["a"] if i + 1 < len(lineas) else ln[-1]["b"] + 15
    fin = min(fin, ln[-1]["b"] + 45)  # en las pausas entre diapositivas no se queda colgado
    subs.append(dict(a=ln[0]["a"], b=fin, palabras=ln))
json.dump(dict(fps=FPS, total=round(ini_s * FPS), dias=out, subs=subs), open("video/src/datos.json", "w"), ensure_ascii=False)
print("diapositivas", len(out), "renglones", len(subs), "duración", round(ini_s, 1), "s")
for d in out: print(d["n"], d["titulo"], d["desde"], d["dura"], [i["f"] for i in d["ideas"]])
