"""Carrusel "Dior, Chanel, Fenty y Huda": fondo = fotos de tiendas Sephora de EE.UU. que mandó Mae, encima la foto
original del producto. Datos: Kayali #1 perfume de Sephora ene-ago 2025 (YipitData vía Beauty Independent);
Gloss Bomb = gloss más vendido de Fenty y Fenty Glow su tono #1 (fentybeauty.com); Easy Bake = el más vendido
de Huda (hudabeauty.com). Dior Lip Glow Oil y Forever Skin Glow = Allure Best of Beauty 2026 (fotos de liverpool.com.mx).
Miss Dior y Coco Mademoiselle sin dato de ventas: solo se dice que son clásicos."""
import os
F = lambda n: os.path.join(os.path.dirname(__file__), "fotos-sephora", n)
PORTADA = {
    "foto": F("charlotte.jpg"),
    "titulo": "DIOR, CHANEL,\nFENTY Y HUDA 💎",
    "sub": "lo que sí vale la pena",
    "pastilla": "con 20% OFF en mi preventa",
}
T = lambda **kw: dict(tienda=True, **kw)
PRODUCTOS = [
    T(foto="tienda-rosa", y=0.4, producto="miss-dior", precio=967, antes=1208, desde=True,
      arriba="Dior: Miss Dior Blooming Bouquet",
      abajo="el clásico de Dior: floral, fresco y súper romántico"),
    T(foto="ysl-blush", y=0.4, producto="dior-lipoil", precio=829, antes=1036,
      arriba="Dior: Lip Glow Oil",
      abajo="premio Allure 2026 al mejor aceite de labios con color"),
    T(foto="charlotte", y=0.5, producto="dior-forever", precio=1184, antes=1479,
      arriba="Dior: Forever Skin Glow",
      abajo="premio Allure 2026 a la mejor base con acabado luminoso"),
    T(foto="bolsas-cama", y=0.4, producto="chanel-coco", precio=2268, antes=2835, desde=True,
      arriba="Chanel: Coco Mademoiselle",
      abajo="el perfume de Chanel que nunca pasa de moda"),
    T(foto="pasillo-skincare", y=0.3, producto="fenty-gloss", precio=454, antes=567,
      arriba="Fenty Beauty: Gloss Bomb en Fenty Glow",
      abajo="el gloss más vendido de Fenty, en su tono #1"),
    T(foto="tienda-tower28", y=0.5, producto="fenty-diamond", precio=415, antes=518, desde=True,
      arriba="Fenty Beauty: Diamond Bomb",
      abajo="el iluminador que brilla como diamante con la luz"),
    T(foto="huda", y=0.4, producto="huda-easybake", precio=474, antes=592, desde=True,
      arriba="Huda Beauty: Easy Bake",
      abajo="el más vendido de Huda: deja la piel como filtro"),
    T(foto="bolsa-caja", y=0.4, producto="kayali-marsh", precio=572, antes=715, desde=True,
      arriba="Kayali: Yum Boujee Marshmallow 81",
      abajo="el perfume #1 de Sephora en 2025"),
]
FALTARON = {
    "foto": F("bolsas-carro.jpg"),
    "texto": "¿Qué marca de lujo\nquieres que te traiga? 👀",
    "pastilla": "Pídelos en alpacca.mx 💗",
}
