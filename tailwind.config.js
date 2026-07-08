/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-teal': '#00C9A7',
        'brand-purple': '#4F46E5',
        'calm-bg': '#FAFAFA',
        'calm-text': '#1E1B4B',
        'muted-warm': '#8C847B', // Soft grey mixed with beige
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to left, #00C9A7, #4F46E5)',
      }
    },
  },
  plugins: [],
}
