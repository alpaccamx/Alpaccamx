"""Carrusel "Skincare coreano del Sephora Sale": Laneige y Glow Recipe (tarjetas rosas). Precios de la preventa."""
PORTADA = {"estilo": "heroe", "color": (92, 168, 136), "circulo": (214, 240, 228), "producto": "glow-dew",
    "arriba": "Laneige y Glow Recipe", "grande": ["SKINCARE", "COREANO"], "pastilla": "20% OFF en mi preventa"}
P = lambda que, marca, foto, precio, antes, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=antes, **kw)
PARES = [
    (P("Mascarilla de labios", "Laneige", "laneige-lsm", 474, 592, desde=True, alto=0.62),
     P("Bálsamo de labios", "Laneige · Lip Glowy Balm", "laneige-glowy", 375, 469, alto=0.86),
     P("Crema hidratante", "Laneige · Water Bank", "laneige-waterbank", 434, 543, desde=True, alto=0.72)),
    (P("Sérum iluminador", "Glow Recipe · Dew Drops", "glow-dew", 395, 493, desde=True, alto=0.74),
     P("Hidratante sin grasa", "Glow Recipe · Pink Juice", "glow-pinkjuice", 415, 518, desde=True)),
    (P("Crema hidratante", "Glow Recipe · Plum Plump", "glow-plum", 415, 518, desde=True, alto=0.76),
     P("Kit 5 minis Lip Mask", "Laneige", "kit-laneige-midnight", 454, 567, alto=0.66)),
]
CIERRE = {
    "titulo": "¿CUÁL TE LLEVAS?",
    "pasos": [("Pide en alpacca.mx", "Todo el catálogo de la preventa"),
              ("Aparta con el 50%", "Y liquidas cuando llegue tu pedido"),
              ("100% original", "Comprado directo en Sephora USA")],
    "pastilla": "Cierra el 8 de noviembre",
}
