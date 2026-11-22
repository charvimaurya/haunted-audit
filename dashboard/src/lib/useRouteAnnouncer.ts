import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { announce } from './announce';
import { titleFor } from '../routes';

/**
 * On every page change: set the title, scroll to the top, move focus to the
 * page's H1 and announce the page. It does not move focus on first load.
 */
export function useRouteAnnouncer(): void {
  const { pathname } = useLocation();
  // The path focus was last settled for. Comparing paths (not a "first run" flag) keeps focus where it
  // is on first load even when React runs the effect twice (StrictMode in development).
  const settled = useRef(pathname);

  useEffect(() => {
    document.title = titleFor(pathname);
    if (settled.current === pathname) return;
    settled.current = pathname;
    window.scrollTo(0, 0);
    let frames = 0;
    let raf = 0;
    const settle = () => {
      const h1 = document.querySelector<HTMLElement>('h1[data-page-title]');
      if (h1 || frames >= 60) {
        const target = h1 ?? document.getElementById('main-content');
        target?.focus({ preventScroll: true });
        announce(`Navigated to ${h1?.textContent ?? document.title}`);
        return;
      }
      frames += 1;
      raf = window.requestAnimationFrame(settle);
    };
    raf = window.requestAnimationFrame(settle);
    return () => window.cancelAnimationFrame(raf);
  }, [pathname]);
}
