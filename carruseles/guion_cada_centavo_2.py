"""Carrusel "Cosas que valen cada centavo pt.2" con fotos reales de Mae (pedidos del Sephora Sale 2025)
sosteniendo cada producto. Precios de la preventa (alpacca.mx/?ver=preventa)."""
import os
F = lambda n: os.path.join(os.path.dirname(__file__), "fotos-mae", n)
PORTADA = {
    "foto": F("caja-patrick.jpg"),
    "titulo": "COSAS QUE VALEN\nCADA CENTAVO 💸",
    "sub": "Sephora Sale pt.2",
    "pastilla": "con 20% OFF en mi preventa",
    "nota": "📦 Pedidos de mis clientas del Sephora Sale 2025",
}
PRODUCTOS = [
    dict(foto="mano-patrick-duo", y=0.2, precio=493, antes=617, desde=True,
         arriba="el blush que TODAS me piden cada año",
         abajo="crema y polvo en uno: dura todo el día y se ve natural"),
    dict(foto="mano-rare", y=0.35, precio=316, antes=395, desde=True,
         arriba="con UNA gotita es suficiente",
         abajo="el Soft Pinch de Rare Beauty: un bote te dura meses"),
    dict(foto="mano-patrick-paleta", y=0.3, precio=908, antes=1134, desde=True,
         arriba="la paleta de sombras más BONITA",
         abajo="tonos rosados que combinan con todo, de día y de noche"),
    dict(foto="mano-urban", y=0.15, precio=355, antes=444, desde=True,
         arriba="si quieres que tu makeup NO SE MUEVA",
         abajo="el All Nighter de Urban Decay aguanta toda la fiesta"),
    dict(foto="mano-huda", y=0.35, precio=474, antes=592, desde=True,
         arriba="el polvo que hace que tu piel se vea como FILTRO",
         abajo="el Easy Bake de Huda sella el corrector y no se cuartea"),
]
FALTARON = {
    "foto": F("caja-rare.jpg"),
    "texto": "¿Cuáles me faltaron?\nDíganme sus favs para hacer parte 3 👀",
    "pastilla": "Pídelos en alpacca.mx 💗",
}
