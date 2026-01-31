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
          surface2: "#F1F5F9", // slate-100
          border: "#E2E8F0", // slate-200
          primary: "#4F46E5", // indigo-600

          success: "#10B981", // emerald-500
          danger: "#EF4444", // red-500

          text: "#0F172A", // slate-900
          textSecondary: "#334155", // slate-700
          textMuted: "#64748B", // slate-500
        },
      },
    },
  },
  plugins: [],
};
