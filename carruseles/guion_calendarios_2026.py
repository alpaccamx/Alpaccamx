"""Carrusel "Calendarios de adviento 2026": los que hay en la preventa (precios de alpacca.mx/?ver=preventa).
El de Sephora Favorites ya está agotado, por eso no sale."""
import os
PORTADA = {
    "foto": os.path.join(os.path.dirname(__file__), "fotos-mae", "caja-calendarios.jpg"),
    "titulo": ["CALENDARIOS DE", "ADVIENTO 2026", "(20% OFF)"],
    "nota": "📦 Así llegaron los de mis clientas en 2025",
    "titulo_y": 470,
}
CALENDARIOS = [
    {"nombre": "Olive Young x Sephora", "foto": "oy-cal", "precio": 1361, "antes": 1701},
    {"nombre": "Sephora Collection Premium 24 días", "foto": "sc-cal", "precio": 1953, "antes": 2441},
    {"nombre": "Glow Recipe 12 Days of Glow", "foto": "glow-cal", "precio": 2170, "antes": 2712},
    {"nombre": "Laneige 12 Days of Wonder", "foto": "laneige-cal", "precio": 2939, "antes": 3673},
    {"nombre": "Charlotte Tilbury Hollywood Beauty Wonderland", "foto": "ct-cal", "precio": 4339, "antes": 5423},
]
CIERRE = {
    "pregunta": "¿Cuál te gustaría abrir en diciembre? 🎄",
    "sub": "Todos están en mi preventa del Sephora Sale. Apartas con el 50% y liquidas antes de que te lo envíe.",
    "pastilla": "Cierra el 8 de noviembre · alpacca.mx",
}
