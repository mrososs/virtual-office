import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--vo-${name}) / <alpha-value>)`;

// Colors resolve to CSS variables defined per theme in src/shared/styles/main.css,
// so a light theme only needs a second variable set — no component changes.
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        raised: token('raised'),
        hover: token('hover'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
      },
      boxShadow: {
        panel: '0 12px 32px -12px rgb(0 0 0 / 0.55), 0 0 0 1px rgb(255 255 255 / 0.05)',
        pop: '0 16px 48px -12px rgb(0 0 0 / 0.65), 0 0 0 1px rgb(255 255 255 / 0.06)',
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.8)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 1.6s ease-in-out infinite',
        'toast-in': 'toast-in 180ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
