/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
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
