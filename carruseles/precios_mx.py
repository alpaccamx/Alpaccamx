"""Precio de comparación de cada producto. Si Mae puso el precio de Sephora México en precios-sephora-mx.csv,
se compara contra ese ("Sephora México"); si no, no se pone precio tachado.
Dior Forever y Olaplex 3 y 7 vienen de liverpool.com.mx: Mae confirmó que en Sephora México cuestan lo mismo."""
import csv, os

_mx = {}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "precios-sephora-mx.csv")) as fh:
    for r in csv.DictReader(fh):
        v = r["precio_sephora_mexico"].replace("$", "").replace(",", "").strip()
        if v: _mx[r["clave"]] = int(float(v))


def comparacion(p):
    """(etiqueta, precio) para tachar junto al precio de la preventa"""
    clave = p.get("producto") or p.get("foto")
    if clave in _mx: return "Sephora México", _mx[clave]
    return None  # sin precio de Sephora México no se compara (Mae no quiere comparar con Sephora USA)
