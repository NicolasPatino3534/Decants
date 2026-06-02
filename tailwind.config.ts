import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d0f",
        paper: "#ffffff",
        mist: "#f5f6f4",
        line: "#e4e4df",
        amber: "#c88719",
        moss: "#23975c",
        danger: "#c9342e",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(11, 13, 15, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
