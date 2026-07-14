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
        // Bundled Poppins family (assets/fonts). On Android the value is the
        // font file name; use these classes where the design needs a specific
        // weight (the app-wide default is Poppins-Regular, see src/setupFonts).
        poppins: ['Poppins-Regular'],
        'poppins-light': ['Poppins-Light'],
        'poppins-medium': ['Poppins-Medium'],
        'poppins-semibold': ['Poppins-SemiBold'],
        'poppins-bold': ['Poppins-Bold'],
      },
    },
  },
  plugins: [],
};
