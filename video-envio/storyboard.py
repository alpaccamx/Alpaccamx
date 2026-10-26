"""Hojas de storyboard para animar "La historia de tu pedido" con Seedance (Leonardo.ai / CapCut).
Cada hoja = un pedazo de la narración (máx. 15 s): tomas con su tiempo, cámara y acción, el personaje y la paleta.
Uso: python3 storyboard.py  -> storyboard/segmento-N.jpg"""
import json, os
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.dirname(AQUI)
FONTS = os.path.join(RAIZ, "video-sephora", "fonts")
def F(n, s): return ImageFont.truetype(f"{FONTS}/Poppins-{n}.ttf", s)
INK = (40, 30, 36); PINK = (238, 108, 146); DEEP = (196, 70, 110); BLUSH = (254, 235, 241)
T = json.load(open(os.path.join(AQUI, "tiempos.json")))
D = [e["dur"] for e in T]
IMG = {"hola": "../assets/alpaca-surtir.webp", "corea": "dibujos/empacando.png", "avion": "dibujos/avion.png",
       "camion": "dibujos/camion.png", "revisa": "dibujos/revisando.png", "entrega": "dibujos/entregando.png"}

# (título, duración, [(dibujo, cámara, acción)])
SEG = [
    ("A morning in Seoul", D[0], [
        ("hola", "Wide, slow tracking", "Morning in Seoul: the alpaca walks happily down a cute street with cherry blossoms, N Seoul Tower (Namsan) on the hill behind."),
        ("hola", "Medium, follow", "She arrives at a cute small warehouse, smiles and waves at the camera inviting us in."),
        ("corea", "Push-in", "She walks inside: tall shelves and stacks of cardboard boxes with pink tape, a Korean flag on the wall."),
    ]),
    ("Packing your order", D[1], [
        ("corea", "Medium shot", "A new order pops up on a tablet with a little heart; the alpaca gets excited."),
        ("corea", "Slow push-in", "She picks skincare products from the shelves and gently places them in a box with pink tissue paper."),
        ("corea", "Close-up", "She closes the box with a Korean flag sticker, then yawns and stretches (weekend rest) with a smile."),
    ]),
    ("Flying to the USA", D[2], [
        ("avion", "Medium shot", "The alpaca puts on her pilot goggles and loads the box into her pink plane at the airport."),
        ("avion", "Wide, tracking", "The plane flies over the ocean among fluffy clouds, propeller spinning, she waves happily."),
        ("avion", "Wide shot", "The plane lands gently next to a pink warehouse with a US flag."),
    ]),
    ("On the road to Mexico", D[3] + D[4], [
        ("camion", "Side tracking shot", "The pink truck full of boxes drives on a sunny desert road with cactus, boxes bouncing."),
        ("camion", "Wide shot", "The truck passes a cute welcome arch decorated with the Mexican flag."),
        ("revisa", "Medium, push-in", "In a cozy room, the alpaca checks the products with a pink magnifying glass, then repacks the box with the Mexican flag."),
    ]),
    ("Knock knock!", D[5], [
        ("entrega", "Wide shot", "The alpaca walks up to a cute pink house carrying a gift box with a pink bow and knocks on the door."),
        ("entrega", "Medium shot", "The door opens and she offers the gift box toward the camera, hearts burst around."),
    ]),
]

def cuadro(nombre, w, h):
    im = Image.open(os.path.join(AQUI, IMG[nombre])).convert("RGBA"); im = im.crop(im.getbbox())
    k = min((w - 30) / im.width, (h - 30) / im.height); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    c = Image.new("RGBA", (w, h), BLUSH + (255,)); c.alpha_composite(im, ((w - im.width) // 2, (h - im.height) // 2)); return c

def envuelve(d, xy, s, f, w, fill, lh=1.25):
    x, y = xy; linea = ""
    for p in s.split():
        if f.getlength(linea + " " + p) > w and linea: d.text((x, y), linea, font=f, fill=fill); y += f.size * lh; linea = p
        else: linea = (linea + " " + p).strip()
    d.text((x, y), linea, font=f, fill=fill)

os.makedirs(os.path.join(AQUI, "storyboard"), exist_ok=True)
for n, (tit, dur, tomas) in enumerate(SEG, 1):
    Wd, Hd = 1920, 1080; S = Image.new("RGBA", (Wd, Hd), (255, 250, 252, 255)); d = ImageDraw.Draw(S)
    d.rectangle((0, 0, Wd, 110), fill=PINK)
    d.text((40, 55), f"ALPACCA · Part {n}/5: {tit}", font=F("ExtraBold", 46), fill="white", anchor="lm")
    d.text((Wd - 40, 55), f"{dur:.1f} s · vertical 9:16 · 3D cartoon", font=F("Bold", 32), fill="white", anchor="rm")
    # tomas
    pw, ph, x0, y0 = 300, 533, 40, 140; t = 0.0; seg = dur / len(tomas)
    for i, (img, cam, acc) in enumerate(tomas):
        x = x0 + i * (pw + 40)
        S.alpha_composite(cuadro(img, pw, ph), (x, y0)); d.rectangle((x, y0, x + pw, y0 + ph), outline=DEEP, width=4)
        d.rounded_rectangle((x + 12, y0 + 12, x + 150, y0 + 58), 20, fill=DEEP)
        d.text((x + 81, y0 + 35), f"SHOT {i + 1}", font=F("Bold", 24), fill="white", anchor="mm")
        d.text((x, y0 + ph + 16), f"{t:.1f}–{t + seg:.1f} s", font=F("Bold", 24), fill=DEEP)
        d.text((x, y0 + ph + 48), cam, font=F("Bold", 24), fill=DEEP)
        envuelve(d, (x, y0 + ph + 90), acc, F("Medium", 22), pw, INK); t += seg
    # personaje y estilo
    xr = 1100; d.text((xr, 140), "CHARACTER — Mae the alpaca (keep identical)", font=F("Bold", 26), fill=DEEP)
    for j, k in enumerate(["hola", "corea", "avion", "entrega"]):
        S.alpha_composite(cuadro(k, 185, 185), (xr + j * 195, 185))
    envuelve(d, (xr, 390), "Fluffy cream-white curly wool, big pink inner ears, round shiny dark eyes, pink cheeks, "
             "small dark nose, open happy smile, dark grey hooves. Cute, soft, Pixar-like 3D.", F("Medium", 22), 760, INK)
    d.text((xr, 520), "STYLE & PALETTE", font=F("Bold", 26), fill=DEEP)
    for j, c in enumerate([(254, 235, 241), (248, 196, 214), (238, 108, 146), (196, 70, 110), (250, 246, 238), (214, 170, 120), (240, 200, 90)]):
        d.rounded_rectangle((xr + j * 105, 565, xr + j * 105 + 90, 635), 14, fill=c, outline=(220, 200, 208))
    envuelve(d, (xr, 660), "Pastel pink world, soft warm lighting, gentle smooth camera moves, cheerful and cozy. "
             "Smooth transitions between shots. No text on screen, no dialogue, the alpaca does not talk (a narrator voice-over is added later).",
             F("Medium", 22), 760, INK)
    d.text((xr, 800), "ROUTE", font=F("Bold", 26), fill=DEEP)
    d.text((xr, 845), "Korea  >  USA  >  Mexico  >  your home", font=F("Bold", 30), fill=INK)
    S.convert("RGB").save(os.path.join(AQUI, "storyboard", f"segmento-{n}.jpg"), quality=92); print("ok", n, round(dur, 1))
