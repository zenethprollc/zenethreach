/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        bg2: '#111118',
        bg3: '#18181f',
        card: '#13131a',
        border: 'rgba(255,255,255,0.07)',
        accent: '#7c6fe8',
        accent2: '#c47ef4',
        teal: '#3ecfb2',
        gold: '#f0b93a',
        coral: '#f0704a',
        success: '#4fd98a',
        muted: '#8a88a0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
