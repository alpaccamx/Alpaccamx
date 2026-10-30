"""Carrusel "Kits y sets de regalo del Sephora Sale" (estilo @namy.gloow), precios de la preventa."""
PORTADA = {"estilo": "collage", "color": (196, 40, 62),
    "arriba": "Kits del Sephora Sale", "grande": ["PARA REGALAR"], "abajo": ["(o regalarte) con 20% OFF"],
    "productos": ["kit-laneige-midnight", "kit-rare-violet", "kit-huda-mocktail", "kit-patrick-set"]}
K = lambda que, marca, foto, precio, antes, **kw: dict(que=que, marca=marca, foto="kit-" + foto, precio=precio, antes=antes, **kw)
PARES = [
    (K("5 minis Lip Mask", "Laneige", "laneige-midnight", 454, 567, alto=0.70),
     K("4 minis Lip Balm", "Summer Fridays", "sf-pink", 493, 617, alto=0.45, ancho=0.98),
     K("Set Jell-O Lip", "Tower 28", "tower-jello", 395, 493, alto=0.62, ancho=0.98)),
    (K("Trío mini blush", "Huda Beauty", "huda-mocktail", 572, 715),
     K("Trío mini blush + lip", "Rare Beauty", "rare-violet", 671, 839, alto=0.62)),
    (K("Jet Set Bum Bum", "Sol de Janeiro", "sol-jetset", 671, 839),
     K("Set 4 Gloss Bomb", "Fenty Beauty", "fenty-posse", 967, 1208)),
    (K("Kit Blush + Lip Balm", "Patrick Ta", "patrick-set", 1026, 1282),
     K("Kit con bolsita", "Rare Beauty", "rare-hope", 1065, 1332, alto=0.58, ancho=0.98)),
]
GRACIAS = {"texto": ["¿Buscas otro producto?", "Mándame mensajito y te lo cotizo"]}
