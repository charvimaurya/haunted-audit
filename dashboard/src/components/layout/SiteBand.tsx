import { AmbientLayer } from '../../immersion/AmbientLayer';

/**
 * SiteBand: slim decorative castle and fog strip behind the breadcrumb row (docs/ui-fidelity.md D7).
 * aria-hidden, ignores the pointer, never focusable, painted under the breadcrumb text.
 */
export function SiteBand() {
  return (
    <div className="site-band" aria-hidden="true" data-testid="site-band">
      {/* The red and green roaming ghosts cross the band on every page (Calm mode stops them). */}
      <AmbientLayer />
      <svg
        className="absolute bottom-0 left-1/2 h-full w-56 -translate-x-1/2"
        viewBox="0 0 224 48"
        preserveAspectRatio="xMaxYMax meet"
        focusable="false"
        role="presentation"
      >
        <circle cx="168" cy="16" r="11" fill="var(--scene-moon)" fillOpacity="0.35" />
        <g fill="var(--hero-castle)">
          <rect x="130" y="26" width="52" height="22" />
          <rect x="124" y="18" width="10" height="30" />
          <rect x="150" y="12" width="12" height="36" />
          <rect x="176" y="20" width="10" height="28" />
          <path d="M122 19 L129 8 L136 19 Z M148 13 L156 0 L164 13 Z M174 21 L181 10 L188 21 Z" />
        </g>
        <rect x="140" y="32" width="3" height="5" fill="var(--hero-window)" />
        <rect x="155" y="22" width="3" height="5" fill="var(--hero-window)" />
        <rect x="168" y="33" width="3" height="5" fill="var(--hero-window)" />
        <rect x="0" y="34" width="224" height="14" fill="var(--scene-ghost)" fillOpacity="0.06" />
      </svg>
    </div>
  );
}
