"""Carrusel "Regalos de menos de $500" del Sephora Sale (tarjetas rosas), para intercambios. Precios de la preventa."""
PORTADA = {
    "arriba": "Regalitos del Sephora Sale de", "grande": ["MENOS DE", "$500"],
    "abajo": ["perfectos para el intercambio", "con 20% OFF en mi preventa"],
    "esquinas": [("touch-vanilla", 360, -14, 110, 170), ("rare-miniblush", 330, 16, 970, 170),
                 ("huda-mini", 300, 14, 110, 1230), ("kosas-wetoil", 330, -14, 990, 1220)],
}
P = lambda que, marca, foto, precio, antes, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=antes, **kw)
PARES = [
    (P("Blush mini", "Rare Beauty", "rare-miniblush", 316, 395, alto=0.7, ancho=0.98),
     P("Bálsamo de labios", "Laneige", "laneige-glowy", 375, 469, alto=0.86),
     P("Perfume en bálsamo", "Rare Beauty", "rare-balm", 395, 493, alto=0.86)),
    (P("Body mist", "Touchland", "touch-vanilla", 395, 493, alto=0.86),
     P("Polvo mini", "Huda Beauty", "huda-mini", 474, 592, alto=0.72),
     P("Bálsamo de labios", "Summer Fridays", "sf-balm", 474, 592, alto=0.86)),
    (P("Gloss con aceite", "Kosas · Wet Lip Oil", "kosas-wetoil", 493, 617, alto=0.7),
     P("Perfume para cabello", "Gisou", "gisou-perfume", 493, 617, desde=True, alto=0.72)),
]
GRACIAS = {"texto": ["¿Buscas otro regalito?", "Mándame mensajito y te lo cotizo"]}
