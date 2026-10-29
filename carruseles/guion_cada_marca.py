"""Carrusel "Lo más vendido de cada marca en Sephora": fondos = fotos de tiendas Sephora de EE.UU. que mandó Mae,
encima el producto comprobado (ver bestsellers-comprobados.md). Precios de la preventa."""
import os
F = lambda n: os.path.join(os.path.dirname(__file__), "fotos-sephora", n)
PORTADA = {
    "foto": F("entrada-usa.jpg"),
    "titulo": "LO MÁS VENDIDO\nDE CADA MARCA\nEN SEPHORA 🛍️",
    "sub": "con datos reales 📊",
    "pastilla": "y te lo traigo con 20% OFF",
}
T = lambda **kw: dict(tienda=True, **kw)
PRODUCTOS = [
    T(foto="charlotte", y=0.3, precio=375, antes=469, desde=True,
      arriba="Charlotte Tilbury: el Hollywood Flawless Filter",
      abajo="más de 4 mil reseñas en Sephora: deja la piel como con filtro"),
    T(foto="huda", y=0.4, producto="huda-easybake", precio=474, antes=592, desde=True,
      arriba="Huda Beauty: el polvo Easy Bake",
      abajo="el que más me pidieron mis clientas en el Sephora Sale pasado"),
    T(foto="bolsa-caja", y=0.4, producto="sf-balm", precio=474, antes=592,
      arriba="Summer Fridays: el Lip Butter Balm",
      abajo="el producto #1 en ventas de sephora.com en 2025"),
    T(foto="tienda-tower28", y=0.5, producto="tower-sos", precio=237, antes=296, desde=True,
      arriba="Tower 28: el SOS Spray",
      abajo="top 10 de sephora.com y premio Allure"),
    T(foto="tienda-rosa", y=0.4, producto="laneige-glowy", precio=375, antes=469,
      arriba="Laneige: el Lip Glowy Balm",
      abajo="se venden 90 mil al mes solo en Amazon"),
    T(foto="pasillo-skincare", y=0.3, producto="rhode-milk", precio=395, antes=493, desde=True,
      arriba="Rhode: el Glazing Milk",
      abajo="el de Hailey Bieber que se agota cada vez que llega"),
    T(foto="ysl-blush", y=0.4, producto="patrick-duo", precio=493, antes=617, desde=True,
      arriba="Patrick Ta: el Major Headlines",
      abajo="el blush más vendido de la marca"),
    T(foto="bolsas-cama", y=0.4, producto="kayali-vanilla", precio=572, antes=715, desde=True,
      arriba="Kayali: el Vanilla 28",
      abajo="el perfume que se metió al top 10 de sephora.com"),
]
FALTARON = {
    "foto": F("bolsas-carro.jpg"),
    "texto": "¿De qué marca quieres\nla parte 2? 👀",
    "pastilla": "Pídelos en alpacca.mx 💗",
}
