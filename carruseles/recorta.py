"""Quita el fondo a las fotos de producto (rembg) y las guarda como PNG transparentes en recortes/.
Uso: python3 recorta.py nombre=ruta_foto ..."""
import os, sys
import numpy as np
from scipy import ndimage
from PIL import Image
from rembg import remove, new_session

AQUI = os.path.dirname(os.path.abspath(__file__))
ses = new_session("isnet-general-use")
for arg in sys.argv[1:]:
    nombre, ruta = arg.split("=", 1)
    im = remove(Image.open(ruta).convert("RGB"), session=ses, alpha_matting=True)
    a = np.array(im.getchannel("A")); a[a < 40] = 0; et, n = ndimage.label(a > 0)  # quita pedacitos sueltos (texto, manchas)
    if n:
        tam = ndimage.sum(np.ones_like(a), et, range(1, n + 1))
        for i, t in enumerate(tam, 1):
            if t < tam.max() * 0.06: a[et == i] = 0
        im.putalpha(Image.fromarray(a))
    im = im.crop(im.getbbox())
    im.save(os.path.join(AQUI, "recortes", nombre + ".png")); print("ok", nombre, im.size)
