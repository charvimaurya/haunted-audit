import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import { MotionConfig } from 'framer-motion';
import { Code2, Compass, Pause, Play, Search, ShieldCheck } from 'lucide-react';
import { GhostFigure } from '../ghost/GhostFigure';
import { V9Dot } from '../ghost/V9Dot';
import { AmbientLayer } from '../../immersion/AmbientLayer';
import { useImmersion } from '../../immersion/ImmersionContext';
import { to as routeTo } from '../../routes';
import { InteractiveTour } from './InteractiveTour';

interface HeroSectionProps {
  to?: string;
}

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
  const { calm } = useImmersion();
  const [paused, setPaused] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const hideMotionControls = calm || reducedMotion;
  const freezeAnimations = paused || hideMotionControls;

  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      className={`v9-hero ${freezeAnimations ? 'hero-paused' : ''}`}
    >
      <div
        className="art"
        role="img"
        data-testid="hero-castle"
        aria-label="A friendly witch-hat ghost holding a laptop and a magnifying glass, in a moonlit graveyard with a castle and glowing pumpkins"
      />

      {/* Restored Framer Motion flying Crimson Stalker + Ectoplasm Wraith + Ambient Particles */}
      {!hideMotionControls && (
        <MotionConfig reducedMotion={paused ? 'always' : 'user'}>
          <AmbientLayer />
        </MotionConfig>
      )}

      <div className="v9-center flex flex-col items-center">
        <h1
          id="hero-heading"
          data-page-title
          tabIndex={-1}
          className="v9-wordmark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
        >
          Haunted <span>Audit</span>
        </h1>

        <p className="mt-3 text-base sm:text-xl lg:text-[1.45rem] font-semibold text-[#f6f2ff] drop-shadow-[0_2px_8px_#000] max-w-xl">
          The accessibility guardrail for AI-built applications.
        </p>
        <p className="mt-1.5 text-sm sm:text-base text-[#d9d0f3] drop-shadow-[0_2px_8px_#000]">
          Feel the barrier. Fix the cause. Prove the journey.
        </p>

        <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            id="tour-cta-possess"
            as={Link}
            to={to}
            role="link"
            radius="full"
            size="lg"
            color="secondary"
            variant="shadow"
            aria-label="Possess This App — run an accessibility journey"
            startContent={<GhostFigure tone="white" face="happy" size={28} />}
            className={[
              'h-12 sm:h-14 border border-[#c4b5fd99] bg-gradient-to-b from-[#5b30c4] to-[#3a1a8f] px-6 sm:px-8 text-base sm:text-xl font-bold text-white hover:brightness-110',
              freezeAnimations ? '' : 'animate-glow-pulse',
            ].join(' ')}
          >
            Possess This App
          </Button>
        </div>

        <ul
          id="tour-pipeline"
          className="mt-5 sm:mt-6 m-0 flex flex-wrap items-center justify-center gap-2 list-none p-0"
          aria-label="Audit pipeline steps"
        >
          <li>
            <Chip
              variant="flat"
              size="md"
              startContent={<Search size={15} style={{ color: '#fb923c' }} aria-hidden="true" data-icon-role="step" />}
              className="h-8 sm:h-9 border border-white/15 bg-[#160e2ecc] px-3 text-xs sm:text-sm font-semibold text-white backdrop-blur-md"
            >
              Detect
            </Chip>
          </li>
          <li>
            <Chip
              variant="flat"
              size="md"
              startContent={<Code2 size={15} style={{ color: '#4ade80' }} aria-hidden="true" data-icon-role="step" />}
              className="h-8 sm:h-9 border border-white/15 bg-[#160e2ecc] px-3 text-xs sm:text-sm font-semibold text-white backdrop-blur-md"
            >
              Fix
            </Chip>
          </li>
          <li>
            <Chip
              variant="flat"
              size="md"
              startContent={<V9Dot state="ok" size={18} />}
              className="h-8 sm:h-9 border border-white/15 bg-[#160e2ecc] px-3 text-xs sm:text-sm font-semibold text-white backdrop-blur-md"
            >
              Verify
            </Chip>
          </li>
          <li>
            <Chip
              variant="flat"
              size="md"
              color="secondary"
              startContent={<ShieldCheck size={15} style={{ color: '#c084fc' }} aria-hidden="true" data-icon-role="step" />}
              className="h-8 sm:h-9 border border-secondary/70 bg-[#160e2ecc] px-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_12px_#7c3aed44] backdrop-blur-md"
            >
              Prevent
            </Chip>
          </li>
        </ul>
      </div>

      {/* Bottom-right HeroUI Controls */}
      <div className="absolute right-3 bottom-3 z-[4] flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          radius="full"
          variant="flat"
          onPress={() => setTourOpen(true)}
          startContent={<Compass size={14} className="text-violet-300" aria-hidden="true" />}
          className="h-8 border border-white/20 bg-[#0f0a22cc] px-3 text-xs font-semibold text-white backdrop-blur-md hover:bg-[#1c1340]"
        >
          Tour
        </Button>
        {!hideMotionControls && (
          <Button
            type="button"
            size="sm"
            radius="full"
            variant="flat"
            aria-pressed={paused}
            onPress={() => setPaused((p) => !p)}
            startContent={paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
            className="h-8 border border-white/20 bg-[#0f0a22cc] px-3 text-xs font-semibold text-white backdrop-blur-md hover:bg-[#1c1340]"
          >
            {paused ? 'Play animation' : 'Pause animation'}
          </Button>
        )}
      </div>

      <InteractiveTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </section>
  );
}
