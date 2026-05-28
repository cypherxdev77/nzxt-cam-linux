/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nzxt: {
          bg: '#0a0a0f',
          card: '#111118',
          border: '#1e1e2e',
          accent: '#00d4ff',
          text: '#e0e0e0'
        }
      },
      borderRadius: {
        xl: '12px'
      }
    }
  },
  plugins: []
}
