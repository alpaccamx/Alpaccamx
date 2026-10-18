# Miniatura (1200x630) con una ilustración de la alpaca a la derecha y el
# logo + textos a la izquierda, igual que og-alpacca.jpg y las de
# assets/og/ver-*.jpg.
#
# uso: python3 scripts/og_alpaca.py ALPACA.png SALIDA.jpg CARPETA_DE_FUENTES \
#        "ETIQUETA" "Título línea 1|línea 2" "Subtítulo línea 1|línea 2"
#   (fuentes Poppins-Bold.ttf, Poppins-SemiBold.ttf y Poppins-Medium.ttf
#    de Google Fonts; la alpaca en PNG con fondo transparente)
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
BG, BLOB1, BLOB2 = (253, 238, 243), (246, 200, 218), (236, 230, 250)
INK, ROSE, MUTED = (31, 23, 32), (196, 70, 110), (90, 80, 95)


def main(src, out, fdir, tag, title, sub):
    fnt = lambda n, s: ImageFont.truetype(os.path.join(fdir, f"Poppins-{n}.ttf"), s)
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.ellipse((760, -220, 1420, 440), fill=BLOB1)
    d.ellipse((-200, 430, 260, 890), fill=BLOB2)

    # Alpaca: sin el polvito casi transparente de los bordes, recortada a lo
    # que se ve y con una sombra suave.
    a = Image.open(src).convert("RGBA")
    a.putalpha(a.getchannel("A").point(lambda v: 0 if v < 25 else v))
    a = a.crop(a.getchannel("A").point(lambda v: 255 if v > 60 else 0).getbbox())
    a.thumbnail((590, 565), Image.LANCZOS)
    ax, ay = W - a.width - 40, H - a.height - 28
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s = Image.new("RGBA", a.size, (150, 60, 90, 70))
    s.putalpha(a.getchannel("A").point(lambda v: int(v * 0.35)))
    sh.paste(s, (ax + 8, ay + 14))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    im.paste(sh, (0, 0), sh)
    im.paste(a, (ax, ay), a)

    logo = Image.open(os.path.join(ROOT, "assets", "logo-wordmark.png")).convert("RGBA")
    logo.thumbnail((230, 80), Image.LANCZOS)
    im.paste(logo, (70, 60), logo)

    lines = [l for l in title.split("|") if l]
    size = 64
    while size > 40 and any(d.textlength(l, font=fnt("Bold", size)) > 560 for l in lines):
        size -= 4
    y = 262 if len(lines) > 1 else 300
    if tag:
        lf = fnt("SemiBold", 22)
        tw = d.textlength(tag, font=lf)
        d.rounded_rectangle((70, y - 62, 70 + tw + 36, y - 20), 21, fill=ROSE)
        d.text((88, y - 57), tag, font=lf, fill=(255, 255, 255))
    for l in lines:
        d.text((70, y), l, font=fnt("Bold", size), fill=INK)
        y += int(size * 1.22)
    for i, l in enumerate([l for l in sub.split("|") if l]):
        d.text((72, y + 10 + i * 40), l, font=fnt("Medium", 30), fill=MUTED)
    d.text((72, 560), "alpacca.mx", font=fnt("SemiBold", 30), fill=ROSE)
    im.save(out, "JPEG", quality=85, optimize=True, progressive=True)


if __name__ == "__main__":
    main(*sys.argv[1:7])
