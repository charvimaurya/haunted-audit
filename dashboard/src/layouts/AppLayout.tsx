/**
 * AppLayout: sidebar + breadcrumbs + main for /app/* routes.
 */
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Ghost, Menu, X } from 'lucide-react';
import { SenseControls } from '../immersion/SenseControls';
import { APP_NAV, pageFor } from '../routes';

function breadcrumbLabel(pathname: string): string {
  const page = pageFor(pathname);
  if (!page) return 'App';
  if (page.id === 'app-home') return 'Dashboard';
  return page.h1;
}

export function AppLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const crumb = breadcrumbLabel(pathname);

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
      'block w-full rounded-lg px-3 py-2 text-base font-ui transition-colors',
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
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className="hidden w-56 shrink-0 border-r border-base-line bg-base-panel md:flex md:flex-col"
        aria-label="App"
      >
        <div className="flex h-14 items-center gap-2 border-b border-base-line px-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
            aria-label="Haunted Audit — home"
          >
            <Ghost size={20} className="text-violet-neon" aria-hidden="true" />
            <span className="text-sm text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              Haunted Audit
            </span>
          </Link>
        </div>
        <nav aria-label="App" className="flex-1 p-3">
          {navList}
        </nav>
        <div className="border-t border-base-line p-3">
          <SenseControls />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-base-line bg-base/95 px-4 backdrop-blur-sm md:hidden">
        <Link
          to="/"
          className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          aria-label="Haunted Audit — home"
        >
          <Ghost size={20} className="text-violet-neon" aria-hidden="true" />
          <span className="text-sm text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Haunted Audit
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <SenseControls />
          <button
            ref={burgerRef}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted
                       hover:bg-base-surface/60 hover:text-ink
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
            aria-label={menuOpen ? 'Close app menu' : 'Open app menu'}
            aria-expanded={menuOpen}
            aria-controls="app-mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
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
        <nav
          aria-label="Breadcrumb"
          className="border-b border-base-line px-4 py-2 text-base font-ui text-ink-muted sm:px-6"
        >
          <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
            <li>
              <Link
                to="/app"
                className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                App
              </Link>
            </li>
            {pathname !== '/app' && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <span aria-current="page" className="font-semibold text-ink">
                    {crumb}
                  </span>
                </li>
              </>
            )}
          </ol>
        </nav>
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
