"""Videos del Sephora Sale (preventa en alpacca.mx/?ver=preventa): cortes rápidos de Mae empacando pedidos de Sephora
(videos del iPhone ya pasados a 1080p), una frase en pantalla, tarjetas de producto con el precio de la preventa y la
voz de Mae. 1080x1920, 30 fps.

Uso: python3 build.py VARIANTE CARPETA_DE_VIDEOS   (antes: python3 voz.py VARIANTE)
     VARIANTE = anuncio | emprende | empaque | top | ahorro | rubores | calendarios | caja | ultimos (con tomas de Mae)
              bestsellers | tips | regalos (solo fotos de las marcas, de fotos.py)  -> Sephora-VARIANTE-voz.mp4
Los videos de la carpeta se llaman IMG_xxxx.mp4. IMG_2510 es de e.l.f. (no es de Sephora): no se usa."""
import json, math, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
VAR, CRUDO = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "video-envio"))
sys.argv = [sys.argv[0], "/dev/null"]
import build as b
from PIL import Image, ImageDraw, ImageFilter

W, H, FPS = 1080, 1920, 30
PINK, WHITE, INK, GREY = b.PINK, b.WHITE, b.INK, (120, 120, 128)
T = json.load(open(os.path.join(AQUI, f"tiempos-{VAR}.json")))
OUT = os.path.join(AQUI, f"Sephora-{VAR}.mp4")
# los videos del iPhone vienen en HDR (HLG, BT.2020): sin esto se ven pálidos y deslavados. Se pasan a color normal (SDR)
SDR = ("zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,"
       "tonemap=reinhard:param=0.6:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24")

# precios de la preventa (Precio = con descuento; Antes = "Precio Sephora" que sale tachado en la página)
PRODUCTOS = {  # clave: (marca, nombre, precio, Precio Sephora, foto en fotos/ o None)
    "rare": ("Rare Beauty", "Soft Pinch Liquid Blush", 316, 395, "rare-blush"),
    "patrick": ("Patrick Ta", "Major Headlines Blush Duo", 493, 617, "patrick-duo"),
    "huda": ("Huda Beauty", "Easy Bake Setting Powder", 474, 592, None),
    "calendario": ("Sephora Favorites", "Calendario de adviento 2026", 2071, 2589, None),
    "rhode-tint": ("Rhode", "Peptide Lip Tint", 395, 493, "rhode-tint"),
    "rhode-pocket": ("Rhode", "Pocket Blush", 493, 617, "rhode-pocket"),
    "sf-balm": ("Summer Fridays", "Lip Butter Balm", 474, 592, "sf-balm"),
    "sf-minis": ("Summer Fridays", "Lip Butter Balm Minis", 493, 617, "sf-minis"),
    "laneige-lsm": ("Laneige", "Lip Sleeping Mask", 474, 592, "laneige-lsm"),
    "laneige-minis": ("Laneige", "Midnight Minis (5 piezas)", 454, 567, "laneige-minis"),
    "glow-dew": ("Glow Recipe", "Watermelon Dew Drops", 395, 493, "glow-dew"),
    "sol-c62": ("Sol de Janeiro", "Cheirosa 62 Perfume Mist", 513, 641, "sol-c62"),
    "touch-peanuts": ("Touchland", "Peanuts Hand Sanitizer", 237, 296, "touch-peanuts"),
    "tower-lipsoftie": ("Tower 28", "LipSoftie", 316, 395, "tower-lipsoftie"),
    "rare-comfort": ("Rare Beauty", "Find Comfort Lip Butter", 355, 444, "rare-comfort"),
    "rare-mini": ("Rare Beauty", "Mini Soft Pinch Liquid Blush", 316, 395, "rare-mini"),
    "saie-dew": ("Saie", "Dew Blush", 355, 444, "saie-dew"),
    "kosas-blush": ("Kosas", "Blush is Life", 277, 346, "kosas-blush"),
    "glow-cal": ("Glow Recipe", "12 Days of Glow 2026", 2170, 2712, "glow-cal"),
    "laneige-cal": ("Laneige", "12 Days of Wonder 2026", 2939, 3673, "laneige-cal"),
    "fav-experts": ("Sephora Favorites", "Makeup Experts · 13 productos", 1677, 2096, None),
    "fav-lip": ("Sephora Favorites", "Lip Kit · 9 productos", 967, 1208, None),
    "fav-holiday": ("Sephora Favorites", "Holiday Must-Haves · 5 productos", 493, 617, None),
    "fav-perfume": ("Sephora Favorites", "Perfume Sampler · 20 muestras", 1933, 2416, None),
    "patrick-duo": ("Patrick Ta", "Major Headlines Blush Duo", 493, 617, "patrick-duo"),
    "rare-blush": ("Rare Beauty", "Soft Pinch Liquid Blush", 316, 395, "rare-blush"),
}
# todas las tomas son de los pedidos del Sephora Sale del año pasado: se aclara con esta etiqueta para no confundir
ETIQUETA = "📦 Pedidos del Sephora Sale 2025"

