/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAF8',
        ink: '#10231E',
        slate: '#68736E',
        primary: '#087A55',
        fresh: '#36B77D',
        mint: '#DDF5EA',
        line: '#E5EBE7',
        warning: '#F8CD62',
        ember: '#A94F18',
        flame: '#D97722',
        warmth: '#F7E3CD',
        warmthSoft: '#FCF4EA',
        warmLine: '#EED8C1',
      },
    },
  },
  plugins: [],
};
