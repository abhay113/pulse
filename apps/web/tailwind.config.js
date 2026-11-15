/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        darkBg: '#080a10',
        cardBg: '#0f1422',
        cyanNeon: '#00f0ff',
        magentaNeon: '#ff007f',
        limeNeon: '#39ff14',
        amberNeon: '#ffaa00',
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(0, 240, 255, 0.65)',
        'glow-magenta': '0 0 25px rgba(255, 0, 127, 0.65)',
        'glow-lime': '0 0 25px rgba(57, 255, 20, 0.65)',
        'glow-amber': '0 0 25px rgba(255, 170, 0, 0.65)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

