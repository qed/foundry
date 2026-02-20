
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0f1117',
          secondary: '#1a1d27',
          tertiary: '#252830',
        },
        border: {
          DEFAULT: '#2e3140',
        },
        text: {
          primary: '#e4e7ec',
          secondary: '#8b8fa3',
          tertiary: '#5a5f73',
        },
        accent: {
          cyan: '#00d4ff',
          purple: '#8b5cf6',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
        'glow-cyan': 'radial-gradient(circle, rgba(0, 212, 255, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 255, 0.1)',
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.1)',
      }
    },
  },
  plugins: [],
}
