import type { Config } from 'tailwindcss'

const brandPalette = {
  50: '#f4f1fc',
  100: '#ebe6f9',
  200: '#d9cff2',
  300: '#c4b2ea',
  400: '#b097e3',
  500: '#9A83DC',
  600: '#8568d2',
  700: '#6f52c0',
  800: '#5d449f',
  900: '#4c387f',
  950: '#312250',
}

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        amber: brandPalette,
        orange: brandPalette,
        primary: '#9A83DC',
        secondary: '#EC4899',
      },
    },
  },
  plugins: [],
}
export default config
