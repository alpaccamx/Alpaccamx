"""Carrusel "Lo más pedido del Sephora Sale": 16 productos que se venden mucho, con el precio de la preventa
(alpacca.mx/?ver=preventa). desde=True cuando el producto tiene tamaños/tonos con distinto precio."""
PORTADA = {
    "arriba": "Productos del",
    "grande": ["SEPHORA", "SALE"],
    "abajo": ["que puedes encontrar en", "mi preventa con 20% OFF"],
    "esquinas": [("huda-easybake", 430, -12, 110, 140), ("rare-blush", 520, -62, 960, 230),
                 ("rhode-pocket", 400, 38, 70, 1210), ("laneige-lsm", 330, 14, 990, 1220)],
}
PARES = [
    ({"que": "Mascarilla de labios", "marca": "Laneige", "foto": "laneige-lsm", "precio": 474, "antes": 592, "desde": True, "alto": 0.70},
     {"que": "Bálsamo de labios", "marca": "Summer Fridays", "foto": "sf-balm", "precio": 474, "antes": 592}),
    ({"que": "Blush líquido", "marca": "Rare Beauty", "foto": "rare-blush", "swatch": "rare-swatch", "precio": 316, "antes": 395, "desde": True},
     {"que": "Gloss Bomb", "marca": "Fenty Beauty", "foto": "fenty-gloss", "swatch": "fenty-swatch", "precio": 454, "antes": 567}),
    ({"que": "Gloss con péptidos", "marca": "Rhode", "foto": "rhode-tint", "precio": 395, "antes": 493},
     {"que": "Bálsamo con color", "marca": "Tower 28", "foto": "tower-lipsoftie", "swatch": "tower-swatch", "precio": 316, "antes": 395, "desde": True}),
    ({"que": "Blush en barra", "marca": "Rhode", "foto": "rhode-pocket", "precio": 493, "antes": 617, "alto": 0.70},
     {"que": "Dúo de blush", "marca": "Patrick Ta", "foto": "patrick-duo", "swatch": "patrick-swatch", "precio": 493, "antes": 617, "desde": True, "alto": 0.70}),
    ({"que": "Polvo para sellar", "marca": "Huda Beauty", "foto": "huda-easybake", "precio": 474, "antes": 592, "desde": True, "alto": 0.72},
     {"que": "Sérum iluminador", "marca": "Glow Recipe", "foto": "glow-dew", "precio": 395, "antes": 493, "desde": True, "alto": 0.74}),
    ({"que": "Fijador de maquillaje", "marca": "Milk Makeup", "foto": "milk-spray", "precio": 474, "antes": 592, "desde": True},
     {"que": "Fijador con SPF 28", "marca": "ONE/SIZE", "foto": "onesize-spray", "precio": 415, "antes": 518, "desde": True}),
    ({"que": "Body mist", "marca": "Sol de Janeiro · 62", "foto": "sol-c62", "precio": 513, "antes": 641, "desde": True},
     {"que": "Aceite para cabello", "marca": "Gisou", "foto": "gisou-oil", "precio": 493, "antes": 617, "desde": True, "alto": 0.72}),
    ({"que": "Crema corporal", "marca": "Sol de Janeiro", "foto": "sol-cream", "precio": 474, "antes": 592, "desde": True, "alto": 0.62, "ancho": 0.80},
     {"que": "Gel antibacterial", "marca": "Touchland", "foto": "touch-mist", "precio": 198, "antes": 247, "desde": True, "alto": 0.80}),
]
CIERRE = {
    "titulo": "¿CUÁL TE LLEVAS?",
    "pasos": [("Pide en alpacca.mx", "Todo el catálogo de la preventa"),
              ("Aparta con el 50%", "Y liquidas cuando llegue tu pedido"),
              ("100% original", "Comprado directo en Sephora USA")],
    "pastilla": "Cierra el 8 de noviembre",
}
