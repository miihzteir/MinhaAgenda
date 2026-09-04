/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif']
      },
      colors: {
        // Paleta clara — creme, bege, marrom suave, rosa queimado, lilás acinzentado, verde sálvia.
        cream: {
          DEFAULT: '#faf6f1',
          soft: '#f4ede4'
        },
        sand: {
          50: '#faf5ee',
          100: '#f2e6d5',
          200: '#e6d2b8',
          300: '#d7b98f',
          400: '#c49f6d'
        },
        cocoa: {
          50: '#f6efe9',
          100: '#e8d6c7',
          200: '#dcc0a5',
          300: '#b98f6f',
          400: '#c18564',
          500: '#a9785f',
          600: '#8f6249',
          700: '#6f4c39',
          800: '#4a3327',
          900: '#332318'
        },
        blush: {
          100: '#f6e3dd',
          200: '#eecdc2',
          300: '#e6b8ac',
          400: '#dba394',
          500: '#cf8f7d',
          600: '#b8735f'
        },
        mauve: {
          100: '#eae3ea',
          200: '#dccedb',
          300: '#c9b7c9',
          400: '#b8a2b8',
          500: '#a68fa6',
          600: '#8a738a',
          700: '#6f5a6f'
        },
        sage: {
          100: '#e5ebe1',
          200: '#cddbc4',
          300: '#b9c9b0',
          400: '#a3b895',
          500: '#8ba37c',
          600: '#71895f'
        },
        ink: {
          DEFAULT: '#3a2e27',
          soft: '#5c4c40'
        },
        // Modo escuro — marrom profundo, grafite quente, rosé escuro.
        night: {
          bg: '#241b16',
          surface: '#2e231c',
          surface2: '#392c23',
          border: '#4a3a2f',
          text: '#f2e9df',
          textSoft: '#cbb9a9'
        }
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem'
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(74, 51, 39, 0.08)',
        card: '0 4px 16px -4px rgba(74, 51, 39, 0.12)',
        pop: '0 8px 30px -8px rgba(74, 51, 39, 0.22)'
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'pop-check': { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } }
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'slide-up': 'slide-up .22s ease-out',
        'pop-check': 'pop-check .28s ease-out'
      }
    }
  },
  plugins: []
};
