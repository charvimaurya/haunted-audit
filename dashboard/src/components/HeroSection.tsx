/**
 * HeroSection
 *
 * Full-width landing panel: spooky wordmark, tagline, "Possess This App" CTA,
 * and the four-step pill toolbar (Detect · Fix · Verify · Prevent).
 *
 * Accessibility:
 * - Single <h1> with id referenced by aria-labelledby on the section.
 * - Decorative emojis all aria-hidden.
 * - Pills are static labels (not interactive) — no hover affordance, no role="button".
 * - CTA glow-pulse suppressed when prefers-reduced-motion is active.
 * - CTA aria-label includes the purpose so AT users get full context.
 */

import { useEffect, useState } from 'react';
import { Search, Wrench, CheckCircle, ShieldCheck } from 'lucide-react';
import { AmbientLayer } from '../immersion/AmbientLayer';

interface HeroSectionProps {
  onPossess?: () => void;
}

const PILL_STEPS = [
  { icon: Search,      label: 'Detect'  },
  { icon: Wrench,      label: 'Fix'     },
  { icon: CheckCircle, label: 'Verify'  },
  { icon: ShieldCheck, label: 'Prevent' },
];

function usePrefersReducedMotion(): boolean {
  const mq =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const [reduced, setReduced] = useState(mq?.matches ?? false);

  useEffect(() => {
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mq]);

  return reduced;
}

export function HeroSection({ onPossess }: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      className="relative flex flex-col items-center justify-center text-center
                 min-h-[340px] px-4 py-16 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 900px 420px at 50% 0%, #3a1a6e 0%, transparent 70%), #0d0714',
      }}
    >
      {/* Roaming ghost crosses the hero. It is not the semantic mascot. */}
      <AmbientLayer />

      {/* Decorative marks sit under the controls and cannot take a click. */}
      <span aria-hidden="true" className="absolute top-8 left-12 z-0 text-3xl opacity-40 select-none pointer-events-none">🦇</span>
      <span aria-hidden="true" className="absolute top-12 right-16 z-0 text-2xl opacity-30 select-none pointer-events-none">🦇</span>
      <span aria-hidden="true" className="absolute bottom-20 left-8 z-0 text-4xl opacity-20 select-none pointer-events-none">🎃</span>
      <span aria-hidden="true" className="absolute bottom-16 right-10 z-0 text-3xl opacity-20 select-none pointer-events-none">🎃</span>

      <div className="relative z-[1] flex flex-col items-center">
      {/* Wordmark — display (spooky) font; sole <h1> on the page */}
      <h1
        id="hero-heading"
        className="mb-3 leading-tight text-ink"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
      >
        Haunted Audit
      </h1>

      {/* Tagline */}
      <p className="text-base text-ink-muted max-w-md mb-1 font-ui">
        The accessibility guardrail for AI-built applications.
      </p>
      <p className="text-sm text-ghost-ready mb-8 font-ui">
        Feel the barrier. Fix the cause. Prove the journey.
      </p>

      {/* Primary CTA
          animate-glow-pulse is a CSS box-shadow animation — suppressed both by
          the global CSS reduced-motion rule and the JS class guard below. */}
      <button
        type="button"
        onClick={onPossess}
        className={[
          'flex items-center gap-2 px-8 py-3 rounded-full font-ui font-bold text-base',
          'bg-violet-600 text-white border border-violet-neon/60',
          'hover:bg-violet-500 active:scale-95 transition-all duration-150 shadow-glow',
          // Only add the pulse class when motion is allowed
          reducedMotion ? '' : 'animate-glow-pulse',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-neon',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Possess This App — run an accessibility journey"
      >
        <span aria-hidden="true">👻</span>
        Possess This App
      </button>

      {/* Audit pipeline pills — static labels, not interactive.
          Using <ul>/<li> so AT understands list semantics without hover confusion. */}
      <ul
        className="flex flex-wrap items-center justify-center gap-2 mt-8 list-none p-0 m-0"
        aria-label="Audit pipeline steps"
      >
        {PILL_STEPS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-ui
                       bg-base-surface/80 border border-base-line text-ink-muted"
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
