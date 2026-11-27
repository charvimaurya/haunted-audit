/**
 * PossessionGhost
 *
 * The ghost beside the Send Payment control (v7 panel 2, v9 "ghostpin"): angry red when the journey is
 * blocked, happy green when it is verified. It sits BESIDE the control, never on it, and is decorative:
 * the state is also written in text ("Journey Blocked"), so the picture is aria-hidden.
 */
import { GhostFigure } from './GhostFigure';

interface PossessionGhostProps {
  /** Rendered width in px. */
  size?: number;
  /** Red and angry (Blocked) or green and happy (Verified). */
  state?: 'blocked' | 'verified';
}

export function PossessionGhost({ size = 96, state = 'blocked' }: PossessionGhostProps) {
  return state === 'blocked' ? (
    <GhostFigure tone="red" face="angry" size={size} />
  ) : (
    <GhostFigure tone="green" face="happy" size={size} />
  );
}
