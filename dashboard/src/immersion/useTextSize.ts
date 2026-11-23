/**
 * Text size setting (product-ux.md "Settings on every page"; docs/ui-fidelity.md D20).
 * Three steps of the root font size, so every rem-based size grows. Saved on the device and applied
 * before first paint by index.html.
 */
import { useCallback, useState } from 'react';

export const TEXT_SIZE_STORAGE_KEY = 'haunted-audit.text-size';
export const TEXT_SIZES = ['100', '125', '150'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

function read(): TextSize {
  try {
    const v = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    if (v === '125' || v === '150') return v;
  } catch {
    /* storage off: default size */
  }
  return '100';
}

export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size;
}

export function useTextSize(): { size: TextSize; next: () => void } {
  const [size, setSize] = useState<TextSize>(read);
  const next = useCallback(() => {
    setSize((prev) => {
      const n = TEXT_SIZES[(TEXT_SIZES.indexOf(prev) + 1) % TEXT_SIZES.length];
      try {
        window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, n);
      } catch {
        /* ignore */
      }
      applyTextSize(n);
      return n;
    });
  }, []);
  return { size, next };
}
