"""Precio de comparación de cada producto. Si Mae puso el precio de Sephora México en precios-sephora-mx.csv,
se compara contra ese ("Sephora México"); si no, no se pone precio tachado.
Si no está en Sephora México se compara con la tienda oficial en México (columna tienda_comparacion: Rhode México,
Palacio de Hierro); no se usan precios de revendedores. Dior Forever y Olaplex 3 y 7 vienen de liverpool.com.mx: Mae confirmó que en Sephora México cuestan lo mismo."""
import csv, os

_mx = {}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "precios-sephora-mx.csv")) as fh:
    for r in csv.DictReader(fh):
        v = r["precio_sephora_mexico"].replace("$", "").replace(",", "").strip()
        if v and v != "NO HAY": _mx[r["clave"]] = (int(float(v)), r.get("tienda_comparacion") or "Sephora México")

# Sephora México solo vende el tamaño completo: para que la comparación sea del MISMO tamaño, en estos se
# muestra el precio de la preventa del tamaño completo (precioMax del catálogo) en vez del "desde" del mini.
TAMANO_COMPLETO = {"huda-easybake": 829, "sep-huda": 829, "rare-blush": 493, "patrick-duo": 789, "onesize-matte": 710,
                   "onesize-spray": 770, "fenty-diamond": 848, "rare-mist": 553, "mario-softpop": 671, "charlotte": 986,
                   "rhode-milk": 632, "sep-rhode-milk": 632}


def ajusta_guion(g):
    """cambia en el guion el precio de los productos de TAMANO_COMPLETO (y les quita el "desde")"""
    items = []
    for grp in getattr(g, "PARES", []): items += list(grp)
    items += getattr(g, "PRODUCTOS", []) + getattr(g, "CALENDARIOS", [])
    for p in items:
        k = p.get("producto") or p.get("foto")
        if k in TAMANO_COMPLETO and k in _mx: p["precio"], p["desde"] = TAMANO_COMPLETO[k], False


def comparacion(p):
    """(etiqueta, precio) para tachar junto al precio de la preventa"""
    clave = p.get("producto") or p.get("foto")
    if clave in _mx: return _mx[clave][1], _mx[clave][0]
    if p.get("antes"): return "Sephora USA", p["antes"]  # sin precio en México: se compara con Sephora USA (en pesos)
    return None
