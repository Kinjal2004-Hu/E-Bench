import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1A2C42",
          mid: "#243552",
          deep: "#0F1E33",
        },
        gold: {
          DEFAULT: "#8B6914",
          mid: "#A07820",
          light: "#C4963A",
          pale: "#D4AF6B",
        },
        parchment: {
          DEFAULT: "#F7F3E8",
          2: "#F0EAD6",
          3: "#E8DFCA",
        },
        cream: "#FDFAF3",
        "warm-white": "#FFFEF9",
      },
      fontFamily: {
        playfair: ["Playfair Display", "serif"],
        cormorant: ["Cormorant Garamond", "serif"],
        sans: ["DM Sans", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.7s ease forwards",
        "fade-in": "fadeIn 1s ease forwards",
        blink: "blink 2s infinite",
        "scale-glow": "scaleGlow 3s ease-in-out infinite",
        "marquee-left": "marqueeLeft 22s linear infinite",
        "particle-fly": "particleFly 4s linear infinite",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(22px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        scaleGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        marqueeLeft: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        particleFly: {
          "0%": { opacity: "0", transform: "translateY(0) scale(0)" },
          "20%": { opacity: "0.8" },
          "80%": { opacity: "0.4" },
          "100%": { opacity: "0", transform: "translateY(-110px) scale(1.5)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
