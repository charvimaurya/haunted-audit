/**
 * RootLayout: skip link, polite live region, run state, and nested shells via <Outlet />.
 * Marketing and App chrome live in their own layouts.
 */
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useRouteAnnouncer } from '../lib/useRouteAnnouncer';
import { RunProvider } from '../runs/RunProvider';

function moveFocusToMain(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  document.getElementById('main-content')?.focus();
}

export function RootLayout() {
  useRouteAnnouncer();
  return (
    <RunProvider>
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
        <Suspense
          fallback={
            <p role="status" className="px-4 py-10 text-base font-ui text-ink-muted">
              Loading page…
            </p>
          }
        >
          <Outlet />
        </Suspense>
        <div id="live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      </div>
    </RunProvider>
  );
}
