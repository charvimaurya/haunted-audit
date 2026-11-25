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

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Code2, CheckCircle2, ShieldCheck, Ghost, Pause, Play } from 'lucide-react';
import { AmbientLayer } from '../immersion/AmbientLayer';
import { useImmersion } from '../immersion/ImmersionContext';
import { to as routeTo } from '../routes';

interface HeroSectionProps {
  /** Where "Possess This App" goes. */
  to?: string;
}

const PILL_STEPS = [
  { icon: Search,       label: 'Detect',  tone: 'text-[color:var(--scene-gold)]' },
  { icon: Code2,        label: 'Fix',     tone: 'text-ghost-ready' },
  { icon: CheckCircle2, label: 'Verify',  tone: 'text-ghost-verified' },
  { icon: ShieldCheck,  label: 'Prevent', tone: 'text-violet-neon' },
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

export function HeroSection({ to = routeTo('try') }: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const hostRef = useRef<HTMLElement>(null);
  const { calm } = useImmersion();
  // Home's own pause, separate from the global Calm mode setting (v9 Home spec).
  // The button pauses only this hero's roaming ghosts and never writes to calm/localStorage.
  const [paused, setPaused] = useState(false);
  // Already stopped globally (Calm mode or the system reduced-motion preference):
  // a second, local pause control would be redundant, so it is hidden, same as the v9 spec.
  const alreadyStopped = calm || reducedMotion;

  return (
    <div className="mx-auto max-w-[1360px] px-3 pt-4 sm:px-6">
    <section
      ref={hostRef}
      id="home"
      aria-labelledby="hero-heading"
      className={[
        'relative flex flex-col items-center justify-start lg:justify-center text-center',
        'lg:min-h-[580px] px-4 pt-12 pb-[460px] lg:py-16 lg:pl-[34%] lg:pr-[18%] overflow-hidden',
        'rounded-2xl border-2 border-violet-neon/70 shadow-glow',
        paused ? 'hero-paused' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 25%, var(--hero-sky-top) 0%, transparent 70%), linear-gradient(var(--hero-sky-mid), var(--hero-sky-low))',
      }}
    >
      {/* The painted v7 artwork (text removed). Decorative: aria-hidden, no pointer events, never focusable. */}
      <div className="hero-art" aria-hidden="true" data-testid="hero-castle" />
      {/* Roaming ghosts cross the hero. They are not the semantic mascot. */}
      <AmbientLayer />

      {/* WCAG 2.2.2: a visible control to stop this hero's own moving ghosts.
          Local to Home only — never reads or writes the global Calm setting.
          Hidden when animation is already stopped globally (Calm mode or
          prefers-reduced-motion), same as the v9 Home spec. */}
      {!alreadyStopped && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="absolute right-3 top-3 z-[2] flex items-center gap-1.5 rounded-full border
                     border-[var(--hero-pill-edge)] bg-[var(--hero-pill)] px-3 py-1.5 text-base font-ui
                     font-semibold text-ink focus-visible:outline-none focus-visible:ring-[3px]
                     focus-visible:ring-violet-neon"
        >
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          {paused ? 'Play animation' : 'Pause animation'}
        </button>
      )}

      <div className="relative z-[1] flex flex-col items-center">
      {/* Wordmark — display (spooky) font; sole <h1> on the page */}
      <h1
        id="hero-heading"
        data-page-title
        tabIndex={-1}
        className="mb-3 whitespace-nowrap leading-tight text-ink wordmark-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 6vw, 4.75rem)', letterSpacing: '0.02em' }}
      >
        <span className="wordmark-haunted">Haunted</span>{' '}<span className="wordmark-audit">Audit</span>
      </h1>

      {/* Tagline */}
      <p className="text-xl font-semibold text-ink max-w-xl mb-2 font-ui">
        The accessibility guardrail for AI-built applications.
      </p>
      <p className="text-base text-ink mb-8 font-ui">
        Feel the barrier. Fix the cause. Prove the journey.
      </p>

      {/* Primary CTA
          animate-glow-pulse is a CSS box-shadow animation — suppressed both by
          the global CSS reduced-motion rule and the JS class guard below. */}
      <Link
        to={to}
        className={[
          'flex items-center gap-3 px-12 py-4 rounded-full font-ui font-bold text-xl text-white',
          'bg-[linear-gradient(var(--hero-cta-top),var(--hero-cta-bottom))] border-2 border-violet-neon',
          'hover:brightness-110 active:scale-95 transition-all duration-150 shadow-glow',
          // Only add the pulse class when motion is allowed
          reducedMotion ? '' : 'animate-glow-pulse',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-neon',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Possess This App — run an accessibility journey"
      >
        <Ghost size={26} aria-hidden="true" />
        Possess This App
      </Link>

      {/* Audit pipeline pills — static labels, not interactive.
          Using <ul>/<li> so AT understands list semantics without hover confusion. */}
      <ul
        className="flex flex-wrap items-center justify-center gap-2 mt-8 list-none p-0 m-0"
        aria-label="Audit pipeline steps"
      >
        {PILL_STEPS.map(({ icon: Icon, label, tone }) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-base font-ui font-semibold
                       bg-[var(--hero-pill)] border text-ink ${label === 'Prevent' ? 'border-violet-neon shadow-glow' : 'border-[var(--hero-pill-edge)]'}`}
          >
            <Icon size={16} className={tone} aria-hidden="true" data-icon-role="step" />
            {label}
          </li>
        ))}
      </ul>
      </div>
    </section>
    </div>
  );
}
