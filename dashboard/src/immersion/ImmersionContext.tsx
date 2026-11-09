/**
 * Calm mode, sound, and the quality budget for the whole dashboard.
 * Sound never starts on its own. This module does not construct audio.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  CALM_STORAGE_KEY,
  SOUND_STORAGE_KEY,
  deviceQuality,
  isLowPowerDevice,
  isMobileOrCoarse,
  nextQuality,
  readStoredSwitch,
  resolveSoundOn,
  systemPrefersReducedMotion,
  writeStoredSwitch,
  type Quality,
} from './motion';

interface ImmersionValue {
  calm: boolean;
  /** True only when roaming, particles, and 3D are allowed. */
  motionAllowed: boolean;
  systemReduce: boolean;
  soundOn: boolean;
  quality: Quality;
  toggleCalm: () => void;
  toggleSound: () => void;
}

const ImmersionContext = createContext<ImmersionValue | null>(null);

export function ImmersionProvider({ children }: { children: ReactNode }) {
  const [systemReduce, setSystemReduce] = useState(systemPrefersReducedMotion);
  const [manualCalm, setManualCalm] = useState(() => readStoredSwitch(CALM_STORAGE_KEY) === 'on');
  const [soundOn, setSoundOn] = useState(() => resolveSoundOn(readStoredSwitch(SOUND_STORAGE_KEY)));
  const [quality, setQuality] = useState<Quality>(() =>
    deviceQuality({
      reducedMotion: systemPrefersReducedMotion(),
      mobile: isMobileOrCoarse(),
      lowPower: isLowPowerDevice(),
    }),
  );

  const calm = manualCalm || systemReduce;
  const motionAllowed = !calm && quality !== 'static';

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setSystemReduce(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.calm = calm ? 'true' : 'false';
    document.documentElement.dataset.quality = quality;
  }, [calm, quality]);

  useEffect(() => {
    if (!motionAllowed) return;
    if (typeof requestAnimationFrame !== 'function') return;
    if (/jsdom/i.test(navigator.userAgent)) return;

    let frames = 0;
    let windowStart = performance.now();
    let lowSince: number | null = null;
    let raf = 0;

    const tick = (now: number) => {
      frames += 1;
      const elapsed = now - windowStart;
      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        windowStart = now;
        if (fps < 40) {
          if (lowSince === null) lowSince = now;
          const lowFor = now - lowSince;
          setQuality((current) => nextQuality(current, fps, lowFor));
          if (lowFor >= 2000) lowSince = null;
        } else {
          lowSince = null;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motionAllowed, quality]);

  const value = useMemo<ImmersionValue>(
    () => ({
      calm,
      motionAllowed,
      systemReduce,
      soundOn,
      quality,
      toggleCalm: () => {
        if (systemReduce) {
          setManualCalm(true);
          writeStoredSwitch(CALM_STORAGE_KEY, 'on');
          return;
        }
        setManualCalm((current) => {
          const next = !current;
          writeStoredSwitch(CALM_STORAGE_KEY, next ? 'on' : 'off');
          return next;
        });
      },
      toggleSound: () => {
        setSoundOn((current) => {
          const next = !current;
          writeStoredSwitch(SOUND_STORAGE_KEY, next ? 'on' : 'off');
          return next;
        });
      },
    }),
    [calm, motionAllowed, systemReduce, soundOn, quality],
  );

  return <ImmersionContext.Provider value={value}>{children}</ImmersionContext.Provider>;
}

export function useImmersion(): ImmersionValue {
  const value = useContext(ImmersionContext);
  if (!value) {
    throw new Error('useImmersion must be used inside ImmersionProvider');
  }
  return value;
}

/** Metrics outside the provider stay still and show the measured value. */
export function useMotionAllowed(): boolean {
  return useContext(ImmersionContext)?.motionAllowed ?? false;
}
