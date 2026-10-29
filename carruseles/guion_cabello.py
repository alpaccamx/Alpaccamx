"""Carrusel "Para tu cabello" del Sephora Sale (tarjetas rosas). Precios de la preventa."""
PORTADA = {
    "arriba": "Para tu cabello, del", "grande": ["SEPHORA", "SALE"],
    "abajo": ["pelo suavecito y con brillo", "con 20% OFF en mi preventa"],
    "esquinas": [("gisou-oil", 400, -14, 110, 170), ("olaplex-3", 380, 18, 980, 180),
                 ("amika-perkup", 420, 20, 90, 1220), ("ouai-mask", 400, -16, 990, 1220)],
}
P = lambda que, marca, foto, precio, antes, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=antes, **kw)
PARES = [
    (P("Aceite para pelo", "Gisou", "gisou-oil", 493, 617, desde=True, alto=0.72),
     P("Mascarilla para pelo", "Gisou", "gisou-mask", 493, 617, desde=True, alto=0.62)),
    (P("Tratamiento reparador", "Olaplex · No. 3", "olaplex-3", 671, 839, desde=True, alto=0.76),
     P("Aceite reparador", "Olaplex · No. 7", "olaplex-7", 632, 789, desde=True, alto=0.76)),
    (P("Bálsamo reparador", "OUAI · Bond Repair", "ouai-mask", 553, 691, desde=True),
     P("Mascarilla reparadora", "Amika · The Kure", "amika-kure", 474, 592, desde=True, alto=0.6)),
    (P("Shampoo en seco", "Amika · Perk Up", "amika-perkup", 316, 395, desde=True),
     P("Aceite pre-lavado", "Fable & Mane · HoliRoots", "fable-holiroots", 355, 444, desde=True)),
]
CIERRE = {
    "titulo": "¿CUÁL TE LLEVAS?",
    "pasos": [("Pide en alpacca.mx", "Todo el catálogo de la preventa"),
              ("Aparta con el 50%", "Y liquidas cuando llegue tu pedido"),
              ("100% original", "Comprado directo en Sephora USA")],
    "pastilla": "Cierra el 8 de noviembre",
}
