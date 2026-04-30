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
        ifedel: {
          primary: "#8DC640", // Verde marca
          brown: "#835029", // Marrón secundario
          black: "#000000",
        },
      },
      fontFamily: {
        sans: ["var(--font-raleway)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        dashboard: "0 1px 2px rgb(15 23 42 / 0.04), 0 4px 12px rgb(15 23 42 / 0.06)",
        "dashboard-lg":
          "0 4px 6px rgb(15 23 42 / 0.04), 0 12px 24px rgb(15 23 42 / 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
