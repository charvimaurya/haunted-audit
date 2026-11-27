import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Code2, CheckCircle2, ShieldCheck, Ghost, Compass, ArrowRight, Sparkles, X } from 'lucide-react';
import heroBg from '../../assets/hero-bg.jpg';
import { AmbientLayer } from '../../immersion/AmbientLayer';
import { useImmersion } from '../../immersion/ImmersionContext';
import { halloweenAudio } from '../../immersion/halloweenAudio';
import { to as routeTo } from '../../routes';
import { InteractiveTour } from './InteractiveTour';

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

const GHOST_GUIDES = [
  {
    topic: 'Keyboard',
    title: 'Why Tab gets stuck',
    text: 'A <div onclick> looks clickable to a mouse, but Tab skips right past it unless it is a real <button>.',
    actionLabel: 'Test in Possession Mode',
    actionTo: routeTo('possession'),
  },
  {
    topic: 'Voice',
    title: 'How voice control sees forms',
    text: 'Voice commands look up controls by <label> and role. A visual <span> caption leaves inputs unreachable.',
    actionLabel: 'Inspect Agents',
    actionTo: routeTo('app-agents'),
  },
  {
    topic: 'Exorcist',
    title: 'Human-approved fixes',
    text: 'The Exorcist proposes minimal unified diffs on isolated copies and requires your approval before verifying.',
    actionLabel: 'Open Fixes Workspace',
    actionTo: routeTo('app-fixes'),
  },
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

export function HeroSection({ to = routeTo('possession') }: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const hostRef = useRef<HTMLElement>(null);
  const { motionAllowed, soundOn } = useImmersion();
  const [tourOpen, setTourOpen] = useState(false);
  const [ghostOpen, setGhostOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const activeTip = GHOST_GUIDES[tipIndex];
  const videoUrl = `${import.meta.env.BASE_URL}hero-loop.webm`;

  function toggleGhostPanel() {
    setGhostOpen((o) => !o);
    if (soundOn) halloweenAudio.start();
  }

  return (
    <section
      ref={hostRef}
      id="home"
      aria-labelledby="hero-heading"
      className="relative flex flex-1 min-h-0 w-full flex-col items-center justify-start lg:justify-center text-center
                 px-4 pt-14 pb-52 sm:pt-12 sm:pb-60 lg:py-8 lg:pl-[34%] lg:pr-[18%] overflow-hidden
                 rounded-2xl border-2 border-violet-neon/70 shadow-glow"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 25%, var(--hero-sky-top) 0%, transparent 70%), linear-gradient(var(--hero-sky-mid), var(--hero-sky-low))',
      }}
    >
      {/* Responsive cinematic video: bottom-anchored band on mobile/tablet so text stays clear; full-bleed subtle breathe on desktop */}
      {motionAllowed ? (
        <div
          aria-hidden="true"
          data-testid="hero-castle"
          className="pointer-events-none absolute inset-x-0 bottom-0 top-auto h-[235px] sm:h-[280px] lg:inset-0 lg:h-full z-0 overflow-hidden
                     [mask-image:linear-gradient(to_bottom,transparent_0%,#000_26%)] lg:[mask-image:none]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{
              opacity: 1,
              scale: [1.01, 1.055, 1.01],
              x: ['-0.6%', '0.6%', '-0.6%'],
            }}
            transition={{
              opacity: { duration: 0.9, ease: 'easeOut' },
              scale: { duration: 16, repeat: Infinity, ease: 'easeInOut' },
              x: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="h-full w-full"
          >
            <video
              src={videoUrl}
              poster={heroBg}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover object-[18%_85%] sm:object-[22%_85%] lg:object-center opacity-90"
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base/70 via-transparent to-base/30" />
        </div>
      ) : (
        <div className="hero-art" aria-hidden="true" data-testid="hero-castle" />
      )}

      {/* Framer Motion cinematic flying ghosts + particles */}
      <AmbientLayer />

      {/* Interactive Ask Ghost companion (responsive across mobile, tablet, desktop) */}
      <div className="absolute right-3 top-3 z-[3] flex flex-col items-end">
        <motion.button
          type="button"
          onClick={toggleGhostPanel}
          aria-expanded={ghostOpen}
          aria-controls="ask-ghost-panel"
          whileHover={motionAllowed ? { scale: 1.06, rotate: -3 } : undefined}
          whileTap={motionAllowed ? { scale: 0.94, rotate: 4 } : undefined}
          animate={motionAllowed ? { y: [0, -4, 0] } : undefined}
          transition={{ y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-violet-neon/60 bg-[#16102e] px-3 text-xs sm:text-sm font-ui font-semibold text-ink shadow-glow-sm hover:border-violet-neon hover:bg-[#1e153d] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon"
        >
          <Ghost size={15} className="text-violet-neon" aria-hidden="true" />
          <span>Ask Ghost</span>
          <Sparkles size={13} className="text-amber-400" aria-hidden="true" />
        </motion.button>
      </div>

      <AnimatePresence>
        {ghostOpen && (
          <motion.div
            id="ask-ghost-panel"
            role="region"
            aria-label="Interactive Ghost Guide"
            initial={motionAllowed ? { opacity: 0, y: -10, scale: 0.96 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={motionAllowed ? { opacity: 0, y: -8, scale: 0.96 } : undefined}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-3 top-16 z-[40] sm:absolute sm:inset-x-auto sm:right-3 sm:top-14 sm:w-80 rounded-2xl border border-violet-neon/70 bg-[#120b24] p-4 text-left text-ink shadow-glow"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1" role="tablist" aria-label="Ghost tip topics">
                {GHOST_GUIDES.map((g, idx) => (
                  <button
                    key={g.topic}
                    type="button"
                    role="tab"
                    aria-selected={idx === tipIndex}
                    onClick={() => setTipIndex(idx)}
                    className={[
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
                      idx === tipIndex
                        ? 'bg-violet-600 text-white'
                        : 'border border-base-line bg-[#1d1438] text-ink-muted hover:text-ink',
                    ].join(' ')}
                  >
                    {g.topic}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setGhostOpen(false)}
                aria-label="Close Ask Ghost"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-base-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            <h2 className="m-0 text-sm font-bold text-ink">{activeTip.title}</h2>
            <p className="mt-1 mb-3 text-xs sm:text-sm leading-relaxed text-ink-muted" aria-live="polite">
              {activeTip.text}
            </p>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setTipIndex((i) => (i + 1) % GHOST_GUIDES.length)}
                className="rounded-lg border border-base-line px-2.5 py-1 text-xs font-semibold text-ink hover:border-violet-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                Next tip
              </button>
              <Link
                to={activeTip.actionTo}
                onClick={() => setGhostOpen(false)}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                <span>{activeTip.actionLabel}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={motionAllowed ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-[1] flex flex-col items-center"
      >
        {/* Wordmark — original Rubik Wet Paint display font; sole <h1> on the page */}
        <h1
          id="hero-heading"
          data-page-title
          tabIndex={-1}
          className="mb-3 whitespace-nowrap leading-tight text-ink wordmark-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)', letterSpacing: '0.02em' }}
        >
          <span className="wordmark-haunted">Haunted</span>{' '}<span className="wordmark-audit">Audit</span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl font-semibold text-ink max-w-xl mb-1.5 font-ui">
          The accessibility guardrail for AI-built applications.
        </p>
        <p className="text-base text-ink mb-6 font-ui">
          Feel the barrier. Fix the cause. Prove the journey.
        </p>

        {/* Primary CTA + Live Tour button */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link
            id="tour-cta-possess"
            to={to}
            className={[
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-ui font-bold text-base text-white',
              'bg-[linear-gradient(var(--hero-cta-top),var(--hero-cta-bottom))] border border-violet-neon',
              'hover:brightness-110 active:scale-95 transition-all duration-150 shadow-glow-sm',
              reducedMotion ? '' : 'animate-glow-pulse',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-neon',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="Possess This App — run an accessibility journey"
          >
            <Ghost size={18} aria-hidden="true" />
            Possess This App
          </Link>

          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hero-pill-edge)] bg-[var(--hero-pill)]/90 px-4 py-2.5 font-ui text-sm font-semibold text-ink hover:border-violet-neon transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-neon"
          >
            <Compass size={16} className="text-violet-neon" aria-hidden="true" />
            Live Tour
          </button>
        </div>

        {/* Audit pipeline pills */}
        <ul
          id="tour-pipeline"
          className="flex flex-wrap items-center justify-center gap-2 mt-5 list-none p-0 m-0"
          aria-label="Audit pipeline steps"
        >
          {PILL_STEPS.map(({ icon: Icon, label, tone }) => (
            <li
              key={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-ui font-semibold
                         bg-[var(--hero-pill)] border text-ink ${label === 'Prevent' ? 'border-violet-neon shadow-glow-sm' : 'border-[var(--hero-pill-edge)]'}`}
            >
              <Icon size={14} className={tone} aria-hidden="true" data-icon-role="step" />
              {label}
            </li>
          ))}
        </ul>
      </motion.div>

      <InteractiveTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </section>
  );
}
