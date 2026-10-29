"""Carrusel "Lo más pedido del Sephora Sale": 8 productos que se venden mucho, con el precio de la preventa
(alpacca.mx/?ver=preventa). desde=True cuando el producto tiene tamaños/tonos con distinto precio."""
PORTADA = {
    "titulo": [("LO MÁS PEDIDO", 190), ("DEL SEPHORA SALE", 128)],
    "pastilla": "20% OFF EN MI PREVENTA",
    "collage": [("sol-c62", 430), ("rare-blush", 390), ("laneige-lsm", 260), ("glow-dew", 360), ("gisou-oil", 340)],
}
PARES = [
    ({"que": "Mascarilla de labios", "marca": "Laneige", "foto": "laneige-lsm", "precio": 474, "antes": 592, "desde": True, "alto": 0.70},
     {"que": "Bálsamo de labios", "marca": "Summer Fridays", "foto": "sf-balm", "precio": 474, "antes": 592}),
    ({"que": "Blush líquido", "marca": "Rare Beauty", "foto": "rare-blush", "swatch": "rare-swatch", "precio": 316, "antes": 395, "desde": True},
     {"que": "Gloss Bomb", "marca": "Fenty Beauty", "foto": "fenty-gloss", "swatch": "fenty-swatch", "precio": 454, "antes": 567}),
    ({"que": "Polvo para sellar", "marca": "Huda Beauty", "foto": "huda-easybake", "precio": 474, "antes": 592, "desde": True, "alto": 0.72},
     {"que": "Sérum iluminador", "marca": "Glow Recipe", "foto": "glow-dew", "precio": 395, "antes": 493, "desde": True, "alto": 0.74}),
    ({"que": "Body mist", "marca": "Sol de Janeiro · 62", "foto": "sol-c62", "precio": 513, "antes": 641, "desde": True},
     {"que": "Aceite para pelo", "marca": "Gisou", "foto": "gisou-oil", "precio": 493, "antes": 617, "desde": True, "alto": 0.72}),
]
CIERRE = {
    "titulo": "¿CUÁL TE LLEVAS?",
    "pasos": [("Pide en alpacca.mx", "Todo el catálogo de la preventa"),
              ("Aparta con el 50%", "Y liquidas cuando llegue tu pedido"),
              ("100% original", "Comprado directo en Sephora USA")],
    "pastilla": "Cierra el 8 de noviembre",
}
