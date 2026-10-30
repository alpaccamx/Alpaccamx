"""Carrusel "Sets de Navidad edición limitada" de Sephora: productos de las capturas de la app que mandó Mae.
Precios de la preventa (alpacca.mx/?ver=preventa)."""
PORTADA = {"estilo": "rayas",
    "arriba": "Edición limitada", "grande": ["SETS DE", "NAVIDAD"], "abajo": ["se agotan cada año", "aparta el tuyo con 20% OFF"],
    "productos": [("sep-patrick-set", 330), ("sep-rhode-pair", 330), ("sep-rhode-sugarmint", 240), ("sep-onesize-duo", 360)]}
ANTES = {'sep-patrick-set': 1282, 'sep-rhode-pair': 937, 'sep-rhode-sugarmint': 1430, 'sep-onesize-duo': 888}  # Sephora USA en pesos (catálogo de la preventa)
P = lambda que, marca, foto, precio, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=ANTES.get(foto, 0), dato="Edición limitada", **kw)
PARES = [
    (P("Blush + bálsamo de labios", "Patrick Ta · Major Headlines", "sep-patrick-set", 1026, alto=0.74),
     P("Blush + gloss", "Rhode · Pocket Pair", "sep-rhode-pair", 750, alto=0.82)),
    (P("Set de skincare", "Rhode · Sugarmint Trio", "sep-rhode-sugarmint", 1144, alto=0.56, ancho=0.98),
     P("Fijador grande + mini", "ONE/SIZE · Big & Bitty", "sep-onesize-duo", 710, alto=0.8)),
]
GRACIAS = {"texto": ["Son de edición limitada", "Apártalos antes de que se agoten"]}
