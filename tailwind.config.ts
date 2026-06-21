import type { Config } from "tailwindcss";

const channel = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (theme-aware) — prefer these everywhere.
        background: channel("--bg"),
        surface: {
          DEFAULT: channel("--surface"),
          2: channel("--surface-2"),
        },
        border: channel("--border"),
        text: channel("--text"),
        muted: channel("--muted"),
        subtle: channel("--subtle"),
        primary: {
          DEFAULT: channel("--primary"),
          hover: channel("--primary-hover"),
          foreground: channel("--primary-foreground"),
        },
        accent: {
          DEFAULT: channel("--accent"),
          foreground: channel("--accent-foreground"),
        },
        highlight: channel("--highlight"),
        ring: channel("--ring"),

        // Fixed brand colors — only for intentional brand marks (logo, brand
        // panels). Not theme-aware; do not use for normal text/surfaces.
        brand: {
          cream: "#FBF7F0",
          ink: "#26312E",
          forest: "#1F6F5C",
          "forest-dark": "#15543F",
          clay: "#E07A5F",
          sun: "#E9B949",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgb(var(--shadow-color) / 0.22)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      keyframes: {
        "promo-bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "promo-pop": {
          "0%, 100%": {
            transform: "scale(1)",
            boxShadow: "0 10px 25px rgb(var(--shadow-color) / 0.15)",
          },
          "50%": {
            transform: "scale(1.06)",
            boxShadow: "0 12px 28px rgb(var(--primary) / 0.35)",
          },
        },
      },
      animation: {
        "promo-bob": "promo-bob 3s ease-in-out infinite",
        "promo-pop": "promo-pop 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
