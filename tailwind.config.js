/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.ejs",
    "./src/public/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        text: 'var(--color-text)',
        background: 'var(--color-bg)',
        card: 'var(--color-card)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
      }
    },
  },
  plugins: [],
}
