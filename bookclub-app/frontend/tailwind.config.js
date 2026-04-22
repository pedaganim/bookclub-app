const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shifted the teal scale one shade darker (e.g. 600 maps to 700) to make the UI less bright
        indigo: {
          50: colors.teal[100],
          100: colors.teal[200],
          200: colors.teal[300],
          300: colors.teal[400],
          400: colors.teal[500],
          500: colors.teal[600],
          600: colors.teal[700],
          700: colors.teal[800],
          800: colors.teal[900],
          900: '#042f2e', // teal-950 equivalent or dark teal
        },
      },
      // Add mobile-friendly spacing
      spacing: {
        'touch': '44px', // Minimum touch target size
      },
      // Add mobile-friendly font sizes
      fontSize: {
        'mobile-xs': ['12px', '16px'],
        'mobile-sm': ['14px', '20px'],
        'mobile-base': ['16px', '24px'],
        'mobile-lg': ['18px', '28px'],
      },
    },
  },
  plugins: [],
}
