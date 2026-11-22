/**
 * MarketingLayout: header + main + footer for public marketing routes.
 */
import { Link, Outlet, useLocation } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { MARKETING_FOOTER_NAV } from '../routes';

export function MarketingLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <TopNav />
      <main
        id="main-content"
        tabIndex={-1}
        aria-label="Haunted Audit"
        className="relative z-[1] pt-14 pb-16 min-h-[70vh] focus-visible:outline-none"
      >
        <Outlet />
      </main>
      <footer className="border-t border-base-line px-4 py-8 text-base font-ui text-ink-muted">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="m-0 text-center sm:text-left">Built with Kiro</p>
          <nav aria-label="Footer">
            <ul className="m-0 flex list-none flex-wrap justify-center gap-4 p-0">
              {MARKETING_FOOTER_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={item.isCurrent(pathname) ? 'page' : undefined}
                    className="rounded px-1 text-ink-muted underline-offset-4 hover:text-ink hover:underline
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
