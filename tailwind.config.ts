import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F7F3EB',
          alt: '#FAF6F0',
          deep: '#EEE8DB',
        },
        ink: {
          DEFAULT: '#1C1C1C',
          wash: '#6B6B6B',
          mist: '#D4CFC4',
          stone: '#9B968D',
        },
        cinnabar: {
          DEFAULT: '#B83B3B',
          soft: '#D26A6A',
          deep: '#8C2A2A',
        },
        indigo_ink: '#3D5A80',
        bamboo: '#5C7A6B',
        amber_ink: '#C4A35A',
        frailty: {
          robust: '#5C7A6B',
          preFrail: '#C4A35A',
          frail: '#B83B3B',
        },
        border: 'rgba(28,28,28,0.18)',
        ring: '#B83B3B',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        ink: '0 1px 0 rgba(28,28,28,0.06), 0 8px 24px -12px rgba(28,28,28,0.15)',
      },
      keyframes: {
        'ink-bleed': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'ink-bleed': 'ink-bleed 480ms ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config
