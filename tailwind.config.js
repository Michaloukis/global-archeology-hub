/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#fdfbf7',
          100: '#f8f3e8',
          200: '#efe6d5',
          300: '#e2d4bc',
          400: '#c9b896',
        },
        ink: {
          DEFAULT: '#2c2825',
          light: '#5c5652',
        },
        brown: {
          DEFAULT: '#5c4033',
          light: '#7a5c4d',
          lighter: '#a67c52',
          dark: '#3d2b23',
        },
        sage: {
          DEFAULT: '#87a96b',
          light: '#9cb87d',
          dark: '#6b8b4f',
        },
        beige: {
          DEFAULT: '#f5f5dc',
          light: '#fafaf0',
          dark: '#e8e8d0',
        },
      },
    },
  },
  plugins: [],
}

