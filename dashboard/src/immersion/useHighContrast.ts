/**
 * High contrast setting (product-ux.md "Settings on every page"; docs/ui-fidelity.md D19).
 * Saved on the device. index.html applies it before first paint; this hook keeps it in sync.
 */
import { useCallback, useState } from 'react';
import { readStoredSwitch, writeStoredSwitch } from './motion';

export const CONTRAST_STORAGE_KEY = 'haunted-audit.contrast';

export function applyContrast(on: boolean): void {
  document.documentElement.dataset.contrast = on ? 'high' : 'normal';
}

export function useHighContrast(): { high: boolean; toggle: () => void } {
  const [high, setHigh] = useState(() => readStoredSwitch(CONTRAST_STORAGE_KEY) === 'on');
  const toggle = useCallback(() => {
    setHigh((prev) => {
      const next = !prev;
      writeStoredSwitch(CONTRAST_STORAGE_KEY, next ? 'on' : 'off');
      applyContrast(next);
      return next;
    });
  }, []);
  return { high, toggle };
}
