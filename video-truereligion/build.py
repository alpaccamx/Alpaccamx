"""Videos "True Religion": Mae empacando un pedido (videos del iPhone) + su voz + fotos de la tienda con precios.
Dos versiones con las mismas piezas, 1080x1920, 30 fps:
  - para clientas:  python3 build.py CARPETA_DE_VIDEOS           -> TrueReligion-voz.mp4 y portada.jpg
  - para revender:  VERSION=mayoreo python3 build.py CARPETA  -> TrueReligion-mayoreo-voz.mp4 y portada-mayoreo.jpg
(la carpeta tiene IMG_4655 e IMG_4656, .MOV o -1080p.mp4; antes, python3 voz.py [mayoreo] para la voz)
La de mayoreo tiene su propio diseño (fotos tipo polaroid + "ticket de ganancia", negro y verde) y otro ejemplo
(Camo en vez del leopardo), para que en el perfil no se vea igual que la de clientas."""
import hashlib, json, os, re, subprocess, sys
from functools import lru_cache

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b  # textos con emojis de iPhone, pastillas, aparecer con rebote
from PIL import Image, ImageDraw, ImageFilter

W, H, FPS = 1080, 1920, 30
SUF = "-mayoreo" if os.environ.get("VERSION") == "mayoreo" else ""
OUT = os.path.join(AQUI, f"TrueReligion{SUF}.mp4")
WHITE, INK, PINK, DEEP = b.WHITE, b.INK, b.PINK, b.DEEP
GREEN = (22, 150, 80); WA = (37, 211, 102); GREY = (120, 120, 128)
T = json.load(open(os.path.join(AQUI, f"tiempos{SUF}.json")))

# el de Mae: oferta USA x 1.0825 tax x 1.15 comisión x 18.80. Contra qué se compara:
# - leopardo: el mismo modelo en truereligion.mx, que solo vende la sudadera (precio normal $6,026, oct 2026)
# - los demás no se venden en México: contra su precio normal de etiqueta (USD x 18.80)
# título, precio comparado, precio de Mae, etiqueta de arriba, etiqueta de Mae, pastilla de abajo, ¿no se vende en México?
PRODUCTOS = {
    "leopardo":     ("Leopardo rosa con cerezas", 6026, 3019, "True Religion México · solo sudadera", "Conmigo · conjunto", "Sudadera + pants 💗", False),
    "cereza-rosa":  ("Cerezas de cristal · rosa", 4850, 3623, "Precio de etiqueta", "Conmigo", None, True),
    "cereza-negra": ("Cerezas de cristal · negro", 4850, 3623, "Precio de etiqueta", "Conmigo", None, True),
    "camo-azul":    ("Camo Groovy · azul", 4286, 2281, "Precio de etiqueta", "Conmigo", None, True),
    "camo-rojo":    ("Camo Groovy · rojo", 4286, 2281, "Precio de etiqueta", "Conmigo", None, True),
}
if SUF:  # para revender: el precio de referencia es a cuánto lo podría vender (no se tacha) y la ganancia
    PRODUCTOS = {k: (v[0], v[1], v[2], v[3], "Te cuesta conmigo", f"Ganas hasta ${v[1] - v[2]:,}", v[6]) for k, v in PRODUCTOS.items()}
# (qué pasa en la escena, video, segundo de inicio): dónde se ve cada conjunto en la caja
ESCENAS = {
    "": [("no_envia", "4656", 300.0), ("leopardo", "4656", 305.5), ("whatsapp", "4655", 62.0), ("cerezas", "4655", 88.0),
         ("camo", "4656", 168.0), ("condiciones", "4656", 345.0), ("cta", "4655", 204.0)],
    "-mayoreo": [("ganancia", "4655", 196.0), ("camo", "4656", 168.0), ("nadie", "4655", 98.0), ("cerezas", "4655", 88.0),
                 ("mayoreo", "4656", 345.0), ("grupo", "4656", 372.0)],
}[SUF]


SDR = ("zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,"
       "tonemap=reinhard:param=0.6:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24")


