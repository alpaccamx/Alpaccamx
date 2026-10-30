"""Carrusel "Lo más vendido de Sephora" SOLO con productos con datos reales de ventas o premios:
- Top 10 de sephora.com 2025 (Navigo Marketing, publicado por WWD el 20/01/2026)
- Ventas en Amazon EE.UU. (AsInsight, julio 2026)
- Allure Best of Beauty 2025 y 2026
- Más vendidos del Sephora Sale 2026 (The Stripe) y reseñas de editoras
Precios de la preventa (alpacca.mx/?ver=preventa)."""
PORTADA = {
    "arriba": "Lo más vendido de", "grande": ["SEPHORA", "2025"],
    "abajo": ["según datos reales de ventas", "y ahora con 20% OFF en mi preventa"],
    "esquinas": [("sf-balm", 400, -14, 90, 170), ("kayali-vanilla", 330, 16, 980, 170),
                 ("tower-sos", 320, 14, 80, 1260), ("laneige-glowy", 340, -16, 1000, 1250)],
}
P = lambda que, marca, foto, precio, antes, dato, **kw: dict(que=que, marca=marca, foto=foto, precio=precio, antes=antes, dato=dato, **kw)
PARES = [
    (P("Bálsamo de labios", "Summer Fridays", "sf-balm", 474, 592, "#1 en sephora.com 2025"),
     P("Gel antibacterial", "Touchland · Power Mist", "touch-mist", 198, 247, "Top 10 sephora.com 2025", desde=True)),
    (P("Spray para granitos", "Tower 28 · SOS", "tower-sos", 237, 296, "Top 10 + premio Allure", desde=True, alto=0.86),
     P("Perfume de vainilla", "Kayali · Vanilla 28", "kayali-vanilla", 572, 715, "Top 10 sephora.com 2025", desde=True, alto=0.7)),
    (P("Bálsamo de labios", "Laneige · Lip Glowy", "laneige-glowy", 375, 469, "90 mil vendidos al mes", alto=0.8),
     P("Mascarilla de labios", "Laneige · Lip Sleeping Mask", "laneige-lsm", 474, 592, "70 mil vendidos al mes", desde=True, alto=0.6)),
    (P("Dúo de blush", "Patrick Ta · Major Headlines", "patrick-duo", 493, 617, "El más vendido de la marca", desde=True, alto=0.66),
     P("Esencia hidratante", "Rhode · Glazing Milk", "rhode-milk", 395, 493, "Se agota cada vez", desde=True, alto=0.78)),
    (P("Aceite para cabello", "Gisou", "gisou-oil", 493, 617, "Top 10 Sephora Sale 2026", desde=True, alto=0.7),
     P("Bronzer en barra", "Merit · Bronze Balm", "merit-bronze", 632, 789, "Premio Allure 2025", alto=0.66)),
]
GRACIAS = {"texto": ["¿Buscas otro producto?", "Mándame mensajito y te lo cotizo"]}
