import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f1a",
        "bg-2": "#0f1524",
        text: "#e8edf7",
        muted: "#9aa6c4",
        card: "#121a2d",
        border: "#23304d",
        accent: "#4f7cff",
        "accent-2": "#79a1ff",
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,.25)" },
      borderRadius: { xl2: "14px" },
    },
  },
  plugins: [],
} satisfies Config;
