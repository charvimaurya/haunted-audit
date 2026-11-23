/**
 * GhostGlyph: our own ghost drawn as inline SVG (replaces the 👻 emoji, which looks different on every
 * device; docs/ui-fidelity.md D1, D8). Filled with currentColor, so the parent sets the colour.
 * Always aria-hidden and not focusable: the meaning is given in text next to it.
 */
interface GhostGlyphProps {
  size?: number;
  /** angry brows for the Blocked state */
  mood?: 'calm' | 'angry';
  className?: string;
}

export function GhostGlyph({ size = 48, mood = 'calm', className = '' }: GhostGlyphProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      data-ghost-glyph=""
    >
      <path
        d="M32 4C18 4 10 14 10 28v28l7-5 7 6 8-6 8 6 7-6 7 5V28C54 14 46 4 32 4Z"
        fill="currentColor"
      />
      {mood === 'angry' ? (
        <>
          <path d="M19 22l9 4M45 22l-9 4" stroke="var(--scene-eye)" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="25" cy="30" rx="3.5" ry="4.5" fill="var(--scene-eye)" />
          <ellipse cx="39" cy="30" rx="3.5" ry="4.5" fill="var(--scene-eye)" />
          <path d="M26 43q6-5 12 0" stroke="var(--scene-eye)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="25" cy="27" rx="3.5" ry="4.5" fill="var(--scene-eye)" />
          <ellipse cx="39" cy="27" rx="3.5" ry="4.5" fill="var(--scene-eye)" />
          <path d="M27 38q5 4 10 0" stroke="var(--scene-eye)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
