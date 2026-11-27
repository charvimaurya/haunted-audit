import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Footprints } from 'lucide-react';
import { useImmersion } from '../../immersion/ImmersionContext';
import { describeStop, focusTrailStops, type FocusTrailStop } from '../../lib/focusTrail';
import type { JourneyResult } from '../../types';

interface FocusTrailReplayProps {
  result: JourneyResult | null;
  isRunning: boolean;
}

interface BadgePos {
  stop: FocusTrailStop;
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureBadges(card: HTMLElement, stops: FocusTrailStop[]): BadgePos[] {
  const cardRect = card.getBoundingClientRect();
  const out: BadgePos[] = [];
  for (const stop of stops) {
    if (!stop.replicaId) continue;
    const el = document.getElementById(stop.replicaId);
    if (!el || !card.contains(el)) continue;
    const r = el.getBoundingClientRect();
    out.push({
      stop,
      top: r.top - cardRect.top,
      left: r.left - cardRect.left,
      width: r.width,
      height: r.height,
    });
  }
  return out;
}

export function FocusTrailReplay({ result, isRunning }: FocusTrailReplayProps) {
  const { calm } = useImmersion();
  const [step, setStep] = useState(0);
  const [liveText, setLiveText] = useState('');
  const [cardEl, setCardEl] = useState<HTMLElement | null>(null);
  const [positions, setPositions] = useState<BadgePos[]>([]);

  const stops = focusTrailStops(result);

  useEffect(() => {
    setStep(0);
    setLiveText('');
  }, [result?.run_id, isRunning]);

  useEffect(() => {
    setCardEl(document.getElementById('pm-replica-card'));
  }, [result, isRunning, calm, step]);

  const activeStops = calm
    ? stops.filter((s) => s.replicaId !== null)
    : step >= 1 && step <= stops.length
      ? [stops[step - 1]].filter((s) => s.replicaId !== null)
      : [];

  const activeKey = activeStops.map((s) => `${s.position}:${s.replicaId}`).join(',');

  useEffect(() => {
    if (!cardEl || activeStops.length === 0) {
      setPositions([]);
      return;
    }
    const update = () => setPositions(measureBadges(cardEl, activeStops));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(cardEl);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardEl, activeKey]);

  function handleAdvance() {
    if (stops.length === 0) return;
    const next = step >= stops.length + 1 ? 1 : step + 1;
    setStep(next);
    if (next <= stops.length) {
      setLiveText(describeStop(stops[next - 1]));
    } else {
      setLiveText('Replay finished');
    }
  }

  const buttonLabel = step >= 1 && step <= stops.length ? 'Next stop' : 'Replay focus trail';
  const neverReachedSend = result?.reason_code === 'TARGET_NOT_FOCUSABLE';

  const portalLayer =
    cardEl && positions.length > 0
      ? createPortal(
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {positions.map(({ stop, top, left, width, height }) => (
              <div key={stop.position}>
                <div
                  className="pointer-events-none absolute rounded-lg outline outline-[3px] outline-amber-400"
                  style={{ top, left, width, height }}
                />
                <span
                  data-trail-badge={stop.position}
                  className="pointer-events-none absolute grid min-h-[1.75rem] min-w-[1.75rem] place-items-center rounded-full border-2 border-amber-300 bg-base px-1.5 text-base font-bold text-amber-200 shadow-glow-sm"
                  style={{
                    top: Math.max(4, top + height / 2 - 14),
                    left: left + width + 8,
                  }}
                >
                  {stop.position}
                </span>
              </div>
            ))}
          </div>,
          cardEl,
        )
      : null;

  return (
    <section className="mt-4 border-t border-bank-line pt-4" aria-labelledby="focus-trail-heading">
      <div className="flex items-center gap-2">
        <Footprints size={18} className="shrink-0 text-violet-neon" aria-hidden="true" />
        <h4 id="focus-trail-heading" className="m-0 text-base font-bold font-ui text-ink">
          Focus trail
        </h4>
      </div>
      <p className="mt-1 mb-2 text-sm text-ink-muted font-ui">
        Replay of the keyboard path on this drawing
      </p>

      {isRunning ? (
        <p className="m-0 text-base text-ink-muted font-ui">
          The keyboard path is not ready: the run is still going.
        </p>
      ) : result === null ? (
        <p className="m-0 text-base text-ink-muted font-ui">Not run yet.</p>
      ) : stops.length === 0 ? (
        <p className="m-0 text-base text-ink-muted font-ui">No keyboard trail in this run.</p>
      ) : (
        <>
          {!calm && (
            <button
              type="button"
              onClick={handleAdvance}
              className="mb-3 inline-flex min-h-11 min-w-11 items-center rounded-lg border border-violet-neon/60 bg-violet-600/20 px-4 text-base font-semibold font-ui text-ink hover:bg-violet-600/35 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon"
            >
              {buttonLabel}
            </button>
          )}

          {neverReachedSend && (
            <p className="m-0 mb-2 text-base font-semibold text-ghost-blocked font-ui">
              Tab never landed on Send Payment
            </p>
          )}

          <div role="status" aria-live="polite" className="mb-2 min-h-6 text-base font-semibold text-violet-300 font-ui">
            {liveText}
          </div>

          <ol className="m-0 list-decimal pl-5 text-sm text-ink-muted font-ui space-y-1">
            {stops.map((s) => {
              const active = !calm && step === s.position;
              return (
                <li
                  key={s.position}
                  className={active ? 'font-bold text-ink' : undefined}
                >
                  {describeStop(s)}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {portalLayer}
    </section>
  );
}
