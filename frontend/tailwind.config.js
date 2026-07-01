/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: 'var(--spring-page-bg)',
          card: 'var(--spring-white)',
          border: 'var(--spring-green-mid)',
          text: 'var(--spring-green-dark)',
          muted: 'var(--spring-green-text)'
        }
      }
    },
  },
  plugins: [],
}