# tomas en orden: (video, inicio, segundos, velocidad); se estiran parejo para llenar la voz. Sin video:
#   ("foto", nombre en fotos/, segundos, None), ("liso", None, segundos, None) = fondo de color,
#   ("vs", "producto1|producto2", segundos, None) = este o este
# fondo: rosa | negro | rojo | blanco (para las escenas sin video)
# o escenas: una lista de tomas por escena (segundos None = lo que falte de la escena)
# textos: (escena, marca o None, tipo, texto); uno a la vez. tipo "nada" quita el texto
# tarjetas: (escena, marca o None, segundos, producto)
VARIANTES = {
    "anuncio": dict(
        escenas=[[("2452", 10, 1.4, 1.5), ("1828", 120, 1.2, 3.0), ("1881", 140, None, 3.0)],
                 [("1830", 0.5, 1.4, 1.3), ("1861", 31, None, 1.0)],
                 # las marcas salen como lista sobre tomas generales (no hay tomas de Dior, Fenty ni Charlotte Tilbury)
                 [("1881", 100, 0.8, 3.0), ("1830", 22, 1.1, 1.0), ("1828", 130, None, 3.0)],
                 [("1829", 75, 2.0, 1.0), ("2452", 340, None, 1.2)],
                 [("1695", 7.0, 1.4, 1.0), ("2453", 89, 1.4, 1.0), ("2452", 20, None, 1.0)]],
        textos=[(0, None, "texto", "Lo que pidieron mis clientas\nen el Sephora Sale 2025 👀"),
                (1, 0, "grande", "SEPHORA SALE 2026"), (1, 1, "precio", "20% OFF"),
                (2, 0, "texto", "+2,000 productos"), (2, 1, "lista", "Dior"), (2, 2, "lista", "Dior\nRare Beauty"),
                (2, 3, "lista", "Dior\nRare Beauty\nFenty Beauty"), (2, 4, "lista", "Dior\nRare Beauty\nFenty Beauty\nCharlotte Tilbury\n…y muchas más 💗"),
                (3, 0, "texto", "Aparta con el 50% 💳"), (3, 1, "texto", "…y el resto cuando\nte llegue 📦"),
                (4, 0, "cta", "Hasta el 8 de noviembre ⏰"), (4, 1, "cta", "Aparta en alpacca.mx 🛍️")],
        tarjetas=[]),
    "emprende": dict(
        tomas=[("1881", 100, 1.5, 3.0), ("1830", 22, 1.3, 1.0), ("1830", 35, 1.5, 1.2), ("2452", 30, 1.5, 3.0), ("1861", 31, 1.4, 1.0),
               ("1828", 130, 1.5, 3.0), ("1695", 56, 1.4, 1.0), ("2453", 75, 1.5, 1.0), ("2452", 330, 1.6, 1.2), ("1829", 187, 1.5, 1.0),
               ("1881", 230, 1.8, 2.0)],
        textos=[(0, None, "texto", "¿Vendes maquillaje? 👀"), (0, 1, "grande", "SEPHORA SALE 2026"),
                (1, 0, "texto", "100% original ✅"), (1, 1, "precio", "20% OFF"),
                (2, 0, "texto", "Apartas con el 50% 💳"), (2, 1, "texto", "Tú le pones tu precio 💸"),
                (3, 0, "cta", "Comenta “Me quiero unir” 👇")],
        tarjetas=[]),
    "empaque": dict(
        tomas=[("2452", 0, 1.6, 2.0), ("2452", 19, 1.4, 1.0), ("1828", 100, 1.6, 3.0), ("1828", 145, 1.4, 1.0), ("1881", 120, 1.5, 3.0),
               ("2453", 43, 1.5, 1.5), ("1695", 20, 1.5, 2.0), ("1695", 60, 1.4, 1.0), ("1828", 186, 1.6, 2.0), ("1881", 228, 1.6, 2.5),
               ("1695", 84, 1.5, 1.0), ("2452", 372, 1.6, 1.0)],
        textos=[(0, None, "texto", "POV: los pedidos de mis clientas\nen el Sephora Sale 2025 📦"), (1, 0, "texto", "100% original ✅"),
                (1, 1, "texto", "Bien protegido 🫧"), (2, 0, "grande", "SEPHORA SALE 2026"), (2, 1, "precio", "20% OFF"),
                (3, 0, "cta", "Aparta en alpacca.mx 🛍️"), (3, 1, "cta", "Hasta el 8 de noviembre ⏰")],
        tarjetas=[]),
    "top": dict(
        escenas=[[("2452", 20, 1.4, 2.0), ("1830", 22, 1.2, 1.0), ("1881", 140, None, 3.0)],
                 [("1830", 8.5, None, 1.0)],
                 [("1829", 73, None, 1.0)],
                 [("1861", 30.5, None, 1.0)],
                 [("2452", 15, None, 1.0)],
                 [("1828", 130, 1.6, 3.0), ("2453", 89, 1.5, 1.0), ("1881", 225, None, 2.0)]],
        textos=[(0, None, "texto", "Lo más pedido en el\nSephora Sale 2025 💗"), (1, None, "nada", ""),
                (5, 0, "texto", "Este año, con descuento 💸"), (5, 1, "cta", "Preventa hasta el 8 de noviembre ⏰")],
        tarjetas=[(1, None, 2.6, "rare"), (2, None, 2.8, "patrick"), (3, None, 2.7, "huda"), (4, None, 3.2, "calendario")]),
    # ---- solo con fotos de las marcas (sin tomas de Mae) ----
    "bestsellers": dict(
        fondo="rosa", alpaca=("lupa", 860, 1330, 430, (0, 7)), foto_y=880, tarjeta_y=1450, texto_y=300,
        escenas=[[("foto", "rare-blush", 1.3, None), ("foto", "sf-balm", 1.3, None), ("foto", "glow-dew", None, None)],
                 [("foto", "rare-blush", None, None)], [("foto", "rhode-tint", None, None)], [("foto", "sf-balm", None, None)],
                 [("foto", "laneige-lsm", None, None)], [("foto", "glow-dew", None, None)], [("foto", "sol-c62", None, None)],
                 [("foto", "sf-minis", None, None)]],
        textos=[(0, None, "texto", "Bestsellers de Sephora que\nvale la pena aprovechar 💗"),
                (1, None, "grande", "#1"), (2, None, "grande", "#2"), (3, None, "grande", "#3"), (4, None, "grande", "#4"),
                (5, None, "grande", "#5"), (6, None, "grande", "#6"),
                (7, 0, "precio", "20% OFF"), (7, 1, "cta", "Aparta antes del 8 de noviembre ⏰")],
        tarjetas=[(1, None, None, "rare"), (2, None, None, "rhode-tint"), (3, None, None, "sf-balm"), (4, None, None, "laneige-lsm"),
                  (5, None, None, "glow-dew"), (6, None, None, "sol-c62")]),
    "tips": dict(
        alpaca=("espejo", 860, 1330, 430, (0, 5)), fondo="negro", foto_y=900, tarjeta_y=1450, texto_y=300,
        escenas=[[("foto", "rare-blush", 1.7, None), ("foto", "laneige-minis", 1.7, None), ("foto", "sf-balm", None, None)],
                 [("foto", "rhode-tint", None, None)], [("foto", "laneige-minis", None, None)], [("foto", "rare-mini", None, None)],
                 [("foto", "sf-balm", None, None)], [("foto", "glow-dew", 3.0, None), ("foto", "sol-c62", None, None)]],
        textos=[(0, None, "texto", "5 tips para que te rinda\nel Sephora Sale 💡"),
                (1, None, "texto", "Tip 1: haz tu lista\ndesde ahorita 📝"), (1, 1, "texto", "Lo más vendido\nse agota primero ⏳"),
                (2, None, "texto", "Tip 2: fíjate en\nlos sets 🎁"), (2, 1, "texto", "Casi siempre te sale mejor\nque por separado 💸"),
                (3, None, "texto", "Tip 3: aprovecha\nlos minis ✨"), (3, 1, "texto", "Para probar algo nuevo\no para regalar 🎀"),
                (4, None, "texto", "Tip 4: surte lo que\nmás usas 💄"),
                (5, None, "texto", "Tip 5: aparta antes del\n8 de noviembre ⏰"), (5, 1, "texto", "Con el 50% lo apartas 💳")],
        tarjetas=[(1, None, None, "rhode-tint"), (2, None, None, "laneige-minis"), (3, None, None, "rare-mini"), (4, None, None, "sf-balm")]),
    "regalos": dict(
        alpaca=("regalo", 860, 1330, 430, (0, 6)), fondo="rojo", foto_y=880, tarjeta_y=1450, texto_y=300,
        escenas=[[("foto", "touch-peanuts", 1.8, None), ("foto", "sf-minis", 1.8, None), ("foto", "laneige-minis", None, None)],
                 [("foto", "touch-peanuts", None, None)], [("foto", "tower-lipsoftie", None, None)], [("foto", "rare-comfort", None, None)],
                 [("foto", "laneige-minis", None, None)], [("foto", "sf-minis", None, None)],
                 [("foto", "rare-comfort", 2.5, None), ("foto", "tower-lipsoftie", None, None)]],
        textos=[(0, None, "texto", "Regalos de Navidad\nde Sephora 🎄"), (0, 1, "precio", "Menos de $500"),
                (1, None, "nada", ""), (6, 0, "cta", "Aparta en mi preventa 🛍️"), (6, 1, "cta", "Hasta el 8 de noviembre ⏰")],
        tarjetas=[(1, None, None, "touch-peanuts"), (2, None, None, "tower-lipsoftie"), (3, None, None, "rare-comfort"),
                  (4, None, None, "laneige-minis"), (5, None, None, "sf-minis")]),
    # ---- con tomas de los pedidos del año pasado ----
    "ahorro": dict(
        alpaca=("lupa", 860, 1330, 430, (0, 5)), foto_en_tarjeta=True, ahorro=True, tarjeta_y=480,
        escenas=[[("2452", 20, 1.4, 2.0), ("1881", 140, None, 3.0)],
                 [("1830", 8.5, None, 1.0)], [("1694", 60, None, 1.0)], [("1861", 30.5, None, 1.0)], [("2452", 15, None, 1.0)],
                 [("1828", 130, 1.8, 3.0), ("1699", 80, None, 6.0)]],
        textos=[(0, None, "texto", "¿Cuánto te ahorras en\nel Sephora Sale? 💸"), (1, None, "nada", ""),
                (5, 0, "texto", "Entre más pides,\nmás ahorras 💗"), (5, 1, "cta", "Aparta antes del 8 de noviembre ⏰")],
        tarjetas=[(1, None, None, "rare"), (2, None, None, "patrick"), (3, None, None, "huda"), (4, None, None, "calendario")]),
    "rubores": dict(
        foto_en_tarjeta=True, tarjeta_y=480, foto_y=1000,
        escenas=[[("1694", 132, 1.8, 1.0), ("1829", 62, None, 1.0)],
                 [("1830", 8.5, None, 1.0)], [("1694", 60, None, 1.0)], [("1694", 168, None, 1.0)], [("1701", 91, None, 1.0)],
                 [("foto", "rhode-pocket", None, None)],
                 [("1828", 150, 1.6, 3.0), ("1694", 48, None, 1.0)]],
        textos=[(0, None, "texto", "Los rubores más\nvirales de Sephora 💗"), (1, None, "nada", ""),
                (6, 0, "precio", "20% OFF"), (6, 1, "cta", "Aparta antes del 8 de noviembre ⏰")],
        tarjetas=[(1, None, None, "rare"), (2, None, None, "patrick"), (3, None, None, "saie-dew"), (4, None, None, "kosas-blush"),
                  (5, None, None, "rhode-pocket")]),
    "calendarios": dict(
        texto_y=420, etiqueta_y=1580, foto_y=1000,
        escenas=[[("2452", 12, 1.2, 1.5), ("2452", 10, None, 1.5)],
                 [("2452", 15, 2.2, 1.0), ("1695", 2.5, 2.0, 1.0), ("2451", 10, 2.0, 1.0), ("1701", 30, None, 1.0)],
                 [("foto", "glow-cal", 2.3, None), ("foto", "laneige-cal", None, None)],
                 [("2452", 30, 2.0, 3.0), ("1701", 60, None, 1.0)]],
        textos=[(0, None, "texto", "Calendarios de\nadviento 2026 🎁"),
                (1, 0, "lista", "Sephora Favorites · $2,071"), (1, 1, "lista", "Sephora Favorites · $2,071\nGlow Recipe · $2,170"),
                (1, 2, "lista", "Sephora Favorites · $2,071\nGlow Recipe · $2,170\nLaneige · $2,939"),
                (1, 3, "lista", "Sephora Favorites · $2,071\nGlow Recipe · $2,170\nLaneige · $2,939\nCharlotte Tilbury · $4,339\n…y varios más 💗"),
                (2, 0, "texto", "Todos con descuento 💸"), (2, 1, "precio", "Desde $1,361"),
                (3, 0, "texto", "Se agotan rápido ⏳"), (3, 1, "cta", "Aparta con el 50% · hasta el 8 nov ⏰")],
        tarjetas=[]),
    "caja": dict(
        tomas=[("1699", 0, 4.4, 45.0), ("1696", 0, 4.2, 42.0), ("2452", 0, 3.0, 25.0), ("1828", 95, 3.5, 30.0)],  # de vacía a llena
        textos=[(0, None, "texto", "Así se llena una caja\nde pedidos de Sephora 📦"), (1, 0, "texto", "100% original ✅"),
                (1, 1, "texto", "Bien acomodado 🫧"), (2, 0, "grande", "SEPHORA SALE 2026"), (2, 1, "cta", "Aparta en alpacca.mx 🛍️")],
        tarjetas=[]),
    "ultimos": dict(
        tomas=[("2452", 20, 1.4, 2.0), ("1830", 22, 1.3, 1.0), ("1694", 60, 1.4, 1.0), ("1881", 140, 1.5, 3.0), ("1701", 91, 1.4, 1.0),
               ("1699", 150, 1.5, 1.0), ("1828", 130, 1.5, 3.0), ("2453", 89, 1.4, 1.0), ("1694", 425, 1.6, 1.0), ("1696", 130, 1.6, 1.0)],
        textos=[(0, None, "grande", "⏰ ÚLTIMO AVISO"), (0, 1, "texto", "Mi preventa cierra el\n8 de noviembre"),
                (1, 0, "texto", "¿Todavía no apartas? 👀"), (2, 0, "texto", "Aparta con el 50% 💳"),
                (2, 1, "texto", "…y el resto cuando\nte llegue 📦"), (3, 0, "cta", "Aparta en alpacca.mx 🛍️")],
        tarjetas=[]),
    "esteoeste": dict(
        alpaca=("lupa", 860, 1600, 380, (0, 4)), fondo="blanco", texto_y=380,
        escenas=[[("vs", "rare-blush|patrick-duo", None, None)], [("vs", "rare-blush|patrick-duo", None, None)],
                 [("vs", "sf-balm|laneige-lsm", None, None)], [("vs", "rhode-tint|tower-lipsoftie", None, None)],
                 [("vs", "saie-dew|kosas-blush", None, None)]],
        textos=[(0, None, "grande", "ESTE O ESTE 👀"), (1, None, "grande", "RUBOR 💗"), (2, None, "grande", "LABIOS 💋"),
                (3, None, "grande", "GLOSS ✨"), (4, None, "texto", "Déjame en comentarios\ncuáles elegiste 👇"),
                (4, 1, "cta", "Preventa hasta el 8 de noviembre ⏰")],
        tarjetas=[]),
    "favorites": dict(
        alpaca=("caja", 800, 1450, 470, (1, 2, 3, 4, 5, 6)), tarjeta_escala=1.45, fondo="blanco", tarjeta_y=1000, texto_y=520,
        escenas=[[("2452", 10, 1.8, 1.5), ("2452", 12, None, 1.5)],
                 [("liso", None, None, None)], [("liso", None, None, None)], [("liso", None, None, None)],
                 [("liso", None, None, None)], [("liso", None, None, None)], [("2452", 20, 2.5, 1.0), ("1881", 140, None, 3.0)]],
        textos=[(0, None, "grande", "SEPHORA FAVORITES"), (0, 1, "texto", "Lo que más conviene\nen el sale 💡"),
                (1, None, "texto", "Sets que arma Sephora\ncon varias marcas 🎁"), (1, 1, "texto", "Te salen más baratos que\npor separado 💸"),
                (2, None, "grande", "#1"), (3, None, "grande", "#2"), (4, None, "grande", "#3"),
                (5, None, "texto", "También hay sets\nde perfumes 🌸"),
                (6, 0, "precio", "Con descuento"), (6, 1, "cta", "Aparta antes del 8 de noviembre ⏰")],
        tarjetas=[(2, None, None, "fav-experts"), (3, None, None, "fav-lip"), (4, None, None, "fav-holiday"), (5, 0, None, "fav-perfume")]),
}
CFG = VARIANTES[VAR]


