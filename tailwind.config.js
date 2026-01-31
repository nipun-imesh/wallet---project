/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        app: {
          bg: colors.zinc[50],
          surface: colors.white,
          primary: colors.emerald[600],
          primaryDark: colors.emerald[700],
          primarySoft: colors.emerald[50],
          border: colors.zinc[200],
          text: colors.zinc[900],
          muted: colors.zinc[500],
        },
      },
    },
  },
  plugins: [],
};
