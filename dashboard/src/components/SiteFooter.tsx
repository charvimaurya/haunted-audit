/**
 * SiteFooter: the public pages that are not in the v7 top menu, plus "Built with Kiro".
 * Same place on every page, in both shells.
 */
import { Link, useLocation } from 'react-router-dom';
import { FOOTER_NAV } from '../routes';

export function SiteFooter() {
  const { pathname } = useLocation();
  return (
    <footer className="relative z-[1] border-t border-base-line px-4 py-8 text-base font-ui text-ink-muted">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="m-0 text-center sm:text-left">Built with Kiro</p>
        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0">
            {FOOTER_NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={item.isCurrent(pathname) ? 'page' : undefined}
                  className="inline-flex min-h-11 items-center rounded px-1 text-ink-muted underline-offset-4
                             hover:text-ink hover:underline aria-[current=page]:font-bold aria-[current=page]:text-ink
                             focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
