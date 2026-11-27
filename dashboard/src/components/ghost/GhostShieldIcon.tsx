/**
 * Kiro bowtie/hourglass mark matching design/v9 top pill & sidebar icons.
 */
interface GhostShieldIconProps {
  size?: number;
  className?: string;
}

export function GhostShieldIcon({ size = 18, className }: GhostShieldIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 3h14l-7 9 7 9H5l7-9z" />
    </svg>
  );
}
