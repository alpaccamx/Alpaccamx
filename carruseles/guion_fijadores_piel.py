"""Carrusel "NO compres otro fijador sin ver esto": fijadores y polvos según tu tipo de piel. Precios de la preventa."""
import os
PORTADA = {
    "foto": os.path.join(os.path.dirname(__file__), "fotos-mae", "caja-huda.jpg"),
    "gancho": "NO compres fijador sin ver esto✨",
    "sub": "Te digo cuál elegir según tu piel",
    "nota": "📦 Pedido de mis clientas del Sephora Sale 2025",
}
PRODUCTOS = [
    {"nombre": "Milk Makeup Hydro Grip Setting Spray", "foto": "milk-spray",
     "si": "Si tienes piel seca y quieres verte glowy",
     "por_que": "Tiene ácido hialurónico y niacinamida: fija el maquillaje y deja la piel jugosa, sin resecar.",
     "precio": 474, "antes": 592, "desde": True},
    {"nombre": "ONE/SIZE On 'Til Dawn SPF 28", "foto": "onesize-spray",
     "si": "Si tienes piel grasa y te brilla la cara",
     "por_que": "Acabado mate que controla el brillo, es a prueba de agua y además trae SPF 28.",
     "precio": 415, "antes": 518, "desde": True},
    {"nombre": "Huda Beauty Easy Bake Loose Powder", "foto": "huda-easybake", "alto": 0.8,
     "si": "Si te gusta hornear las ojeras",
     "por_que": "Polvo suelto finito que sella el corrector y deja la piel lisita y difuminada.",
     "precio": 474, "antes": 592, "desde": True},
    {"nombre": "Kosas Cloud Set Loose Powder", "foto": "kosas-cloudset", "alto": 0.8,
     "si": "Si quieres un polvo que no se note",
     "por_que": "Es sin talco y súper ligerito: sella el maquillaje sin verse pesado ni acartonado.",
     "precio": 493, "antes": 617, "desde": True},
    {"nombre": "Saie CitySet Setting Spray", "foto": "saie-cityset",
     "si": "Si tienes piel normal o mixta",
     "por_que": "Fijador ligerito e hidratante que ayuda a que tu maquillaje dure hasta 16 horas.",
     "precio": 355, "antes": 444, "desde": True},
    {"nombre": "Makeup by Mario SurrealSkin Setting Spray", "foto": "mario-surreal",
     "si": "Si vas a un evento largo o sudas mucho",
     "por_que": "Es a prueba de agua y dura hasta 16 horas. Perfecto para bodas y fiestas.",
     "precio": 395, "antes": 493},
]
CIERRE = {
    "pregunta": "¿Tu piel es seca, grasa o mixta? 👀",
    "sub": "Todos están en mi preventa del Sephora Sale con 20% OFF",
    "pastilla": "Cierra el 8 de noviembre · alpacca.mx",
}
