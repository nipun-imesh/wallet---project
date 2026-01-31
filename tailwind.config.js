/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        app: {
          // Black/White theme (light). Use `dark:` classes for dark mode.
          bg: "#FFFFFF",
          surface: "#FFFFFF",
          surface2: "#F5F5F5",
          border: "#E5E5E5",
          primary: "#000000",

          // Keep these semantic tokens available (some screens use them).
          success: "#000000",
          danger: "#000000",

          text: "#000000",
          textSecondary: "#111111",
          textMuted: "#555555",
        },
      },
    },
  },
  plugins: [],
};
