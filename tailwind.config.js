/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#c17b3f",
        "primary-hover": "#a86835",
        navy: "#1a2744",
        "navy-hover": "#243557",
        "bg-main": "#f8f9fa",
        "bg-secondary": "#f1f5f9",
        "text-main": "#0f172a",
        "text-muted": "#64748b",
        "border-color": "#e2e8f0",
      },
    },
  },
  plugins: [],
}

