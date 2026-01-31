/** @type {import('tailwindcss').Config} */
module.exports = {
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
          // 2026 neutral canvas + indigo accent
          bg: "#F8FAFC", // slate-50
          surface: "#FFFFFF",
          primary: "#4F46E5", // indigo-600

          text: "#0F172A", // slate-900
          textSecondary: "#334155", // slate-700
          textMuted: "#64748B", // slate-500
        },
      },
    },
  },
  plugins: [],
};
