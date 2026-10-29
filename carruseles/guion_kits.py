"""Carrusel "Kits y sets de regalo del Sephora Sale" (estilo @namy.gloow), precios de la preventa."""
PORTADA = {
    "arriba": "Kits y sets del",
    "grande": ["SEPHORA", "SALE"],
    "abajo": ["para regalar (o regalarte)", "con 20% OFF en mi preventa"],
    "esquinas": [("kit-rare-violet", 300, -14, 90, 110), ("kit-laneige-midnight", 330, 18, 960, 140),
                 ("kit-huda-mocktail", 320, 16, 80, 1250), ("kit-patrick-set", 330, -14, 1000, 1240)],
}
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
