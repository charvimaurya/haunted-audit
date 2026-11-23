/**
 * MarketingLayout: main area for the public pages. The top menu and footer come from RootLayout.
 * Every public page except Home gets the breadcrumb row with the castle band and the run state
 * (docs/ui-fidelity.md D7, D8, D10). Home has its own hero, as in v7.
 */
import { Link, Outlet, useLocation } from 'react-router-dom';
import { RunStateBadge } from '../components/RunStateBadge';
import { SiteBand } from '../components/SiteBand';
import { NOT_FOUND_TITLE, pageFor, to } from '../routes';

export function MarketingLayout() {
  const { pathname } = useLocation();
  const current = pageFor(pathname);
  const showCrumbs = current?.id !== 'home';
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-label="Haunted Audit"
      className="relative z-[1] pt-14 pb-16 min-h-[70vh] focus-visible:outline-none"
    >
      {showCrumbs && (
        <div className="relative flex flex-wrap items-center gap-3 border-b border-base-line px-4 py-2 sm:px-6">
          <SiteBand />
          <nav aria-label="Breadcrumb" className="relative z-[1] text-base font-ui text-ink-muted">
            <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
              <li>
                <Link
                  to={to('home')}
                  className="inline-flex min-h-11 items-center rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                >
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="font-semibold text-ink">
                  {current ? current.h1 : NOT_FOUND_TITLE}
                </span>
              </li>
            </ol>
          </nav>
          <RunStateBadge />
        </div>
      )}
      <Outlet />
    </main>
  );
}
