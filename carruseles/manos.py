"""Carrusel "cosas que valen cada centavo" con fotos reales de Mae sosteniendo cada producto (estilo @yourdailyglow_ pt.5),
1080x1440. Cada lámina: foto a pantalla completa, caja arriba con marca y producto,
caja abajo con la frase, el precio, la comparación y lo que se ahorra.
Uso: python3 manos.py NOMBRE -> NOMBRE/01.jpg, ... (guion en guion_NOMBRE.py)"""
from precios_mx import comparacion
import importlib, os, sys
from centavo import W, H, NEGRO, b, bloque, portada, faltaron, whatsapp, FONDO
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))


def foto(ruta, y=0.3):
    """recorta la foto vertical a 3:4; y = qué tan abajo se recorta (0 arriba, 1 abajo)"""
    im = Image.open(ruta).convert("RGB")
    k = max(W / im.width, H / im.height); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    y0 = int((im.height - H) * y)
    return im.crop(((im.width - W) // 2, y0, (im.width - W) // 2 + W, y0 + H)).convert("RGBA")


def tarjeta_producto(L, nombre, alto=500, cy=650):
    """el producto recortado en una tarjeta blanca redondeada encima de la foto de la tienda"""
    from carrusel import foto as recorte
    im = recorte(nombre, alto * 0.82, 520)
    w, h = max(im.width + 120, 460), alto
    t = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(t).rounded_rectangle((0, 0, w - 1, h - 1), 48, fill=(255, 255, 255, 235))
    t.alpha_composite(im, ((w - im.width) // 2, (h - im.height) // 2))
    L.alpha_composite(t, (int(W / 2 - w / 2), int(cy - h / 2)))


ROSA, GRIS_T, TINTA_T = (232, 112, 145), (120, 120, 126), (30, 30, 34)


def renglones(s, fuente, ancho):
    out, cur = [], ""
    for pal in s.split():
        t = (cur + " " + pal).strip()
        if fuente.getlength(t) <= ancho or not cur: cur = t
        else: out.append(cur); cur = pal
    return out + [cur]


def caja(L, filas, y, ancho=900, abajo=False, extra=0):
    """caja blanca redondeada con renglones centrados: filas = [(texto, fuente, color, espacio_antes)].
    abajo=True: y es dónde termina la caja (se acomoda de abajo hacia arriba)"""
    lineas, alto = [], 44
    for txt, fnt, col, sep in filas:
        for i, r in enumerate(renglones(txt, fnt, ancho - 80)):
            hh = fnt.size * 1.22; lineas.append((r, fnt, col, alto + (sep if i == 0 else 0))); alto += hh + (sep if i == 0 else 0)
    alto += 30 + extra  # extra: espacio al fondo de la caja (para la pastilla de "Ahorras")
    y0 = y - alto if abajo else y
    d = ImageDraw.Draw(L)
    d.rounded_rectangle((W / 2 - ancho / 2, y0, W / 2 + ancho / 2, y0 + alto), 40, fill=(255, 255, 255, 240))
    for r, fnt, col, yy in lineas:
        d.text((W / 2, y0 + yy + fnt.size * 0.55), r, font=fnt, fill=col, anchor="mm")
    return y0, y0 + alto


def lamina(p):
    """arriba: caja con la marca y el producto (o la frase); en medio el producto o la foto de Mae;
    abajo: una caja con la frase, el precio de la preventa, la comparación y lo que se ahorra"""
    carpeta = "fotos-sephora" if p.get("tienda") else "fotos-mae"
    L = foto(os.path.join(AQUI, carpeta, p["foto"] + ".jpg"), p.get("y", 0.3))
    if p.get("producto"): tarjeta_producto(L, p["producto"])
    arriba = p["arriba"].replace("\n", " ")
    if ": " in arriba:
        marca, nombre = arriba.split(": ", 1)
        filas = [(marca.upper(), b.F("SemiBold", 30), GRIS_T, 0), (nombre[:1].upper() + nombre[1:], b.F("Bold", 50), TINTA_T, 6)]
    else:
        filas = [(arriba, b.F("Bold", 46), TINTA_T, 0)]
    _, yt = caja(L, filas, 60, 880)
    ImageDraw.Draw(L).text((W - 50, yt + 34), "@alpaccamx", font=b.F("Medium", 28), fill=(255, 255, 255), anchor="rm")
    c = comparacion(p)
    frase = p["abajo"][:1].upper() + p["abajo"][1:]
    filas = [(frase, b.F("SemiBold", 36), TINTA_T, 0),
             (f"{'Desde ' if p.get('desde') else ''}${p['precio']:,} en mi preventa", b.F("ExtraBold", 50), ROSA, 18)]
    if c: filas.append((f"En {c[0]}: ${c[1]:,}", b.F("SemiBold", 32), GRIS_T, 4))
    ah = b.pastilla(f"Ahorras ${c[1] - p['precio']:,}", "ExtraBold", 40, ROSA, b.WHITE, padx=40, pady=8) if c and c[1] > p["precio"] else None
    y0, y1 = caja(L, filas, H - 50, 920, abajo=True, extra=(ah.height + 16) if ah else 0)
    if ah: L.alpha_composite(ah, (int(W / 2 - ah.width / 2), int(y1 - 34 - ah.height)))
    return L


if __name__ == "__main__":
    nombre = sys.argv[1]
    g = importlib.import_module(f"guion_{nombre.replace('-', '_')}")
    import precios_mx; precios_mx.ajusta_guion(g)
    out = os.path.join(AQUI, nombre); os.makedirs(out, exist_ok=True)
    wa = whatsapp.lamina(W, H, FONDO, ["Únete a mi grupo", "de WhatsApp"], ["Ahí aviso de las preventas, ofertas", "y todo lo nuevo que llega"],
                         NEGRO, (70, 70, 74), lambda: b.F("Bold", 76), lambda: b.F("SemiBold", 38))
    laminas = [portada(g.PORTADA)] + [lamina(p) for p in g.PRODUCTOS] + [faltaron(g.FALTARON), wa]
    for i, L in enumerate(laminas, 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"{nombre}/{i:02d}.jpg")
