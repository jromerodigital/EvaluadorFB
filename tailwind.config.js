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
        navy: {
          DEFAULT: '#081C59',
          dark: '#05123B',
          light: '#0E2B85',
        },
        electric: {
          DEFAULT: '#0C6CFB',
          hover: '#0958D3',
          soft: '#EFF6FF',
        },
        canvas: '#F5F5F7',
        ink: {
          DEFAULT: '#1D1D1F',
          secondary: '#6E6E73',
          muted: '#86868B',
        },
        status: {
          greenText: '#16A34A',
          greenBg: '#F0FDF4',
          greenBorder: '#BBF7D0',
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
        'apple-card': '0 4px 24px -2px rgba(8, 28, 89, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        'apple-elevated': '0 12px 36px -4px rgba(8, 28, 89, 0.09), 0 2px 6px 0 rgba(0, 0, 0, 0.04)',
        'apple-pill': '0 2px 10px rgba(12, 108, 251, 0.08)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    },
  },
  plugins: [],
}
