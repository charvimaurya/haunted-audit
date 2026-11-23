/**
 * GhostMascot
 *
 * The ghost IS the accessibility barrier — functional, not decorative.
 * Purple = Ready, Red = Blocked, Green = Verified.
 *
 * Accessibility:
 * - aria-hidden="true": state is conveyed in text elsewhere (WCAG 1.1.1, 1.4.1).
 * - title attribute omitted: redundant on aria-hidden elements and confuses
 *   some AT that expose title as a tooltip even on hidden nodes.
 * - animate prop is suppressed automatically when prefers-reduced-motion:reduce
 *   is active (JS-level guard supplements the global CSS rule in index.css).
 */

import { useEffect, useState } from 'react';
import type { GhostState } from '../types';
import { GhostGlyph } from './GhostGlyph';

interface GhostMascotProps {
  state: GhostState;
  /** px size of the ghost emoji wrapper — defaults to 48 */
  size?: number;
  /** Whether to apply the floating animation. Ignored when reduced-motion is on. */
  animate?: boolean;
  className?: string;
}

/** Colours from the tokens in index.css (purple Ready, red Blocked, green Verified). The SVG takes currentColor. */
const STATE_COLOR: Record<GhostState, string> = {
  ready:    'text-ghost-ready',
  blocked:  'text-ghost-blocked',
  verified: 'text-ghost-verified',
};

/** Returns true when the user has requested reduced motion. */
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

export function GhostMascot({
  state,
  size = 48,
  animate = true,
  className = '',
}: GhostMascotProps) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  return (
    <span
      aria-hidden="true"
      role="presentation"
      data-ghost-state={state}
      data-semantic-ghost="true"
      data-testid="ghost-mascot"
      className={[
        'inline-flex items-center justify-center select-none leading-none',
        STATE_COLOR[state],
        shouldAnimate ? 'animate-float' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
    >
      <GhostGlyph size={size} mood={state === 'blocked' ? 'angry' : 'calm'} />
    </span>
  );
}
