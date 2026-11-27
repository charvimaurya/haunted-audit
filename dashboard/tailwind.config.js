import { heroui } from '@heroui/react';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          panel:   'var(--color-panel)',
          surface: 'var(--color-surface)',
          line:    'var(--color-line)',
        },
        violet: {
          50:  '#f5f0ff',
          100: '#ede5ff',
          200: '#d9c9ff',
          300: '#bfa3ff',
          400: '#a370ff',
          500: '#8b46ff',
          600: '#7c3aed',
          700: '#6621d0',
          800: '#551aab',
          900: '#3d1080',
          neon: 'var(--color-violet-neon)',
        },
        ghost: {
          ready:    'var(--color-ghost-ready)',
          blocked:  'var(--color-ghost-blocked)',
          verified: 'var(--color-ghost-verified)',
          caught:   'var(--color-ghost-caught)',
        },
        parchment: {
          DEFAULT: '#f5e6c8',
          dark:    '#e8d0a0',
          ink:     '#3b2a0e',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted:   'var(--color-ink-muted)',
          faint:   'var(--color-ink-faint)',
        },
        bank: {
          bar:            'var(--bank-bar)',
          rail:           'var(--bank-rail)',
          card:           'var(--bank-card)',
          line:           'var(--bank-line)',
          sidebar:        'var(--bank-sidebar)',
          input:          'var(--bank-input)',
          nav:            'var(--bank-nav)',
          'nav-line':     'var(--bank-nav-line)',
          dash:           '#c83f4b',
          'dash-fill':    'var(--bank-dash-fill)',
          tip:            'var(--bank-tip)',
          'tip-line':     '#561931',
          barrier:        'var(--bank-barrier)',
          'barrier-line': '#8f223a',
        },
        blocked:  '#ef4444',
        verified: '#22c55e',
        warning:  '#f59e0b',
      },
      fontFamily: {
        sans:    ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Rubik Wet Paint"', 'fantasy'],
        ui:      ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow:         'var(--shadow-glow)',
        'glow-sm':    '0 0 8px 1px rgba(168,85,247,0.28)',
        'glow-red':   '0 0 10px 2px rgba(239,68,68,0.40)',
        'glow-green': '0 0 10px 2px rgba(34,197,94,0.35)',
      },
      borderColor: {
        panel: 'var(--color-line)',
        glow:  '#7c3aed',
      },
      keyframes: {
        shimmer: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.55' },
        },
        'ghost-float': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 12px 1px rgba(139,92,246,0.45)' },
          '50%':     { boxShadow: '0 0 26px 6px rgba(168,85,247,0.78)' },
        },
      },
      animation: {
        shimmer:      'shimmer 2.2s ease-in-out infinite',
        float:        'ghost-float 3.4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [
    heroui({
      defaultTheme: 'dark',
      themes: {
        dark: {
          colors: {
            background: '#08060f',
            foreground: '#eef0ff',
            divider: '#2b3254',
            content1: { DEFAULT: '#15102b', foreground: '#eef0ff' },
            content2: { DEFAULT: '#171c34', foreground: '#eef0ff' },
            content3: { DEFAULT: '#1b203f', foreground: '#eef0ff' },
            content4: { DEFAULT: '#22284d', foreground: '#eef0ff' },
            default: {
              DEFAULT: '#1e2340',
              50: '#0d1022',
              100: '#14172f',
              200: '#1e2340',
              300: '#2b3254',
              foreground: '#eef0ff',
            },
            primary: { DEFAULT: '#8b5cf6', foreground: '#ffffff' },
            secondary: { DEFAULT: '#7c3aed', foreground: '#ffffff' },
            success: { DEFAULT: '#22c55e', foreground: '#ffffff' },
            danger: { DEFAULT: '#ef4444', foreground: '#ffffff' },
            warning: { DEFAULT: '#f59e0b', foreground: '#1f1408' },
          },
        },
      },
    }),
  ],
};
