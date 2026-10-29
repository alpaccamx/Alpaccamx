"""Carrusel "Lo que TODAS compran en Sephora" (estilo @yourdailyglow_): portada y cierre con fotos de tiendas
Sephora de EE.UU. que mandó Mae; solo productos con datos reales (ver bestsellers-comprobados.md).
Precios de la preventa (alpacca.mx/?ver=preventa)."""
import os
F = lambda n: os.path.join(os.path.dirname(__file__), "fotos-sephora", n)
PORTADA = {
    "foto": F("tienda-tower28.jpg"),
    "titulo": "LO QUE TODAS\nCOMPRAN EN\nSEPHORA 🛍️",
    "sub": "con datos reales 📊",
    "pastilla": "y ahora con 20% OFF en mi preventa",
}
PRODUCTOS = [
    dict(foto="sf-balm", alto=0.85, precio=474, antes=592,
         arriba="Summer Fridays Lip Butter Balm\nel producto #1 en ventas de sephora.com en 2025",
         abajo="sí, de TODA la página. Hidrata y huele riquísimo"),
    dict(foto="laneige-glowy", alto=0.85, precio=375, antes=469,
         arriba="Laneige Lip Glowy Balm\nse venden 90 MIL al mes solo en Amazon",
         abajo="brillo jugoso con un toque de color"),
    dict(foto="touch-mist", alto=0.75, precio=198, antes=247, desde=True,
         arriba="Touchland Power Mist\nde los 10 más vendidos de sephora.com en 2025",
         abajo="gel antibacterial en spray que huele delicioso y no reseca"),
    dict(foto="kayali-vanilla", alto=0.75, precio=572, antes=715, desde=True,
         arriba="Kayali Vanilla 28\nel perfume que se metió al top 10 de Sephora",
         abajo="vainilla dulce y elegante que dura todo el día"),
    dict(foto="tower-sos", alto=0.9, precio=237, antes=296, desde=True,
         arriba="Tower 28 SOS Spray\ntop 10 de Sephora Y premio Allure",
         abajo="calma granitos y rojeces en segundos"),
    dict(foto="rhode-milk", alto=0.85, precio=395, antes=493, desde=True,
         arriba="Rhode Glazing Milk\nel de Hailey Bieber que se agota cada vez que llega",
         abajo="la piel queda hidratada y con ese glow de “glazed donut”"),
    dict(foto="patrick-duo", swatch="patrick-swatch", alto=0.7, precio=493, antes=617, desde=True,
         arriba="Patrick Ta Major Headlines\nel blush más vendido de la marca",
         abajo="crema y polvo en uno: dura todo el día"),
    dict(foto="gisou-oil", alto=0.85, precio=493, antes=617, desde=True,
         arriba="Gisou Honey Infused Hair Oil\nde lo más vendido del Sephora Sale de este año",
         abajo="con muy poquito deja el pelo suavecito y con brillo"),
    dict(foto="kosas-revealer", alto=0.9, precio=336, antes=420, desde=True,
         arriba="Kosas Revealer\nel corrector favorito de los maquillistas",
         abajo="ilumina las ojeras y se ve como piel de verdad"),
    dict(foto="merit-bronze", alto=0.75, precio=632, antes=789,
         arriba="Merit Bronze Balm\nganador del premio Allure Best of Beauty",
         abajo="bronzer en barra que se difumina facilísimo"),
]
FALTARON = {
    "foto": F("bolsas-productos.jpg"),
    "texto": "¿Cuántos ya tienes?\nY ¿cuál te falta? 👀",
    "pastilla": "Pídelos en alpacca.mx 💗",
}
