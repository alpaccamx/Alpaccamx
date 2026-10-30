"""Carrusel "Perfumes y mists del Sephora Sale" (tarjetas rosas). Precios de la preventa."""
PORTADA = {"estilo": "heroe", "color": (172, 146, 206), "circulo": (232, 222, 246), "producto": "kayali-vanilla",
    "arriba": "Sephora Sale", "grande": ["PERFUMES", "Y MISTS"], "pastilla": "20% OFF en mi preventa"}
P = lambda que, marca, foto, precio, antes, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=antes, **kw)
PARES = [
    (P("Perfume de vainilla", "Kayali · Vanilla 28", "kayali-vanilla", 572, 715, desde=True, alto=0.72),
     P("Perfume de pistache", "Kayali · Yum Pistachio Gelato 33", "kayali-pistachio", 572, 715, desde=True, alto=0.72)),
    (P("Perfume caramelo", "Rare Beauty", "rare-edp", 592, 740, desde=True, alto=0.6),
     P("Perfume Easy Bake", "Huda Beauty", "huda-edp", 592, 740, desde=True, alto=0.62)),
    (P("Body mist", "Sol de Janeiro · Cheirosa 68", "sol-68", 513, 641),
     P("Perfume para cabello", "Gisou", "gisou-perfume", 493, 617, desde=True, alto=0.72)),
    (P("Body mist de vainilla", "Touchland · Vanilla Velvet", "touch-vanilla", 395, 493, alto=0.72),
     P("Body mist", "Rare Beauty · Find Comfort", "rare-mist", 316, 395, desde=True)),
]
GRACIAS = {"texto": ["¿Buscas otro perfume?", "Mándame mensajito y te lo cotizo"]}
