import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          soft: "rgb(var(--bg-soft) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)"
        },
        fg: {
          DEFAULT: "rgb(var(--fg) / <alpha-value>)",
          muted: "rgb(var(--fg-muted) / <alpha-value>)",
          subtle: "rgb(var(--fg-subtle) / <alpha-value>)"
        },
        line: "rgb(var(--line) / <alpha-value>)",
        brand: {
          50: "#f3eaff",
          100: "#e1ccff",
          200: "#c69bff",
          300: "#a866ff",
          400: "#8a3aff",
          500: "#6f1bff",
          600: "#5b15d4",
          700: "#4a13a8",
          800: "#3a107f",
          900: "#290a5c"
        },
        success: { DEFAULT: "#16a34a", soft: "rgba(22,163,74,0.15)" },
        danger: { DEFAULT: "#ef4444", soft: "rgba(239,68,68,0.15)" },
        warn: { DEFAULT: "#f59e0b", soft: "rgba(245,158,11,0.15)" }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 0 32px -8px rgba(138, 58, 255, 0.45)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)"
      }
    }
  },
  plugins: []
};

export default config;
