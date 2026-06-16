import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF7F0",
        ink: "#26312E",
        forest: { DEFAULT: "#1F6F5C", dark: "#15543F", light: "#E3F0EC" },
        clay: { DEFAULT: "#E07A5F", light: "#F6E5DE" },
        sun: "#E9B949",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(31, 111, 92, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
