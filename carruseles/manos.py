"""Carrusel "cosas que valen cada centavo" con fotos reales de Mae sosteniendo cada producto (estilo @yourdailyglow_ pt.5),
1080x1440. Cada lámina: foto a pantalla completa, frase arriba y frase abajo en letra blanca con contorno, y el precio.
Uso: python3 manos.py NOMBRE -> NOMBRE/01.jpg, ... (guion en guion_NOMBRE.py)"""
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


def lamina(p):
    L = foto(os.path.join(AQUI, "fotos-mae", p["foto"] + ".jpg"), p.get("y", 0.3))
    # degradado oscuro arriba y abajo para que se lea el texto
    g = Image.new("L", (1, H))
    for yy in range(H):
        t = min(1, max(0, (360 - yy) / 360)) if yy < 360 else min(1, max(0, (yy - (H - 520)) / 520))
        g.putpixel((0, yy), int(130 * t))
    L.alpha_composite(Image.merge("RGBA", [Image.new("L", (W, H), 0)] * 3 + [g.resize((W, H))]))
    bloque(L, p["arriba"], W * p.get("x_arriba", 0.4), 120, 62, 760, "Bold", b.WHITE, 6, NEGRO, 1.12)
    y = bloque(L, p["abajo"], W * p.get("x_abajo", 0.58), H - 400, 48, 760, "SemiBold", b.WHITE, 5, NEGRO, 1.15)
    s = f"{'Desde ' if p.get('desde') else ''}${p['precio']:,} en mi preventa · Sephora ${p['antes']:,}"
    pi = b.pastilla(s, "Bold", 36, (232, 112, 145), b.WHITE, padx=30, pady=10)
    L.alpha_composite(pi, (int(W * p.get("x_abajo", 0.58) - pi.width / 2), int(y + 18)))
    ImageDraw.Draw(L).text((W - 40, 360), "@alpaccamx", font=b.F("Medium", 30), fill=(255, 255, 255), anchor="rm")
    return L


if __name__ == "__main__":
    nombre = sys.argv[1]
    g = importlib.import_module(f"guion_{nombre.replace('-', '_')}")
    out = os.path.join(AQUI, nombre); os.makedirs(out, exist_ok=True)
    wa = whatsapp.lamina(W, H, FONDO, ["Únete a mi grupo", "de WhatsApp"], ["Ahí aviso de las preventas, ofertas", "y todo lo nuevo que llega"],
                         NEGRO, (70, 70, 74), lambda: b.F("Bold", 76), lambda: b.F("SemiBold", 38))
    laminas = [portada(g.PORTADA)] + [lamina(p) for p in g.PRODUCTOS] + [faltaron(g.FALTARON), wa]
    for i, L in enumerate(laminas, 1):
        L.convert("RGB").save(os.path.join(out, f"{i:02d}.jpg"), quality=95); print("ok", f"{nombre}/{i:02d}.jpg")
