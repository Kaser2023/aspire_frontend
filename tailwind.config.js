/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#d9ac3f",
        secondary: "#1e2a45",
        "background-light": "#fdfbf7",
        "background-dark": "#2d3d62",
      },
      fontFamily: {
        display: ["Outfit", "IBM Plex Sans Arabic", "sans-serif"],
        body: ["Outfit", "IBM Plex Sans Arabic", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        "3xl": "2rem",
      },
      animation: {
        float: "float 15s ease-in-out infinite",
        "float-delayed": "float 15s ease-in-out 7.5s infinite",
        "spin-slow": "spin 30s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
}

