"""Arma video/src/datos.json para Remotion: inicio y duración de cada diapositiva (de tiempos-analisis.json), las
palabras con su tiempo (de la caché de ElevenLabs) para los subtítulos, y el momento en que aparece cada idea (cuando
la voz dice su palabra clave)."""
import hashlib, json, re, unicodedata

FPS = 30
VOZ = "uf7lwaqO0yghLWPq8lJ7"
# voz con las pausas acortadas (ajusta_pausas.py): duración de cada sección y los recortes de silencio de cada frase
CORTA = json.load(open("tiempos-corta.json")); INICIO = CORTA["inicio"]
T = CORTA["secciones"]
def mueve(t, cortes):
    """tiempo dentro de la frase original -> tiempo en la frase con las pausas acortadas"""
    q = 0.0
    for a, d in cortes:
        if t >= a + d: q += d
        elif t > a: q += t - a
    return t - q
SEC = json.load(open("secciones.json"))
NAR = json.load(open("narracion-analisis.json"))

def norm(w): return unicodedata.normalize("NFD", w.lower()).encode("ascii", "ignore").decode().strip(".,:;¿?¡!«»\"'()")

# contenido de cada diapositiva: título, autor/enfoque, frase clave de la teoría, ideas de la maestra (texto, palabra clave)
DIAS = [
 dict(tipo="intro", titulo="Análisis posterior de la entrevista", autor="Psicología Educativa",
      frase="Objetivo: comprender sus prácticas desde la psicología, no diagnosticar.",
      ideas=[("Mtra. Laura (seudónimo) · 48 años", "identidad"), ("Lic. en Educación Preescolar · Maestría en Educación", "licenciada"),
             ("24 años de experiencia: 16 frente a grupo y 8 como directora", "lleva"), ("Jardín de niños público · Cd. Juárez", "jardin")]),
 dict(tipo="autor", titulo="B. F. Skinner – Conductismo", autor="Aprendizaje por consecuencias", frase="Lo que se refuerza tiende a repetirse.",
      ideas=[("Reconocimiento verbal, sellos, caritas felices y tablero de estrellas", "reconocimiento"),
             ("«Tiempo para pensar» y consecuencias lógicas en lugar de castigos", "lugar"), ("Repetición con canciones y rutinas", "repeticion")]),
 dict(tipo="autor", titulo="Cognitivismo – Procesamiento de la información", autor="Atención, memoria y recuperación", frase="Aprender es atender, guardar y recuperar la información.",
      ideas=[("Juegos de memoria y «Simón dice»", "juegos"), ("Adivinanzas y rompecabezas", "adivinanzas"), ("Preguntas después de los cuentos", "preguntas")]),
 dict(tipo="autor", titulo="Jean Piaget – Desarrollo cognoscitivo", autor="Teoría psicogenética",
      frase="Etapa preoperacional (2 a 7 años): el pensamiento depende de la acción y de lo que se percibe.",
      ideas=[("1°: egocéntricos y concretos; necesitan tocar y manipular", "egocentricos"), ("3°: clasifican, comparan y siguen instrucciones de varios pasos", "tercero"),
             ("Diagnóstico al inicio del ciclo y actividades cortas según la edad", "diagnostico")]),
 dict(tipo="autor", titulo="Lev Vygotsky – Interacción social", autor="Zona de desarrollo próximo y andamiaje",
      frase="Zona de desarrollo próximo: lo que el niño logra con ayuda de alguien más capaz.",
      ideas=[("Los que ya dominan algo ayudan a sus compañeros", "aprovecha"), ("Apoya de cerca y retira la ayuda: andamiaje (Wood, Bruner y Ross)", "apoya"),
             ("El juego entre compañeros desarrolla lenguaje y convivencia", "reconoce")]),
 dict(tipo="autor", titulo="David Ausubel – Aprendizaje significativo", autor="Conocimientos previos",
      frase="Lo que más influye en el aprendizaje es lo que el alumno ya sabe.",
      ideas=[("Inicia con experiencias previas: «¿Quién ha ido al mercado?»", "empieza"), ("«¿En qué trabajan tus papás?»", "trabajan"),
             ("Dramatizaciones como «la tiendita»", "dramatizaciones")]),
 dict(tipo="autor", titulo="Albert Bandura – Aprendizaje social", autor="Modelado, imitación y autoeficacia", frase="Aprendemos observando e imitando modelos.",
      ideas=[("Imitan a sus compañeros «lo bueno y lo malo»: cuidan los modelos", "imitan"), ("Un niño tímido participa porque su amigo lo anima", "timido"),
             ("Modelado y autoeficacia", "modelado")]),
 dict(tipo="autor", titulo="Howard Gardner – Inteligencias múltiples", autor="Distintas formas de aprender",
      frase="No hay una sola inteligencia: musical, corporal, espacial, lingüística…",
      ideas=[("Facilidad para la música, el movimiento, el dibujo o armar cosas", "observa"),
             ("Un mismo tema: cantando, con cuento, en el patio y con manualidad", "cantando"), ("Más de una puerta de entrada al contenido", "puerta")]),
 dict(tipo="autor", titulo="Jerome Bruner – Aprendizaje por descubrimiento", autor="Constructivismo",
      frase="El niño construye el conocimiento explorando; el docente guía.",
      ideas=[("Experimentos: qué flota y qué se hunde, mezclar colores", "experimentos"), ("Antes pregunta: «¿Qué creen que va a pasar?»", "antes"),
             ("Se ve como guía, no como la que dicta", "describe")]),
 dict(tipo="autor", titulo="Kagan y Witkin – Estilos cognitivos", autor="Diferencias al procesar la información", frase="Diferencias en la forma de procesar la información.",
      ideas=[("Rápidos e impulsivos / lentos y reflexivos: reflexividad-impulsividad (Kagan)", "rapidos"), ("Detalles (analítico) / lo general (global)", "detalles"),
             ("Independientes / buscan aprobación: dependencia-independencia de campo (Witkin)", "independientes"),
             ("Combinar canales, no etiquetar a cada niño con uno", "precision")]),
 dict(tipo="autor", titulo="Deci y Ryan – Motivación", autor="Teoría de la autodeterminación",
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
            if pal: ws.append((pal, ini_s + off + mueve(t0 - cut, t["cortes"]), ini_s + off + mueve(t1 - cut, t["cortes"])))
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
                    desde=round(ini_s * FPS), dura=round((ini_s + t["dur"]) * FPS) - round(ini_s * FPS)))
    palabras += [dict(w=w, a=round(a_ * FPS), b=round(b_ * FPS)) for w, a_, b_ in ws]
    ini_s += t["dur"]

