/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '19': 'repeat(19, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        '19': 'repeat(19, minmax(0, 1fr))',
      },
      gridColumn: {
        'span-19': 'span 19 / span 19',
      },
      gridRow: {
        'span-19': 'span 19 / span 19',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
  },
} 