/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": "#030305",
        "bg-surface": "#08080C",
        "bg-hover": "#12121A",
        "brand-cyan": "#00FFD4",
        "brand-purple": "#A855F7",
        "text-primary": "#F8F8F8",
        "text-secondary": "#A1A1AA",
      },
      fontFamily: {
        heading: ["'Unbounded'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "shimmer-spin": "shimmer-spin 4s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        "shimmer-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      dropShadow: {
        "cyan-glow": "0 0 12px rgba(0, 255, 212, 0.8)",
        "purple-glow": "0 0 8px rgba(168, 85, 247, 0.6)",
      },
    },
  },
  plugins: [],
};
