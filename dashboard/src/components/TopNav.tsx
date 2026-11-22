/**
 * TopNav — marketing header (wordmark, primary links, calm/sound, App CTA).
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ghost, Menu, X } from 'lucide-react';
import { SenseControls } from '../immersion/SenseControls';
import { MARKETING_NAV } from '../routes';

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
      'font-ui text-base transition-colors duration-150 rounded px-2 py-1',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      isActive ? 'text-ink font-bold underline underline-offset-4' : 'text-ink-muted hover:text-ink',
    ].join(' ');

  // Header shows marketing destinations only (not the App shortcut as "current" competition).
  const headerLinks = MARKETING_NAV.filter((l) => l.label !== 'App');

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-base/95 border-b border-base-line backdrop-blur-sm"
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-7xl mx-auto">
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
          aria-label="Haunted Audit — home"
        >
          <span className="text-violet-neon" aria-hidden="true">
            <Ghost size={22} />
          </span>
          <span
            className="text-[1.1rem] leading-none text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Haunted Audit
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-4 list-none m-0 p-0" role="list">
          {headerLinks.map((link) => (
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
          <SenseControls />
          <Link
            to="/app"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-base font-semibold
                       bg-violet-600 text-white border border-violet-neon/50
                       hover:bg-violet-500 transition-colors duration-150 shrink-0
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            <Ghost size={14} aria-hidden="true" />
            <span>App</span>
          </Link>

          <button
            ref={burgerRef}
            type="button"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg
                       text-ink-muted hover:text-ink hover:bg-base-surface/60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon
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
          className="md:hidden border-t border-base-line bg-base-panel"
          role="region"
          aria-label="Navigation menu"
        >
          <ul className="flex flex-col p-3 gap-1 list-none m-0" role="list">
            {headerLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className={[linkClass(link.isCurrent(pathname)), 'block w-full px-3 py-2'].join(' ')}
                  aria-current={link.isCurrent(pathname) ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/app"
                className={[linkClass(pathname.startsWith('/app')), 'block w-full px-3 py-2'].join(' ')}
                onClick={() => setMenuOpen(false)}
              >
                App
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
