"""Video Sephora Sale (Alpacca): tipografía animada sobre fondo blanco,
estilo "motion graphic". 1080x1920, 30 fps, sin audio (la música se pone
en TikTok/Instagram con un sonido en tendencia)."""
import math, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

import os, json
S = os.environ.get("SEPHORA_DIR", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1080, 1920, 30
OUT = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "x" else f"{S}/sephora/SephoraSale-Alpacca.mp4"

INK = (17, 17, 17); GREY = (150, 150, 158); PINK = (238, 108, 146); DEEP = (196, 70, 110)
BLUSH = (253, 236, 242); PILL = (246, 246, 250); GREEN = (37, 211, 102); WA_ME = (217, 253, 211)
RED = (229, 57, 53)

_fc = {}
def F(n, s):
    k = (n, s)
    if k not in _fc: _fc[k] = ImageFont.truetype(f"{S}/fonts/Poppins-{n}.ttf", s)
    return _fc[k]
EMO = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
_ec = {}
def emoji(ch, size):
    k = (ch, size)
    if k not in _ec:
        im = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((70, 70), ch, font=EMO, embedded_color=True, anchor="mm")
        im = im.crop(im.getbbox()); r = size / max(im.size)
        _ec[k] = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return _ec[k]

def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3
def back(x):
    x = max(0.0, min(1.0, x)); c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2

def paste_alpha(base, im, xy, a):
    if a <= 0: return
    if a < 1:
        im = im.copy(); al = im.getchannel("A").point(lambda v: int(v * a)); im.putalpha(al)
    base.alpha_composite(im, (int(xy[0]), int(xy[1])))

def rrect(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)

# ---------- palabras que entran una por una (desenfoque -> nítido) ----------
def words_layer(lines, t, t0, step=0.16, dur=0.38, cy=560, size=92, weight="Bold", lh=1.18, out_t=None):
    """lines: [[(palabra, color), ...], ...]. Devuelve capa RGBA."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = F(weight, size); n = 0; ys = []
    total_h = len(lines) * size * lh
    y = cy - total_h / 2 + size * lh / 2
    for line in lines:
        widths = [f.getlength(w + " ") for w, _ in line]; lw = sum(widths) - f.getlength(" ")
        x = (W - lw) / 2
        for (w, col), ww in zip(line, widths):
            st = t0 + n * step; p = ease((t - st) / dur); n += 1
            if p > 0:
                tw = int(f.getlength(w)) + 20
                im = Image.new("RGBA", (tw, int(size * 1.6)), (0, 0, 0, 0))
                ImageDraw.Draw(im).text((10, size * 0.8), w, font=f, fill=col + (255,), anchor="lm")
                if p < 1: im = im.filter(ImageFilter.GaussianBlur((1 - p) * 9))
                paste_alpha(layer, im, (x - 10, y - size * 0.8 + (1 - p) * 26), p)
            x += ww
        y += size * lh
    if out_t is not None and t > out_t:
        a = 1 - ease((t - out_t) / 0.3)
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    return layer

def scene_alpha(t, a, b, fin=0.0, fout=0.3):
    if t < a or t > b: return 0
    x = 1.0
    if fin: x = min(x, ease((t - a) / fin))
    if fout: x = min(x, 1 - ease((t - (b - fout)) / fout))
    return x

def pill(layer, cx, cy, text, font, bg, fg, padx=34, pady=18, a=1.0, icon=None):
    tw = font.getlength(text); iw = 0
    if icon: iw = icon.width + 14
    w = tw + iw + padx * 2; h = font.size + pady * 2
    im = Image.new("RGBA", (int(w) + 4, int(h) + 4), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    rrect(d, (0, 0, w, h), h / 2, bg + (255,))
    x = padx
    if icon: im.alpha_composite(icon, (int(x), int((h - icon.height) / 2))); x += iw
    d.text((x, h / 2), text, font=font, fill=fg + (255,), anchor="lm")
    paste_alpha(layer, im, (cx - w / 2, cy - h / 2), a)
    return w, h

def card(w, h, r=44, fill=(255, 255, 255), shadow=True):
    im = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((40, 52, 40 + w, 52 + h), r, fill=(60, 40, 60, 46))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(im).rounded_rectangle((40, 40, 40 + w, 40 + h), r, fill=fill + (255,), outline=(236, 236, 242, 255), width=2)
    return im

def scaled(im, s):
    s = max(0.01, s)
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)

def pop(layer, im, cx, cy, t, st, dur=0.45, a_extra=1.0):
    p = (t - st) / dur
    if p <= 0: return
    s = 0.6 + 0.4 * back(p); a = ease(p * 1.6) * a_extra
    sim = scaled(im, s)
    paste_alpha(layer, sim, (cx - sim.width / 2, cy - sim.height / 2), a)

# ---------- piezas fijas ----------
TOP = F("SemiBold", 30)
def top_badge(layer, text, a):
    pill(layer, W / 2, 150, text, TOP, PILL, (90, 90, 100), padx=28, pady=12, a=a)

def progress(layer, i, a):  # puntitos "1 de 4"
    if a <= 0: return
    d = ImageDraw.Draw(layer)
    for k in range(4):
        x = W / 2 - 54 + k * 36; col = PINK if k <= i else (225, 225, 232)
        d.ellipse((x - 9, 205 - 9, x + 9, 205 + 9), fill=col + (int(255 * a),))

# carrito "no envía a México"
def cart_card():
    im = card(720, 430)
    d = ImageDraw.Draw(im); ox, oy = 40, 40
    d.text((ox + 50, oy + 62), "Tu carrito", font=F("Bold", 44), fill=INK + (255,), anchor="lm")
    for k, (n, p) in enumerate([("Soft Pinch Blush", "$32"), ("Lip Glow Oil", "$40"), ("Peptide Lip Tint", "$20")]):
        y = oy + 140 + k * 70
        rrect(d, (ox + 50, y - 26, ox + 102, y + 26), 12, BLUSH + (255,))
        d.text((ox + 126, y), n, font=F("Medium", 34), fill=(70, 70, 78, 255), anchor="lm")
        d.text((ox + 670, y), p, font=F("SemiBold", 34), fill=INK + (255,), anchor="rm")
    return im

def stamp_no():
    f = F("Bold", 40); t = "No envía a México"; w = int(f.getlength(t)) + 140
    im = Image.new("RGBA", (w, 96), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    rrect(d, (0, 0, w, 96), 48, (255, 235, 235, 255), outline=RED + (255,), width=4)
    d.ellipse((22, 18, 82, 78), fill=RED + (255,))
    d.line((40, 36, 64, 60), fill=(255, 255, 255, 255), width=8); d.line((64, 36, 40, 60), fill=(255, 255, 255, 255), width=8)
    d.text((100, 48), t, font=f, fill=RED + (255,), anchor="lm")
    return im

def rouge_card():
    im = card(560, 400, r=56, fill=(255, 255, 255))
    d = ImageDraw.Draw(im); ox, oy = 40, 40
    d.text((ox + 280, oy + 78), "Rouge", font=F("SemiBold", 40), fill=DEEP + (255,), anchor="mm")
    d.text((ox + 250, oy + 220), "20%", font=F("ExtraBold", 190), fill=INK + (255,), anchor="mm")
    d.text((ox + 470, oy + 250), "off", font=F("SemiBold", 44), fill=GREY + (255,), anchor="lm")
    return im

BRANDS = ["Rare Beauty", "rhode", "Dior", "Fenty Beauty", "Huda Beauty", "Sol de Janeiro",
          "Charlotte Tilbury", "Laneige", "Summer Fridays", "Glow Recipe"]
def brand_chip(name):
    f = F("SemiBold", 44); w = int(f.getlength(name)) + 76; h = 104
    im = card(w, h, r=52)
    ImageDraw.Draw(im).text((40 + w / 2, 40 + h / 2), name, font=f, fill=INK + (255,), anchor="mm")
    return im

# chat de WhatsApp
def bubble(text, me, emo=None, img=False):
    f = F("Medium", 38); maxw = 560
    words = text.split(); lines = []; cur = ""
    for w_ in words:
        tst = (cur + " " + w_).strip()
        if f.getlength(tst) > maxw: lines.append(cur); cur = w_
        else: cur = tst
    if cur: lines.append(cur)
    lw = max([f.getlength(l) for l in lines] + [0]) + (64 if emo else 0)
    ih = 260 if img else 0
    w = int(max(lw, 380 if img else 0)) + 56; h = int(len(lines) * 52 + 44 + ih + (14 if img else 0))
    im = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    rrect(d, (0, 0, w, h), 30, (WA_ME if me else (255, 255, 255)) + (255,))
    y = 22
    if img:
        rrect(d, (16, 16, w - 16, 16 + ih), 20, (250, 240, 245, 255))
        d.text((40, 56), "Carrito · sephora.com", font=F("SemiBold", 28), fill=DEEP + (255,), anchor="lm")
        for k, n in enumerate(["Soft Pinch Blush", "Lip Glow Oil", "Gloss Bomb"]):
            yy = 110 + k * 52
            rrect(d, (40, yy - 18, 76, yy + 18), 8, (246, 202, 219, 255))
            d.text((92, yy), n, font=F("Medium", 28), fill=(80, 80, 88, 255), anchor="lm")
        y = 16 + ih + 26
    for k, l in enumerate(lines):
        d.text((28, y + k * 52 + 20), l, font=f, fill=INK + (255,), anchor="lm")
    if emo:
        e = emoji(emo, 44); ll = lines[-1] if lines else ""
        im.alpha_composite(e, (int(28 + f.getlength(ll) + 12), int(y + (len(lines) - 1) * 52 + 20 - e.height / 2)))
    return im

def phone_frame(w=760, h=1060):
    im = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 56, 40 + w, 56 + h), 90, fill=(40, 30, 40, 60))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40, 40, 40 + w, 40 + h), 90, fill=(20, 20, 22, 255))
    d.rounded_rectangle((54, 54, 26 + w, 26 + h), 78, fill=(239, 231, 222, 255))
    d.rounded_rectangle((54, 54, 26 + w, 190), 78, fill=(0, 128, 105, 255))
    d.rectangle((54, 130, 26 + w, 190), fill=(0, 128, 105, 255))
    d.ellipse((90, 112, 150, 172), fill=(246, 202, 219, 255))
    d.text((120, 142), "M", font=F("Bold", 32), fill=DEEP + (255,), anchor="mm")
    d.text((172, 128), "Mae · Alpacca", font=F("SemiBold", 34), fill=(255, 255, 255, 255), anchor="lm")
    d.text((172, 162), "en línea", font=F("Medium", 24), fill=(200, 235, 225, 255), anchor="lm")
    d.rounded_rectangle((40 + w / 2 - 80, 62, 40 + w / 2 + 80, 96), 17, fill=(20, 20, 22, 255))
    return im

CHAT = [  # (t, texto, me, emoji, imagen)
    (0.0, "¿Me lo compras con tu 20%?", False, "🥺", True),
    (1.5, "¡Claro! Te mando tu total en pesos", True, "💕", False),
    (3.0, "¡Pagado!", False, "✅", False),
    (4.3, "Listo, ya lo compré", True, "🛍️", False),
]
_bub = {}
def chat_layer(layer, t, t0, a):
    ph = phone_frame(); px = (W - ph.width) / 2; py = 700
    pl = Image.new("RGBA", ph.size, (0, 0, 0, 0)); pl.alpha_composite(ph)
    # burbujas acomodadas de abajo hacia arriba dentro de la pantalla
    shown = [c for c in CHAT if t >= t0 + c[0]]
    ims = []
    for c in shown:
        if c[1] not in _bub: _bub[c[1]] = bubble(c[1], c[2], c[3], c[4])
        ims.append((c, _bub[c[1]]))
    bottom = 40 + 1060 - 50; y = bottom
    pos = []
    for c, im in reversed(ims):
        y -= im.height + 18; pos.append((c, im, y))
    for c, im, y in pos:
        p = ease((t - (t0 + c[0])) / 0.35)
        x = 40 + 760 - 40 - im.width if c[2] else 80
        if y < 200: continue
        paste_alpha(pl, im, (x, y + (1 - p) * 40), p)
    paste_alpha(layer, pl, (px, py), a)

def comment_box(t, t0):
    w = 820; im = card(w, 330, r=40); d = ImageDraw.Draw(im); ox, oy = 40, 40
    d.text((ox + 40, oy + 50), "Comentarios", font=F("SemiBold", 30), fill=(90, 90, 100, 255), anchor="lm")
    d.text((ox + 40 + F("SemiBold", 30).getlength("Comentarios") + 16, oy + 50), "1.2 mil", font=F("Medium", 28), fill=GREY + (255,), anchor="lm")
    rrect(d, (ox + 30, oy + 90, ox + w - 30, oy + 170), 40, PILL + (255,))
    typed = "SEPHORA"[: max(0, min(7, int((t - t0) / 0.09)))]
    d.text((ox + 64, oy + 130), typed if typed else "Añade un comentario…", font=F("SemiBold" if typed else "Medium", 36),
           fill=(INK if typed else GREY) + (255,), anchor="lm")
    d.ellipse((ox + w - 104, oy + 100, ox + w - 44, oy + 160), fill=PINK + (255,))
    d.polygon([(ox + w - 74, oy + 114), (ox + w - 90, oy + 136), (ox + w - 58, oy + 136)], fill=(255, 255, 255, 255))
    d.rectangle((ox + w - 78, oy + 134, ox + w - 70, oy + 148), fill=(255, 255, 255, 255))
    if t > t0 + 1.2:
        p = ease((t - t0 - 1.2) / 0.4)
        r = Image.new("RGBA", (w, 120), (0, 0, 0, 0)); rd = ImageDraw.Draw(r)
        rd.ellipse((40, 20, 100, 80), fill=(246, 202, 219, 255)); rd.text((70, 50), "M", font=F("Bold", 28), fill=DEEP + (255,), anchor="mm")
        rd.text((120, 30), "Mae · creadora", font=F("Medium", 24), fill=GREY + (255,), anchor="lm")
        rrect(rd, (120, 52, 120 + F("SemiBold", 30).getlength("Te mando cómo pedir") + 110, 100), 24, PINK + (255,))
        rd.text((146, 76), "Te mando cómo pedir", font=F("SemiBold", 30), fill=(255, 255, 255, 255), anchor="lm")
        rd_e = emoji("💌", 34); r.alpha_composite(rd_e, (int(146 + F("SemiBold", 30).getlength("Te mando cómo pedir") + 12), 59))
        paste_alpha(im, r, (ox, oy + 190 + (1 - p) * 20), p)
    return im

# ---------- línea de tiempo ----------
A = lambda w: (w, INK); P = lambda w: (w, PINK); G = lambda w: (w, GREY)
T = [0, 3.4, 6.6, 10.4, 15.6, 22.6, 26.4, 30.4, 34.6, 37.0]
# Si existe timings.json (inicios de cada escena + final, 10 números), manda sobre los de arriba
_tj = os.path.join(os.path.dirname(os.path.abspath(__file__)), "timings.json")
if os.path.exists(_tj): T = json.load(open(_tj))
DUR = T[-1]

def frame(t):
    img = Image.new("RGBA", (W, H), (255, 255, 255, 255)); L = img
    # 1. gancho
    a = scene_alpha(t, T[0], T[1])
    if a:
        top_badge(L, "Sephora Savings Event", a)
        L.alpha_composite(words_layer([[A("Ya"), A("llegó"), A("el")], [P("Sephora"), P("Sale.")]], t, 0.15, size=118, cy=820, out_t=T[1] - 0.3))
        pe = emoji("🛍️", 150); pop(L, pe, W / 2, 1180, t, 1.0, a_extra=a)
    # 2. problema
    a = scene_alpha(t, T[1], T[2])
    if a:
        top_badge(L, "Sephora Savings Event", a)
        L.alpha_composite(words_layer([[A("Pero"), A("desde"), A("México")], [G("no"), G("puedes"), G("comprar.")]], t, T[1] + 0.05, size=92, cy=600, out_t=T[2] - 0.3))
        pop(L, cart_card(), W / 2, 1110, t, T[1] + 0.5, a_extra=a)
        pop(L, stamp_no(), W / 2, 1380, t, T[1] + 1.6, a_extra=a)
    # 3. Rouge
    a = scene_alpha(t, T[2], T[3])
    if a:
        top_badge(L, "Razón 1 de 4", a); progress(L, 0, a)
        L.alpha_composite(words_layer([[A("Yo"), A("soy"), P("Rouge.")]], t, T[2] + 0.05, size=118, cy=560, out_t=T[3] - 0.3))
        pop(L, rouge_card(), W / 2, 1020, t, T[2] + 0.7, a_extra=a)
        if t > T[2] + 1.6:
            p = ease((t - T[2] - 1.6) / 0.4)
            pill(L, W / 2, 1360 + (1 - p) * 20, "Antes que nadie · desde el 30 de oct", F("SemiBold", 38), DEEP, (255, 255, 255), a=p * a,
                 icon=emoji("⚡", 40))
    # 4. marcas
    a = scene_alpha(t, T[3], T[4])
    if a:
        top_badge(L, "Razón 2 de 4", a); progress(L, 1, a)
        L.alpha_composite(words_layer([[A("Tus"), P("favoritas")], [A("con"), P("20%")]], t, T[3] + 0.05, size=104, cy=520, out_t=T[4] - 0.3))
        rows = [BRANDS[0:2], BRANDS[2:4], BRANDS[4:6], BRANDS[6:8], BRANDS[8:10]]
        k = 0
        for r_i, row in enumerate(rows):
            chips = [brand_chip(n) for n in row]; tw = sum(c.width - 80 for c in chips) + 24 * (len(chips) - 1)
            x = (W - tw) / 2
            for c in chips:
                cx = x + (c.width - 80) / 2; cy = 840 + r_i * 150
                pop(L, c, cx, cy, t, T[3] + 0.9 + k * 0.22, a_extra=a); x += c.width - 80 + 24; k += 1
        if t > T[3] + 3.6:
            p = ease((t - T[3] - 3.6) / 0.4)
            ImageDraw.Draw(L).text((W / 2, 1620 + (1 - p) * 16), "…y todo Sephora", font=F("SemiBold", 46), fill=GREY + (int(255 * p * a),), anchor="mm")
    # 5. chat
    a = scene_alpha(t, T[4], T[5])
    if a:
        top_badge(L, "Razón 3 de 4", a); progress(L, 2, a)
        L.alpha_composite(words_layer([[A("Tú"), A("eliges,")], [P("yo"), P("compro"), P("por"), P("ti.")]], t, T[4] + 0.05, size=96, cy=470, out_t=T[5] - 0.3))
        chat_layer(L, t, T[4] + 1.2, a * ease((t - T[4] - 0.6) / 0.5))
    # 6. pesos + envío
    a = scene_alpha(t, T[5], T[6])
    if a:
        top_badge(L, "Razón 4 de 4", a); progress(L, 3, a)
        L.alpha_composite(words_layer([[A("Pagas"), A("en"), P("pesos")], [A("y"), A("te"), A("llega"), A("a"), A("tu"), P("casa.")]], t, T[5] + 0.05, size=84, cy=640, out_t=T[6] - 0.3))
        pop(L, emoji("📦", 190), W / 2, 1060, t, T[5] + 1.1, a_extra=a)
        if t > T[5] + 1.6:
            p = ease((t - T[5] - 1.6) / 0.4)
            pill(L, W / 2, 1290, "Envío a todo México", F("SemiBold", 40), (230, 246, 236), (20, 120, 70), a=p * a, icon=emoji("🇲🇽", 42))
    # 7. fechas
    a = scene_alpha(t, T[6], T[7])
    if a:
        L.alpha_composite(words_layer([[A("Solo"), A("del")], [P("30"), P("oct"), A("al"), P("9"), P("nov.")]], t, T[6] + 0.05, size=118, cy=700, out_t=T[7] - 0.3))
        if t > T[6] + 1.6:
            p = ease((t - T[6] - 1.6) / 0.4)
            ImageDraw.Draw(L).text((W / 2, 1010 + (1 - p) * 16), "Después ya no hay descuento.", font=F("SemiBold", 50), fill=GREY + (int(255 * p * a),), anchor="mm")
        pop(L, emoji("⏳", 150), W / 2, 1260, t, T[6] + 2.0, a_extra=a)
    # 8. comenta
    a = scene_alpha(t, T[7], T[8])
    if a:
        L.alpha_composite(words_layer([[A("Comenta")], [P("“SEPHORA”")]], t, T[7] + 0.05, size=124, cy=560, out_t=T[8] - 0.3))
        cb = comment_box(t, T[7] + 1.0); pop(L, cb, W / 2, 1060, t, T[7] + 0.7, a_extra=a)
        if t > T[7] + 2.6:
            p = ease((t - T[7] - 2.6) / 0.4)
            ImageDraw.Draw(L).text((W / 2, 1330), "y te mando cómo pedir", font=F("SemiBold", 48), fill=GREY + (int(255 * p * a),), anchor="mm")
    # 9. firma
    a = scene_alpha(t, T[8], T[9], fout=0)
    if a:
        av = Image.new("RGBA", (220, 220), (0, 0, 0, 0)); ad = ImageDraw.Draw(av)
        ad.ellipse((0, 0, 219, 219), fill=BLUSH + (255,), outline=PINK + (255,), width=6)
        av.alpha_composite(emoji("🛍️", 110), (55, 50))
        pop(L, av, W / 2, 620, t, T[8] + 0.05)
        L.alpha_composite(words_layer([[A("Soy"), A("Mae.")], [P("Alpacca.")]], t, T[8] + 0.3, size=118, cy=930))
        if t > T[8] + 1.2:
            p = ease((t - T[8] - 1.2) / 0.4)
            pill(L, W / 2, 1200, "Personal shopper en USA", F("SemiBold", 36), PILL, (90, 90, 100), a=p)
            ImageDraw.Draw(L).text((W / 2, 1310), "alpacca.mx/personal-shopper", font=F("SemiBold", 44), fill=DEEP + (int(255 * p),), anchor="mm")
    return img.convert("RGB")

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "preview":
        ts = [float(x) for x in sys.argv[3].split(",")]
        for t in ts: frame(t).save(f"{S}/sephora/prev_{t:05.1f}.jpg", quality=85)
        sys.exit()
    n = int(DUR * FPS)
    p = subprocess.Popen([FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", OUT],
                         stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close(); p.wait(); print("ok", OUT)
