/**
 * SettingsMenu
 *
 * One "Settings" button in the top bar that opens Calm mode, High contrast, Text size and Sound.
 * The four switches did not fit on one row beside the v7 nav, so they sit behind this disclosure.
 * Keyboard: Enter or Space opens it, Escape closes it and returns focus to the button,
 * and moving focus out of it closes it.
 */
import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { SenseControls } from '../immersion/SenseControls';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && !wrapRef.current?.contains(next)) setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    wrapRef.current?.addEventListener('focusout', onFocusOut);
    document.addEventListener('pointerdown', onPointer);
    const wrap = wrapRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      wrap?.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="settings-panel"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        className="v9-gear inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150
                   focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon"
      >
        {/* v9: an icon-only gear button. Its name is "Settings" (aria-label). */}
        <Settings size={18} aria-hidden="true" />
      </button>
      <div
        id="settings-panel"
        hidden={!open}
        className="v9-settings absolute right-0 top-full mt-2 w-64 rounded-xl p-3 z-50"
      >
        <SenseControls />
      </div>
    </div>
  );
}
