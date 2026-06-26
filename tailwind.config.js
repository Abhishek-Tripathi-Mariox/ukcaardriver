/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0097B3',
          green: '#00C896',
          DEFAULT: '#0097B3',
        },
      },
      fontFamily: {
        'poppins-bold': ['Poppins-Bold'],
        'poppins-light': ['Poppins-Light'],
      },
    },
  },
  plugins: [],
};
