/**
 * RootLayout: skip link, the v7 top menu, the shell (via <Outlet />), the footer,
 * the polite live region and run state. Every page in both shells gets the same chrome.
 */
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter';
import { TopNav } from '../components/TopNav';
import { useRouteAnnouncer } from '../lib/useRouteAnnouncer';
import { RunProvider } from '../runs/RunProvider';
import { FixProvider } from '../fixes/FixProvider';

function moveFocusToMain(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  document.getElementById('main-content')?.focus();
}

export function RootLayout() {
  useRouteAnnouncer();
  return (
    <RunProvider>
      <FixProvider>
      <div className="min-h-screen bg-base font-ui">
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
            <p role="status" className="px-4 pt-20 pb-10 text-base font-ui text-ink-muted">
              Loading page…
            </p>
          }
        >
          <Outlet />
        </Suspense>
        <SiteFooter />
        <div id="live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      </div>
      </FixProvider>
    </RunProvider>
  );
}
