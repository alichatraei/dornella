import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        pink: {
          50: '#FFF5F8',
          100: '#FFE9F0',
          200: '#FFD3E1',
          300: '#FBAFC8',
          400: '#F584A9',
          500: '#E8578C',
          600: '#CF3D74',
          700: '#AD2D5E',
          800: '#82224A',
          900: '#521632',
        },
        ink: { DEFAULT: '#2A1A21', soft: '#5B4650', muted: '#8C7680' },
        line: '#F2DDE5',
        paper: '#FFFBFC',
        mint: '#3E9B7A',
        amber: { soft: '#FFF4DE', ink: '#8A5A00' },
      },
      fontFamily: {
        sans: ['IRANSansX', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(82, 22, 50, 0.04), 0 8px 24px -12px rgba(82, 22, 50, 0.12)',
        pop: '0 20px 50px -20px rgba(82, 22, 50, 0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out both',
        'slide-up': 'slide-up .3s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
export default config;
