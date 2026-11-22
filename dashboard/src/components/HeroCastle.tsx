/**
 * HeroCastle: decorative haunted castle on a hill for the Home hero.
 * Not a control: aria-hidden, not focusable, ignores the pointer.
 * With motion allowed and a fine pointer, the castle drifts slightly and the
 * windows brighten as the pointer nears. Calm mode leaves it still.
 */
import { useEffect, useRef } from 'react';
import { useMotionAllowed } from '../immersion/ImmersionContext';

const WINDOWS = [
  { x: 155, y: 130 },
  { x: 155, y: 190 },
  { x: 93, y: 175 },
  { x: 217, y: 160 },
  { x: 125, y: 225 },
];

export function HeroCastle({ hostRef }: { hostRef: React.RefObject<HTMLElement | null> }) {
  const castle = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useEffect(() => {
    const host = hostRef.current;
    const el = castle.current;
    if (!allowed || !host || !el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let tx = 0, ty = 0, tn = 0, cx = 0, cy = 0, cn = 0, raf = 0;
    const step = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; cn += (tn - cn) * 0.12;
      el.style.setProperty('--px', cx.toFixed(3));
      el.style.setProperty('--py', cy.toFixed(3));
      el.style.setProperty('--near', cn.toFixed(3));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(tn - cn) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const move = (e: PointerEvent) => {
      const h = host.getBoundingClientRect();
      const c = el.getBoundingClientRect();
      tx = ((e.clientX - h.left) / h.width) * 2 - 1;
      ty = ((e.clientY - h.top) / h.height) * 2 - 1;
      const d = Math.hypot(e.clientX - (c.left + c.width / 2), e.clientY - (c.top + c.height / 2));
      tn = Math.max(0, 1 - d / 500);
      kick();
    };
    const leave = () => { tx = ty = tn = 0; kick(); };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
    };
  }, [allowed, hostRef]);

  return (
    <div ref={castle} className="hero-castle hidden lg:block" aria-hidden="true" data-testid="hero-castle">
      <svg viewBox="0 -20 300 360" focusable="false" width="100%" role="presentation">
        <defs>
          <radialGradient id="castle-glow-grad">
            <stop offset="0" stopColor="var(--hero-window)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--hero-window)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="120" r="92" fill="var(--scene-moon)" fillOpacity="0.9" />
        <circle cx="118" cy="96" r="14" fill="var(--scene-glyph)" fillOpacity="0.35" />
        <circle cx="176" cy="148" r="10" fill="var(--scene-glyph)" fillOpacity="0.3" />
        <path d="M0 340 C50 270 120 255 190 262 C240 266 275 255 300 262 L300 340 Z" fill="var(--hero-hill)" />
        <g fill="var(--hero-castle)">
          <rect x="96" y="150" width="130" height="120" />
          <rect x="76" y="120" width="34" height="150" />
          <rect x="132" y="82" width="46" height="190" />
          <rect x="200" y="110" width="34" height="160" />
          <path d="M72 122 L93 60 L114 122 Z" />
          <path d="M126 84 L155 6 L184 84 Z" />
          <path d="M196 112 L217 52 L238 112 Z" />
          <path d="M96 150 h10 v-8 h10 v8 h10 v-8 h10 v8 h10 v-8 h10 v8 h10 v-8 h10 v8 h10 Z" />
          <path d="M20 270 l10 -60 l10 60 Z M262 270 l8 -50 l8 50 Z" />
        </g>
        <path d="M155 6 V-14" stroke="var(--hero-castle)" strokeWidth="3" />
        <path className="castle-flag" d="M155 -14 L184 -6 L155 2 Z" fill="var(--hero-window)" />
        {WINDOWS.map((w) => (
          <g key={`${w.x}-${w.y}`}>
            <circle className="castle-glow" cx={w.x} cy={w.y} r="22" fill="url(#castle-glow-grad)" />
            <rect className="castle-window" x={w.x - 5} y={w.y - 9} width="10" height="18" rx="5" fill="var(--hero-window)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
