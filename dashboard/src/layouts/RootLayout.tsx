import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CursorGhosts } from '../components/ghost/CursorGhosts';
import { TopNav } from '../components/layout/TopNav';
import { useImmersion } from '../immersion/ImmersionContext';
import { halloweenAudio } from '../immersion/halloweenAudio';
import { SOUND_STORAGE_KEY } from '../immersion/motion';
import { useRouteAnnouncer } from '../lib/useRouteAnnouncer';
import { RunProvider } from '../runs/RunProvider';
import { FixProvider } from '../fixes/FixProvider';

function moveFocusToMain(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  document.getElementById('main-content')?.focus();
}

export function RootLayout() {
  useRouteAnnouncer();
  const { pathname } = useLocation();
  const { soundOn } = useImmersion();
  const isHome = pathname === '/';

  useEffect(() => {
    if (!soundOn) {
      halloweenAudio.stop();
      return;
    }
    halloweenAudio.start();
    const unlock = () => halloweenAudio.start();
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [soundOn]);

  useEffect(() => {
    const onInteractiveClick = (e: MouseEvent) => {
      if (!e.isTrusted) return;
      try {
        if (window.localStorage.getItem(SOUND_STORAGE_KEY) === 'off') return;
      } catch {
        // Ignore storage errors
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, [role="button"], [role="tab"]')) {
        halloweenAudio.playSpookyClick();
      }
    };
    window.addEventListener('click', onInteractiveClick, { capture: true, passive: true });
    return () => window.removeEventListener('click', onInteractiveClick, { capture: true });
  }, []);

  return (
    <RunProvider>
      <FixProvider>
        <div
          className={[
            'flex flex-col bg-base font-ui text-ink transition-colors duration-200',
            isHome ? 'min-h-dvh lg:h-dvh lg:overflow-hidden' : 'min-h-dvh',
          ].join(' ')}
        >
          <CursorGhosts />
          <a
            href="#main-content"
            onClick={moveFocusToMain}
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2
                       focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg
                       focus:bg-violet-600 focus:text-white focus:font-semibold
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            Skip to main content
          </a>
          <TopNav />
          <Suspense
            fallback={
              <p role="status" className="flex-1 px-4 py-10 text-base font-ui text-ink-muted">
                Loading page…
              </p>
            }
          >
            <Outlet />
          </Suspense>
          <div id="live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
        </div>
      </FixProvider>
    </RunProvider>
  );
}
