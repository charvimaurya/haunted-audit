/**
 * TopNav
 *
 * Fixed top navigation bar matching the v7 design.
 * Wordmark uses the display (spooky) font; nav links use the UI font.
 *
 * Accessibility:
 * - Mobile burger button toggles a full-width menu at ≤768px (WCAG 2.1.1, 1.4.10).
 * - Burger button uses aria-expanded / aria-controls.
 * - Menu closes on Escape and when focus leaves.
 * - All interactive elements have a visible focus ring.
 */

import { useState, useRef, useEffect } from 'react';
import { Ghost, Menu, X } from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home',      href: '#home' },
  { label: 'Scans',     href: '#scans' },
  { label: 'Journeys',  href: '#journeys' },
  { label: 'Fixes',     href: '#fixes' },
  { label: 'Kiro',      href: '#kiro' },
  { label: 'Reports',   href: '#reports' },
];

interface TopNavProps {
  activeSection?: string;
}

export function TopNav({ activeSection = 'Home' }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
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

  // Close when focus moves outside the nav entirely
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

  const linkClass = (label: string) => {
    const isActive = label === activeSection;
    return [
      'font-ui text-sm transition-colors duration-150 rounded px-2 py-1',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      isActive ? 'text-ink font-semibold' : 'text-ink-muted hover:text-ink',
    ].join(' ');
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-base/95 border-b border-base-line backdrop-blur-sm"
      aria-label="Primary navigation"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-7xl mx-auto">
        {/* Wordmark */}
        <a
          href="#home"
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
        </a>

        {/* Desktop nav links — hidden on mobile */}
        <ul
          className="hidden md:flex items-center gap-6 list-none m-0 p-0"
          role="list"
        >
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className={linkClass(link.label)}
                aria-current={link.label === activeSection ? 'page' : undefined}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* Kiro CTA — always visible */}
          <a
            href="#kiro"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
                       bg-violet-600 text-white border border-violet-neon/50
                       hover:bg-violet-500 transition-colors duration-150 shrink-0
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            <Ghost size={14} aria-hidden="true" />
            <span>Kiro</span>
          </a>

          {/* Burger — mobile only */}
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
            {menuOpen
              ? <X size={20} aria-hidden="true" />
              : <Menu size={20} aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div
          id="mobile-nav-menu"
          ref={menuRef}
          className="md:hidden border-t border-base-line bg-base-panel"
          role="region"
          aria-label="Navigation menu"
        >
          <ul className="flex flex-col p-3 gap-1 list-none m-0" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className={[
                    linkClass(link.label),
                    'block w-full px-3 py-2',
                  ].join(' ')}
                  aria-current={link.label === activeSection ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