def frames(vid, ini, n):
    ruta = next(r for r in (os.path.join(CRUDO, f"IMG_{vid}.MOV"), os.path.join(CRUDO, f"IMG_{vid}-1080p.mp4")) if os.path.exists(r))
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(ini), "-i", ruta, "-t", f"{n / FPS + 0.3:.2f}",
                          "-vf", f"{SDR},fps={FPS},scale={W}:{H}:flags=lanczos",  # el iPhone graba en HDR
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


def mxn(v): return f"${v:,.0f}"


@lru_cache(None)
def foto(nombre):
    """foto de la tienda en tarjeta blanca con sombra"""
    im = Image.open(os.path.join(AQUI, "fotos", nombre + ".jpg")).convert("RGB")
    im = im.resize((430, int(im.height * 430 / im.width)), Image.LANCZOS).crop((0, 0, 430, 620))
    card = Image.new("RGBA", (430 + 24 + 60, 620 + 24 + 60))
    sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 40, 30 + 454, 40 + 644), 34, fill=120)
    card.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(card).rounded_rectangle((30, 30, 30 + 454, 30 + 644), 34, fill=WHITE)
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 429, 619), 24, fill=255)
    card.paste(im, (42, 42), m)
    return card


@lru_cache(None)
def precio_card(normal, mio, et_normal, et_mio, pie, tachado=True):
    """columna de precios: el de referencia tachado, el de Mae, + envío y ahorras (o lo que incluye)"""
    im = Image.new("RGBA", (470, 560)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 469, 559), 40, fill=(255, 255, 255, 235))
    fe = b.F("Bold", 32)
    while fe.getlength(et_normal) > 440: fe = b.F("Bold", fe.size - 2)
    d.text((235, 60), et_normal, font=fe, fill=GREY, anchor="mm")
    f = b.F("ExtraBold", 66); s = mxn(normal); w = f.getlength(s)
    d.text((235, 125), s, font=f, fill=GREY if tachado else INK, anchor="mm")
    if tachado: d.line((235 - w / 2 - 6, 132, 235 + w / 2 + 6, 112), fill=(220, 60, 60), width=8)
    d.text((235, 225), et_mio, font=b.F("Bold", 36), fill=DEEP, anchor="mm")
    d.text((235, 310), mxn(mio), font=b.F("ExtraBold", 104), fill=PINK, anchor="mm")
    d.text((235, 385), "+ envío", font=b.F("SemiBold", 28), fill=GREY, anchor="mm")
    p = b.pastilla(pie or f"Ahorras {mxn(normal - mio)}", "ExtraBold", 40, GREEN, WHITE)
    im.alpha_composite(p, ((470 - p.width) // 2, 440))
    return im


def tarjeta_producto(L, nombre, t, t_foto, t_normal, t_mio):
    tit, normal, mio, et_n, et_m, pie, no_mx = PRODUCTOS[nombre]
    b.pon(L, b.pastilla(tit, "Bold", 40, WHITE, DEEP), W / 2, 200, *b.entra(t, t_foto, 0.35))
    b.pon(L, foto(nombre), 300, 640, *b.entra(t, t_foto, 0.45))
    if t >= t_normal:
        s, a = b.entra(t, t_normal, 0.35)
        pc = precio_card(normal, mio, et_n, et_m, pie, not SUF)
        if no_mx: b.pon(L, b.pastilla("🇲🇽 No se vende en México", "Bold", 38, (196, 40, 60), WHITE), W / 2, 1050, s, a)
        if t < t_mio:  # primero solo el precio normal
            pc = pc.crop((0, 0, pc.width, 170)); y = 330 + 85
        else:
            y = 330 + 280
        b.pon(L, pc, 800, y, s if t < t_mio else 1, a)


def pastilla_escena(L, t, t0, s, y, bg=WHITE, fg=INK, sz=46):
    b.pon(L, b.pastilla(s, "Bold", sz, bg, fg), W / 2, y, *b.entra(t, t0, 0.35))


# ---------- diseño de la versión mayoreo: negro y verde, fotos tipo polaroid y "ticket de ganancia" ----------
BEBAS = os.path.join(os.path.dirname(AQUI), "carruseles", "fuentes", "BebasNeue-Regular.ttf")
NOCHE = (18, 18, 20); LIMA = (64, 220, 120); CREMA = (255, 252, 244)
COLOR = {"camo-azul": "AZUL", "camo-rojo": "ROJO", "cereza-rosa": "ROSA", "cereza-negra": "NEGRO"}


def FB(sz): return b.ImageFont.truetype(BEBAS, sz)


def sombrea(L, k=150, y0=0, y1=H):
    """oscurece el video para que resalte lo de encima"""
    L.alpha_composite(Image.new("RGBA", (W, y1 - y0), (10, 10, 12, k)), (0, y0))


@lru_cache(None)
def polaroid(nombre, ang):
    """foto de la tienda en marco blanco de polaroid, con el color abajo, ladeada"""
    im = Image.open(os.path.join(AQUI, "fotos", nombre + ".jpg")).convert("RGB")
    im = im.resize((420, int(im.height * 420 / im.width)), Image.LANCZOS).crop((0, 0, 420, 540))
    c = Image.new("RGBA", (420 + 56, 540 + 150), CREMA + (255,)); c.paste(im, (28, 28))
    ImageDraw.Draw(c).text((c.width / 2, 540 + 28 + 62), COLOR[nombre], font=FB(70), fill=NOCHE, anchor="mm")
    out = Image.new("RGBA", (c.width + 80, c.height + 80))
    sh = Image.new("L", out.size, 0); ImageDraw.Draw(sh).rectangle((40, 52, 40 + c.width, 52 + c.height), fill=150)
    out.putalpha(sh.filter(ImageFilter.GaussianBlur(20))); out.alpha_composite(c, (40, 40))
    return out.rotate(ang, expand=True, resample=Image.BICUBIC)


def ticket(normal, mio, a1, a2, a3):
    """recibo: precio de etiqueta, lo que le cuesta con Mae y su ganancia (a1..a3 = qué tanto se ve cada renglón)"""
    w, h = 860, 440; im = Image.new("RGBA", (w, h + 24)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, w, h), fill=CREMA + (255,))
    d.polygon([(0, h)] + sum(([(x + 20, h + 22), (x + 40, h)] for x in range(0, w, 40)), []), fill=CREMA + (255,))  # orilla de papel cortado
    d.text((w / 2, 50), "TICKET DE GANANCIA", font=FB(58), fill=NOCHE, anchor="mm")
    for x in range(40, w - 40, 26): d.line((x, 92, x + 13, 92), fill=(170, 170, 170), width=3)

    def renglon(y, izq, der, color, sz, a):
        if a <= 0.01: return
        r = Image.new("RGBA", (w, sz + 20)); dr = ImageDraw.Draw(r)
        dr.text((44, r.height / 2), izq, font=FB(int(sz * 0.62)), fill=(80, 80, 84), anchor="lm")
        dr.text((w - 44, r.height / 2), der, font=FB(sz), fill=color, anchor="rm")
        r.putalpha(r.getchannel("A").point(lambda v: int(v * min(1, a))))
        im.alpha_composite(r, (int(-30 * (1 - min(1, a))), int(y - r.height / 2)))
    renglon(150, "PRECIO DE ETIQUETA", mxn(normal), NOCHE, 74, a1)
    renglon(238, "TE CUESTA CONMIGO (+ ENVÍO)", "−" + mxn(mio), (200, 50, 70), 74, a2)
    if a3 > 0.01:
        for x in range(40, w - 40, 26): d.line((x, 292, x + 13, 292), fill=(170, 170, 170), width=3)
        d.rounded_rectangle((26, 312, w - 26, 420), 26, fill=(220, 248, 228))
    renglon(366, "GANAS HASTA", "+" + mxn(normal - mio), (14, 140, 64), 104, a3)
    return im


def tarjeta_mayoreo(L, a, bb, t, t_cambio, t_rows):
    """dos colores del conjunto (polaroids que se apilan) y el ticket que se va llenando"""
    tit = PRODUCTOS[a][0].split(" · ")[0]
    b.pon(L, b.pastilla(tit.upper() + "  ·  TRUE RELIGION", "ExtraBold", 40, NOCHE, WHITE), W / 2, 150, *b.entra(t, 0.0, 0.35))
    if t < t_cambio:
        s, op = b.entra(t, 0.05, 0.45); b.pon(L, polaroid(a, 3), W / 2, 520, 0.85 * s, op)
    else:
        k = b.ease((t - t_cambio) / 0.45); s, op = b.entra(t, t_cambio, 0.45)
        b.pon(L, polaroid(a, 7), W / 2 - 190 * k, 535, 0.85)
        b.pon(L, polaroid(bb, -5), W / 2 + 180, 515, 0.85 * s, op)
    al = [min(1.0, max(0.0, (t - r) / 0.3)) for r in t_rows]
    if t >= t_rows[0]:
        s, op = b.entra(t, t_rows[0] - 0.25, 0.35)
        normal, mio = PRODUCTOS[a][1], PRODUCTOS[a][2]
        b.pon(L, ticket(normal, mio, *al), W / 2, 1120, s, op)


def lista(L, t, filas, y0, paso=118):
    """tarjeta negra con renglones que se van palomeando"""
    vis = [f for f in filas if t >= f[0]]
    if not vis: return
    alto = paso * len(filas) + 60
    caja = Image.new("RGBA", (920, alto)); ImageDraw.Draw(caja).rounded_rectangle((0, 0, 919, alto - 1), 44, fill=NOCHE + (232,))
    b.pon(L, caja, W / 2, y0 + alto / 2, *b.entra(t, filas[0][0] - 0.2, 0.35))
    for i, (t0, txt) in enumerate(filas):
        if t < t0: continue
        s, a = b.entra(t, t0, 0.35); y = y0 + 30 + paso * i + paso / 2
        chk = Image.new("RGBA", (76, 76)); dc = ImageDraw.Draw(chk); dc.ellipse((0, 0, 75, 75), fill=LIMA)
        dc.line([(20, 40), (33, 53), (57, 26)], fill=NOCHE, width=9, joint="curve")
        b.pon(L, chk, 120, y, s, a)
        tx = b.linea(txt, "Bold", 46, WHITE)
        L.alpha_composite(tx, (180, int(y - tx.height / 2))) if a > 0.99 else b.pon(L, tx, 180 + tx.width / 2, y, 1, a)


def escena_mayoreo(tipo, m, t, L):
    if tipo == "ganancia":  # gancho para emprendedoras
        sombrea(L, 140)
        b.pon(L, b.pastilla("TRUE RELIGION ORIGINAL 🇺🇸", "ExtraBold", 44, WHITE, NOCHE), W / 2, 200, *b.entra(t, 0.0, 0.3))
        b.pon(L, b.linea("GANA MÁS DE", "ExtraBold", 92, WHITE), W / 2, 430, *b.entra(t, 0.05, 0.35))
        pulso = 1 + 0.12 * max(0.0, 1 - abs(t - m[1] - 0.15) / 0.3)  # late cuando dice "dos mil"
        num = Image.new("RGBA", (980, 400)); ImageDraw.Draw(num).text((490, 200), "$2,000", font=FB(380), fill=LIMA, anchor="mm")
        brillo = num.filter(ImageFilter.GaussianBlur(26)); num = Image.alpha_composite(brillo, num)
        b.pon(L, num, W / 2, 680, b.entra(t, 0.15, 0.45)[0] * pulso, b.entra(t, 0.15)[1])
        b.pon(L, b.linea("POR CONJUNTO", "ExtraBold", 92, WHITE), W / 2, 930, *b.entra(t, 0.3, 0.35))
        b.pon(L, b.linea("*según a cuánto lo vendas", "SemiBold", 34, (220, 220, 220)), W / 2, 1030, *b.entra(t, 0.4, 0.35))
    elif tipo == "camo":  # azul y luego rojo; el ticket con "son más de dos mil" al final
        sombrea(L, 90)
        tarjeta_mayoreo(L, "camo-azul", "camo-rojo", t, m[0], (m[1], m[2], m[3]))
    elif tipo == "cerezas":
        sombrea(L, 90)
        tarjeta_mayoreo(L, "cereza-rosa", "cereza-negra", t, m[0], (m[1], m[2], m[2] + 1.6))
    elif tipo == "nadie":
        sombrea(L, 110)
        b.pon(L, b.linea("CASI NADIE", "ExtraBold", 120, LIMA), W / 2, 470, *b.entra(t, m[0], 0.4))
        b.pon(L, b.linea("lo tiene en México", "ExtraBold", 76, WHITE), W / 2, 590, *b.entra(t, m[0] + 0.3, 0.4))
        b.pon(L, b.pastilla("🇺🇸 True Religion USA no envía a México 🚫", "Bold", 38, WHITE, NOCHE), W / 2, 760, *b.entra(t, m[1], 0.35))
    elif tipo == "mayoreo":
        sombrea(L, 90)
        b.pon(L, b.linea("PARA EMPEZAR", "ExtraBold", 84, WHITE, stroke=8, sfill=NOCHE), W / 2, 330, *b.entra(t, 0.0, 0.35))
        lista(L, t, [(m[0], "Mayoreo desde 1 pieza 🛍️"), (m[0] + 2.2, "Sin invertir mucho 💸"),
                     (m[1], "Original, con etiqueta 🏷️"), (m[2], "Llega en ~1 semana 📦")], 440)
    elif tipo == "grupo":  # invitación al grupo de WhatsApp con el QR
        sombrea(L, 130)
        b.pon(L, b.pastilla("💬 Únete a mi grupo de WhatsApp", "ExtraBold", 46, WA, WHITE), W / 2, 190, *b.entra(t, m[0], 0.35))
        chips = [(dt, b.pastilla(txt, "Bold", 32, NOCHE, WHITE, padx=24, pady=10))
                 for dt, txt in [(m[1], "🆕 Novedades"), (m[1] + 0.6, "💸 Descuentos"), (m[2], "🤝 Emprendemos juntas")]]
        x = W / 2 - (sum(c.width for _, c in chips) + 20 * (len(chips) - 1)) / 2  # en un renglón, centrados
        for dt, c in chips:
            b.pon(L, c, x + c.width / 2, 300, *b.entra(t, dt, 0.35)); x += c.width + 20
        b.pon(L, qr(), W / 2, 760, *b.entra(t, m[0] + 0.4, 0.45))
        if t >= m[3]: b.pon(L, b.pastilla("📲 Escanea el código", "ExtraBold", 52, LIMA, NOCHE), W / 2, 1180, *b.entra(t, m[3], 0.35))


@lru_cache(None)
def qr():
    sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "carruseles"))
    import whatsapp
    return whatsapp.tarjeta(500)


