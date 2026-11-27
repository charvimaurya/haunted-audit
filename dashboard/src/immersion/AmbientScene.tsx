/**
 * Cinematic Framer Motion flying ghosts and particles.
 * Loaded after paint. Never renders GhostMascot and never reads blocked_element.
 */

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { GhostFigure } from '../components/ghost/GhostFigure';
import { PARTICLE_MS, ROAM_MS, ROAM_REVERSE_MS, type Quality } from './motion';

const PARTICLES = [8, 19, 31, 44, 58, 71, 83, 93];

interface HauntSpot {
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  flip: number;
  tiltStart: number;
  tiltEnd: number;
}

const RED_SPOTS: HauntSpot[] = [
  // Emerge bottom-left -> loom toward center
  { startX: 10, startY: 78, midX: 24, midY: 64, endX: 38, endY: 50, flip: 1, tiltStart: -16, tiltEnd: 12 },
  // Teleport top-right -> swoop diagonally down
  { startX: 88, startY: 16, midX: 74, midY: 28, endX: 62, endY: 42, flip: -1, tiltStart: 18, tiltEnd: -14 },
  // Materialize top-center -> lunge downward
  { startX: 48, startY: 10, midX: 54, midY: 24, endX: 46, endY: 44, flip: 1, tiltStart: -10, tiltEnd: 16 },
  // Appear bottom-right -> stalk left across mist
  { startX: 86, startY: 80, midX: 70, midY: 66, endX: 54, endY: 74, flip: -1, tiltStart: 14, tiltEnd: -12 },
];

const GREEN_SPOTS: HauntSpot[] = [
  // Emerge upper-right -> slice across upper sky
  { startX: 84, startY: 22, midX: 64, midY: 16, endX: 42, endY: 28, flip: -1, tiltStart: 15, tiltEnd: -18 },
  // Teleport mid-left -> drift low & close
  { startX: 14, startY: 48, midX: 28, midY: 66, endX: 44, endY: 76, flip: 1, tiltStart: -14, tiltEnd: 12 },
  // Materialize upper-left corner -> diagonal ambush
  { startX: 12, startY: 14, midX: 26, midY: 28, endX: 36, endY: 40, flip: 1, tiltStart: -20, tiltEnd: 10 },
  // Appear lower-right -> levitate eerily upward
  { startX: 82, startY: 76, midX: 74, midY: 54, endX: 78, endY: 30, flip: -1, tiltStart: 12, tiltEnd: -16 },
];

function jitterSpots(base: HauntSpot[]): HauntSpot[] {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  return base.map((s) => {
    const jx = (Math.random() - 0.5) * 8;
    const jy = (Math.random() - 0.5) * 8;
    return {
      ...s,
      startX: clamp(s.startX + jx, 6, 92),
      startY: clamp(s.startY + jy, 8, 88),
      midX: clamp(s.midX + jx * 0.7, 8, 90),
      midY: clamp(s.midY + jy * 0.7, 10, 86),
      endX: clamp(s.endX + jx * 0.5, 8, 90),
      endY: clamp(s.endY + jy * 0.5, 10, 86),
    };
  });
}

function buildHauntKeyframes(spots: HauntSpot[], baseOpacity: number) {
  const left: string[] = [];
  const top: string[] = [];
  const scale: number[] = [];
  const scaleX: number[] = [];
  const scaleY: number[] = [];
  const rotate: number[] = [];
  const skewX: number[] = [];
  const opacity: number[] = [];
  const times: number[] = [];

  const n = spots.length;
  const seg = 1 / n;

  spots.forEach((s, i) => {
    const t0 = i * seg;
    // Keyframe 1: Hidden arrival at new random coordinate (opacity 0 avoids visible streak across jump)
    left.push(`${s.startX.toFixed(1)}%`);
    top.push(`${s.startY.toFixed(1)}%`);
    scale.push(0.42);
    scaleX.push(s.flip);
    scaleY.push(1.18);
    rotate.push(s.tiltStart);
    skewX.push(s.flip * 8);
    opacity.push(0);
    times.push(Number((t0 + seg * 0.02).toFixed(4)));

    // Keyframe 2: Emerge from ectoplasm mist
    left.push(`${s.midX.toFixed(1)}%`);
    top.push(`${s.midY.toFixed(1)}%`);
    scale.push(1.06);
    scaleX.push(s.flip);
    scaleY.push(0.95);
    rotate.push((s.tiltStart + s.tiltEnd) / 2);
    skewX.push(s.flip * -4);
    opacity.push(baseOpacity);
    times.push(Number((t0 + seg * 0.28).toFixed(4)));

    // Keyframe 3: Menacing lunge closer toward viewer
    left.push(`${s.endX.toFixed(1)}%`);
    top.push(`${s.endY.toFixed(1)}%`);
    scale.push(1.52);
    scaleX.push(s.flip);
    scaleY.push(1.12);
    rotate.push(s.tiltEnd);
    skewX.push(s.flip * 6);
    opacity.push(Math.min(1, baseOpacity + 0.08));
    times.push(Number((t0 + seg * 0.68).toFixed(4)));

    // Keyframe 4: Dissolve back into spectral vapor before next teleport
    left.push(`${(s.endX + s.flip * 3).toFixed(1)}%`);
    top.push(`${Math.max(4, s.endY - 6).toFixed(1)}%`);
    scale.push(1.92);
    scaleX.push(s.flip);
    scaleY.push(1.26);
    rotate.push(s.tiltEnd * 1.2);
    skewX.push(s.flip * -8);
    opacity.push(0);
    times.push(Number((t0 + seg * 0.96).toFixed(4)));
  });

  // Ensure exact 0..1 boundaries for seamless repeat: Infinity
  times[0] = 0;
  times[times.length - 1] = 1;

  return { left, top, scale, scaleX, scaleY, rotate, skewX, opacity, times };
}

