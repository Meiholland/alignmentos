import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E1951', // Deep Navy
          dark: '#0A1240',
          light: '#1A2A6B',
        },
        accent: {
          magenta: '#931E76', // Dark Magenta
          ice: '#42F5E7', // Neon Ice
          pumpkin: '#F5853F', // Pumpkin Spice
        },
        success: {
          DEFAULT: '#28A745',
          light: '#9FE6B6',
          bg: '#E8F5E9',
        },
        warning: {
          DEFAULT: '#F5853F', // Pumpkin Spice
          red: '#931E76', // Dark Magenta
          bg: '#F5F5F5', // White Smoke (light)
        },
        text: {
          primary: '#333333',
          secondary: '#666666',
          light: '#999999',
        },
        bg: {
          canvas: '#F5F5F5', // White Smoke
          card: '#FFFFFF',
          sidebar: '#0E1951', // Deep Navy
        },
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        tag: '20px',
      },
      boxShadow: {
        card: '0px 4px 10px rgba(0, 0, 0, 0.05)',
        cardHover: '0px 8px 20px rgba(0, 0, 0, 0.1)',
        sidebar: '2px 0px 8px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config