def portada_mayoreo():
    """portada distinta a la de clientas: noche, dos polaroids del Camo y el ticket lleno"""
    L = next(frames("4656", 170.0, 1)); sombrea(L, 150)
    sz = 210
    while FB(sz).getlength("¿CUÁNTO GANAS?") > 980: sz -= 6
    t1 = Image.new("RGBA", (1040, 240)); ImageDraw.Draw(t1).text((520, 120), "¿CUÁNTO GANAS?", font=FB(sz), fill=WHITE, anchor="mm")
    b.pon(L, t1, W / 2, 160)
    b.pon(L, b.pastilla("revendiendo True Religion original 🇺🇸", "Bold", 40, LIMA, NOCHE), W / 2, 305)
    b.pon(L, polaroid("camo-azul", 7), W / 2 - 200, 770, 0.92)
    b.pon(L, polaroid("camo-rojo", -5), W / 2 + 190, 750, 0.92)
    b.pon(L, ticket(PRODUCTOS["camo-azul"][1], PRODUCTOS["camo-azul"][2], 1, 1, 1), W / 2, 1370)
    b.pon(L, b.pastilla("🛍️ Mayoreo desde 1 pieza", "ExtraBold", 50, WHITE, NOCHE), W / 2, 1720)
    L.convert("RGB").save(os.path.join(AQUI, "portada-mayoreo.jpg"), quality=92); print("ok portada-mayoreo.jpg")


