# Miniaturas para cuando se comparte un link de marca, categoría o país
# (alpacca.mx/?marca=MOEV, ?categoria=..., ?pais=...). WhatsApp y Facebook
# no corren el JavaScript de la tienda: leen la imagen que pone
# netlify/functions/product-page.js, que busca assets/og/<tipo>-<slug>.jpg
# y, si no existe (marca nueva), usa la foto de un producto de la marca.
#
# uso: python3 scripts/og_images.py catalogo.csv CARPETA_DE_FUENTES
#   (catalogo.csv = https://alpacca.mx/catalogo.csv; fuentes Poppins-Bold.ttf,
#    Poppins-SemiBold.ttf y Poppins-Medium.ttf de Google Fonts)
# Vuelve a correrlo cuando se agreguen marcas nuevas.
import csv, os, re, sys, unicodedata, urllib.request, io
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "og")
W, H = 1200, 630
BG, BLOB1, BLOB2 = (253, 238, 243), (246, 200, 218), (236, 230, 250)
INK, ROSE, MUTED = (31, 23, 32), (196, 70, 110), (90, 80, 95)


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def font(d, name, size):
    return ImageFont.truetype(os.path.join(d, f"Poppins-{name}.ttf"), size)


def load_img(src):
    try:
        if src.startswith("http"):
            data = urllib.request.urlopen(src, timeout=20).read()
            return Image.open(io.BytesIO(data)).convert("RGBA")
        p = os.path.join(ROOT, src.lstrip("./"))
        return Image.open(p).convert("RGBA") if os.path.exists(p) else None
    except Exception:
        return None


def fit_text(draw, text, fdir, max_w, sizes=(96, 84, 72, 62, 54, 46, 40)):
    for s in sizes:
        f = font(fdir, "Bold", s)
        if draw.textlength(text, font=f) <= max_w:
            return f, [text]
    # Dos renglones.
    f = font(fdir, "Bold", 54)
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if draw.textlength(t, font=f) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return f, lines[:2]


def paste_alpaca(im, alpaca):
    """La alpaca de las marcas a la derecha, de cuerpo completo y con sombra suave."""
    a = alpaca.copy()
    a.thumbnail((330, 590), Image.LANCZOS)
    ax, ay = W - a.width - 22, H - a.height - 18
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s = Image.new("RGBA", a.size, (150, 60, 90, 70))
    s.putalpha(a.getchannel("A").point(lambda v: int(v * 0.35)))
    sh.paste(s, (ax + 8, ay + 14))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    im.paste(sh, (0, 0), sh)
    im.paste(a, (ax, ay), a)


