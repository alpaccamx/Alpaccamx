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
      },
    },
  },
  plugins: [],
};
