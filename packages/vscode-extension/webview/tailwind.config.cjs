/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1419',
        fg: '#e6e1cf',
        muted: '#8b8680',
        accent: '#3a8580',
        'node-bg': '#1a1f26',
        'node-border': '#2a3038',
        warn: '#d4a017',
        danger: '#c44536',
      },
    },
  },
  plugins: [],
};
