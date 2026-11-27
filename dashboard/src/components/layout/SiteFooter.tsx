import { Ghost } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { FOOTER_NAV } from '../../routes';

export function SiteFooter() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <footer id="tour-footer" className="relative z-[1] shrink-0 border-t border-base-line/80 bg-base-panel/70 backdrop-blur-sm">
      <div
        className={[
          'mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6 md:flex-row md:items-center md:justify-between',
          isHome ? 'py-2.5' : 'py-4',
        ].join(' ')}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-muted md:justify-start">
          <Ghost size={15} className="shrink-0 text-violet-neon" aria-hidden="true" />
          <span className="font-bold text-ink">Haunted Audit</span>
          <span aria-hidden="true">·</span>
          <span>Accessibility Guardrail</span>
          <span aria-hidden="true">·</span>
          <span>Built with Kiro</span>
        </div>

        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0 text-sm">
            {FOOTER_NAV.map((item) => {
              const active = item.isCurrent(pathname);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'inline-flex min-h-9 items-center rounded-lg px-2.5 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
                      active
                        ? 'bg-violet-600/20 font-semibold text-ink'
                        : 'text-ink-muted hover:bg-base-surface/60 hover:text-ink',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
