"""Carrusel "Cosas que valen cada centavo pt.2" (cuando el producto no se ve bien en la foto, va una tarjeta con su foto: producto=) con fotos reales de Mae (pedidos del Sephora Sale 2025)
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
PRODUCTOS = [  # clave = producto del catálogo, para compararlo con Sephora México
    dict(foto="mano-patrick-duo", clave="patrick-duo", producto="patrick-duo", pop=dict(alto=430, cx=790, cy=640),  y=0.2, precio=493, antes=617, desde=True,
         arriba="Patrick Ta: Major Headlines Blush Duo",
         abajo="El blush que TODAS me piden cada año: crema y polvo en uno, dura todo el día"),
    dict(foto="mano-rare", clave="rare-blush", producto="rare-blush", pop=dict(alto=430, cx=790, cy=640),  y=0.35, precio=316, antes=395, desde=True,
         arriba="Rare Beauty: Soft Pinch Liquid Blush",
         abajo="Con UNA gotita es suficiente: un bote te dura meses"),
    dict(foto="mano-patrick-paleta", producto="patrick-dreamdate", pop=dict(alto=430, cx=790, cy=640), y=0.3, precio=967, antes=1208,
         arriba="Patrick Ta: Major Dimension Dream Date Eyeshadow Palette",
         abajo="La paleta más BONITA: tonos rosados que combinan con todo, de día y de noche"),
    dict(foto="mano-urban", producto="urban-allnighter", pop=dict(alto=430, cx=790, cy=640),  y=0.15, precio=355, antes=444, desde=True,
         arriba="Urban Decay: All Nighter Setting Spray",
         abajo="Si quieres que tu maquillaje NO SE MUEVA: aguanta toda la fiesta"),
    dict(foto="mano-huda", clave="huda-easybake", producto="huda-easybake", pop=dict(alto=430, cx=790, cy=640),  y=0.35, precio=474, antes=592, desde=True,
         arriba="Huda Beauty: Easy Bake Loose Powder",
         abajo="Deja tu piel como FILTRO: sella el corrector y no se cuartea"),
]
FALTARON = {
    "foto": F("caja-rare.jpg"),
    "texto": "¿Cuáles me faltaron?\nDíganme sus favs para hacer parte 3 👀",
    "pastilla": "Pídelos en alpacca.mx 💗",
}
