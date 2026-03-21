/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#c17b3f",
        "primary-hover": "#d4863f",
        dark: "#0a0f1e",
        "dark-secondary": "#0d1526",
        "dark-card": "#111827",
        "dark-blue": "#1a2744",
        "dark-border": "#1e2d45",
      },
    },
  },
  plugins: [],
}