def card(photos, title, subtitle, fdir, out, alpaca=None):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.ellipse((900, -260, 1420, 260), fill=BLOB1)
    d.ellipse((-200, 420, 260, 880), fill=BLOB2)
    logo = Image.open(os.path.join(ROOT, "assets", "logo-wordmark.png")).convert("RGBA")
    logo.thumbnail((230, 80))
    im.paste(logo, (70, 60), logo)
    # Fotos: tarjetas blancas a la derecha (dos arriba, una abajo).
    slots = [(680, 95, 235), (935, 95, 235), (808, 350, 235)][: len(photos)]
    if alpaca is not None:
        # Con alpaca: dos fotos escalonadas en medio y la alpaca a la derecha.
        slots = [(590, 85, 225), (650, 330, 225)][: len(photos)]
    for (x, y, s), ph in zip(slots, photos):
        shadow = Image.new("RGBA", (s + 40, s + 40), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((20, 26, s + 20, s + 26), 28, fill=(150, 60, 90, 60))
        im.paste(shadow.filter(ImageFilter.GaussianBlur(10)), (x - 20, y - 20), shadow.filter(ImageFilter.GaussianBlur(10)))
        tile = Image.new("RGBA", (s, s), (255, 255, 255, 255))
        p = ph.copy(); p.thumbnail((int(s * 0.86), int(s * 0.86)))
        tile.paste(p, ((s - p.width) // 2, (s - p.height) // 2), p)
        mask = Image.new("L", (s, s), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, s, s), 28, fill=255)
        im.paste(tile, (x, y), mask)
    if alpaca is not None:
        paste_alpaca(im, alpaca)
    max_w = (470 if alpaca is not None else 560) if photos else 1000
    f, lines = fit_text(d, title, fdir, max_w)
    y = 250 if len(lines) == 1 else 215
    for ln in lines:
        d.text((70, y), ln, font=f, fill=INK)
        y += int(f.size * 1.15)
    # Con alpaca hay menos ancho: "N productos · Envíos..." va en dos renglones.
    for i, ln in enumerate(subtitle.split(" · ") if alpaca is not None else [subtitle]):
        d.text((72, y + 10 + i * 40), ln, font=font(fdir, "Medium", 30), fill=MUTED)
    d.text((72, 540), "alpacca.mx", font=font(fdir, "SemiBold", 30), fill=ROSE)
    im.save(out, "JPEG", quality=82, optimize=True, progressive=True)


def pick_photos(rows, n=3):
    def key(r):
        return (r.get("Disponible", "SI").upper() == "NO", not r.get("Destacado"), r.get("Presentacion") != "Pieza individual")
    seen, out = set(), []
    for r in sorted(rows, key=key):
        fam = re.sub(r"\s*\(.*\)$", "", r["Nombre"]).lower()
        if fam in seen or not r.get("Imagen"):
            continue
        img = load_img(r["Imagen"])
        if img is None:
            continue
        seen.add(fam); out.append(img)
        if len(out) == n:
            break
    return out


def main(csv_path, fdir, alpaca_path=None, solo=None):
    rows = [r for r in csv.DictReader(open(csv_path, encoding="utf-8")) if r.get("Nombre")]
    os.makedirs(OUT, exist_ok=True)
    # "País" agrupa por el país de la marca (el que más se repite en sus
    # productos), igual que el menú de la tienda (brandCountry en app.js).
    overrides = {"Shiseido": "Japón", "SK-II": "Japón", "Ishizawa-Lab": "Japón", "Bath & Body Works": "Estados Unidos"}
    votes = {}
    for r in rows:
        if r.get("Marca") and r.get("País"):
            v = votes.setdefault(r["Marca"].strip(), {})
            v[r["País"].strip()] = v.get(r["País"].strip(), 0) + 1
    brand_country = {m: max(v, key=v.get) for m, v in votes.items()}
    brand_country.update(overrides)
    for r in rows:
        r["_PaisMarca"] = brand_country.get((r.get("Marca") or "").strip(), "Corea del Sur")
    groups = [("marca", "Marca"), ("categoria", "Categoria"), ("pais", "_PaisMarca")]
    alpaca = None
    if alpaca_path:
        # Las categorías y los países ya tienen su propia alpaca
        # (scripts/og_alpaca.py): con --alpaca solo se rehacen las marcas.
        groups = groups[:1]
        alpaca = Image.open(alpaca_path).convert("RGBA")
        alpaca.putalpha(alpaca.getchannel("A").point(lambda v: 0 if v < 25 else v))
        alpaca = alpaca.crop(alpaca.getchannel("A").point(lambda v: 255 if v > 60 else 0).getbbox())
    for tipo, col in groups:
        by = {}
        for r in rows:
            if r.get(col):
                by.setdefault(r[col].strip(), []).append(r)
        for name, rr in sorted(by.items()):
            if solo and name not in solo:
                continue
            n = len({re.sub(r"\s*\(.*\)$", "", r["Nombre"]) for r in rr if r.get("Presentacion") == "Pieza individual"}) or len(rr)
            title = name if tipo != "pais" else f"Marcas de {name}"
            sub = f"{n} producto{'s' if n != 1 else ''} · Envíos a todo México"
            card(pick_photos(rr, 2 if alpaca is not None else 3), title, sub, fdir, os.path.join(OUT, f"{tipo}-{slug(name)}.jpg"), alpaca)
            print(tipo, name, n)


def stock_main(csv_path, fdir):
    """Miniatura de alpacca.mx/?ver=stock con fotos de lo que hay en Stock."""
    rows = []
    for r in csv.DictReader(open(csv_path, encoding="utf-8")):
        nombre = r.get("Nombre (solo si es producto nuevo)", "")
        img = r.get("Imagen (opcional, URL)", "")
        try:
            piezas = float(r.get("Piezas Disponibles") or 0)
        except ValueError:
            piezas = 0
        # Lotes, geles y bolsas no lucen en la miniatura.
        if nombre and img and piezas > 0 and not re.search(r"lote|gel antibacterial|tote|bag", nombre, re.I):
            try:
                precio = float(r.get("Precio MXN") or 0)
            except ValueError:
                precio = 0
            rows.append({"Nombre": nombre, "Imagen": img, "Presentacion": "Pieza individual", "_p": precio})
    rows.sort(key=lambda r: -r["_p"])  # los de más valor primero
    n = len({re.sub(r"\s*\(.*\)$", "", r["Nombre"]) for r in rows})
    os.makedirs(OUT, exist_ok=True)
    card(pick_photos(rows), "Stock en México", "Entrega inmediata · sin mínimo de compra", fdir, os.path.join(OUT, "ver-stock.jpg"))
    print("stock", n)


if __name__ == "__main__":
    # python3 scripts/og_images.py --stock stock.csv FUENTES  (alpacca.mx/stock.csv)
    # python3 scripts/og_images.py --alpaca ALPACA.png catalogo.csv FUENTES [Marca ...]
    #   (solo las marcas, con la alpaca a un lado; con nombres, solo esas)
    if sys.argv[1] == "--alpaca":
        main(sys.argv[3], sys.argv[4], sys.argv[2], set(sys.argv[5:]) or None)
    elif sys.argv[1] == "--stock":
        stock_main(sys.argv[2], sys.argv[3])
    else:
        main(sys.argv[1], sys.argv[2])
