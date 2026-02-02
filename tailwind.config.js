/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
   content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        app: {
          // Light theme (non black/white)
          bg: "#F4F6FB",
          surface: "#FFFFFF",
          surface2: "#EEF2FF",
          border: "#DDE4F0",
          primary: "#4F46E5",
          onPrimary: "#FFFFFF",

          success: "#16A34A",
          danger: "#DC2626",

          text: "#0F172A",
          textSecondary: "#1E293B",
          textMuted: "#64748B",
        },
        appDark: {
          // Dark theme (non pure black/white)
          bg: "#0B1220",
          surface: "#0F172A",
          surface2: "#111C33",
          border: "#1E2A4A",
          primary: "#818CF8",
          onPrimary: "#0B1220",

          success: "#22C55E",
          danger: "#F87171",

          text: "#E5E7EB",
          textSecondary: "#CBD5E1",
          textMuted: "#94A3B8",
        },
      },
    },
  },
  plugins: [],
};