SFX = []

def escena(k, n, f0):
    e = T[k]; m = e.get("marcas", []); tipo, vid, ini = ESCENAS[k]
    for f, L in enumerate(frames(vid, ini, n)):
        t = f / FPS
        if SUF: escena_mayoreo(tipo, m, t, L)
        elif tipo == "no_envia":  # gancho para clientas
            b.pon(L, b.linea("True Religion original 🇺🇸", "ExtraBold", 64, INK, stroke=10, sfill=WHITE), W / 2, 110)
            b.pon(L, b.pastilla("🇺🇸 True Religion en EE. UU.", "Bold", 52, WHITE, INK), W / 2, 420)
            b.pon(L, b.pastilla("no envía a México 🚫", "ExtraBold", 60, (196, 40, 60), WHITE), W / 2, 535)
            pastilla_escena(L, t, m[1], "📦 Yo te lo traigo… ¡y más barato!", 680, PINK, WHITE, 50)
        elif tipo == "ganancia":  # gancho para emprendedoras
            b.pon(L, b.linea("True Religion original 🇺🇸", "ExtraBold", 64, INK, stroke=10, sfill=WHITE), W / 2, 110)
            b.pon(L, b.linea("Gana hasta", "ExtraBold", 96, WHITE, stroke=12, sfill=(45, 20, 35)), W / 2, 430)
            b.pon(L, b.pastilla("💸 $3,000", "ExtraBold", 120, GREEN, WHITE), W / 2, 590)
            b.pon(L, b.linea("por conjunto", "ExtraBold", 80, WHITE, stroke=12, sfill=(45, 20, 35)), W / 2, 760)
            b.pon(L, b.linea("*según a cuánto lo vendas", "SemiBold", 34, WHITE, stroke=6, sfill=(45, 20, 35)), W / 2, 860)
        elif tipo == "leopardo":
            tarjeta_producto(L, "leopardo", t, 0.0, m[0], m[1])
        elif tipo == "whatsapp":
            pastilla_escena(L, t, m[0], "💬 Pídelo por WhatsApp", 420, WA, WHITE, 50)
            pastilla_escena(L, t, m[0] + 1.2, "🛍️ Yo lo compro por ti", 530, WHITE, INK)
            pastilla_escena(L, t, m[1], "✅ Original, con etiquetas", 640, WHITE, GREEN)
        elif tipo == "nadie":
            pastilla_escena(L, t, m[0], "✨ Casi nadie lo tiene en México", 420, PINK, WHITE, 48)
            pastilla_escena(L, t, m[1], "🇺🇸 True Religion en EE. UU. no envía a México", 530, WHITE, INK, 38)
        elif tipo == "cerezas":  # rosa y luego negro
            nombre = "cereza-negra" if t >= m[0] else "cereza-rosa"
            tarjeta_producto(L, nombre, t, 0.0 if nombre == "cereza-rosa" else m[0], m[1], m[2])
        elif tipo == "camo":  # azul y luego rojo
            nombre = "camo-rojo" if t >= m[0] else "camo-azul"
            tarjeta_producto(L, nombre, t, 0.0 if nombre == "camo-azul" else m[0], m[1], m[2])
        elif tipo == "condiciones":
            pastilla_escena(L, t, m[0], "🛍️ Mayoreo desde 1 pieza", 420, PINK, WHITE, 52)
            pastilla_escena(L, t, m[1], "💳 Transferencia o tarjeta", 530, WHITE, INK)
            pastilla_escena(L, t, m[2], "📦 ~1 semana a todo México", 640, WHITE, INK)
        elif tipo == "mayoreo":
            pastilla_escena(L, t, m[0], "🛍️ Mayoreo desde 1 pieza", 420, PINK, WHITE, 52)
            pastilla_escena(L, t, m[1], "✅ Original, con etiqueta", 530, WHITE, GREEN)
            pastilla_escena(L, t, m[2], "📦 ~1 semana a todo México", 640, WHITE, INK)
        elif tipo == "grupo":  # invitación al grupo de WhatsApp
            pastilla_escena(L, t, m[0], "💬 Únete a mi grupo de WhatsApp", 360, WA, WHITE, 50)
            pastilla_escena(L, t, m[1], "🆕 Novedades", 480, WHITE, INK, 44)
            pastilla_escena(L, t, m[1] + 0.6, "💸 Descuentos", 580, WHITE, INK, 44)
            pastilla_escena(L, t, m[2], "🤝 Emprendemos juntas", 680, WHITE, INK, 44)
            pastilla_escena(L, t, m[3], "Comenta “Me quiero unir” 👇", 830, PINK, WHITE, 56)
        elif tipo == "cta":
            pastilla_escena(L, t, m[0], "💬 Escríbeme por WhatsApp", 560, WA, WHITE, 60)
            pastilla_escena(L, t, m[0] + 0.5, "alpacca.mx", 680, WHITE, DEEP, 44)
        yield L
    # sonidos: pop al salir cada cosa y brillo en el precio de Mae
    for i, tm in enumerate(m):
        SFX.append((f0 / FPS + tm, "glitter" if (tipo in ("leopardo", "cerezas", "camo") and i == len(m) - 1) else "pop"))
    if tipo == "ganancia": SFX.append((f0 / FPS + 0.1, "glitter"))
    if tipo == "cerezas" and SUF: SFX.append((f0 / FPS + m[2] + 1.6, "glitter"))  # aparece la ganancia


