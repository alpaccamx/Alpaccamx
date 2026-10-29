"""Baja las fotos de producto de las tiendas oficiales de cada marca (Shopify: /search/suggest.json) a fotos/.
Sephora no deja bajar sus fotos, por eso se usan las de la marca. Uso: python3 fotos.py"""
import json, os, urllib.parse, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
# nombre: (tienda, búsqueda, palabra que debe traer el título)
FOTOS = {
    "rare-blush": ("www.rarebeauty.com", "soft pinch liquid blush", "Soft Pinch Liquid Blush"),
    "rare-mini": ("www.rarebeauty.com", "soft pinch liquid blush mini", "Mini"),
    "rare-comfort": ("www.rarebeauty.com", "find comfort lip butter", "Lip Butter"),
    "rhode-tint": ("www.rhodeskin.com", "peptide lip tint", "peptide lip tint"),
    "rhode-pocket": ("www.rhodeskin.com", "pocket blush", "pocket blush"),
    "sf-balm": ("summerfridays.com", "lip butter balm vanilla", "Lip Butter Balm"),
    "sf-minis": ("summerfridays.com", "lip butter balm minis", "Mini"),
    "laneige-lsm": ("us.laneige.com", "lip sleeping mask", "Lip Sleeping Mask"),
    "laneige-minis": ("us.laneige.com", "midnight minis", "Mini"),
    "laneige-cal": ("us.laneige.com", "12 days", "12"),
    "glow-dew": ("www.glowrecipe.com", "dew drops", "Dew Drops"),
    "glow-cal": ("www.glowrecipe.com", "12 days of glow", "12"),
    "sol-c62": ("soldejaneiro.com", "cheirosa 62 perfume mist", "Mist"),
    "sol-spritz": ("soldejaneiro.com", "spritz sol", "Spritz"),
    "patrick-duo": ("patrickta.com", "major headlines blush", "Major Headlines"),
    "fenty-gloss": ("fentybeauty.com", "gloss bomb universal lip luminizer", "Gloss Bomb Universal Lip Luminizer"),
    "touch-peanuts": ("touchland.com", "peanuts hand sanitizer", "Hand Sanitizer"),
    "tower-lipsoftie": ("www.tower28beauty.com", "lipsoftie", "LipSoftie"),
    "saie-dew": ("saiehello.com", "dew blush", "Dew Blush"),
    "kosas-blush": ("www.kosas.com", "blush is life", "Blush is Life"),
}

for nombre, (tienda, q, debe) in FOTOS.items():
    ruta = os.path.join(AQUI, "fotos", nombre + ".jpg")
    if os.path.exists(ruta): continue
    url = f"https://{tienda}/search/suggest.json?q={urllib.parse.quote(q)}&resources[type]=product&resources[limit]=6"
    try:
        ps = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=20))["resources"]["results"]["products"]
        p = next((p for p in ps if debe.lower() in p["title"].lower() and (debe == "Mini" or "mini" not in p["title"].lower() or "mini" in q)), ps[0])
        img = p.get("image") or p["featured_image"]["url"]
        img = ("https:" + img if img.startswith("//") else img).split("?")[0]
        x = urllib.request.urlopen(img + "?width=1000", timeout=30).read()
        tmp = ruta + ".src"; open(tmp, "wb").write(x)
        from PIL import Image
        im = Image.open(tmp).convert("RGBA")  # muchas vienen con fondo transparente: se pone blanco (si no, queda negro y dentado)
        fondo = Image.new("RGBA", im.size, (255, 255, 255, 255)); fondo.alpha_composite(im)
        fondo.convert("RGB").save(ruta, quality=94); os.remove(tmp)
        print("ok", nombre, "|", p["title"])
    except Exception as e:
        print("FALLO", nombre, e)
