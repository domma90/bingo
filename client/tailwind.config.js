/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        raya: {
          green: '#1a6b3c',
          gold: '#c9960c',
          cream: '#fdf6e3',
          dark: '#0d3d22',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'pulse-gold': 'pulseGold 1s ease-in-out infinite',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '80%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,150,12,0.7)' },
          '50%': { boxShadow: '0 0 0 12px rgba(201,150,12,0)' },
        },
      },
    },
  },
  plugins: [],
};