def video(vid, ini, n, vel):
    vf = f"{SDR},setpts=PTS/{vel},fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(ini), "-i", os.path.join(CRUDO, f"IMG_{vid}.mp4"),
                          "-t", f"{n * vel / FPS + 0.3:.2f}", "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    last = None
    for _ in range(n):
        x = p.stdout.read(W * H * 3)
        if len(x) == W * H * 3: last = Image.frombytes("RGB", (W, H), x).convert("RGBA")
        yield last.copy()
    p.stdout.close(); p.wait()


_cards = {}
def tarjeta(k, con_foto=False, ahorro=False):
    """tarjeta blanca: (foto chica), marca, producto, precio de la preventa y el Precio Sephora tachado;
    con ahorro=True dice cuánto te ahorras"""
    if (k, con_foto, ahorro) in _cards: return _cards[(k, con_foto, ahorro)]
    marca, nombre, precio, antes, foto = PRODUCTOS[k]
    foto = foto if con_foto else None
    fw = 230 if foto else 0
    fn = b.F("ExtraBold", 54)
    while fn.getlength(nombre) > 760 - fw: fn = b.F("ExtraBold", fn.size - 4)
    pr = b.pastilla(f"${precio:,}", "ExtraBold", 76, PINK, WHITE, padx=34, pady=14)
    fa = b.F("SemiBold", 36); ta = f"Precio Sephora ${antes:,}"
    ah = b.pastilla(f"Te ahorras ${antes - precio:,}", "ExtraBold", 44, (22, 150, 80), WHITE, padx=26, pady=10) if ahorro else None
    w = int(max(fn.getlength(nombre), 520)) + 110 + fw; h = 330 + (ah.height + 14 if ah else 0)
    card = Image.new("RGBA", (w + 60, h + 60))
    sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 40, w + 30, h + 40), 34, fill=120)
    card.putalpha(sh.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(card); d.rounded_rectangle((30, 30, w + 30, h + 30), 34, fill=WHITE)
    if foto:
        im = Image.open(os.path.join(AQUI, "fotos", foto + ".jpg")).convert("RGB"); im.thumbnail((fw, h - 40), Image.LANCZOS)
        m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 20, fill=255)
        card.paste(im, (30 + 30 + (fw - im.width) // 2, 30 + (h - im.height) // 2), m)
    cx = 30 + fw + (w - fw) / 2
    d.text((cx, 82), marca.upper() + " · PREVENTA 2026", font=b.F("Bold", 30), fill=PINK, anchor="mm")
    d.text((cx, 142), nombre, font=fn, fill=INK, anchor="mm")
    card.alpha_composite(pr, (int(cx - pr.width / 2), 180))
    y = 180 + pr.height + 26
    d.text((cx, y), ta, font=fa, fill=GREY, anchor="mm")
    tw = fa.getlength(ta); d.line((cx - tw / 2 + fa.getlength("Precio Sephora "), y, cx + tw / 2, y), fill=(200, 40, 60), width=4)
    if ah: card.alpha_composite(ah, (int(cx - ah.width / 2), int(y + 30)))
    _cards[(k, con_foto, ahorro)] = card
    return card


FONDOS = {"rosa": ((253, 236, 242), (245, 206, 220)), "negro": ((28, 26, 30), (10, 10, 12)),
          "rojo": ((176, 28, 46), (110, 12, 26)), "blanco": ((255, 255, 255), (246, 240, 243))}
_fondo = {}
def fondo():
    k = CFG.get("fondo", "rosa")
    if k not in _fondo:
        (r1, g1, b1), (r2, g2, b2) = FONDOS[k]; g = Image.new("RGB", (1, H))
        for y in range(H):
            t = y / H; g.putpixel((0, y), (int(r1 + (r2 - r1) * t), int(g1 + (g2 - g1) * t), int(b1 + (b2 - b1) * t)))
        _fondo[k] = g.resize((W, H)).convert("RGBA")
    return _fondo[k].copy()


def foto_card(nombre, caja):
    im = Image.open(os.path.join(AQUI, "fotos", nombre + ".jpg")).convert("RGB"); im.thumbnail(caja, Image.LANCZOS)
    card = Image.new("RGBA", (im.width + 100, im.height + 100))
    sh = Image.new("L", card.size, 0); ImageDraw.Draw(sh).rounded_rectangle((40, 55, im.width + 60, im.height + 70), 40, fill=110)
    card.putalpha(sh.filter(ImageFilter.GaussianBlur(20)))
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 36, fill=255)
    card.paste(im, (50, 45), m)
    return card


def foto_escena(nombre, n):
    """escena sin video: fondo de color con la foto del producto grande en tarjeta blanca, acercándose despacio"""
    card = foto_card(nombre, (720, 760))
    for f in range(n):
        L = fondo()
        s_, a_ = b.entra(f / FPS, 0, 0.35)
        b.pon(L, card, W / 2, CFG.get("foto_y", 900), s_ * (1 + 0.04 * f / max(1, n)), a_)
        yield L


def liso(n):
    for _ in range(n): yield fondo()


def versus(par, n):
    """este o este: dos productos lado a lado con su precio y un VS en medio"""
    k1, k2 = par.split("|"); cards = []
    for k in (k1, k2):
        marca, nombre, precio, antes, foto = PRODUCTOS[k]
        c = foto_card(foto, (400, 520))
        lab = b.pastilla(marca, "ExtraBold", 50, WHITE, INK, padx=28, pady=12)
        pr = b.pastilla(f"${precio:,}", "ExtraBold", 64, PINK, WHITE, padx=30, pady=12)
        cards.append((c, lab, pr))
    vs = b.pastilla("VS", "ExtraBold", 90, INK, WHITE, padx=34, pady=20)
    for f in range(n):
        L = fondo(); t = f / FPS
        for i, (c, lab, pr) in enumerate(cards):
            x = W / 2 + (i * 2 - 1) * 258
            s_, a_ = b.entra(t, 0.15 * i, 0.35)
            b.pon(L, c, x, 900, s_, a_); b.pon(L, lab, x, 1250, s_, a_); b.pon(L, pr, x, 1360, s_, a_)
        b.pon(L, vs, W / 2, 900, *b.entra(t, 0.35, 0.3))
        yield L


_alp = {}
def pon_alpaca(L, t, t0, t1):
    """la alpaca de Alpacca en la esquina de abajo: entra con brinco, se mece y se despide encogiéndose"""
    nombre, x, y, alto = CFG["alpaca"][:4]
    if nombre not in _alp:
        im = Image.open(os.path.join(AQUI, "alpacas", nombre + ".png")).convert("RGBA")
        _alp[nombre] = im.resize((int(im.width * alto / im.height), alto), Image.LANCZOS)
    s_, a_ = b.entra(t - t0, 0, 0.45)
    if t1 - t < 0.25: s_ *= max(0.0, (t1 - t) / 0.25)
    if s_ <= 0.01: return
    ang = 5 * math.sin(2 * math.pi * 0.9 * (t - t0))
    im = _alp[nombre].rotate(ang, resample=Image.BICUBIC, expand=True)
    b.pon(L, im, x, y + 14 * math.sin(2 * math.pi * 1.4 * (t - t0)), s_, a_)


_etq = []
def etiqueta():
    if not _etq: _etq.append(b.pastilla(ETIQUETA, "Bold", 36, (30, 30, 34), WHITE, padx=26, pady=10))
    return _etq[0]


def texto(s, sz=62):
    oscuro = CFG.get("fondo") in ("blanco", "rosa")  # sobre fondo claro: letra negra con borde blanco
    while True:
        lineas = [b.linea(l, "ExtraBold", sz, INK if oscuro else WHITE, stroke=7, sfill=WHITE if oscuro else (20, 20, 20)) for l in s.split("\n")]
        if max(l.width for l in lineas) <= 960 or sz <= 40: break
        sz -= 4
    im = Image.new("RGBA", (max(l.width for l in lineas), sum(l.height - 18 for l in lineas) + 18)); y = 0
    for l in lineas: im.alpha_composite(l, ((im.width - l.width) // 2, y)); y += l.height - 18
    return im


def pon_texto(L, tipo, s, t, y):
    if tipo == "grande":  # SEPHORA SALE: pastilla negra con letra blanca, como el logo
        sz = 104
        while b.F("ExtraBold", sz).getlength(s) > 880: sz -= 6
        b.pon(L, b.pastilla(s, "ExtraBold", sz, INK, WHITE, padx=50, pady=24), W / 2, y, *b.entra(t, 0, 0.35))
    elif tipo == "texto":
        b.pon(L, texto(s), W / 2, y, *b.entra(t, 0, 0.3))
    elif tipo == "precio":
        b.pon(L, b.pastilla(s, "ExtraBold", 120, PINK, WHITE, padx=56, pady=26), W / 2, y, *b.entra(t, 0, 0.4))
    elif tipo == "lista":  # marcas una debajo de otra; solo la nueva entra con rebote
        lineas = s.split("\n")
        for i, l in enumerate(lineas):
            anim = b.entra(t, 0, 0.3) if i == len(lineas) - 1 else ()
            b.pon(L, b.pastilla(l, "ExtraBold", 66, WHITE, INK, padx=40, pady=18), W / 2, y - 140 + i * 125, *anim)
    elif tipo == "cta":
        b.pon(L, b.pastilla(s, "ExtraBold", 58, PINK, WHITE), W / 2, y, *b.entra(t, 0, 0.4))


SFX = []

def cuadros():
    ini = [0.0]
    for e in T: ini.append(ini[-1] + e["dur"])
    total = int(round(ini[-1] * FPS))
    def cuando(e, m): return max(0, int((ini[e] + (0 if m is None else T[e]["marcas"][m])) * FPS))
    cambios = sorted((cuando(e, m), tipo, s) for e, m, tipo, s in CFG["textos"])
    def fin(e): return cuando(e + 1, None) if e + 1 < len(T) else total
    cards = [(cuando(e, m), int(d * FPS) if d else fin(e) - cuando(e, m), k) for e, m, d, k in CFG["tarjetas"]]
    SFX.extend([(c / FPS, "pop") for c, tipo, _ in cambios[1:] if tipo != "nada"] + [(0.05, "glitter")] + [(c / FPS, "glitter") for c, _, _ in cards])
    if "escenas" in CFG:  # una lista de tomas por escena: la toma con None (o la última) llena lo que falte de esa escena
        tomas, ns = [], []
        for k, lista in enumerate(CFG["escenas"]):
            n_esc = cuando(k + 1, None) if k + 1 < len(T) else total
            n_esc -= cuando(k, None)
            fijos = sum(int(tm[2] * FPS) for tm in lista if tm[2])
            for j, tm in enumerate(lista):
                tomas.append(tm)
                ns.append(max(0, n_esc - fijos) if tm[2] is None else int(tm[2] * FPS))
            ns[-1] += n_esc - sum(ns[-len(lista):])
    else:  # todas las tomas se estiran o encogen parejo para llenar lo que dura la voz
        tomas = CFG["tomas"]
        nom = [int(tm[2] * FPS) for tm in tomas]
        ns = [int(n * total / sum(nom)) for n in nom]
        ns[-1] += total - sum(ns)
    f = 0
    for tm, n in zip(tomas, ns):
        if n <= 0: continue
        es_foto = tm[0] in ("foto", "liso", "vs")
        gen = (foto_escena(tm[1], n) if tm[0] == "foto" else liso(n) if tm[0] == "liso" else versus(tm[1], n) if tm[0] == "vs"
               else video(tm[0], tm[1], n, tm[3]))
        for k, L in zip(range(n), gen):
            g = f + k
            card = next(((g - c, d, kk) for c, d, kk in cards if c <= g < c + d), None)
            if card:  # tarjeta arriba con rebote; se desvanece al final
                s_, a_ = b.entra(card[0] / FPS, 0, 0.4)
                b.pon(L, tarjeta(card[2], CFG.get("foto_en_tarjeta", False), CFG.get("ahorro", False)), W / 2,
                      CFG.get("tarjeta_y", 460), s_ * CFG.get("tarjeta_escala", 1), min(a_, (card[1] - card[0]) / 6))
            if not es_foto: b.pon(L, etiqueta(), W / 2, CFG.get("etiqueta_y", 270))
            if "alpaca" in CFG:  # en las escenas que dice CFG["alpaca"][4]
                for e in CFG["alpaca"][4]:
                    e0, e1 = cuando(e, None) / FPS, fin(e) / FPS
                    if e0 <= g / FPS < e1: pon_alpaca(L, g / FPS, e0, e1)
            act = [x for x in cambios if x[0] <= g]
            if act and act[-1][1] != "nada": pon_texto(L, act[-1][1], act[-1][2], (g - act[-1][0]) / FPS, CFG.get("texto_y", 700))
            yield L
        f += n


if __name__ == "__main__":
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
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
