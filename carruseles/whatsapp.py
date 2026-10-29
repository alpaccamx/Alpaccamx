"""Última lámina de cada carrusel: el QR para unirse al grupo de WhatsApp de Mae ("Mae | Alpacca Skincare Coreano").
El QR se genera limpio desde el enlace (el de la captura traía parámetros de rastreo que no hacen falta)."""
import os
import qrcode
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
ENLACE = "https://chat.whatsapp.com/Jx4rYqxZvES93A4y4zvfXu"
VERDE = (37, 211, 102)


def codigo(tam):
    """QR negro sobre blanco con el logo de WhatsApp en medio, como el QR original del grupo
    (corrección alta para que se siga leyendo con el logo encima)"""
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=2)
    q.add_data(ENLACE); q.make(fit=True)
    im = q.make_image(fill_color="black", back_color="white").convert("RGBA").resize((tam, tam), Image.NEAREST)
    r = int(tam * 0.11)  # círculo blanco detrás del logo
    ImageDraw.Draw(im).ellipse((tam / 2 - r, tam / 2 - r, tam / 2 + r, tam / 2 + r), fill=(255, 255, 255, 255))
    f = ImageFont.truetype(os.path.join(AQUI, "fuentes", "fa-brands-400.ttf"), int(r * 1.6))
    ImageDraw.Draw(im).text((tam / 2, tam / 2), "\uf232", font=f, fill=VERDE + (255,), anchor="mm")  # ícono de WhatsApp
    return im


def tarjeta(tam, radio=48):
    """QR dentro de una tarjeta blanca redondeada con sombrita"""
    pad = 40; w = h = tam + 2 * pad
    t = Image.new("RGBA", (w + 60, h + 60))
    sh = Image.new("L", t.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 40, w + 30, h + 40), radio, fill=90)
    t.putalpha(sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(t).rounded_rectangle((30, 30, w + 30, h + 30), radio, fill=(255, 255, 255, 255))
    t.alpha_composite(codigo(tam), (30 + pad, 30 + pad))
    return t


def lamina(W, H, fondo, titulo, texto, color_titulo, color_texto, fuente_titulo, fuente_texto, alpaca=True):
    """fuente_*: funciones (tamaño) -> ImageFont. Todo va centrado; la alpaca con su celular abajo."""
    L = Image.new("RGBA", (W, H), fondo + (255,))
    d = ImageDraw.Draw(L)
    alto_vert = H > 1500
    tam = 600 if alto_vert else 420
    t = tarjeta(tam)
    ft, fx = fuente_titulo(), fuente_texto()
    bloque = len(titulo) * ft.size * 0.95 + 10 + len(texto) * fx.size * 1.25 + 20 + t.height + 60
    y = (H * 0.40 if alto_vert else H * 0.44) - bloque / 2 + ft.size / 2
    for r in titulo:
        d.text((W / 2, y), r, font=ft, fill=color_titulo, anchor="mm"); y += ft.size * 0.95
    y += 10 - ft.size * 0.45 + fx.size * 0.6
    for r in texto:
        d.text((W / 2, y), r, font=fx, fill=color_texto, anchor="mm"); y += fx.size * 1.25
    ty = int(y + 20 - fx.size * 0.6)
    L.alpha_composite(t, (int(W / 2 - t.width / 2), ty))
    y = ty + t.height + 10
    d.text((W / 2, y), "Escanéalo con la cámara de tu celular", font=fx, fill=color_texto, anchor="mm")
    if alpaca:
        al = Image.open(os.path.join(RAIZ, "video-sephora", "alpacas", "celular.png")).convert("RGBA")
        lado = int(min(340 if alto_vert else 230, H - y - 50))
        al.thumbnail((lado, lado), Image.LANCZOS)
        L.alpha_composite(al, (int(W / 2 - al.width / 2), int(y + 40)))
    return L
