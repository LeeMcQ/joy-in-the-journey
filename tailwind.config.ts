import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      /* ── Colour system ─────────────────────────────────── */
      colors: {
        gold: {
          50: "#FEF9EC",
          100: "#FBF0CC",
          200: "#F7DF96",
          300: "#F0CC5E",
          400: "#E5BF2E",
          500: "#D4A017", // ← PDF primary
          600: "#B58813",
          700: "#8C6A0F",
          800: "#634B0B",
          900: "#3B2D07",
          950: "#1E1604",
        },
        navy: {
          50: "#EEF0F5",
          100: "#D3D8E5",
          200: "#A7B1CB",
          300: "#7A8AB0",
          400: "#4E6396",
          500: "#2A3F6B",
          600: "#1E2D52",
          700: "#162243",
          800: "#0F172A", // ← App background dark
          900: "#0A0F1C",
          950: "#050812",
        },
        sepia: {
          50: "#FAF6EE",
          100: "#F5F0E6",
          200: "#EDE6D6",
          300: "#DED0B8",
          400: "#C4B393",
          500: "#A08C6A",
          600: "#7D6C4E",
          700: "#5C4B37",
          800: "#3D3224",
          900: "#211B14",
        },
      },

      /* ── Typography ────────────────────────────────────── */
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "Cambria", "serif"],
        scripture: ['"Lora"', '"EB Garamond"', "Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Source Code Pro"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        scripture: ["1.0625rem", { lineHeight: "1.75rem", letterSpacing: "0.01em" }],
      },
      letterSpacing: {
        caps: "0.18em",
      },

      /* ── Spacing & Layout ──────────────────────────────── */
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-lg": "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        "gold-glow": "0 0 20px rgba(212,160,23,0.15)",
        "gold-glow-lg": "0 0 40px rgba(212,160,23,0.2)",
      },

      /* ── Animations ────────────────────────────────────── */
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "slide-down": "slideDown 0.3s ease-out both",
        "scale-in": "scaleIn 0.25s ease-out both",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },

      /* ── Backdrop / Transitions ────────────────────────── */
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [
    /* Stagger delay utility: delay-[1] through delay-[12] */
    plugin(function ({ addUtilities }) {
      const delays: Record<string, Record<string, string>> = {};
      for (let i = 1; i <= 12; i++) {
        delays[`.stagger-${i}`] = { "animation-delay": `${i * 60}ms` };
      }
      addUtilities(delays);
    }),
  ],
} satisfies Config;