# ---------- subtítulos (palabra por palabra, la que se dice en rosa) ----------
def _palabras():
    frases = json.load(open(os.path.join(AQUI, f"narracion{SUF}.json"))); out = []; t0 = 0.0
    for n, (fr, e) in enumerate(zip(frases, T)):
        pre = "uf7lwaqO0yghLWPq8lJ7|" if SUF else ""  # la de mayoreo va con la voz "Mae v4" (ver voz.py)
        k = hashlib.sha1(f"{pre}eleven_v4|0.5|{fr['texto']}".encode()).hexdigest()[:12]
        a = json.load(open(os.path.join(AQUI, "voz", "cache", k + ".json")))["alignment"]
        ch, st = a["characters"], a["character_start_times_seconds"]
        ini = max(0.0, st[0] - 0.03); off = 0.25 if n == 0 else 0.0
        txt = "".join(ch); quitar = set()
        for mm in re.finditer(r"\[[^\]]*\]", txt): quitar.update(range(mm.start(), mm.end()))
        pal, tp = "", None
        for i, c in enumerate(ch):
            if i in quitar: continue
            if c.isspace():
                if pal: out.append((t0 + off + (tp - ini) / 1.1, pal)); pal = ""
                continue
            if not pal: tp = st[i]
            pal += c
        if pal: out.append((t0 + off + (tp - ini) / 1.1, pal))
        out.append((t0 + e["dur"] - 0.15, None)); t0 += e["dur"]
    return out