# subtítulos: nunca juntan dos secciones; se cortan en comas o puntos, y si un renglón es largo, en un lugar donde no
# quede colgada una palabra como «a», «de», «la», «se» o «ni»
DEBIL = {"a", "de", "la", "el", "los", "las", "lo", "le", "se", "ni", "y", "o", "e", "en", "con", "por", "para", "que",
         "un", "una", "unos", "su", "sus", "del", "al", "como", "mas", "muy", "no", "tu", "tus", "mi", "sin", "es", "son",
         "entre", "sobre", "hacia", "desde", "cuando", "pero", "porque", "donde", "otros", "otras", "cada", "ya", "ha",
         "lo", "les", "nos", "me", "te", "hace", "va", "esta", "este", "esa", "ese", "ella", "eso", "muchos",
         "voy", "hay", "estos", "estas", "casi", "sentirse", "puede", "pide", "trabajan", "planear", "muy"}
MAX = 46
def corta_clausula(ws):
    """parte una cláusula (sin puntuación adentro) en renglones de hasta MAX letras sin dejar palabras débiles al final"""
    out = []
    while sum(len(w["w"]) + 1 for w in ws) > MAX:
        mejor = None
        for k in range(1, len(ws)):
            largo = sum(len(w["w"]) + 1 for w in ws[:k])
            if largo > MAX: break
            if norm(ws[k - 1]["w"]) in DEBIL: continue
            resto = sum(len(w["w"]) + 1 for w in ws[k:])
            costo = abs(largo - resto) if resto <= MAX else MAX - largo  # parejos, o el primero lo más largo posible
            if norm(ws[k]["w"]) in ("publico", "timido", "concreto"): costo += 40  # no separar el adjetivo de su sustantivo
            if norm(ws[k]["w"]) in ("de", "del", "e"): costo += 25  # no separar «zona / de desarrollo», «dependencia / e independencia»
            if ws[k - 1]["w"][:1].isupper() and k >= 2 and not ws[k - 2]["w"][-1] in ".:": costo += 60  # ni nombres propios
            if mejor is None or costo <= mejor[0]: mejor = (costo, k)
        k = mejor[1] if mejor else max(1, len(ws) // 2)
        out.append(ws[:k]); ws = ws[k:]
    if ws: out.append(ws)
    return out

subs = []
for d in out:
    a0, a1 = d["desde"], d["desde"] + d["dura"]
    ws = [p for p in palabras if a0 <= p["a"] < a1]
    # cláusulas: cortes en , . : ; ? ! »
    claus = []; cur = []
    for p in ws:
        cur.append(p)
        if p["w"][-1] in ".,:;?!»": claus.append(cur); cur = []
    if cur: claus.append(cur)
    # juntar cláusulas cortas en un renglón si caben
    lineas = []
    # una lista de nombres separada por coma («Wood, Bruner y Ross») va junta
    jun = []
    for c in claus:
        if jun and jun[-1][-1]["w"].endswith(",") and jun[-1][-1]["w"][:1].isupper() and c[0]["w"][:1].isupper():
            jun[-1] = jun[-1] + c
        else: jun.append(c)
    claus = jun
    for c in claus:
        if lineas and sum(len(w["w"]) + 1 for w in lineas[-1] + c) <= MAX and lineas[-1][-1]["w"][-1] in ",":
            lineas[-1] = lineas[-1] + c
        else:
            lineas += corta_clausula(c)
    for k, ln in enumerate(lineas):
        ini = a0 + 2 if k == 0 else ln[0]["a"]  # la primera entra con la diapositiva
        fin = lineas[k + 1][0]["a"] if k + 1 < len(lineas) else min(ln[-1]["b"] + 20, a1 - 2)
        subs.append(dict(a=ini, b=fin, palabras=ln))
# ajustes pedidos a mano (15 nov): no partir «maestra Laura» y unir renglones de menos de un segundo
def txt(x): return " ".join(p["w"] for p in x["palabras"])
def une(i):  # junta el renglón i con el siguiente
    subs[i]["palabras"] += subs[i + 1]["palabras"]; subs[i]["b"] = subs[i + 1]["b"]; del subs[i + 1]
for k in range(len(subs) - 1):
    if txt(subs[k]) == "la práctica de la maestra" and subs[k + 1]["palabras"][0]["w"] == "Laura":
        p = subs[k + 1]["palabras"].pop(0); subs[k]["palabras"].append(p); subs[k + 1]["a"] = subs[k + 1]["palabras"][0]["a"]
        subs[k]["b"] = subs[k + 1]["a"]
for frase in ("respetando", "Ha trabajado"):
    k = next(i for i, x in enumerate(subs) if txt(x) == frase); une(k)
json.dump(dict(fps=FPS, total=round(ini_s * FPS), dias=out, subs=subs), open("video/src/datos.json", "w"), ensure_ascii=False)
print("diapositivas", len(out), "renglones", len(subs), "duración", round(ini_s, 1), "s")
for d in out: print(d["n"], d["titulo"], d["desde"], d["dura"], [i["f"] for i in d["ideas"]])
