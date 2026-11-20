/**
 * RootLayout: skip link, header, main (with the loading state), footer and the
 * polite live region. Every page renders inside <Outlet />.
 */
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { RunProvider } from '../runs/RunProvider';
import { useRouteAnnouncer } from '../lib/useRouteAnnouncer';

function moveFocusToMain(e: React.MouseEvent<HTMLAnchorElement>) {
  // Stay on the same URL: no hash, no history entry
  e.preventDefault();
  document.getElementById('main-content')?.focus();
}

export function RootLayout() {
  useRouteAnnouncer();
  return (
    <RunProvider>
      <div className="min-h-screen bg-base font-ui">
        {/* Skip link (WCAG 2.4.1): first focusable element */}
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
        <main
          id="main-content"
          tabIndex={-1}
          aria-label="Haunted Audit dashboard"
          className="relative z-[1] pt-14 max-w-7xl mx-auto px-4 sm:px-6 pb-16 min-h-[70vh]
                     focus-visible:outline-none"
        >
          <Suspense
            fallback={
              <p role="status" className="py-10 text-base font-ui text-ink-muted">
                Loading page…
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        <footer className="border-t border-base-line px-4 py-6 text-center text-base font-ui text-ink-muted">
          Built with Kiro
        </footer>
        <div id="live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      </div>
    </RunProvider>
  );
}
