"""Marco de iPhone para meter la pantalla de alpacca.mx: cuerpo de titanio con botones, bordes negros finos,
Dynamic Island, barra de estado (9:41, señal, wifi, batería) y la barra de Safari abajo con «alpacca.mx».
La página (390x664 pt, lo que Safari deja libre en un iPhone 13) va entre la barra de estado (47 pt) y la de
Safari (133 pt): 47 + 664 + 133 = 844 pt, la pantalla completa.
Uso: tel = Iphone(alto_pantalla); img = tel.con(pagina)  # pagina: imagen PIL de cualquier tamaño 390:664"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

INTER = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
SS = 3  # se dibuja 3 veces más grande y se reduce para que las orillas salgan suaves


def _f(peso, s): return ImageFont.truetype(INTER.format(peso), int(s))


class Iphone:
    def __init__(self, alto_pantalla):
        k = alto_pantalla / 844                       # px por punto de iOS
        self.k = k
        self.sw, self.sh = int(round(390 * k / 2)) * 2, int(round(alto_pantalla))
        self.bez = int(round(11 * k))                 # borde negro
        self.tit = int(round(3.2 * k))                # canto de titanio
        self.btn = int(round(2.4 * k))                # lo que salen los botones
        self.sombra = int(round(26 * k))
        m = self.btn + self.sombra                    # margen alrededor del cuerpo
        self.bw = self.sw + 2 * (self.bez + self.tit)
        self.bh = self.sh + 2 * (self.bez + self.tit)
        self.W, self.H = self.bw + 2 * m, self.bh + 2 * m
        self.x0 = m + self.tit + self.bez             # esquina de la pantalla dentro de la imagen
        self.y0 = self.x0
        self.r_pant = int(round(47.3 * k))            # radio de las esquinas de la pantalla
        self.arriba, self.abajo = int(round(47 * k)), self.sh - int(round(47 * k)) - int(round(664 * k))
        self.pw, self.ph = self.sw, int(round(664 * k))  # tamaño de la página
        self._cuerpo(); self._pantalla_fija()

    # ---------- cuerpo: sombra, botones, titanio, borde negro, hueco de la pantalla
    def _cuerpo(self):
        k, s = self.k, SS
        W, H = self.W * s, self.H * s
        m = (self.btn + self.sombra) * s
        bw, bh = self.bw * s, self.bh * s
        r_ext = (self.r_pant + self.bez + self.tit) * s
        base = Image.new("RGBA", (W, H))
        # sombra suave abajo
        sh = Image.new("L", (self.W, self.H), 0)
        ImageDraw.Draw(sh).rounded_rectangle((self.btn + self.sombra + 6, self.btn + self.sombra + int(14 * k / 1.8),
                                              self.btn + self.sombra + self.bw - 6, self.btn + self.sombra + self.bh + int(10 * k / 1.8)),
                                             (self.r_pant + self.bez + self.tit), fill=120)
        sh = sh.filter(ImageFilter.GaussianBlur(self.sombra * 0.55)).resize((W, H), Image.BILINEAR)
        base.paste(Image.new("RGBA", (W, H), (60, 20, 40, 255)), (0, 0), sh)
        d = ImageDraw.Draw(base)
        # botones (detrás del cuerpo): acción y volumen a la izquierda, encendido a la derecha
        def boton(lado, y, alto):
            y1, y2 = m + int(y * k * s), m + int((y + alto) * k * s)
            if lado == "i": caja = (m - self.btn * s - 2 * s, y1, m + 4 * s, y2)
            else: caja = (m + bw - 4 * s, y1, m + bw + self.btn * s + 2 * s, y2)
            d.rounded_rectangle(caja, int(1.6 * k * s), fill=(150, 146, 140, 255))
            # brillo
            d.rounded_rectangle((caja[0] + s, caja[1] + 2 * s, caja[2] - s, caja[1] + 5 * s), s, fill=(205, 202, 196, 255))
        boton("i", 120, 32); boton("i", 178, 62); boton("i", 254, 62); boton("d", 205, 100)
        # canto de titanio con degradado (más claro en la orilla de arriba)
        tit = Image.new("RGBA", (W, H))
        g = Image.new("RGBA", (1, bh))
        for y in range(bh):
            t = y / bh; c = int(118 + 40 * (1 - t) ** 3 - 18 * t)
            g.putpixel((0, y), (c, c - 3, c - 8, 255))
        g = g.resize((bw, bh))
        mk = Image.new("L", (bw, bh), 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, bw - 1, bh - 1), r_ext, fill=255)
        tit.paste(g, (m, m), mk)
        base.alpha_composite(tit)
        d = ImageDraw.Draw(base)
        # línea fina clara en la orilla y otra oscura adentro (se ve el canto)
        d.rounded_rectangle((m, m, m + bw - 1, m + bh - 1), r_ext, outline=(210, 207, 200, 255), width=int(0.7 * k * s))
        t = self.tit * s
        d.rounded_rectangle((m + t, m + t, m + bw - 1 - t, m + bh - 1 - t), r_ext - t, fill=(8, 8, 10, 255))
        d.rounded_rectangle((m + t, m + t, m + bw - 1 - t, m + bh - 1 - t), r_ext - t, outline=(40, 40, 44, 255), width=int(0.6 * k * s))
        # hueco de la pantalla
        x0, y0 = self.x0 * s, self.y0 * s
        hueco = Image.new("L", (W, H), 255)
        ImageDraw.Draw(hueco).rounded_rectangle((x0, y0, x0 + self.sw * s - 1, y0 + self.sh * s - 1), self.r_pant * s, fill=0)
        a = base.getchannel("A"); base.putalpha(Image.composite(a, Image.new("L", (W, H), 0), hueco))
        # Dynamic Island (encima de la pantalla)
        iw, ih, iy = 126 * k * s, 37.3 * k * s, 11 * k * s
        cx = x0 + self.sw * s / 2
        d = ImageDraw.Draw(base)
        d.rounded_rectangle((cx - iw / 2, y0 + iy, cx + iw / 2, y0 + iy + ih), ih / 2, fill=(0, 0, 0, 255))
        # cámara dentro de la isla (reflejo apenas visible)
        cr = 5.5 * k * s; ccx = cx + iw / 2 - ih / 2
        d.ellipse((ccx - cr, y0 + iy + ih / 2 - cr, ccx + cr, y0 + iy + ih / 2 + cr), fill=(14, 16, 26, 255))
        d.ellipse((ccx - cr * .4, y0 + iy + ih / 2 - cr * .5, ccx + cr * .05, y0 + iy + ih / 2 - cr * .05), fill=(40, 50, 80, 255))
        self.marco = base.resize((self.W, self.H), Image.LANCZOS)
        mp = Image.new("L", (self.sw * s, self.sh * s), 0)
        ImageDraw.Draw(mp).rounded_rectangle((0, 0, self.sw * s - 1, self.sh * s - 1), self.r_pant * s, fill=255)
        self.mascara = mp.resize((self.sw, self.sh), Image.LANCZOS)

    # ---------- barra de estado y barra de Safari (no cambian)
    def _pantalla_fija(self):
        k, s = self.k, SS
        sw, sh = self.sw * s, self.sh * s
        im = Image.new("RGBA", (sw, sh), (255, 255, 255, 255))
        d = ImageDraw.Draw(im)
        u = k * s  # un punto de iOS
        negro = (0, 0, 0, 255)
        # barra de estado
        cy = 23.5 * u
        d.text((52 * u, cy), "9:41", font=_f("SemiBold", 17 * u), fill=negro, anchor="mm")
        # batería
        bx, bw_, bh_ = sw - 33 * u - 25 * u, 25 * u, 12 * u
        d.rounded_rectangle((bx, cy - bh_ / 2, bx + bw_, cy + bh_ / 2), 3.6 * u, outline=(0, 0, 0, 110), width=int(1.1 * u))
        d.rounded_rectangle((bx + 2 * u, cy - bh_ / 2 + 2 * u, bx + bw_ - 2 * u, cy + bh_ / 2 - 2 * u), 2 * u, fill=negro)
        d.rounded_rectangle((bx + bw_ + 1.2 * u, cy - 2 * u, bx + bw_ + 2.6 * u, cy + 2 * u), u, fill=(0, 0, 0, 110))
        # wifi (tres arcos y un punto)
        wx, wy = bx - 18 * u, cy + 4.4 * u
        for i, r in enumerate((11.5, 7.6, 3.6)):
            r = r * u
            if i < 2: d.arc((wx - r, wy - r, wx + r, wy + r), 225, 315, fill=negro, width=int(2.4 * u))
            else: d.pieslice((wx - r, wy - r, wx + r, wy + r), 225, 315, fill=negro)
        # señal (cuatro barras)
        sx = wx - 34 * u
        for i in range(4):
            h = (4 + 2.6 * i) * u; x = sx + i * 5 * u
            d.rounded_rectangle((x, cy + 5.5 * u - h, x + 3.2 * u, cy + 5.5 * u), 0.9 * u, fill=negro)
        # barra de Safari (abajo)
        y0 = sh - self.abajo * s
        d.rectangle((0, y0, sw, sh), fill=(246, 246, 248, 255))
        d.line((0, y0, sw, y0), fill=(0, 0, 0, 40), width=int(0.6 * u))
        # campo de dirección
        ax0, ay0, ax1, ay1 = 10 * u, y0 + 8 * u, sw - 10 * u, y0 + 52 * u
        d.rounded_rectangle((ax0 + 0, ay0 + 1.5 * u, ax1, ay1 + 1.5 * u), 13 * u, fill=(0, 0, 0, 18))
        d.rounded_rectangle((ax0, ay0, ax1, ay1), 13 * u, fill=(255, 255, 255, 255))
        acy = (ay0 + ay1) / 2
        d.text((ax0 + 22 * u, acy), "aA", font=_f("Medium", 16 * u), fill=negro, anchor="mm")
        f = _f("Medium", 16.5 * u); txt = "alpacca.mx"
        tw = d.textlength(txt, font=f); cxx = sw / 2 + 7 * u
        # candado
        lx, ly = cxx - tw / 2 - 12 * u, acy + 1 * u
        d.rounded_rectangle((lx - 4.4 * u, ly - 2.2 * u, lx + 4.4 * u, ly + 5.4 * u), 1.4 * u, fill=negro)
        d.arc((lx - 3 * u, ly - 8 * u, lx + 3 * u, ly - 0.5 * u), 180, 360, fill=negro, width=int(1.5 * u))
        d.line((lx - 3 * u + .7 * u, ly - 4.2 * u, lx - 3 * u + .7 * u, ly - 1.6 * u), fill=negro, width=int(1.5 * u))
        d.line((lx + 3 * u - .7 * u, ly - 4.2 * u, lx + 3 * u - .7 * u, ly - 1.6 * u), fill=negro, width=int(1.5 * u))
        d.text((cxx, acy), txt, font=f, fill=negro, anchor="mm")
        # recargar
        rx, rr = ax1 - 22 * u, 6.5 * u
        d.arc((rx - rr, acy - rr, rx + rr, acy + rr), 300, 240 + 360, fill=negro, width=int(1.7 * u))
        d.polygon([(rx + rr * .25, acy - rr - 3 * u), (rx + rr * .25 + 4.5 * u, acy - rr), (rx + rr * .25, acy - rr + 3 * u)], fill=negro)
        # íconos de la barra (azul iOS)
        az = (0, 122, 255, 255); gris = (190, 190, 196, 255); iy = y0 + 76 * u; lw = int(2.2 * u)
        xs = [sw * (i + .5) / 5 for i in range(5)]
        # atrás / adelante
        x = xs[0]; d.line([(x + 4 * u, iy - 9 * u), (x - 4.5 * u, iy), (x + 4 * u, iy + 9 * u)], fill=az, width=lw, joint="curve")
        x = xs[1]; d.line([(x - 4 * u, iy - 9 * u), (x + 4.5 * u, iy), (x - 4 * u, iy + 9 * u)], fill=gris, width=lw, joint="curve")
        # compartir
        x = xs[2]
        d.line([(x - 4 * u, iy - 4 * u), (x - 8.5 * u, iy - 4 * u), (x - 8.5 * u, iy + 11 * u), (x + 8.5 * u, iy + 11 * u),
                (x + 8.5 * u, iy - 4 * u), (x + 4 * u, iy - 4 * u)], fill=az, width=lw, joint="curve")
        d.line([(x, iy + 4 * u), (x, iy - 12 * u)], fill=az, width=lw)
        d.line([(x - 4.5 * u, iy - 7.5 * u), (x, iy - 12 * u), (x + 4.5 * u, iy - 7.5 * u)], fill=az, width=lw, joint="curve")
        # marcadores (libro abierto)
        x = xs[3]
        d.line([(x, iy - 7 * u), (x, iy + 9 * u)], fill=az, width=lw)
        d.line([(x, iy - 7 * u), (x - 5 * u, iy - 9 * u), (x - 11 * u, iy - 8 * u), (x - 11 * u, iy + 8 * u), (x - 5 * u, iy + 7 * u), (x, iy + 9 * u)], fill=az, width=lw, joint="curve")
        d.line([(x, iy - 7 * u), (x + 5 * u, iy - 9 * u), (x + 11 * u, iy - 8 * u), (x + 11 * u, iy + 8 * u), (x + 5 * u, iy + 7 * u), (x, iy + 9 * u)], fill=az, width=lw, joint="curve")
        # pestañas
        x = xs[4]
        d.rounded_rectangle((x - 7.5 * u, iy - 4.5 * u, x + 5.5 * u, iy + 9.5 * u), 2.5 * u, outline=az, width=lw)
        d.line([(x - 4 * u, iy - 8.5 * u), (x + 6.5 * u, iy - 8.5 * u)], fill=az, width=lw)
        d.line([(x + 9.5 * u, iy - 5.5 * u), (x + 9.5 * u, iy + 5.5 * u)], fill=az, width=lw)
        d.arc((x + 3.5 * u, iy - 8.5 * u, x + 9.5 * u, iy - 2.5 * u), 270, 360, fill=az, width=lw)
        # indicador de inicio
        d.rounded_rectangle((sw / 2 - 67 * u, sh - 8 * u - 5 * u, sw / 2 + 67 * u, sh - 8 * u), 2.5 * u, fill=negro)
        self.fija = im.resize((self.sw, self.sh), Image.LANCZOS)

    def con(self, pagina):
        """el iPhone con la página dentro (RGBA del tamaño W x H)"""
        if pagina.size != (self.pw, self.ph): pagina = pagina.resize((self.pw, self.ph), Image.LANCZOS)
        pant = self.fija.copy(); pant.paste(pagina.convert("RGB"), (0, self.arriba))
        out = Image.new("RGBA", (self.W, self.H))
        out.paste(pant, (self.x0, self.y0), self.mascara)
        out.alpha_composite(self.marco)
        return out


if __name__ == "__main__":
    import os, sys
    aqui = os.path.dirname(os.path.abspath(__file__))
    t = Iphone(1520)
    im = t.con(Image.open(os.path.join(aqui, "pantallas", "02.png")))
    fondo = Image.new("RGBA", im.size, (250, 222, 232, 255)); fondo.alpha_composite(im)
    fondo.convert("RGB").save(sys.argv[1] if len(sys.argv) > 1 else "/tmp/iphone.png")
    print(t.W, t.H, t.pw, t.ph)
