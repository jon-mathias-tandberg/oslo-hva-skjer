/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'ui-serif', 'Times New Roman', 'serif'],
      },
      colors: {
        paper: '#fafaf8',
      },
    },
  },
  plugins: [],
}
