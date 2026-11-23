/**
 * AppLayout: sidebar, breadcrumbs and main for /app/* pages, under the shared top menu.
 * Breadcrumbs come from the route table; the last crumb matches the page H1.
 */
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { RunStateBadge } from '../components/RunStateBadge';
import { SiteBand } from '../components/SiteBand';
import { APP_NAV, NOT_FOUND_TITLE, pageFor, to, trailFor } from '../routes';

export function AppLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const current = pageFor(pathname);
  const trail = current ? trailFor(current.id) : [];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        burgerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const linkClass = (isActive: boolean) =>
    [
      'flex min-h-11 w-full items-center rounded-lg px-3 text-base font-ui transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      isActive
        ? 'bg-violet-600/25 font-bold text-ink underline underline-offset-4'
        : 'text-ink-muted hover:bg-base-surface/60 hover:text-ink',
    ].join(' ');

  const navList = (
    <ul className="m-0 flex list-none flex-col gap-1 p-0" role="list">
      {APP_NAV.map((item) => (
        <li key={item.label}>
          <Link
            to={item.to}
            className={linkClass(item.isCurrent(pathname))}
            aria-current={item.isCurrent(pathname) ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-screen flex-col pt-14 md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className="hidden w-56 shrink-0 border-r border-base-line bg-base-panel md:block"
        aria-label="App"
      >
        <nav aria-label="App" className="sticky top-14 p-3">
          {navList}
        </nav>
      </aside>

      {/* Mobile: the sidebar opens from a button under the top menu */}
      <div className="flex h-12 items-center border-b border-base-line bg-base/95 px-4 md:hidden">
        <button
          ref={burgerRef}
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-base font-ui text-ink-muted
                     hover:bg-base-surface/60 hover:text-ink
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          aria-expanded={menuOpen}
          aria-controls="app-mobile-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          {menuOpen ? 'Close app menu' : 'App menu'}
        </button>
      </div>
      {menuOpen && (
        <div
          id="app-mobile-nav"
          ref={menuRef}
          className="border-b border-base-line bg-base-panel p-3 md:hidden"
          role="region"
          aria-label="App menu"
        >
          <nav aria-label="App">{navList}</nav>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex flex-wrap items-center gap-3 border-b border-base-line px-4 py-2 sm:px-6">
        <SiteBand />
        <nav aria-label="Breadcrumb" className="relative z-[1] text-base font-ui text-ink-muted">
          <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
            <li>
              <Link
                to={to('app-home')}
                className="inline-flex min-h-11 items-center rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                App
              </Link>
            </li>
            {(current ? trail.filter((p) => p.id !== 'app-home') : [null]).map((p, i, all) => (
              <li key={p?.id ?? 'not-found'} className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                {p && i < all.length - 1 ? (
                  <Link
                    to={to(p.id)}
                    className="inline-flex min-h-11 items-center rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                  >
                    {p.h1}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-semibold text-ink">
                    {p ? p.h1 : NOT_FOUND_TITLE}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <RunStateBadge />
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          aria-label="Haunted Audit app"
          className="relative z-[1] flex-1 px-4 py-4 sm:px-6 pb-16 focus-visible:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
