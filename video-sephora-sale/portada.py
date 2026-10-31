"""Portadas (1080x1920) de los 3 videos del Sephora Sale. Lo importante va entre y=260 y y=1660 (recorte 3:4 del perfil).
Uso: python3 portada.py CARPETA_CON_est_vNN.mp4 -> portada-lista.jpg, portada-juego.jpg, portada-cierre.jpg"""
import importlib.util, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = sys.argv[1]


def motor(var):  # build.py de esa variante (para usar sus mismas piezas)
    sys.argv = ["build.py", var, CRUDO]
    sp = importlib.util.spec_from_file_location("sale_" + var, os.path.join(AQUI, "build.py"))
    m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m


def cuadro(B, fuente, seg):
    L = next(B.video(fuente, seg, 1, 1.0))
    L.alpha_composite(B.Image.new("RGBA", L.size, (0, 0, 0, 60)))
    return L


def guarda(L, nombre):
    L.convert("RGB").save(os.path.join(AQUI, nombre), quality=92); print("ok", nombre)


# 1. lista: la tienda (Rhode) con la lista ya palomeada
B = motor("lista"); b = B.b
L = cuadro(B, "v69", 128)
B.pas(L, "Fui al Sephora Sale con", 330, sz=64, bg=B.NEGRO)
B.pas(L, "la lista de mis clientas 📝", 450, sz=64, bg=B.NEGRO)
lb = B.libreta(999); lb = lb.resize((int(lb.width * 1.35), int(lb.height * 1.35)), B.Image.LANCZOS)
b.pon(L, lb, B.W / 2, 1000)
b.pon(L, B.sello("¡Lista completa! ✅"), B.W / 2, 1500)
guarda(L, "portada-lista.jpg")

# 2. juego: los 3 productos con el precio escondido
B = motor("juego"); b = B.b
L = cuadro(B, "v62", 10)
B.pas(L, "¿Adivinas cuánto cuestan", 330, sz=68, bg=B.NEGRO)
B.pas(L, "en México? 🤔", 450, sz=68, bg=B.NEGRO)
for i, rec in enumerate(["rhode-pocket", "rare-blush", "huda-easybake"]):
    p = B.producto(rec, 330); p = p.resize((int(p.width * 0.62), int(p.height * 0.62)), B.Image.LANCZOS)
    b.pon(L, p, 200 + 340 * i, 760)
    b.pon(L, b.pastilla("$ ???", "ExtraBold", 54, B.ROSA, B.WHITE), 200 + 340 * i, 1000)
B.pas(L, "Precio en México vs. conmigo 💸", 1200, "Bold", 50, B.WHITE, B.NEGRO)
B.pas(L, "Sephora Sale · 20% OFF", 1560, sz=56)
guarda(L, "portada-juego.jpg")

# 3. cierre: el calendario del 8 de noviembre
B = motor("cierre"); b = B.b
L = cuadro(B, "v62", 100)
B.pas(L, "Mi preventa del Sephora Sale", 330, sz=60, bg=B.NEGRO)
b.pon(L, B.calendario(), B.W / 2, 780)
B.pas(L, "Así funciona 👇", 1150, sz=66, bg=B.NEGRO)
B.pas(L, "Aparta con el 50% · 20% OFF", 1290, "Bold", 50, B.WHITE, B.NEGRO)
guarda(L, "portada-cierre.jpg")