export default function AmbientScene({ quality }: { quality: Quality }) {
  const sceneHost = useRef<HTMLDivElement>(null);
  const allow3d = quality === 'full';
  const allowParticles = quality === 'full';

  const redPath = useMemo(() => jitterSpots(RED_SPOTS), []);
  const greenPath = useMemo(() => jitterSpots(GREEN_SPOTS), []);

  const redLead = useMemo(() => buildHauntKeyframes(redPath, 0.9), [redPath]);
  const redTrail1 = useMemo(() => buildHauntKeyframes(redPath, 0.34), [redPath]);
  const redTrail2 = useMemo(() => buildHauntKeyframes(redPath, 0.18), [redPath]);

  const greenLead = useMemo(() => buildHauntKeyframes(greenPath, 0.88), [greenPath]);
  const greenTrail1 = useMemo(() => buildHauntKeyframes(greenPath, 0.32), [greenPath]);
  const greenTrail2 = useMemo(() => buildHauntKeyframes(greenPath, 0.16), [greenPath]);

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
    <div ref={sceneHost} className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="ambient-scene">
      {/* Crimson Stalker: appears across corners & center, lunges toward screen, vanishes into mist */}
      {[
        { trail: 0, kf: redLead },
        { trail: 1, kf: redTrail1 },
        { trail: 2, kf: redTrail2 },
      ].map(({ trail, kf }) => (
        <motion.span
          key={`red-${trail}`}
          data-testid={trail === 0 ? 'ambient-ghost' : undefined}
          data-ambient-ghost={trail === 0 ? 'true' : undefined}
          data-roam={trail === 0 ? 'ltr' : undefined}
          aria-hidden="true"
          className="pointer-events-none absolute select-none"
          style={{
            animationDuration: trail === 0 ? `${ROAM_MS}ms` : undefined,
            filter: trail > 0 ? `blur(${trail * 2}px)` : undefined,
          }}
          initial={{ left: kf.left[0], top: kf.top[0], opacity: 0, scale: 0.45 }}
          animate={{
            left: kf.left,
            top: kf.top,
            scale: kf.scale,
            scaleX: kf.scaleX,
            scaleY: kf.scaleY,
            rotate: kf.rotate,
            skewX: kf.skewX,
            opacity: kf.opacity,
          }}
          transition={{
            duration: ROAM_MS / 1000,
            delay: trail * 0.18,
            repeat: Infinity,
            ease: 'easeInOut',
            times: kf.times,
          }}
        >
          <span className="relative block -translate-x-1/2 -translate-y-1/2">
            {trail === 0 && (
              <span
                className="ambient-ghost-ring pointer-events-none absolute -inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(239,68,68,0.38) 0%, rgba(127,29,29,0.12) 55%, transparent 75%)',
                }}
              />
            )}
            <GhostFigure
              tone="red"
              face="angry"
              size={48 - trail * 5}
              className="ambient-ghost-svg ambient-ghost-red drop-shadow-[0_0_20px_rgba(239,68,68,0.85)]"
            />
          </span>
        </motion.span>
      ))}

      {/* Ectoplasm Wraith: teleports between edges & upper sky, distorts & swoops */}
      {[
        { trail: 0, kf: greenLead },
        { trail: 1, kf: greenTrail1 },
        { trail: 2, kf: greenTrail2 },
      ].map(({ trail, kf }) => (
        <motion.span
          key={`green-${trail}`}
          data-testid={trail === 0 ? 'ambient-ghost' : undefined}
          data-ambient-ghost={trail === 0 ? 'true' : undefined}
          data-roam={trail === 0 ? 'rtl' : undefined}
          aria-hidden="true"
          className="pointer-events-none absolute select-none"
          style={{
            animationDuration: trail === 0 ? `${ROAM_REVERSE_MS}ms` : undefined,
            filter: trail > 0 ? `blur(${trail * 2}px)` : undefined,
          }}
          initial={{ left: kf.left[0], top: kf.top[0], opacity: 0, scale: 0.45 }}
          animate={{
            left: kf.left,
            top: kf.top,
            scale: kf.scale,
            scaleX: kf.scaleX,
            scaleY: kf.scaleY,
            rotate: kf.rotate,
            skewX: kf.skewX,
            opacity: kf.opacity,
          }}
          transition={{
            duration: ROAM_REVERSE_MS / 1000,
            delay: 0.9 + trail * 0.18,
            repeat: Infinity,
            ease: 'easeInOut',
            times: kf.times,
          }}
        >
          <span className="relative block -translate-x-1/2 -translate-y-1/2">
            {trail === 0 && (
              <span
                className="ambient-ghost-ring pointer-events-none absolute -inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(34,197,94,0.34) 0%, rgba(20,83,45,0.12) 55%, transparent 75%)',
                }}
              />
            )}
            <span className="ambient-ghost-alt">
              <GhostFigure
                tone="green"
                face="worried"
                size={46 - trail * 5}
                className="ambient-ghost-svg ambient-ghost-green drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]"
              />
            </span>
          </span>
        </motion.span>
      ))}

      {allowParticles &&
        PARTICLES.map((left, idx) => (
          <motion.span
            key={left}
            data-testid="ambient-particle"
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-violet-neon/50 shadow-[0_0_8px_rgba(168,85,247,0.7)]"
            style={{ left: `${left}%` }}
            initial={{ top: '16%', opacity: 0.15 }}
            animate={{ top: ['16%', '74%', '16%'], opacity: [0.15, 0.65, 0.15], scale: [0.8, 1.35, 0.8] }}
            transition={{
              duration: PARTICLE_MS / 1000 + idx * 0.7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
    </div>
  );
}
