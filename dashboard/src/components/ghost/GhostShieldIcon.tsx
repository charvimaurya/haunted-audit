/**
 * GhostShieldIcon: the small ghost-inside-a-shield mark on the Kiro pill (v7 top bar).
 * Decorative: the pill's own text and label carry the meaning. Draws in the current text colour.
 */
interface GhostShieldIconProps {
  size?: number;
}

export function GhostShieldIcon({ size = 18 }: GhostShieldIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.5 20 5.5v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z" />
      <path d="M9 15.5v-4.6a3 3 0 0 1 6 0v4.6l-1.5-1.1-1.5 1.1-1.5-1.1z" strokeWidth="1.4" />
      <circle cx="10.9" cy="11" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="13.1" cy="11" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