def _bloques():
    ws, bl, cur = _palabras(), [], []
    for t, w in ws:
        if w is None:
            if cur: bl.append(cur); cur = []
            continue
        cur.append((t, w))
        if len(cur) >= 4 or len(" ".join(x for _, x in cur)) > 20 or w[-1] in ".!?" or w[-1] in ",:;" and len(cur) >= 2:
            bl.append(cur); cur = []
    if cur: bl.append(cur)
    return [(c[0][0], min(bl[i + 1][0][0] if i + 1 < len(bl) else c[-1][0] + 1.0, c[-1][0] + 0.9), c) for i, c in enumerate(bl)]

SUBS = _bloques()

@lru_cache(None)
def _sub_img(k, activa):
    pal = [w for _, w in SUBS[k][2]]; sz = 62
    while True:
        f = b.F("ExtraBold", sz); esp = f.getlength(" ")
        w = sum(f.getlength(p) for p in pal) + esp * (len(pal) - 1)
        if w <= 900 or sz <= 40: break
        sz -= 4
    im = Image.new("RGBA", (int(w) + 40, int(sz * 1.6))); d = ImageDraw.Draw(im); x = 20
    for i, p in enumerate(pal):
        d.text((x, im.height / 2), p, font=f, anchor="lm", fill=((140, 255, 170) if SUF else (255, 182, 206)) if i == activa else WHITE, stroke_width=9, stroke_fill=(45, 20, 35))
        x += f.getlength(p) + esp
    return im

