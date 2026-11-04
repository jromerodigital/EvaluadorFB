/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // FonBienes Brand Official Palette
        fon: {
          DEFAULT: '#004E89', // Azul Petróleo FonBienes
          dark: '#003865',
          light: '#0062AB',
          soft: '#EBF3FA',
        },
        bienes: {
          DEFAULT: '#008744', // Verde FonBienes Institucional
          dark: '#006E37',
          light: '#00A352',
          soft: '#E8F6EE',
        },
        navy: {
          DEFAULT: '#004E89',
          dark: '#003865',
          light: '#0062AB',
        },
        electric: {
          DEFAULT: '#004E89',
          hover: '#003865',
          soft: '#EBF3FA',
        },
        canvas: '#F5F5F7',
        ink: {
          DEFAULT: '#1D1D1F',
          secondary: '#6E6E73',
          muted: '#86868B',
        },
        status: {
          greenText: '#008744',
          greenBg: '#E8F6EE',
          greenBorder: '#A7F3D0',
          amberText: '#D97706',
          amberBg: '#FFFBEB',
          amberBorder: '#FDE68A',
          redText: '#DC2626',
          redBg: '#FEF2F2',
          redBorder: '#FECACA',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'apple-card': '0 4px 24px -2px rgba(0, 78, 137, 0.06), 0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        'apple-elevated': '0 12px 36px -4px rgba(0, 78, 137, 0.12), 0 2px 6px 0 rgba(0, 0, 0, 0.04)',
        'apple-pill': '0 4px 14px rgba(0, 78, 137, 0.18)',
        'fon-cta': '0 4px 16px rgba(0, 78, 137, 0.25)',
        'bienes-cta': '0 4px 16px rgba(0, 135, 68, 0.25)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    },
  },
  plugins: [],
}
