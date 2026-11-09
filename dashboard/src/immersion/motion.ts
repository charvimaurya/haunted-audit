/**
 * Motion and immersion rules.
 *
 * Ambient effects are decorative. The semantic ghost (Blocked / Verified,
 * placed from blocked_element) is a different component and is not animated
 * by this module.
 *
 * prefers-reduced-motion and Calm mode turn roaming, parallax, 3D, particles,
 * and page transitions off. Nothing here flashes faster than 3 times a second.
 * Counters may ease toward a measured number and must not invent one.
 */

export const CALM_STORAGE_KEY = 'haunted-audit.calm';
export const SOUND_STORAGE_KEY = 'haunted-audit.sound';

/** WCAG 2.3.1: a cycle shorter than this can flash more than 3 times a second. */
export const MIN_FLASH_CYCLE_MS = 334;

/** One left-to-right pass. Slow enough to read as slo-mo, far slower than a flash. */
export const ROAM_MS = 24_000;
export const PARTICLE_MS = 8_000;

export type Quality = 'full' | 'reduced' | 'static';
export type StoredSwitch = 'on' | 'off' | null;

export function readStoredSwitch(key: string): StoredSwitch {
  try {
    const value = window.localStorage.getItem(key);
    if (value === 'on' || value === 'off') return value;
  } catch {
    /* private mode and disabled storage keep the in-memory default */
  }
  return null;
}

export function writeStoredSwitch(key: string, value: 'on' | 'off'): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota and private-mode failures */
  }
}

export function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMobileOrCoarse(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 768px)').matches
  );
}

export function isLowPowerDevice(): boolean {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (!nav) return false;
  const memory = (nav as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === 'number' && memory > 0 && memory <= 4) return true;
  const connection = (nav as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) {
    return true;
  }
  return false;
}

/** Full motion only on a capable pointer device. Mobile and low-power skip 3D and particles. */
export function deviceQuality(options: {
  reducedMotion: boolean;
  mobile: boolean;
  lowPower: boolean;
}): Quality {
  if (options.reducedMotion) return 'static';
  if (options.mobile || options.lowPower) return 'reduced';
  return 'full';
}

/**
 * Drop a step after fps stays under 40 for 2 seconds.
 * full loses 3D and particles. reduced loses the remaining roam.
 */
export function nextQuality(current: Quality, fps: number, lowForMs: number): Quality {
  if (fps >= 40 || lowForMs < 2000) return current;
  if (current === 'full') return 'reduced';
  if (current === 'reduced') return 'static';
  return 'static';
}

export function resolveCalm(stored: StoredSwitch, systemReduce: boolean): boolean {
  if (stored === 'on') return true;
  if (stored === 'off') return false;
  return systemReduce;
}

/** Sound is off unless the visitor has explicitly switched it on. */
export function resolveSoundOn(stored: StoredSwitch): boolean {
  return stored === 'on';
}

/** A counter may move only toward a real finite measurement, and only when motion is allowed. */
export function shouldAnimateCounter(value: number | null | undefined, motionAllowed: boolean): boolean {
  return motionAllowed && typeof value === 'number' && Number.isFinite(value);
}
