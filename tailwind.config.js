/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        monokai: {
          bg: '#2d2a2e',      /* Soft charcoal */
          card: '#221f22',    /* Dark panel */
          deep: '#19181a',    /* Deeper shadow contrast */
          hover: '#3e3b3f',   /* Focused item */
          active: '#49464a',  /* Selected element background */
          text: '#fcfcfa',    /* Bright off-white */
          dim: '#939293',     /* Muted gray text */

          /* Accent colors */
          pink: '#ff6188',    /* Hard / Alerts */
          green: '#a9dc76',   /* Easy / Completion status */
          yellow: '#ffd866',  /* Wishlist state / Rating stars */
          orange: '#fc9867',  /* Intermediate */
          blue: '#78dce8',    /* Transit / Altitude / Weather icons */
          purple: '#ab9df2',  /* Pace / Ascent / Time metrics */
        }
      }
    },
  },
  plugins: [],
}
