/**
 * Decorative roam and particles. This file is loaded only after the page
 * has painted. It never renders GhostMascot and never reads blocked_element.
 */

import { useEffect, useRef } from 'react';
import { PARTICLE_MS, ROAM_MS, type Quality } from './motion';

const PARTICLES = [8, 22, 41, 63, 78, 90];

export default function AmbientScene({ quality }: { quality: Quality }) {
  const sceneHost = useRef<HTMLDivElement>(null);
  const allow3d = quality === 'full';
  const allowParticles = quality === 'full';

  useEffect(() => {
    if (!allow3d) return;
    let dispose = () => {};
    let cancelled = false;
    import('./scene3d').then((mod) => {
      if (cancelled) return;
      dispose = mod.mountDecorativeScene(sceneHost.current);
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, [allow3d]);

  return (
    <div ref={sceneHost} className="absolute inset-0" data-testid="ambient-scene">
      <span
        data-testid="ambient-ghost"
        data-ambient-ghost="true"
        className="ambient-roam absolute text-4xl text-ghost-ready select-none"
        style={{ animationDuration: `${ROAM_MS}ms` }}
      >
        👻
      </span>
      {allowParticles &&
        PARTICLES.map((left) => (
          <span
            key={left}
            data-testid="ambient-particle"
            className="ambient-particle absolute h-1.5 w-1.5 rounded-full bg-violet-neon/40"
            style={{ left: `${left}%`, animationDuration: `${PARTICLE_MS}ms` }}
          />
        ))}
    </div>
  );
}
