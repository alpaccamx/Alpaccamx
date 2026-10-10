/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app.js", "./privacidad.html", "./terminos.html", "./reembolsos.html"],
  theme: {
    extend: {
      colors: {
        // Fondo blanco y texto casi negro, al estilo de StyleKorean. Se
        // conserva el nombre "cream" porque se usa en todo el sitio (fondos
        // y texto sobre botones rosas).
        cream: "#ffffff",
        ink: "#111111",
        // Gris muy claro para pastillas de navegación/filtros y fondo de
        // las fotos de producto.
        pill: "#f7f7fb",
        // Rojo para descuentos (como el "40%" de StyleKorean).
        sale: "#fc123e",
        // Rosa de dos tonos: el rosa brillante (DEFAULT) es solo para
        // rellenos sin texto (círculos de íconos, corazón de favoritos,
        // puntos del banner, tintes). Todo lo que lleva texto usa "deep"
        // (botones, crema encima: 4.6:1) o "ink" (texto y links sobre
        // crema, y hover de botones: 5.7:1).
        rose: {
          DEFAULT: "#ee6c92",
          deep: "#c4466e",
          ink: "#b33660",
        },
        // Lilac: DEFAULT para tintes, bordes y el anillo de foco; "band"
        // para las franjas con texto crema encima (4.6:1); "ink" para
        // texto lilac sobre fondos claros (etiquetas de caja).
        lilac: {
          DEFAULT: "#8b84ac",
          band: "#766f96",
          ink: "#696288",
        },
        blush: "#f6cadb",
      },
      fontFamily: {
        // Inter: misma base latina que Pretendard (la fuente de
        // StyleKorean), y sí está en Google Fonts.
        display: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        logo: ["Ready to Party", "sans-serif"],
      },
    },
  },
  plugins: [
    // "coarse:" = pantallas táctiles (dedo), sin importar el tamaño de la
    // pantalla: controles más grandes para tocar, más compactos con mouse.
    require("tailwindcss/plugin")(({ addVariant }) => {
      addVariant("coarse", "@media (pointer: coarse)");
    }),
  ],
};
