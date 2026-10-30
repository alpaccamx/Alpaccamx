"""Carrusel "Los más amados de Sephora": productos de las capturas de la app de Sephora que mandó Mae (fotos
recortadas de ahí). El dato es cuántas personas los tienen en favoritos (corazón) y sus reseñas en la app, al 29/10/2026.
Precios de la preventa (alpacca.mx/?ver=preventa)."""
PORTADA = {
    "arriba": "Los más amados de", "grande": ["SEPHORA", "2026"],
    "abajo": ["los que más gente tiene en favoritos", "con 20% OFF en mi preventa"],
    "esquinas": [("sep-ysl-blush", 300, -14, 100, 150), ("sep-dior-palette", 300, 14, 980, 160),
                 ("sep-tower-swipe", 300, 18, 60, 1290), ("sep-rhode-milk", 300, -16, 1020, 1290)],
}
ANTES = {'sep-huda': 0, 'sep-tower-swipe': 592, 'sep-ysl-blush': 1135, 'sep-rhode-milk': 790, 'sep-dior-palette': 1356, 'sep-patrick-mini': 617}  # Sephora USA en pesos (catálogo de la preventa)
P = lambda que, marca, foto, precio, dato, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=ANTES.get(foto, 0), dato=dato, **kw)
PARES = [
    (P("Polvo para sellar", "Huda Beauty · Easy Bake", "sep-huda", 474, "1.8 millones de favoritos", desde=True, alto=0.74),
     P("Corrector hidratante", "Tower 28 · Swipe", "sep-tower-swipe", 474, "937 mil favoritos", alto=0.86)),
    (P("Blush en polvo", "YSL · Make Me Blush", "sep-ysl-blush", 908, "585 mil favoritos", alto=0.7),
     P("Esencia hidratante", "Rhode · Glazing Milk", "sep-rhode-milk", 395, "516 mil favoritos", desde=True, alto=0.82)),
    (P("Paleta de iluminadores", "Dior · Backstage Glow", "sep-dior-palette", 1085, "349 mil favoritos", alto=0.66),
     P("Dúo de blush mini", "Patrick Ta · Major Headlines", "sep-patrick-mini", 493, "204 mil favoritos", alto=0.84)),
]
GRACIAS = {"texto": ["¿Cuál ya tienes en favoritos?", "Mándame mensajito y te lo aparto"]}
