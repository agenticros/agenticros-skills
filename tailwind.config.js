/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-deep": "#050810",
        "bg-surface": "#0a0f1a",
        "bg-elevated": "#111827",
        /* Primary: Electric Teal */
        "coral-bright": "#00D1B2",
        "coral-mid": "#00b89e",
        "coral-dark": "#008f7a",
        /* Secondary: Cyan */
        "cyan-bright": "#00AEEF",
        "cyan-mid": "#0090c9",
        /* Accent: Neon Green */
        "accent-bright": "#7CFF00",
        "accent-mid": "#6ae600",
        "text-primary": "#f0f4ff",
        "text-secondary": "#8892b0",
        "text-muted": "#5a6480",
      },
      fontFamily: {
        display: ["Clash Display", "system-ui", "sans-serif"],
        body: ["Satoshi", "system-ui", "sans-serif"],
        mono: ["SF Mono", "Fira Code", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
