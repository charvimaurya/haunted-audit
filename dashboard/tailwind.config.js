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
        // ── UI v9 palette (design/v9/index.html :root) ───────────────────────────
        v9: {
          page: '#08060f', 'frame-a': '#15102b', 'frame-b': '#0c0919',
          'card-a': '#171c34', 'card-b': '#10142a', 'card-line': '#2b3254', 'head-line': '#2a2350',
          violet: '#8b5cf6', 'violet-hi': '#b794ff', 'violet-neon': '#c084fc', 'violet-deep': '#2a1a5c',
          ink: '#eef0ff', mute: '#a9afcc', dim: '#7f86a8',
          ok: '#22c55e', 'ok-hi': '#4ade80', bad: '#ef4444', 'bad-hi': '#ff6b6b', amber: '#f59e0b',
          nav: '#d6d9f3', side: '#d6d9f0', crumb: '#d2d5ee', 'crumb-sep': '#7d74a8', here: '#c9b5ff',
        },
        // ── Ghost state ───────────────────────────────────────────────────────
        ghost: {
          ready:    '#c9b6ff',  // purple — waiting
          blocked:  '#ef4444',  // red    — barrier found
          verified: '#22c55e',  // green  — checker passed
          caught:   '#ffffff',  // white  — the returning ghost, caught (v9 Fixes)
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
          faint:   '#9480b2',   // quieter text. Was #6b5a8a (3.27:1 / 3.0:1 / 2.76:1, fails 4.5:1); now 5.66 / 5.20 / 4.78 on base / panel / surface
        },
        // ── Possession panel (sampled from design/Haunted_Audit_Final_UI_v7.png, panel 2) ──
        // value  (x, y in the PNG, flat 7x7 median unless noted)
        bank: {
          bar:         '#090c1a', // breadcrumb bar            (1055, 58)
          rail:        '#0a0c1a', // right checklist card      (1275, 112)
          card:        '#111626', // payment form card         (1055, 100)
          line:        '#1e2437', // card outline, 1px line    (955, 86)
          sidebar:     '#050d17', // bank sidebar card         (755, 270)
          input:       '#151a2b', // text input fill           (985, 165)
          nav:         '#10223c', // active nav item fill      (799, 178)
          'nav-line':  '#144775', // active nav item outline   (702, 178) 1px line
          'dash':      '#c83f4b', // dashed outline of Send Payment (848, 262) 1px line
          'dash-fill': '#30243d', // Send Payment fill         (870, 256)
          tip:         '#0f0f1f', // Journey Blocked card fill (1140, 300)
          'tip-line':  '#561931', // Journey Blocked outline   (997, 290) 1px line
          barrier:     '#2f0e21', // Barrier Detected fill     (1178, 268)
          'barrier-line': '#8f223a', // Barrier Detected outline (1173, 268) 1px line
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