def subtitula(L, tg):
    for k, (t0, t1, c) in enumerate(SUBS):
        if t0 <= tg < t1:
            activa = max(i for i, (tw, _) in enumerate(c) if tw <= tg) if tg >= c[0][0] else 0
            b.pon(L, _sub_img(k, activa), W / 2, 1430); return


def escenas():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    q = lambda s: int(round(s * FPS))
    for k in range(len(T)):
        yield from escena(k, q(ini[k + 1]) - q(ini[k]), q(ini[k]))


def portada():
    """portada: el leopardo en la caja con la foto de la tienda y los dos precios"""
    if SUF: return portada_mayoreo()
    L = next(frames("4656", 310.0, 1))
    g = Image.new("L", (1, H)); [g.putpixel((0, y), int(150 * max(0, (y - 1300) / (H - 1300)) ** 1.3)) for y in range(H)]
    som = Image.new("RGBA", (W, H), (40, 15, 30, 255)); som.putalpha(g.resize((W, H))); L.alpha_composite(som)
    b.pon(L, b.linea("True Religion original 🇺🇸", "ExtraBold", 72, INK, stroke=12, sfill=WHITE), W / 2, 95)
    tarjeta_producto(L, "leopardo", 9, -1, 0, 0)
    if SUF:
        b.pon(L, b.linea("Gana hasta $3,000 por conjunto 💸", "ExtraBold", 60, WHITE, stroke=10, sfill=(45, 20, 35)), W / 2, 1180)
        b.pon(L, b.pastilla("Mayoreo desde 1 pieza", "Bold", 50, PINK, WHITE), W / 2, 1310)
    else:
        b.pon(L, b.linea("Conjuntos desde $2,281", "ExtraBold", 66, WHITE, stroke=10, sfill=(45, 20, 35)), W / 2, 1180)
        b.pon(L, b.pastilla("💬 Pídelo por WhatsApp", "Bold", 50, WA, WHITE), W / 2, 1310)
    L.convert("RGB").save(os.path.join(AQUI, f"portada{SUF}.jpg"), quality=92); print(f"ok portada{SUF}.jpg")


if __name__ == "__main__":
    portada()
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    cnt = 0
    for fr in escenas():
        subtitula(fr, cnt / FPS)
        p.stdin.write(fr.convert("RGB").tobytes()); cnt += 1
    p.stdin.close(); p.wait(); print("ok", OUT, f"{cnt / FPS:.1f}s")
    voz = os.path.join(AQUI, f"voz{SUF}", "narracion.wav"); final = OUT.replace(".mp4", "-voz.mp4")
    GAN = {"click": 0.3, "glitter": 0.35, "pop": 0.3}
    ins, fil = ["-i", OUT, "-i", voz], ["[1:a]aformat=channel_layouts=stereo[v]"]
    for j, (t, s) in enumerate(SFX):
        ins += ["-i", os.path.join(b.SFX_DIR, s + ".wav")]; ms = int(t * 1000)
        fil.append(f"[{j + 2}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},volume={GAN[s]}[s{j}]")
    fil.append("[v]" + "".join(f"[s{j}]" for j in range(len(SFX))) + f"amix=inputs={len(SFX) + 1}:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fil), "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    print("ok", final)
