import { useEffect, useRef } from 'react';
import { useImmersion } from '../../immersion/ImmersionContext';

const TRAIL_COUNT = 5;

/**
 * Multiple tiny translucent ghosts following the cursor smoothly.
 * Purely decorative: aria-hidden, pointer-events-none, disabled in Calm mode and on touch devices.
 */
export function CursorGhosts() {
  const { motionAllowed } = useImmersion();
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!motionAllowed) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const positions = Array.from({ length: TRAIL_COUNT }, () => ({ x: target.x, y: target.y }));
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      target.x = e.clientX;
      target.y = e.clientY;
      activeRef.current = true;
    };

    const tick = () => {
      let leadX = target.x;
      let leadY = target.y;
      for (let i = 0; i < TRAIL_COUNT; i += 1) {
        const ease = 0.28 - i * 0.035;
        positions[i].x += (leadX - positions[i].x) * ease;
        positions[i].y += (leadY - positions[i].y) * ease;
        leadX = positions[i].x;
        leadY = positions[i].y;

        const el = nodesRef.current[i];
        if (el) {
          const offsetY = Math.sin(performance.now() * 0.004 + i) * 3;
          const scale = 1 - i * 0.13;
          const opacity = activeRef.current ? Math.max(0.1, 0.36 - i * 0.06) : 0;
          el.style.transform = `translate3d(${positions[i].x + 12}px, ${positions[i].y + 12 + offsetY}px, 0) scale(${scale})`;
          el.style.opacity = String(opacity);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [motionAllowed]);

  if (!motionAllowed) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] hidden overflow-hidden md:block"
    >
      {Array.from({ length: TRAIL_COUNT }, (_, idx) => (
        <div
          key={idx}
          ref={(el) => {
            nodesRef.current[idx] = el;
          }}
          className="pointer-events-none fixed left-0 top-0 opacity-0 transition-opacity duration-300"
          style={{ willChange: 'transform, opacity' }}
        >
          <svg
            width={18 - idx}
            height={22 - idx}
            viewBox="0 0 24 28"
            fill="none"
            className="text-violet-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.65)]"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12v11.2a1.2 1.2 0 0 0 2.05.85l2.2-2.2a1.2 1.2 0 0 1 1.7 0l2.1 2.1a1.2 1.2 0 0 0 1.7 0l2.1-2.1a1.2 1.2 0 0 1 1.7 0l2.2 2.2A1.2 1.2 0 0 0 22 23.2V12c0-5.52-4.48-10-10-10Z"
              fill="currentColor"
              fillOpacity="0.88"
            />
            <circle cx="9" cy="11.5" r="1.5" fill="#0d0714" />
            <circle cx="15" cy="11.5" r="1.5" fill="#0d0714" />
          </svg>
        </div>
      ))}
    </div>
  );
}
