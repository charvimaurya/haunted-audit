/**
 * TopNav: the v7 top menu, drawn once by RootLayout on every page in both shells.
 * Wordmark, Home · Scans · Journeys · Fixes · Kiro · Reports, Calm mode and Sound, and the Kiro pill.
 * Every link comes from the route table (src/routes.ts).
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ghost, Menu, X } from 'lucide-react';
import { GhostShieldIcon } from './GhostShieldIcon';
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
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      isActive ? 'text-ink font-bold underline underline-offset-4' : 'text-ink-muted hover:text-ink',
    ].join(' ');

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-base/95 border-b border-base-line backdrop-blur-sm"
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-7xl mx-auto">
        <Link
          to={to('home')}
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

        <ul className="hidden lg:flex items-center gap-3 list-none m-0 p-0" role="list">
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
            className="hidden sm:flex min-h-11 items-center gap-1.5 px-3 rounded-full text-base font-semibold
                       bg-[var(--hero-pill)] text-ink border-2 border-violet-neon
                       hover:bg-violet-600/40 transition-colors duration-150 shrink-0
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
            aria-label="Built with Kiro"
          >
            <GhostShieldIcon size={18} />
            <span>Kiro</span>
          </Link>
          <button
            ref={burgerRef}
            type="button"
            className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg
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
