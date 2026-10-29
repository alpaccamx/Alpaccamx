"""Carrusel "NO compres otro blush sin ver esto": 6 rubores de la preventa, cuál elegir según tu piel.
Precios de alpacca.mx/?ver=preventa (desde=True cuando hay tonos/tamaños con distinto precio)."""
PORTADA = {
    "foto": __import__("os").path.join(__import__("os").path.dirname(__file__), "fotos-mae", "caja-rubores.jpg"),
    "gancho": "NO compres otro blush sin ver esto💕",
    "sub": "Te digo cuál elegir según tu piel",
    "nota": "📦 Pedido de mis clientas del Sephora Sale 2025",
}
PRODUCTOS = [
    {"nombre": "Rare Beauty Soft Pinch Liquid Blush", "foto": "rare-blush", "swatch": "rare-swatch",
     "si": "Si quieres un rubor que te dure TODO el día",
     "por_que": "Con una sola gotita es suficiente: es súper pigmentado y dura muchísimo. Un bote te rinde meses.",
     "precio": 316, "antes": 395, "desde": True},
    {"nombre": "Rhode Pocket Blush", "foto": "rhode-pocket", "alto": 0.80,
     "si": "Si tienes piel seca y quieres verte jugosita",
     "por_que": "Es en barra cremosa e hidratante, se pone con los dedos y deja un glow natural. Cabe en cualquier bolsita.",
     "precio": 493, "antes": 617},
    {"nombre": "Patrick Ta Major Headlines Blush Duo", "foto": "patrick-duo", "swatch": "patrick-swatch", "alto": 0.75, "ancho": 440,
     "si": "Si tienes piel grasa o mixta",
     "por_que": "Trae crema y polvo: pones la crema y encima el polvo para sellarla. Dura más y sin brillo.",
     "precio": 493, "antes": 617, "desde": True},
    {"nombre": "Saie Dew Blush", "foto": "saie-dew",
     "si": "Si casi no te maquillas y quieres un rubor natural",
     "por_que": "Es líquido y ligerito, se difumina con los dedos y deja un acabado jugoso que parece tu color natural.",
     "precio": 355, "antes": 444, "desde": True},
    {"nombre": "Tower 28 BeachPlease Cream Blush", "foto": "tower-beach", "alto": 0.70,
     "si": "Si tienes piel sensible",
     "por_que": "Tower 28 hace todo pensando en piel sensible. Es en crema, sirve para mejillas y labios, y se difumina facilísimo.",
     "precio": 395, "antes": 493},
    {"nombre": "Summer Fridays Blush Butter Balm", "foto": "sf-blush", "swatch": "sf-blush-swatch", "alto": 0.62, "ancho": 440,
     "si": "Si te maquillas en 5 minutos",
     "por_que": "Es un bálsamo cremoso con péptidos: lo pones con los dedos y listo. Acabado natural y nada pesado.",
     "precio": 513, "antes": 641},
]
CIERRE = {
    "pregunta": "¿Cuál es tu tipo de piel y qué blush usas? 👀",
    "sub": "Todos están en mi preventa del Sephora Sale con 20% OFF",
    "pastilla": "Cierra el 8 de noviembre · alpacca.mx",
}
