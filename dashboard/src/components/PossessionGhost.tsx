/**
 * PossessionGhost
 *
 * The angry red ghost of v7 panel 2, drawn as inline SVG. It sits BESIDE the
 * Send Payment control and is decorative: the blocked state is also written in
 * text ("Journey Blocked"), so the picture is aria-hidden.
 * Colours come from CSS variables, not literals.
 */
interface PossessionGhostProps {
  /** Rendered width in px. Height follows the viewBox. */
  size?: number;
}

export function PossessionGhost({ size = 76 }: PossessionGhostProps) {
  return (
    <svg
      viewBox="0 0 80 92"
      width={size}
      height={(size * 92) / 80}
      aria-hidden="true"
      focusable="false"
      className="text-ghost-blocked"
    >
      <defs>
        <filter id="pg-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {/* soft red glow behind the body */}
      <ellipse cx="40" cy="50" rx="34" ry="38" fill="currentColor" opacity="0.35" filter="url(#pg-glow)" />
      {/* arms */}
      <ellipse cx="9" cy="58" rx="7" ry="9" transform="rotate(20 9 58)" fill="currentColor" />
      <ellipse cx="71" cy="58" rx="7" ry="9" transform="rotate(-20 71 58)" fill="currentColor" />
      {/* body with a wavy hem */}
      <path
        d="M10 80 V38 C10 18 24 6 40 6 C56 6 70 18 70 38 V80 L62 72 L54 80 L46 72 L40 80 L34 72 L26 80 L18 72 Z"
        fill="currentColor"
      />
      {/* belly highlight */}
      <ellipse cx="40" cy="62" rx="18" ry="12" fill="var(--color-ink)" opacity="0.12" />
      {/* eyes */}
      <ellipse cx="29" cy="40" rx="7" ry="8" fill="var(--color-ink)" />
      <ellipse cx="51" cy="40" rx="7" ry="8" fill="var(--color-ink)" />
      <circle cx="31" cy="42" r="3.6" fill="var(--color-base)" />
      <circle cx="49" cy="42" r="3.6" fill="var(--color-base)" />
      {/* angry brows */}
      <path d="M19 27 L35 35" stroke="var(--color-base)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M61 27 L45 35" stroke="var(--color-base)" strokeWidth="4.5" strokeLinecap="round" />
      {/* frown */}
      <path
        d="M29 62 Q40 51 51 62"
        fill="none"
        stroke="var(--color-base)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
