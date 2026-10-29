"""Carrusel "NO compres otro gloss sin ver esto": 6 productos de labios según lo que buscas. Precios de la preventa."""
import os
PORTADA = {
    "foto": os.path.join(os.path.dirname(__file__), "fotos-mae", "caja-tower28.jpg"),
    "gancho": "NO compres otro gloss sin ver esto💋",
    "sub": "Te digo cuál elegir según lo que buscas",
    "nota": "📦 Pedido de mis clientas del Sephora Sale 2025",
}
PRODUCTOS = [
    {"nombre": "Laneige Lip Sleeping Mask", "foto": "laneige-lsm", "alto": 0.62, "ancho": 520,
     "si": "Si amaneces con los labios resecos",
     "por_que": "Te la pones antes de dormir y amaneces con los labios suavecitos. Un frasquito te dura muchísimo.",
     "precio": 474, "antes": 592, "desde": True},
    {"nombre": "Fenty Beauty Gloss Bomb", "foto": "fenty-gloss", "swatch": "fenty-swatch",
     "si": "Si quieres un gloss que se vea bonito en todas",
     "por_que": "Brillo intenso que no se siente pegajoso y huele riquísimo. Es de los glosses más vendidos.",
     "precio": 454, "antes": 567},
    {"nombre": "Rhode Peptide Lip Tint", "foto": "rhode-tint",
     "si": "Si quieres un toque de color natural",
     "por_que": "Hidrata con péptidos y deja un color ligerito con brillo. Perfecto para diario.",
     "precio": 395, "antes": 493},
    {"nombre": "Gisou Honey Infused Lip Oil", "foto": "gisou-lipoil",
     "si": "Si te gustan los labios jugositos con brillo",
     "por_que": "Aceite con miel que hidrata y deja un brillo bonito sin sentirse pesado.",
     "precio": 553, "antes": 691, "desde": True},
    {"nombre": "Kosas Wet Lip Oil", "foto": "kosas-wetoil", "alto": 0.8,
     "si": "Si quieres labios que se vean más llenitos",
     "por_que": "Gloss con aceites y péptidos que hidrata y deja los labios con efecto más llenito.",
     "precio": 493, "antes": 617},
    {"nombre": "Tower 28 LipSoftie", "foto": "tower-lipsoftie", "swatch": "tower-swatch",
     "si": "Si tienes los labios sensibles",
     "por_que": "Tower 28 hace todo pensando en piel sensible. Hidrata, da un toque de color y no se siente pesado.",
     "precio": 316, "antes": 395, "desde": True},
]
CIERRE = {
    "pregunta": "¿Cuál es tu favorito para los labios? 💋",
    "sub": "Todos están en mi preventa del Sephora Sale con 20% OFF",
    "pastilla": "Cierra el 8 de noviembre · alpacca.mx",
}
