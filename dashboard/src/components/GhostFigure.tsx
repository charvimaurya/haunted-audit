/**
 * GhostFigure: the v7 / v9 ghost, drawn as inline SVG with the same body, gradients and faces as
 * design/v9. Red angry = Blocked, green happy = Verified, white worried or happy = brand.
 * Decorative: aria-hidden and not focusable. The state is always written in text next to it.
 * Colours come from the --gf-* variables in index.css.
 */
import { useId } from 'react';

export type GhostTone = 'red' | 'green' | 'white';
export type GhostFace = 'angry' | 'happy' | 'worried';

interface GhostFigureProps {
  tone: GhostTone;
  face: GhostFace;
  /** Width and height in px. */
  size?: number;
  className?: string;
}

const BODY =
  'M60 6C36 6 24 26 24 48c0 6-4 12-12 18 8 3 14 1 18-2-2 14-6 26-14 38 12 2 22-2 28-8 4 10 12 14 22 12 8 6 18 6 24-2 8 6 18 4 22-2-8-12-10-26-10-40 4 3 10 5 18 2-8-6-12-12-12-18C96 26 84 6 60 6z';

const GLOW: Record<GhostTone, string> = {
  red: 'drop-shadow(0 0 12px var(--gf-glow-red))',
  green: 'drop-shadow(0 0 12px var(--gf-glow-green))',
  white: 'drop-shadow(0 0 6px var(--gf-glow-white))',
};

function Face({ face }: { face: GhostFace }) {
  if (face === 'angry') {
    return (
      <>
        <path d="M38 40l16 7M82 40l-16 7" stroke="var(--gf-face)" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="47" cy="54" rx="6.5" ry="8" fill="var(--gf-face)" />
        <ellipse cx="73" cy="54" rx="6.5" ry="8" fill="var(--gf-face)" />
        <circle cx="49" cy="51" r="2" fill="var(--gf-shine)" />
        <circle cx="75" cy="51" r="2" fill="var(--gf-shine)" />
        <path d="M48 76q12-10 24 0l-4 2-4-4-4 4-4-4-4 4z" fill="var(--gf-face)" />
      </>
    );
  }
  if (face === 'happy') {
    return (
      <>
        <ellipse cx="47" cy="50" rx="6.5" ry="8.5" fill="var(--gf-face)" />
        <ellipse cx="73" cy="50" rx="6.5" ry="8.5" fill="var(--gf-face)" />
        <circle cx="49" cy="47" r="2.2" fill="var(--gf-shine)" />
        <circle cx="75" cy="47" r="2.2" fill="var(--gf-shine)" />
        <path d="M50 66q10 8 20 0" stroke="var(--gf-face)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <ellipse cx="47" cy="52" rx="6.5" ry="8.5" fill="var(--gf-face)" />
      <ellipse cx="73" cy="52" rx="6.5" ry="8.5" fill="var(--gf-face)" />
      <circle cx="49" cy="49" r="2.2" fill="var(--gf-shine)" />
      <circle cx="75" cy="49" r="2.2" fill="var(--gf-shine)" />
      <ellipse cx="60" cy="72" rx="6" ry="7" fill="var(--gf-face)" />
    </>
  );
}

export function GhostFigure({ tone, face, size = 80, className = '' }: GhostFigureProps) {
  const gradId = `gf-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-ghost-glyph=""
      data-ghost-tone={tone}
      className={className}
      style={{ filter: GLOW[tone], overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={gradId} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor={`var(--gf-${tone}-0)`} />
          <stop offset="0.45" stopColor={`var(--gf-${tone}-1)`} />
          <stop offset="1" stopColor={`var(--gf-${tone}-2)`} />
        </radialGradient>
      </defs>
      <path d={BODY} fill={`url(#${gradId})`} />
      <Face face={face} />
    </svg>
  );
}
