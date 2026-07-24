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
        ganadero: {
          tier1: "#378ADD",
          tier1bg: "#DDEEFF",
          tier1text: "#0C447C",
          tier2: "#5A9E2F",
          tier2bg: "#D8EDCA",
          tier2text: "#27500A",
          tier3: "#E8973A",
          tier3bg: "#FDECC8",
          tier3text: "#633806",
          tier4: "#9E9E94",
          tier4bg: "#EAEAE6",
          tier4text: "#444441",
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
