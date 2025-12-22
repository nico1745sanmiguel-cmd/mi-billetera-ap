/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#0f172a',
          primary: '#3b82f6',
          accent: '#06b6d4',
          glass: 'rgba(255, 255, 255, 0.1)',
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(to bottom right, #ffffff 0%, #ffffff 0%)', // Fallback
        'night-gradient': 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)', // Atardecer Profundo / Midnight
      }
    },
  },
  plugins: [],
}