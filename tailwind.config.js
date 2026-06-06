// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        brand: {
          blue: "hsl(217, 91%, 60%)",
          teal: "hsl(160, 84%, 39%)",
        },
        surface: {
          DEFAULT: "rgba(15, 23, 42, 0.6)",
          strong: "rgba(15, 23, 42, 0.85)",
        },
      },
      boxShadow: {
        "glow-blue": "0 0 20px 4px rgba(59, 130, 246, 0.15)",
        "glow-emerald": "0 0 20px 4px rgba(16, 185, 129, 0.15)",
        "glow-sm-blue": "0 0 10px 2px rgba(59, 130, 246, 0.12)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
      },
      animation: {
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 0.4s ease both",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(16, 185, 129, 0.15)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

