"""Videos del Sephora Sale con lo que Mae grabó el 30 de octubre con sus lentes Meta (carpeta Sephora del Drive):
v45 = manejando a Sephora y entrando, v69 = recorrido por la tienda, v62 = Rare Beauty, Charlotte Tilbury y salida,
fotos/bolsa.jpg = su bolsa llena (IMG_5355, con el ticket difuminado).
Los videos se pasan antes a color normal y se estabilizan (est_vNN.mp4, con scratchpad/sale/estabiliza.sh).

Formatos que no se repiten con los de BBW, Victoria's Secret ni los de Sephora anteriores:
  lista  = la lista de pedidos de sus clientas que se va palomeando (con lo que de verdad compró: ver LISTA)
  juego  = ¿adivinas cuánto cuesta en México? (precio de México y luego el de Mae)
  cierre = la preventa cierra el 8 de noviembre: línea de tiempo de cómo funciona
Del 31 de octubre (v5364 = Dior Backstage, v111 = Sephora de noche, v5362 = Mae caminando con la bolsa), con la
estrategia de estrategia/estrategia-redes.md (gancho en el segundo 0, 20-25 s, CTA de comentar "GRUPO"):
  dior   = prueba de precio: ¿cuánto cuesta esta paleta Dior en México?
  noche  = detrás de cámaras: 8 de la noche y sigo en Sephora por sus pedidos
  amiga  = para compartir: mándale esto a la amiga que siempre te pide algo de Sephora
  allure = ganadores de los premios Allure 2026: ¿cuánto cuestan en México vs. conmigo? (lista numerada, producto
           flotando, prueba de precio; fondo de la tienda difuminado)
  vlog   = estilo del video de inspiración de @itsmaafer: voz de amiga con opinión, el producto en la mano, casi sin
           texto (subtítulo de una palabra) y una sola mención de la preventa al final
Uso: python3 build.py VARIANTE CARPETA_CON_est_vNN.mp4   (antes: python3 voz.py VARIANTE) -> Sale-VARIANTE-voz.mp4"""
import json, math, os, subprocess, sys
from functools import lru_cache

