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


# ---- videos del 31 de octubre (necesitan est_v5364, est_v111 y est_v5362) ----
if os.path.exists(os.path.join(CRUDO, "est_v5364.mp4")):
    # 4. dior: la paleta con el precio escondido
    B = motor("dior"); b = B.b
    L = cuadro(B, "v5364", 7.0)
    B.pas(L, "¿Cuánto cuesta esta paleta", 330, sz=64, bg=B.NEGRO)
    B.pas(L, "Dior en México? 🤔", 450, sz=64, bg=B.NEGRO)
    b.pon(L, B.producto("sep-dior-palette", 440), B.W / 2, 800)
    b.pon(L, B.etiqueta("En Sephora México", "$ ???", B.ROSA), B.W / 2, 1150)
    B.pas(L, "Sephora Sale · 20% OFF", 1520, sz=56)
    guarda(L, "portada-dior.jpg")
if os.path.exists(os.path.join(CRUDO, "est_v111.mp4")):
    # 5. noche: Sephora de noche
    B = motor("noche"); b = B.b
    L = cuadro(B, "v111", 3.5)
    b.pon(L, b.pastilla("🕗 8:00 pm", "ExtraBold", 110, B.NEGRO + (230,), B.WHITE, padx=56, pady=26), B.W / 2, 420)
    B.pas(L, "…y sigo en Sephora por sus pedidos 🛍️", 590, "Bold", 50, B.WHITE, B.NEGRO)
    B.pas(L, "La parte que nadie ve 👀", 1450, sz=66)
    guarda(L, "portada-noche.jpg")
if os.path.exists(os.path.join(CRUDO, "est_v5362.mp4")):
    # 6. amiga: la burbuja de mensaje
    B = motor("amiga"); b = B.b
    L = cuadro(B, "v5362", 1.5)
    B.pas(L, "Mándale esto a la amiga", 360, sz=66, bg=B.NEGRO)
    B.pas(L, "que siempre te dice:", 480, sz=66, bg=B.NEGRO)
    bb = B.burbuja("¿me traes algo de Sephora? 🥺"); b.pon(L, bb, 60 + bb.width / 2, 720)
    bb = B.burbuja("porfa 🙏🙏"); b.pon(L, bb, 60 + bb.width / 2, 880)
    B.pas(L, "20% OFF · cierra el 8 de noviembre", 1480, "Bold", 50, B.WHITE, B.NEGRO)
    guarda(L, "portada-amiga.jpg")
if os.path.exists(os.path.join(CRUDO, "est_v111.mp4")):
    # 7. vlog: estilo del video de inspiración (título blanco sin caja, sobre el letrero de Sephora)
    B = motor("vlog"); b = B.b
    L = cuadro(B, "v111", 3.5)
    b.pon(L, b.linea("Sephora Sale 🛍️", "ExtraBold", 120, B.WHITE, stroke=7, sfill=(30, 20, 26)), B.W / 2, 420)
    b.pon(L, b.linea("las wish lists de mis clientas", "Bold", 62, B.WHITE, stroke=6, sfill=(30, 20, 26)), B.W / 2, 560)
    b.pon(L, b.linea("acompáñame", "ExtraBold", 96, B.WHITE, stroke=10, sfill=B.ROSA), B.W / 2, 1450)
    guarda(L, "portada-vlog.jpg")
if os.path.exists(os.path.join(CRUDO, "est_v62.mp4")):
    # 8. allure: los 4 ganadores flotando sobre la tienda difuminada
    B = motor("allure"); b = B.b
    L = cuadro(B, "v111", 16)
    L.paste(L.filter(B.ImageFilter.GaussianBlur(18))); L.alpha_composite(B.Image.new("RGBA", L.size, (24, 10, 18, 120)))
    f = B.ImageFont.truetype(os.path.join(B.FUENTES, "BagelFatOne-Regular.ttf"), 130)
    for txt, y, col in [("Premios", 400, B.WHITE), ("Allure 2026", 550, B.ROSA)]:
        im = B.Image.new("RGBA", (int(f.getlength(txt)) + 40, 190)); B.ImageDraw.Draw(im).text((20, 95), txt, font=f, fill=col, anchor="lm")
        b.pon(L, B._sombra(im, 12, 170), B.W / 2, y)
    b.pon(L, B._sombra(b.linea("¿cuánto cuestan en México vs. conmigo?", "Bold", 46, B.WHITE)), B.W / 2, 690)
    for k, rec in enumerate(["ct-spray", "dior-lipoil", "dior-forever", "tower-sos-solo"]):
        b.pon(L, B.recorte(rec, 380), [290, 790][k % 2], [960, 1380][k // 2])
    B.pas(L, "Sephora Sale · 20% OFF", 1500, sz=56)
    guarda(L, "portada-allure.jpg")
# 9-11. serie Allure por categoría
for var in ["allure-rostro", "allure-labios", "allure-piel"]:
    if not os.path.exists(os.path.join(CRUDO, "est_v111.mp4")): break
    B = motor(var); b = B.b; C = B.CAT
    L = cuadro(B, "v111", 16)
    L.paste(L.filter(B.ImageFilter.GaussianBlur(18))); L.alpha_composite(B.Image.new("RGBA", L.size, (24, 10, 18, 120)))
    b.pon(L, B._bagel("Premios Allure", 120, B.WHITE), B.W / 2, 420)
    b.pon(L, b.pastilla(f"Cap. {C['cap']} · {C['nombre']}", "ExtraBold", 80, B.ROSA, B.WHITE, padx=50, pady=20), B.W / 2, 580)
    n = len(C["productos"])
    for k, p in enumerate(C["productos"]):
        b.pon(L, B.recorte(p["rec"], 560 if n > 1 else 720), B.W / 2 + (k - (n - 1) / 2) * 470, 1080)
    B.pas(L, "para qué sirven y cuánto cuestan 💸" if n > 1 else "para qué sirve y cuánto cuesta 💸", 1480, "Bold", 48, B.WHITE, B.NEGRO)
    guarda(L, f"portada-{var}.jpg")
