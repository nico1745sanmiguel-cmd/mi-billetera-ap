/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'float-delay': 'float 3s ease-in-out infinite 1.5s',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.8' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }
      },
      colors: {
        brand: {
          dark: '#0f172a',
          primary: '#3b82f6',
          accent: '#06b6d4',
          glass: 'rgba(255, 255, 255, 0.1)',
        },
        surface: {
          light: '#ffffff',
          DEFAULT: '#f3f4f6',
          dark: '#1f2937',
          glass: 'rgba(255, 255, 255, 0.05)',
        },
        status: {
          success: '#10b981', // green-500
          danger: '#ef4444', // red-500
          warning: '#f59e0b', // amber-500
          info: '#3b82f6', // blue-500
        },
        ocean: {
            900: '#151E28',
            800: '#0E5F76',
        },
        mint: {
            400: '#4ADE80',
            500: '#4ADE80',
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'night-gradient': 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)', // Atardecer Profundo / Midnight
      }
    },
  },
  plugins: [],
}