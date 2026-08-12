/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app.js"],
  theme: {
    extend: {
      colors: {
        cream: "#fffcf4",
        ink: "#3d3a42",
        rose: "#ee6c92",
        lilac: "#8b84ac",
        blush: "#e9c3be",
      },
      fontFamily: {
        display: ["Josefin Sans", "sans-serif"],
        body: ["Nunito", "sans-serif"],
        logo: ["Ready to Party", "sans-serif"],
      },
      animation: {
        marquee: "marquee 22s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
