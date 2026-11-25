/**
 * AppLayout: sidebar, breadcrumbs and main for /app/* pages, under the shared top menu.
 * Breadcrumbs come from the route table; the last crumb matches the page H1.
 */
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChartColumn, Code2, FileSearch, Ghost, Hourglass, House, Menu, RefreshCw, Send, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react';
import { RunStateBadge } from '../components/RunStateBadge';
import { APP_NAV, NOT_FOUND_TITLE, pageFor, to, trailFor } from '../routes';

const ICONS: Record<string, LucideIcon> = {
  // The same icons as the v9 sidebar.
  Overview: House,
  Journeys: Send,
  Agents: Users,
  Findings: FileSearch,
  Fixes: Code2,
  Verification: ShieldCheck, // v9 draws a circle tick; a tick before any run reads as a pass (no-mock-results guard)
  Regression: RefreshCw,
  Kiro: Hourglass,
  Reports: ChartColumn,
};

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
      'flex min-h-11 w-full items-center rounded-xl px-3 text-base font-ui font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      isActive ? 'v9-side-current' : 'v9-side-link',
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
            {(() => {
              const Icon = ICONS[item.label];
              return Icon ? <Icon size={18} className="mr-3 shrink-0" aria-hidden="true" /> : null;
            })()}
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    // v9 app shell: one framed panel with a head bar (breadcrumb, run chip) and a sidebar.
    <div className="min-h-screen pt-[60px]">
    <div className="v9-frame v9-appframe flex flex-col">
      <div className="v9-apphead relative flex flex-wrap items-center gap-3 px-5 py-2">
        <nav aria-label="Breadcrumb" className="relative z-[1] text-base font-ui text-v9-crumb">
          <ol className="v9-crumbs m-0 flex list-none flex-wrap items-center gap-[10px] p-0">
            <li className="flex items-center gap-2">
              <Ghost size={22} className="text-white" aria-hidden="true" />
              <Link
                to={to('app-home')}
                className="inline-flex min-h-11 items-center rounded font-bold text-white hover:text-v9-here focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
              >
                App
              </Link>
            </li>
            {(current ? trail.filter((p) => p.id !== 'app-home') : [null]).map((p, i, all) => (
              <li key={p?.id ?? 'not-found'} className="flex items-center">
                {p && i < all.length - 1 ? (
                  <Link
                    to={to(p.id)}
                    className="inline-flex min-h-11 items-center rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                  >
                    {p.h1}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-bold text-v9-here [text-shadow:0_0_10px_#a78bfa88]">
                    {p ? p.h1 : NOT_FOUND_TITLE}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <RunStateBadge />
      </div>
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className="v9-side hidden w-[200px] shrink-0 md:block"
        aria-label="App"
      >
        <nav aria-label="App" className="sticky top-[64px] px-2.5 py-3">
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
        <main
          id="main-content"
          tabIndex={-1}
          aria-label="Haunted Audit app"
          className="relative z-[1] flex-1 px-5 pb-5 focus-visible:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
    </div>
    </div>
  );
}
