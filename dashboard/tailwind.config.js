/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Base ──────────────────────────────────────────────────────────────
        base: {
          DEFAULT: '#0d0714',   // page background
          panel:   '#1a0f2e',   // card / panel fill
          surface: '#231540',   // slightly elevated surface
          line:    '#3b2060',   // subtle dividers
        },
        // ── Violet accent (neon glow) ─────────────────────────────────────────
        violet: {
          50:  '#f5f0ff',
          100: '#ede5ff',
          200: '#d9c9ff',
          300: '#bfa3ff',
          400: '#a370ff',
          500: '#8b46ff',   // primary CTA
          600: '#7c3aed',   // border glow
          700: '#6621d0',
          800: '#551aab',
          900: '#3d1080',
          neon: '#a855f7',  // hover / focus ring
        },
        // ── Ghost state ───────────────────────────────────────────────────────
        ghost: {
          ready:    '#c9b6ff',  // purple — waiting
          blocked:  '#ef4444',  // red    — barrier found
          verified: '#22c55e',  // green  — checker passed
        },
        // ── Parchment (The Outcome card) ──────────────────────────────────────
        parchment: {
          DEFAULT: '#f5e6c8',
          dark:    '#e8d0a0',
          ink:     '#3b2a0e',
        },
        // ── Text ─────────────────────────────────────────────────────────────
        ink: {
          DEFAULT: '#f0e8ff',   // primary text
          muted:   '#9d89b8',   // secondary / labels
          faint:   '#6b5a8a',   // placeholder / disabled
        },
        // ── Status aliases ────────────────────────────────────────────────────
        blocked:  '#ef4444',
        verified: '#22c55e',
        warning:  '#f59e0b',
      },
      fontFamily: {
        display: ['"MedievalSharp"', '"Uncial Antiqua"', 'Papyrus', 'fantasy'],
        ui:      ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow:        '0 0 12px 2px rgba(168,85,247,0.45)',
        'glow-sm':   '0 0 6px 1px rgba(168,85,247,0.30)',
        'glow-red':  '0 0 10px 2px rgba(239,68,68,0.40)',
        'glow-green':'0 0 10px 2px rgba(34,197,94,0.35)',
      },
      borderColor: {
        panel: '#3b2060',
        glow:  '#7c3aed',
      },
      keyframes: {
        shimmer: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.55' },
        },
        'ghost-float': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 8px 1px rgba(168,85,247,0.4)' },
          '50%':     { boxShadow: '0 0 18px 4px rgba(168,85,247,0.7)' },
        },
      },
      animation: {
        shimmer:     'shimmer 2s ease-in-out infinite',
        float:       'ghost-float 3s ease-in-out infinite',
        'glow-pulse':'glow-pulse 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