AQUI = os.path.dirname(os.path.abspath(__file__))
VAR, CRUDO = sys.argv[1], sys.argv[2]
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(RAIZ, "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H, FPS = 1080, 1920, 30
WHITE, INK = b.WHITE, b.INK
ROSA, NEGRO, VERDE, GRIS = (232, 70, 120), (20, 20, 22), (22, 150, 80), (110, 110, 116)
T = json.load(open(os.path.join(AQUI, f"tiempos-{VAR}.json")))
OUT = os.path.join(AQUI, f"Sale-{VAR}.mp4")
INI = [0.0]
for e in T: INI.append(INI[-1] + e["dur"])
def marca(e, m=None): return INI[e] + (0 if m is None else T[e]["marcas"][m])

# recorte (x, y, ancho, alto) sobre el video de 1080x1444. Mae pidió quitar sus tomas en espejos (coche, espejo redondo y
# Beauty Services en v62 57 s) y la toma movida de v45 286 s (no se ve nada): no usarlas.
ESPEJO = (180, 306, 640, 1138)
SIN_ESPEJO_OS = (400, 120, 680, 1209)  # v62 43-49 s: solo la mitad derecha (el espejo queda fuera)
# tomas en orden: (fuente, inicio, segundos, velocidad[, recorte]); se estiran parejo para llenar lo que dura la voz.
# cada renglón es una frase de la voz. fuente "bolsa" = la foto de la bolsa (con un zoom lento)
TOMAS = {
    "lista": [("v45", 62, 1.0, 3.0), ("v45", 262, 1.0, 2.0), ("v62", 65.5, 1.8, 1.0),  # sin el espejo ni la toma movida de v45 286
              ("v69", 41.8, 1.7, 1.0), ("v69", 81.5, 1.7, 1.0),         # amika (muro HAIR), Tower 28 (pasillo)
              # NO usar v69 0-3 s: el espejo redondo junto a amika refleja la cara de Mae
              ("v69", 15, 1.6, 1.0), ("v69", 26, 1.3, 1.0),             # Saie, Too Faced
              ("v62", 66, 1.5, 1.0), ("v69", 198, 1.4, 1.0),            # Mane, Dior (tomas de la tienda)
              ("bolsa", 0, 3.2, 1.0),
              ("v69", 215, 2.4, 1.2), ("v69", 256, 2.2, 1.0), ("v69", 278, 2.2, 1.0), ("v62", 96, 2.5, 1.2)],
    "juego": [("v69", 186, 1.6, 1.3), ("v62", 90, 1.6, 1.3),
              ("v69", 100, 2.8, 1.0), ("v69", 130, 2.7, 1.0), ("v69", 145, 2.7, 1.0),
              ("v62", 6, 2.8, 1.0), ("v62", 16, 2.7, 1.0), ("v62", 26, 2.7, 1.0),
              ("v69", 253, 4.0, 0.8), ("v69", 260, 3.3, 0.8),
              ("v69", 215, 3.0, 1.2), ("v62", 72, 3.0, 1.0), ("v62", 104, 2.9, 1.2)],
    "cierre": [("v62", 100, 2.6, 1.2), ("v69", 190, 2.6, 1.2),
               ("v69", 15, 2.0, 1.0), ("v69", 60, 2.0, 1.0), ("v69", 166, 2.1, 1.0),
               ("v69", 280, 2.0, 1.0),
               ("v45", 286, 2.7, 1.2),
               ("bolsa", 0, 2.3, 1.0), ("v62", 112, 2.0, 1.0),
               ("v69", 220, 2.9, 1.2), ("v62", 72, 2.8, 1.0)],
    # las tomas de los clips nuevos se ajustan en cuanto se revisan estabilizados (ver hojas)
    # v5364: NO usar 8.8-13.8 s (Mae se refleja en el espejo del exhibidor de Dior) ni 0-2.5 s (espejo redondo)
    "dior": [("v5364", 3.0, 3.7, 1.0),
             ("v5364", 5.2, 3.6, 1.0),
             ("v5364", 14.0, 4.0, 1.0),
             ("v5364", 17.5, 2.7, 1.0), ("v5364", 20.0, 2.7, 1.0),
             ("v5364", 22.5, 2.5, 1.0), ("v111", 14.0, 2.5, 1.0), ("v5362", 1.0, 2.5, 1.0)],
    "noche": [("v111", 0.3, 2.6, 1.0), ("v111", 6.5, 1.6, 1.3),
              ("v111", 16, 1.8, 1.2), ("v111", 23, 1.8, 1.2), ("v5364", 34, 1.8, 1.2),  # v111 27-28 s: espejo redondo
              ("v5364", 4.0, 1.9, 1.0), ("v111", 36, 1.9, 1.2),
              ("v5362", 0.8, 2.2, 1.0), ("bolsa", 0, 2.2, 1.0),
              ("v5362", 11.8, 3.2, 1.0), ("v111", 2.0, 3.2, 1.0)],  # v5362 4.3-5.3 s: espejo redondo
    "amiga": [("v5362", 0.5, 2.5, 1.0), ("v111", 0.5, 2.5, 1.0),
              ("v5362", 12.6, 3.0, 1.0),
              ("v5364", 3.5, 2.5, 1.0), ("v111", 18, 2.6, 1.2),
              ("v111", 30, 3.0, 1.2),
              ("v5362", 1.5, 2.6, 1.0), ("bolsa", 0, 2.7, 1.0)],
    "vlog": [("v111", 3.5, 2.6, 1.0), ("v111", 7.0, 2.65, 1.0),
             # productos que no salen en los otros videos (Mae no quiso repetir Saie, amika, Tower 28 ni Dior)
             # ONE/SIZE On 'Til Dawn waterproof en su mano; recortado para que no salga el espejo redondo de la
             # izquierda (ahí se refleja la cara de Mae)
             # (cámara lenta para no pasar de 47.0 s: después la cámara gira y entra el espejo con su cara)
             ("v62", 43.0, 3.6, 0.65, SIN_ESPEJO_OS), ("v62", 45.4, 3.56, 0.45, SIN_ESPEJO_OS),
             ("v69", 58.5, 2.4, 1.0), ("v69", 60.3, 2.84, 1.0),                    # Gisou, el aceite de miel
             ("v5364", 47.5, 2.4, 1.0), ("v5364", 49.5, 2.0, 1.0), ("v62", 78.5, 2.6, 1.0),  # Tarte Shape Tape, Charlotte
             ("v5362", 1.5, 2.4, 1.0), ("v111", 0.3, 2.43, 1.0),  # sin la foto de la bolsa (ya salió en muchos)
             ("v111", 23, 2.8, 1.2), ("v5362", 12.6, 2.9, 1.0), ("v111", 2.0, 2.85, 1.0)],
    # fondo difuminado (el producto es lo importante); sin los tramos con espejos donde sale Mae
    "allure": [("v111", 7.0, 2.6, 1.0), ("v111", 16, 2.6, 1.0), ("v69", 215, 2.6, 1.0),
               ("v62", 78.5, 3.5, 1.0), ("v62", 80.0, 3.4, 1.0), ("v62", 77.0, 3.4, 1.0),
               ("v5364", 15.0, 2.8, 1.0), ("v5364", 18.0, 2.8, 1.0), ("v5364", 21.0, 2.8, 1.0),
               ("v5364", 23.0, 3.0, 1.0), ("v5364", 25.5, 3.0, 1.0), ("v5364", 28.0, 2.9, 1.0),
               ("v111", 26, 2.8, 1.0), ("v111", 30, 2.8, 1.0), ("v111", 34, 2.9, 1.0),
               ("v111", 38, 2.6, 1.0), ("v5362", 12.6, 2.6, 1.0), ("v111", 2.0, 2.5, 1.0)],
}[VAR]


def video(fuente, ini, n, vel, recorte=None):
    if fuente == "bolsa":  # foto fija con acercamiento lento
        im = ImageOps.fit(Image.open(os.path.join(AQUI, "fotos", "bolsa.jpg")).convert("RGB"), (W, H))
        for k in range(n):
            z = 1 + 0.08 * k / max(1, n - 1); w, h = int(W / z), int(H / z)
            yield im.crop(((W - w) // 2, (H - h) // 2, (W - w) // 2 + w, (H - h) // 2 + h)).resize((W, H), Image.BILINEAR).convert("RGBA")
        return
    vf = f"setpts=PTS/{vel},fps={FPS}" + (",crop={2}:{3}:{0}:{1}".format(*recorte) if recorte else "")
    vf += f",scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"est_{fuente}.mp4"),
                          "-t", f"{n * vel / FPS + 0.3:.2f}", "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


_cache = {}
def qr():
    if "qr" not in _cache:
        sys.path.insert(0, os.path.join(RAIZ, "carruseles"))
        import whatsapp
        _cache["qr"] = whatsapp.tarjeta(420)
    return _cache["qr"]


def producto(nombre, alto=440):
    """recorte del producto en tarjeta blanca redonda con sombra"""
    if nombre not in _cache:
        im = Image.open(os.path.join(RAIZ, "carruseles", "recortes", nombre + ".png")).convert("RGBA")
        im.thumbnail((440, alto - 80), Image.LANCZOS)
        c = Image.new("RGBA", (560, alto + 60))
        sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 42, 530, alto + 42), 50, fill=120)
        c.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
        ImageDraw.Draw(c).rounded_rectangle((30, 30, 530, alto + 30), 50, fill=WHITE)
        c.alpha_composite(im, ((560 - im.width) // 2, 30 + (alto - im.height) // 2))
        _cache[nombre] = c
    return _cache[nombre]


def pas(L, s, cy, n="ExtraBold", sz=56, bg=ROSA, fg=WHITE, t=99, t0=0, maxw=1000):
    if t < t0: return
    while b.pastilla(s, n, sz, bg, fg).width > maxw and sz > 30: sz -= 3
    b.pon(L, b.pastilla(s, n, sz, bg, fg), W / 2, cy, *b.entra(t, t0, 0.35))


def cta(L, tg, e):
    """últimas frases: QR del grupo y la invitación"""
    m = len(T[e]["marcas"]) - 1
    if tg >= marca(e, m):
        b.pon(L, qr(), W / 2, 560, *b.entra(tg, marca(e, m), 0.45))
        pas(L, "Únete a mi grupo de WhatsApp 💬", 920, sz=52, t=tg, t0=marca(e, m) + 0.2)


# ---------------- lista: la libreta de pedidos que se va palomeando ----------------
# lo que de verdad compró ese día (su correo de Sephora): marca, cuándo se palomea y las fotos de sus productos (compra/*.png,
# recortadas de las capturas del correo). Tower 28, Too Faced, Mane y Dior no salen en sus videos: por eso la tarjeta con la foto
LISTA = [("amika", (1, 0), ["amika-hydrorush", "amika-wizard", "amika-soulfood", "amika-mini"]),
         ("Tower 28", (1, 1), ["tower-beachplease", "tower-getset", "tower-gogo"]),
         ("Saie", (2, 0), ["saie-dew", "saie-minidew"]),
         ("Too Faced", (2, 1), ["toofaced-concealer"]),
         ("Mane", (3, 0), ["mane-cottoncandy", "mane-pinky", "mane-tempcheck"]),
         ("Dior", (3, 1), ["dior-palette", "dior-missdior"])]


def tarjeta_compra(marca_, fotos):
    """las fotos de lo que compró de esa marca, en una tarjeta blanca con el nombre"""
    k = ("compra", marca_)
    if k not in _cache:
        ims = []
        for f in fotos:
            im = Image.open(os.path.join(AQUI, "compra", f + ".png")).convert("RGB"); im.thumbnail((260, 250), Image.LANCZOS); ims.append(im)
        t = b.linea(f"✅ {marca_}", "ExtraBold", 50, NEGRO)
        w = max(sum(i.width for i in ims) + 30 * (len(ims) - 1) + 80, t.width + 80); h = 250 + 140
        c = Image.new("RGBA", (w + 60, h + 60))
        sh = Image.new("L", c.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 42, w + 30, h + 42), 44, fill=120)
        c.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
        ImageDraw.Draw(c).rounded_rectangle((30, 30, w + 30, h + 30), 44, fill=WHITE)
        x = 30 + (w - (sum(i.width for i in ims) + 30 * (len(ims) - 1))) // 2
        for im in ims: c.paste(im, (x, 70 + (250 - im.height) // 2)); x += im.width + 30
        c.alpha_composite(t, ((c.width - t.width) // 2, 70 + 250 + 10))
        _cache[k] = c
    return _cache[k]

def libreta(tg):
    w, h = 560, 120 + 78 * len(LISTA)
    im = Image.new("RGBA", (w + 40, h + 40))
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((20, 28, w + 20, h + 28), 30, fill=110)
    im.putalpha(sh.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(im); d.rounded_rectangle((20, 20, w + 20, h + 20), 30, fill=(255, 253, 247))
    d.line((92, 20, 92, h + 20), fill=(240, 160, 180), width=3)  # margen de libreta
    im.alpha_composite(b.linea("Pedidos de mis clientas 📝", "ExtraBold", 33, NEGRO), (110, 44))
    for i, (s, (e, m), _) in enumerate(LISTA):
        y = 130 + 78 * i
        d.line((92, y + 62, w + 10, y + 62), fill=(225, 225, 232), width=2)
        hecho = tg >= marca(e, m)
        d.rounded_rectangle((40, y + 12, 78, y + 50), 8, outline=ROSA, width=4, fill=ROSA if hecho else None)
        if hecho: d.line([(48, y + 31), (57, y + 41), (71, y + 20)], fill=WHITE, width=6, joint="curve")
        tx = b.linea(s, "Bold" if hecho else "SemiBold", 40, NEGRO if hecho else GRIS)
        im.alpha_composite(tx, (110, y + 6))
    return im


def sello(s):
    im = b.pastilla(s, "ExtraBold", 84, ROSA, WHITE, padx=50, pady=26)
    ImageDraw.Draw(im).rounded_rectangle((8, 8, im.width - 9, im.height - 9), im.height // 2 - 8, outline=WHITE, width=6)
    return im.rotate(-8, expand=True, resample=Image.BICUBIC)


def capa_lista(L, tg):
    if tg < INI[1]:
        pas(L, "Hoy: la lista de pedidos de mis clientas 📝", 420, "Bold", 46, (20, 20, 22, 220), WHITE, tg, 0.1)
    elif tg < INI[5]:
        lb = libreta(tg); lb = lb.resize((int(lb.width * 1.3), int(lb.height * 1.3)), Image.LANCZOS)  # que se lea bien
        s, a = b.entra(tg, INI[1] - 0.15, 0.4)
        b.pon(L, lb, 20 + lb.width / 2, 200 + lb.height / 2, s, a)
        act = [x for x in LISTA if tg >= marca(*x[1])]
        if act and tg < marca(4, 0):  # la tarjeta con las fotos de lo último que se palomeó
            nom, (e, m), fotos = act[-1]; t0 = marca(e, m)
            tj = tarjeta_compra(nom, fotos)
            if tj.width > 1040: tj = tj.resize((1040, int(tj.height * 1040 / tj.width)), Image.LANCZOS)
            b.pon(L, tj, W / 2, 1360, *b.entra(tg, t0, 0.35))
        if tg >= marca(4, 0): b.pon(L, sello("¡Lista completa! ✅"), W / 2, 1380, *b.entra(tg, marca(4, 0), 0.4))
    else:
        if tg < marca(5, 1): pas(L, "Mi preventa cierra el 8 de noviembre 🗓️", 700, sz=52, t=tg, t0=marca(5, 0))
        cta(L, tg, 5)


# ---------------- juego: ¿adivinas cuánto cuesta en México? ----------------
# (recorte, nombre, tienda de México, precio en México, precio de Mae) — de carruseles/precios-sephora-mx.csv:
# Rhode no está en Sephora México (Rhode México), y Rare Beauty y Huda son tamaño completo
JUEGO = {1: ("rhode-pocket", "Rhode Pocket Blush", "Rhode México", 575, 493),
         2: ("rare-blush", "Rare Beauty Soft Pinch", "Sephora México", 665, 493),
         3: ("huda-easybake", "Huda Beauty Easy Bake", "Sephora México", 950, 829)}

def etiqueta(arriba, precio, color):
    im = Image.new("RGBA", (620, 230)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 619, 229), 40, fill=(255, 255, 255, 240))
    d.text((310, 60), arriba, font=b.F("Bold", 40), fill=GRIS, anchor="mm")
    d.text((310, 150), precio, font=b.F("ExtraBold", 110), fill=color, anchor="mm")
    return im


def capa_juego(L, tg):
    e = next(i for i in range(len(T)) if tg < INI[i + 1] or i == len(T) - 1)
    if e == 0:
        pas(L, "¿Adivinas cuánto cuestan", 560, sz=70, bg=NEGRO, t=tg, t0=0.05)
        pas(L, "en México? 🤔", 690, sz=70, bg=NEGRO, t=tg, t0=0.3)
    elif e in JUEGO:
        rec, nom, tienda, mx, mio = JUEGO[e]
        b.pon(L, producto(rec, 420), W / 2, 420, *b.entra(tg, INI[e], 0.4))
        pas(L, nom, 730, "ExtraBold", 50, NEGRO, WHITE, tg, INI[e] + 0.2)
        if tg < marca(e, 0):  # todavía no se dice: signo de pregunta que late
            k = 1 + 0.06 * abs(((tg * 2) % 2) - 1)
            b.pon(L, etiqueta(f"En {tienda}", "$ ???", ROSA), W / 2, 940, k)
        else:
            b.pon(L, etiqueta(f"En {tienda}", f"${mx:,}", NEGRO), W / 2, 940, *b.entra(tg, marca(e, 0), 0.35))
        if tg >= marca(e, 1):
            pas(L, f"Conmigo: ${mio:,}", 1120, sz=78, t=tg, t0=marca(e, 1))
            pas(L, f"Ahorras ${mx - mio:,} 💸", 1250, "ExtraBold", 56, VERDE, WHITE, tg, marca(e, 1) + 0.5)
    else:
        if tg < marca(e, 1): pas(L, "Apártalos con el 50% antes del 8 de noviembre", 700, sz=48, t=tg, t0=max(0, marca(e, 0)))
        cta(L, tg, e)


# ---------------- cierre: calendario y línea de tiempo de la preventa ----------------
PASOS = [("🛍️", "Elige en alpacca.mx", "con 20% de descuento"), ("💳", "Aparta con el 50%", ""),
         ("🏬", "Yo lo compro en Sephora", ""), ("✅", "Liquida antes de que te lo envíe", ""), ("📦", "Te llega a tu casa", "")]

def calendario():
    im = Image.new("RGBA", (440, 470)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 439, 469), 44, fill=WHITE)
    d.rounded_rectangle((0, 0, 439, 120), 44, fill=ROSA); d.rectangle((0, 70, 439, 120), fill=ROSA)
    d.text((220, 62), "NOVIEMBRE", font=b.F("ExtraBold", 54), fill=WHITE, anchor="mm")
    d.text((220, 275), "8", font=b.F("ExtraBold", 230), fill=NEGRO, anchor="mm")
    d.text((220, 420), "cierra mi preventa", font=b.F("Bold", 38), fill=GRIS, anchor="mm")
    return im


def linea_tiempo(activo):
    im = Image.new("RGBA", (1000, 190)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 999, 189), 40, fill=(20, 20, 22, 215))
    xs = [110 + 195 * i for i in range(5)]
    d.line((xs[0], 80, xs[-1], 80), fill=(90, 90, 96), width=8)
    if activo > 0: d.line((xs[0], 80, xs[activo], 80), fill=ROSA, width=8)
    for i, x in enumerate(xs):
        r = 52 if i == activo else 40
        d.ellipse((x - r, 80 - r, x + r, 80 + r), fill=ROSA if i <= activo else (70, 70, 76), outline=WHITE if i == activo else None, width=5)
        em = b.linea(PASOS[i][0], "Bold", 44 if i == activo else 34, WHITE)
        im.alpha_composite(em, (int(x - em.width / 2), int(80 - em.height / 2)))
        d.text((x, 158), f"Paso {i + 1}", font=b.F("Bold", 26), fill=WHITE if i <= activo else (150, 150, 156), anchor="mm")
    return im


def capa_cierre(L, tg):
    pasos_t = [INI[1], INI[2], INI[3], INI[4], marca(4, 1)]  # cuándo empieza cada paso (se dice en la voz)
    if tg < INI[1]:
        b.pon(L, calendario(), W / 2, 640, *b.entra(tg, 0.05, 0.45))
        pas(L, "Así funciona 👇", 1000, sz=60, bg=NEGRO, t=tg, t0=marca(0, 1))
    elif tg < INI[5]:
        k = max(i for i, t0 in enumerate(pasos_t) if tg >= t0)
        b.pon(L, linea_tiempo(k), W / 2, 300)
        emo, tit, sub = PASOS[k]
        pas(L, f"{k + 1}. {tit} {emo}", 900, sz=64, t=tg, t0=pasos_t[k])
        if sub: pas(L, sub, 1030, "Bold", 48, WHITE, NEGRO, tg, pasos_t[k] + 0.3)
    else:
        cta(L, tg, 5)


# ---------------- CTA de comentar (estrategia: comentar sube el video y te da a la clienta por mensaje) ----------------
def tarjeta_grupo():
    """tarjeta limpia: «Comenta GRUPO y te mando el link» (sin usuario ni foto inventados)"""
    im = Image.new("RGBA", (820, 330)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 819, 329), 50, fill=(255, 255, 255, 245))
    t = b.linea("💬 Comenta", "Bold", 52, GRIS); im.alpha_composite(t, ((820 - t.width) // 2, 28))
    d.text((410, 175), "GRUPO", font=b.F("ExtraBold", 130), fill=ROSA, anchor="mm")
    t = b.linea("y te mando el link 👇", "Bold", 46, NEGRO); im.alpha_composite(t, ((820 - t.width) // 2, 248))
    return im


def cta_comenta(L, tg, e, m_grupo):
    """«Comenta GRUPO» en una tarjeta limpia; el QR va chiquito como apoyo"""
    t0 = marca(e, m_grupo) - 0.2
    if tg < t0: return
    b.pon(L, tarjeta_grupo(), W / 2, 690, *b.entra(tg, t0, 0.4))
    q = qr(); q = q.resize((300, 300), Image.LANCZOS)
    b.pon(L, q, W / 2, 1060, *b.entra(tg, t0 + 0.8, 0.4))
    pas(L, "o escanéalo desde otro celular", 1240, "Bold", 34, WHITE, NEGRO, tg, t0 + 0.8)


def vlog(L, s, cy, t, t0):
    """renglón tipo vlog: caja negra a la izquierda que entra deslizándose"""
    if t < t0: return
    c = b.pastilla(s, "SemiBold", 48, NEGRO + (225,), WHITE, padx=34, pady=18)
    if c.width > 1000: c = c.resize((1000, int(c.height * 1000 / c.width)), Image.LANCZOS)
    k = b.ease((t - t0) / 0.35)
    b.pon(L, c, 40 + c.width / 2 - 120 * (1 - k), cy, 1, min(1, (t - t0) / 0.2))


# ---------------- dior: ¿cuánto cuesta esta paleta Dior en México? ----------------
def capa_dior(L, tg):
    e = next(i for i in range(len(T)) if tg < INI[i + 1] or i == len(T) - 1)
    if e < 4:
        pas(L, "¿Cuánto cuesta esta paleta", 250, sz=62, bg=NEGRO, t=tg, t0=0.0)
        pas(L, "Dior en México? 🤔", 360, sz=62, bg=NEGRO, t=tg, t0=0.15)
        b.pon(L, producto("sep-dior-palette", 400), W / 2, 650, *b.entra(tg, 0.3, 0.4))
        if tg >= INI[1]: pas(L, "Dior Backstage Glow Face Palette", 900, "ExtraBold", 46, WHITE, NEGRO, tg, marca(1, 0))
        if tg < marca(2, 0):
            if tg >= INI[1]: b.pon(L, etiqueta("En Sephora México", "$ ???", ROSA), W / 2, 1100, 1 + 0.06 * abs(((tg * 2) % 2) - 1))
        else:
            b.pon(L, etiqueta("En Sephora México", "$1,330", NEGRO), W / 2, 1100, *b.entra(tg, marca(2, 0), 0.35))
        if tg >= marca(3, 0): pas(L, "Conmigo: $1,085", 1290, sz=82, t=tg, t0=marca(3, 0))
        if tg >= marca(3, 1): pas(L, "Ahorras $245 💸", 1420, "ExtraBold", 58, VERDE, WHITE, tg, marca(3, 1))
    else:
        pas(L, "¿Cuánto creías que costaba? 👇", 400, sz=56, bg=NEGRO, t=tg, t0=marca(4, 0))
        cta_comenta(L, tg, 4, 1)


# ---------------- noche: detrás de cámaras ----------------
def capa_noche(L, tg):
    e = next(i for i in range(len(T)) if tg < INI[i + 1] or i == len(T) - 1)
    if e == 0:
        b.pon(L, b.pastilla("🕗 8:00 pm", "ExtraBold", 90, NEGRO + (230,), WHITE, padx=50, pady=24), W / 2, 330, *b.entra(tg, 0.0, 0.35))
        vlog(L, "…y sigo en Sephora por sus pedidos 🛍️", 470, tg, 0.4)
    elif e == 1:
        vlog(L, "👀 La parte que nadie ve", 330, tg, INI[1])
        vlog(L, "🔎 Busco producto por producto", 450, tg, marca(1, 1))
    elif e == 2:
        vlog(L, "⏳ Lo que está en oferta se acaba rápido", 330, tg, INI[2])
        vlog(L, "…por eso vengo yo 💪", 450, tg, marca(2, 0))
    elif e == 3:
        vlog(L, "🛍️ Bolsa llena", 330, tg, marca(3, 0))
        vlog(L, "✈️ Lista para mandarla a México 🇲🇽", 450, tg, marca(3, 1))
    else:
        pas(L, "¿La próxima vez vengo por lo tuyo? 💗", 400, sz=52, bg=NEGRO, t=tg, t0=marca(4, 0))
        cta_comenta(L, tg, 4, 1)


# ---------------- amiga: para compartir ----------------
def burbuja(texto):
    """burbuja de mensaje (como iMessage) de la amiga"""
    t = b.linea(texto, "SemiBold", 56, NEGRO)
    im = Image.new("RGBA", (t.width + 80, t.height + 50)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, im.width - 1, im.height - 1), 46, fill=(235, 235, 240, 250))
    im.alpha_composite(t, (40, 25))
    return im


def capa_amiga(L, tg):
    e = next(i for i in range(len(T)) if tg < INI[i + 1] or i == len(T) - 1)
    if e == 0:
        pas(L, "Mándale esto a la amiga", 300, sz=62, bg=NEGRO, t=tg, t0=0.0)
        pas(L, "que siempre te dice:", 410, sz=62, bg=NEGRO, t=tg, t0=0.15)
        bb = burbuja("¿me traes algo de Sephora? 🥺")
        b.pon(L, bb, 60 + bb.width / 2, 620, *b.entra(tg, 1.2, 0.4))
        if tg >= 2.6:
            bb2 = burbuja("porfa 🙏🙏")
            b.pon(L, bb2, 60 + bb2.width / 2, 770, *b.entra(tg, 2.6, 0.35))
    elif e == 1:
        pas(L, "🧳 Ya no cargues sus pedidos", 420, sz=58, bg=NEGRO, t=tg, t0=INI[1])
        pas(L, "en tu maleta", 530, sz=58, bg=NEGRO, t=tg, t0=INI[1] + 0.2)
    elif e == 2:
        pas(L, "Yo se lo traigo ✈️", 380, sz=74, t=tg, t0=INI[2])
        pas(L, "20% OFF 💸", 540, "ExtraBold", 66, VERDE, WHITE, tg, marca(2, 0))
        pas(L, "Aparta con el 50%", 680, "Bold", 54, WHITE, NEGRO, tg, marca(2, 1))
    elif e == 3:
        b.pon(L, calendario(), W / 2, 600, *b.entra(tg, INI[3], 0.4))
    else:
        pas(L, "📲 Mándaselo ahorita", 400, sz=60, bg=NEGRO, t=tg, t0=marca(4, 0))
        cta_comenta(L, tg, 4, 1)


# ---------------- vlog: estilo @itsmaafer (voz de amiga, subtítulo de una palabra, casi sin texto) ----------------
def _palabras():
    """(segundo, palabra) de toda la voz, con los tiempos por letra que guardó ElevenLabs"""
    import hashlib, re
    v = open(os.path.join(AQUI, "voz.py")).read()
    voz = re.search(r'^VOZ = "([^"]+)"', v, re.M).group(1)
    frases = json.load(open(os.path.join(AQUI, f"narracion-{VAR}.json"))); out = []
    for n, fr in enumerate(frases):
        k = hashlib.sha1(f"{voz}|eleven_v4|0.5|{fr['texto']}".encode()).hexdigest()[:12]
        a = json.load(open(os.path.join(AQUI, "voz", "cache", k + ".json")))["alignment"]
        ch, st = a["characters"], a["character_start_times_seconds"]
        ini = max(0.0, st[0] - 0.03); off = 0.25 if n == 0 else 0.0
        pal, tp = "", None
        for c, t in zip(ch + [" "], st + [st[-1]]):
            if c.isspace():
                if pal: out.append((INI[n] + off + tp - ini, pal.strip(".,:;…")))
                pal = ""; continue
            if not pal: tp = t
            pal += c
    return out

_PAL = []

FUENTES = os.path.join(RAIZ, "carruseles", "fuentes")
# palabras clave: grandes, en rosa y con la tipografía gordita de la marca (estilo del video de @thaliarueda)
CLAVE = {"Holi", "Sale", "One", "Size", "Gisou", "neta", "delicioso", "Tarte", "Charlotte", "Tilbury", "veinte",
         "llena", "México", "preventa", "GRUPO", "Bye", "Allure", "Dior", "Forever", "Tower", "Conmigo", "Cuál"}


def _sombra(im, r=10, a=150):
    """texto sin borde: solo una sombra suave detrás para que se lea"""
    sh = Image.new("RGBA", (im.width + 4 * r, im.height + 4 * r))
    m = im.getchannel("A").point(lambda v: v * a // 255)
    base = Image.new("RGBA", im.size, (20, 10, 16, 255)); base.putalpha(m)
    sh.alpha_composite(base, (2 * r, 2 * r + 4)); sh = sh.filter(ImageFilter.GaussianBlur(r))
    sh.alpha_composite(im, (2 * r, 2 * r)); return sh


def subtitulo(L, tg, y=1480):
    """la palabra que se dice: chica y blanca; las clave, grandes en rosa con Bagel. Sin bordes."""
    if not _PAL: _PAL.extend(_palabras())
    act = [(t, w) for t, w in _PAL if t <= tg]
    if not act or tg > _PAL[-1][0] + 0.8: return
    t0, w = act[-1]
    if w in CLAVE:
        f = ImageFont.truetype(os.path.join(FUENTES, "BagelFatOne-Regular.ttf"), 150)
        im = Image.new("RGBA", (int(f.getlength(w)) + 40, 220)); ImageDraw.Draw(im).text((20, 110), w, font=f, fill=ROSA, anchor="lm")
        s_, a_ = b.entra(tg, t0, 0.3)
        b.pon(L, _sombra(im), W / 2, y, s_, a_)
    else:
        b.pon(L, _sombra(b.linea(w, "ExtraBold", 70, WHITE)), W / 2, y)


def interrupcion(L, tg, t0, texto, dur=0.9):
    """algo que no se ve venir a la mitad: título gigante con Bebas que entra de golpe"""
    if not (t0 <= tg < t0 + dur): return
    f = ImageFont.truetype(os.path.join(FUENTES, "BebasNeue-Regular.ttf"), 420)
    im = Image.new("RGBA", (int(f.getlength(texto)) + 40, 460)); ImageDraw.Draw(im).text((20, 230), texto, font=f, fill=ROSA, anchor="lm")
    if im.width > 1040: im = im.resize((1040, int(im.height * 1040 / im.width)), Image.LANCZOS)
    k = (tg - t0) / dur
    b.pon(L, _sombra(im, 14, 170), W / 2, 960, 1.25 - 0.25 * b.ease(k / 0.25), min(1.0, (1 - k) / 0.2))


def sticker(L, nom, fotos, tg, t0, t1):
    """la tarjeta con lo que compró, chica y ladeada, como estampa"""
    if not (t0 <= tg < t1): return
    tj = tarjeta_compra(nom, fotos)
    k = 620 / max(tj.width, 620); tj = tj.resize((int(tj.width * k), int(tj.height * k)), Image.LANCZOS)
    tj = tj.rotate(-4, expand=True, resample=Image.BICUBIC)
    b.pon(L, tj, W / 2 + 150, 640, *b.entra(tg, t0, 0.35))  # arriba: abajo va el producto en su mano


def capa_vlog(L, tg):
    if tg < INI[1] - 0.2:  # inicio: título con la tipografía de la marca, sin bordes
        f = ImageFont.truetype(os.path.join(FUENTES, "BagelFatOne-Regular.ttf"), 130)
        im = Image.new("RGBA", (int(f.getlength("Sephora Sale")) + 40, 190)); ImageDraw.Draw(im).text((20, 95), "Sephora Sale", font=f, fill=WHITE, anchor="lm")
        b.pon(L, _sombra(im, 12, 170), W / 2, 330, *b.entra(tg, 0.0, 0.35))
        b.pon(L, _sombra(b.linea("las wish lists de mis clientas 🛍️", "Bold", 52, WHITE)), W / 2, 450, *b.entra(tg, 0.2, 0.35))
    interrupcion(L, tg, marca(3, 2), "20% OFF")  # a la mitad: algo que no se ve venir (con sonido)
    # ONE/SIZE: el waterproof que tenía en la mano (no el de SPF)
    for rec, t0, t1 in [("onesize-waterproof", marca(1, 0), INI[2]), ("gisou-oil", marca(2, 0), INI[3])]:
        if t0 <= tg < t1:  # estampa con la foto del producto, arriba (abajo va en su mano)
            p = producto(rec, 360).rotate(-4, expand=True, resample=Image.BICUBIC)
            b.pon(L, p, W / 2 + 230, 600, *b.entra(tg, t0, 0.35))
    if INI[5] <= tg < marca(5, 1):
        pas(L, "Mi preventa cierra el 8 de noviembre 🗓️", 420, "Bold", 46, (20, 20, 22, 220), WHITE, tg, marca(5, 0))
    if tg >= marca(5, 1): cta_comenta(L, tg, 5, 1)
    else: subtitulo(L, tg)


# ---------------- allure: ganadores de los premios Allure 2026 ----------------
# (recorte, nombre, tienda con la que se compara, precio ahí o None = no se vende en México, precio de Mae)
# precios: carruseles/precios-sephora-mx.csv y el catálogo de la preventa. Charlotte Tilbury no tiene precio en
# Sephora México: se compara con Sephora USA (regla de Mae). El sello de Allure se quitó de la foto de Tower 28.
ALLURE = {1: ("ct-spray", "Charlotte Tilbury Airbrush Flawless Setting Spray", "Sephora USA", 617, "desde $493"),
          2: ("dior-lipoil", "Dior Lip Glow Oil", "Sephora México", 970, "$829"),
          3: ("dior-forever", "Dior Forever Skin Glow", "Sephora México", 1550, "$1,184"),
          4: ("tower-sos-solo", "Tower 28 SOS Daily Rescue Spray", None, None, "desde $237")}
AHORRO = {1: 124, 2: 141, 3: 366}


@lru_cache(None)
def recorte(nombre, alto):
    im = Image.open(os.path.join(RAIZ, "carruseles", "recortes", nombre + ".png")).convert("RGBA")
    im.thumbnail((620, alto), Image.LANCZOS)
    return _sombra(im, 24, 120)


def numero(n, total=4):
    im = b.pastilla(f"{n}/{total}", "ExtraBold", 64, ROSA, WHITE, padx=34, pady=12)
    return im


def capa_allure(L, tg):
    L.paste(L.filter(ImageFilter.GaussianBlur(18)))
    L.alpha_composite(Image.new("RGBA", L.size, (24, 10, 18, 120)))
    e = next(i for i in range(len(T)) if tg < INI[i + 1] or i == len(T) - 1)
    if e == 0:
        f = ImageFont.truetype(os.path.join(FUENTES, "BagelFatOne-Regular.ttf"), 120)
        for k, (txt, y, col) in enumerate([("Premios", 330, WHITE), ("Allure 2026", 470, ROSA)]):
            im = Image.new("RGBA", (int(f.getlength(txt)) + 40, 180)); ImageDraw.Draw(im).text((20, 90), txt, font=f, fill=col, anchor="lm")
            b.pon(L, _sombra(im, 12, 170), W / 2, y, *b.entra(tg, 0.1 + 0.2 * k, 0.4))
        b.pon(L, _sombra(b.linea("¿cuánto cuestan en México vs. conmigo?", "Bold", 44, WHITE)), W / 2, 600, *b.entra(tg, marca(0, 1) - 0.3, 0.35))
        for k, rec in enumerate(["ct-spray", "dior-lipoil", "dior-forever", "tower-sos-solo"]):  # entran flotando
            t0 = 0.6 + 0.35 * k; p = recorte(rec, 520)
            if tg >= t0:
                dy = 260 * (1 - b.ease((tg - t0) / 0.5)); fl = 10 * math.sin(2 * (tg + k))
                b.pon(L, p, 150 + 260 * k, 1080 + dy + fl, 0.85, min(1, (tg - t0) / 0.2))
        subtitulo(L, tg, 1560)
    elif e in ALLURE:
        rec, nom, tienda, pt, mio = ALLURE[e]; t0 = INI[e]
        b.pon(L, numero(e), W - 150, 150, *b.entra(tg, t0, 0.3))
        pas(L, "🏆 Ganador Allure 2026", 300, "ExtraBold", 50, WHITE, NEGRO, tg, t0 + 0.1)
        fl = 14 * math.sin(2.2 * tg)
        s_, a_ = b.entra(tg, t0 + 0.15, 0.5)
        b.pon(L, recorte(rec, 640), W / 2, 760 + fl, s_, a_)
        pas(L, nom, 1150, "Bold", 44, WHITE, NEGRO, tg, marca(e, 0))
        if tienda:
            if tg >= marca(e, 1): b.pon(L, etiqueta(f"En {tienda}", f"${pt:,}", NEGRO), W / 2, 1330, *b.entra(tg, marca(e, 1), 0.35))
        elif tg >= marca(e, 1):
            pas(L, "🇲🇽 No se vende en México", 1330, "ExtraBold", 56, (196, 40, 60), WHITE, tg, marca(e, 1))
        if tg >= marca(e, 2):
            pas(L, f"Conmigo: {mio}", 1510, sz=74, t=tg, t0=marca(e, 2))
            if e in AHORRO: pas(L, f"Ahorras ${AHORRO[e]:,} 💸", 1640, "ExtraBold", 52, VERDE, WHITE, tg, marca(e, 2) + 0.5)
        subtitulo(L, tg, 160)  # arriba: abajo van los precios y los botones de TikTok
    else:
        pas(L, "¿Cuál te llevas? 👇", 400, sz=64, bg=NEGRO, t=tg, t0=INI[5])
        cta_comenta(L, tg, 5, 1)
        if tg >= marca(5, 2): pas(L, "¿Parte 2? Dímelo en comentarios 💬", 1400, "Bold", 46, WHITE, NEGRO, tg, marca(5, 2))


CAPA = {"lista": capa_lista, "juego": capa_juego, "cierre": capa_cierre,
        "dior": capa_dior, "noche": capa_noche, "amiga": capa_amiga, "vlog": capa_vlog, "allure": capa_allure}[VAR]
SFX = []


def cuadros():
    total = int(round(INI[-1] * FPS))
    raw = [int(tm[2] * FPS) for tm in TOMAS]
    k = total / sum(raw); ns = [int(r * k) for r in raw]; ns[-1] += total - sum(ns)
    f = 0
    for tm, n in zip(TOMAS, ns):
        for j, L in zip(range(n), video(tm[0], tm[1], n, *tm[3:])):
            CAPA(L, (f + j) / FPS)
            yield L
        f += n


if __name__ == "__main__":
    # sonidos: un pop en cada marca de la voz y brillo al inicio
    SFX += [(0.05, "glitter")] + [(INI[e] + m, "pop") for e in range(len(T)) for m in T[e]["marcas"] if INI[e] + m > 0.3]
    if VAR == "vlog": SFX.append((marca(3, 2), "glitter"))  # la interrupción de la mitad
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in cuadros():
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait()
    final = OUT.replace(".mp4", "-voz.mp4")
    ins, fil = ["-i", OUT, "-i", os.path.join(AQUI, f"voz-{VAR}", "narracion.wav")], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=0.3[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final, f"{cnt / FPS:.1f}s")
