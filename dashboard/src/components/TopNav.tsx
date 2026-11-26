/**
 * TopNav: the v7 top menu, drawn once by RootLayout on every page in both shells.
 * Wordmark, Home · Scans · Journeys · Fixes · Kiro · Reports, Calm mode and Sound, and the Kiro pill.
 * Every link comes from the route table (src/routes.ts).
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ghost, Hourglass, Menu, X } from 'lucide-react';
import { SenseControls } from '../immersion/SenseControls';
import { SettingsMenu } from './SettingsMenu';
import { NAV, to } from '../routes';

export function TopNav() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

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
    function onFocusOut(e: FocusEvent) {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.relatedTarget as Node) &&
        !burgerRef.current?.contains(e.relatedTarget as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('focusout', onFocusOut);
    return () => document.removeEventListener('focusout', onFocusOut);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const linkClass = (isActive: boolean) =>
    [
      'inline-flex min-h-11 items-center font-ui text-base transition-colors duration-150 rounded px-2',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon',
      isActive ? 'v9-nav-current' : 'text-v9-nav hover:text-white',
    ].join(' ');

  return (
    <nav
      className="v9-topnav fixed top-0 left-0 right-0 z-50"
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between gap-4 px-4 sm:px-7 h-14">
        <Link
          to={to('home')}
          className="flex items-center gap-2 shrink-0
                     focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon rounded"
          aria-label="Haunted Audit — home"
        >
          <span className="text-white" aria-hidden="true">
            <Ghost size={26} />
          </span>
          {/* v9 brand: bold Inter, white. The dripping display font is for the Home wordmark only. */}
          <span className="text-[1.2rem] font-extrabold leading-none text-white tracking-[0.01em]">Haunted Audit</span>
        </Link>

        <ul className="hidden lg:flex flex-1 items-center justify-center gap-8 list-none m-0 p-0" role="list">
          {NAV.map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                className={linkClass(link.isCurrent(pathname))}
                aria-current={link.isCurrent(pathname) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* On narrow screens the settings live in the menu, so the bar never overflows. */}
          <div className="hidden lg:block">
            <SettingsMenu />
          </div>
          <Link
            to={to('kiro')}
            className="v9-kiropill hidden sm:flex min-h-11 items-center gap-2 px-4 rounded-xl text-base font-bold text-white
                       shrink-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon"
            aria-label="Built with Kiro"
          >
            <Hourglass size={18} aria-hidden="true" />
            <span>Kiro</span>
          </Link>
          <button
            ref={burgerRef}
            type="button"
            className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg
                       text-ink-muted hover:text-ink hover:bg-base-surface/60
                       focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon
                       transition-colors"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav-menu"
          ref={menuRef}
          className="lg:hidden border-t border-base-line bg-base-panel"
          role="region"
          aria-label="Navigation menu"
        >
          <div className="px-3 pt-3">
            <SenseControls />
          </div>
          <ul className="flex flex-col p-3 gap-1 list-none m-0" role="list">
            {NAV.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className={[linkClass(link.isCurrent(pathname)), 'w-full px-3'].join(' ')}
                  aria-current={link.isCurrent(pathname) ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
