"""Carrusel "Sets de Navidad edición limitada" de Sephora: productos de las capturas de la app que mandó Mae.
Precios de la preventa (alpacca.mx/?ver=preventa)."""
PORTADA = {
    "arriba": "Sets edición limitada de", "grande": ["NAVIDAD", "2026"],
    "abajo": ["se agotan cada año", "aparta el tuyo con 20% OFF"],
    "esquinas": [("sep-patrick-set", 330, -12, 110, 160), ("sep-rhode-pair", 340, 16, 980, 170),
                 ("sep-rhode-sugarmint", 220, 12, 110, 1290), ("sep-onesize-duo", 280, -14, 1010, 1280)],
}
P = lambda que, marca, foto, precio, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=0, dato="Edición limitada", **kw)
PARES = [
    (P("Blush + bálsamo de labios", "Patrick Ta · Major Headlines", "sep-patrick-set", 1026, alto=0.74),
     P("Blush + gloss", "Rhode · Pocket Pair", "sep-rhode-pair", 750, alto=0.82)),
    (P("Set de skincare", "Rhode · Sugarmint Trio", "sep-rhode-sugarmint", 1144, alto=0.56, ancho=0.98),
     P("Fijador grande + mini", "ONE/SIZE · Big & Bitty", "sep-onesize-duo", 710, alto=0.8)),
]
GRACIAS = {"texto": ["Son de edición limitada", "Apártalos antes de que se agoten"]}
