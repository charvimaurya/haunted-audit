/**
 * Visible, keyboard-reachable switches for Calm mode and sound.
 * Sound is off until the visitor turns it on. Nothing on this control plays audio.
 */

import { useImmersion } from './ImmersionContext';

const buttonClass = [
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1',
  'font-ui text-xs font-semibold text-ink',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
].join(' ');

export function SenseControls() {
  const { calm, systemReduce, soundOn, toggleCalm, toggleSound } = useImmersion();

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Motion and sound">
      <button
        type="button"
        className={`${buttonClass} ${calm ? 'border-violet-neon bg-violet-600/40' : 'border-base-line bg-base-surface/60'}`}
        aria-pressed={calm}
        aria-describedby={systemReduce ? 'calm-system-note' : undefined}
        onClick={toggleCalm}
      >
        Calm mode {calm ? 'on' : 'off'}
      </button>
      {systemReduce && (
        <span id="calm-system-note" className="sr-only">
          On because the system prefers reduced motion.
        </span>
      )}
      <button
        type="button"
        className={`${buttonClass} ${soundOn ? 'border-violet-neon bg-violet-600/40' : 'border-base-line bg-base-surface/60'}`}
        aria-pressed={soundOn}
        onClick={toggleSound}
      >
        {soundOn ? 'Sound on' : 'Sound off'}
      </button>
    </div>
  );
}
