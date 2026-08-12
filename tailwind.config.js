/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app.js"],
  theme: {
    extend: {
      colors: {
        cream: "#fffcf4",
        ink: "#263d42",
        blush: "#e9c3be",
      },
      fontFamily: {
        display: ["Josefin Sans", "sans-serif"],
        body: ["Nunito", "sans-serif"],
        logo: ["Baloo 2", "sans-serif"],
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
