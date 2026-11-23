/// <reference types="vitest/globals" />
/**
 * Link crawl (REQ-SH-01, 04 to 07): render every page, follow every internal link in the top menu,
 * footer, sidebar, breadcrumbs and page body, and fail on any "Page not found".
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../AppRoutes';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { NAV, PAGES, REDIRECTS, to } from '../routes';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ImmersionProvider>
        <AppRoutes />
      </ImmersionProvider>
    </MemoryRouter>,
  );
}

async function h1At(path: string): Promise<string> {
  renderAt(path);
  const h1 = await screen.findByRole('heading', { level: 1 });
  const text = h1.textContent ?? '';
  cleanup();
  return text;
}

function internalLinks(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map((a) => a.getAttribute('href') ?? '')
    .filter((h) => h.startsWith('/'));
}

describe('link crawl', () => {
  it('no internal link on any page lands on "Page not found"', async () => {
    const found = new Set<string>();
    for (const page of PAGES) {
      const { container } = renderAt(page.path);
      await screen.findByRole('heading', { level: 1 });
      internalLinks(container).forEach((h) => found.add(h));
      cleanup();
    }
    // every menu, footer and sidebar destination is in the crawl
    for (const item of NAV) expect(found).toContain(item.to);
    expect(found.size).toBeGreaterThanOrEqual(PAGES.length);
    const dead: string[] = [];
    for (const href of found) {
      if ((await h1At(href)) === 'Page not found') dead.push(href);
    }
    expect(dead).toEqual([]);
  }, 60_000); // renders every page and every link it finds

  it('every page shows the v7 top menu, in the same order', async () => {
    for (const page of PAGES) {
      renderAt(page.path);
      await screen.findByRole('heading', { level: 1 });
      const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
      const labels = within(nav).getAllByRole('link').map((a) => a.getAttribute('aria-label') ?? a.textContent);
      expect(labels, page.path).toEqual([
        'Haunted Audit — home', 'Home', 'Scans', 'Journeys', 'Fixes', 'Kiro', 'Reports', 'Voice agent', 'Built with Kiro',
      ]);
      // The four settings sit behind one Settings button in the bar (owner approved, 22 Nov 2026).
      fireEvent.click(within(nav).getByRole('button', { name: 'Settings' }));
      for (const name of [/calm mode/i, /high contrast/i, /text size/i, /sound/i]) {
        expect(within(nav).getByRole('button', { name }), page.path).toBeVisible();
      }
      cleanup();
    }
  }, 60_000);

  it.each([
    [to('possession'), 'Journeys'],
    [to('app-fixes-verify'), 'Fixes'],
    [to('app-fixes-regression'), 'Fixes'],
    [to('app-reports'), 'Reports'],
    [to('home'), 'Home'],
  ])('%s marks "%s" as the current top-menu item', async (path, label) => {
    renderAt(path);
    await screen.findByRole('heading', { level: 1 });
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const current = within(nav).getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.textContent)).toEqual([label]);
  });

  it('Possession Mode and all four fix steps load', async () => {
    expect(await h1At(to('possession'))).toBe('Possession Mode');
    expect(await h1At(to('app-fixes-find'))).toBe('Fixes: Find');
    expect(await h1At(to('app-fixes-fix'))).toBe('Fixes: Fix');
    expect(await h1At(to('app-fixes-verify'))).toBe('Fixes: Verify');
    expect(await h1At(to('app-fixes-regression'))).toBe('Fixes: Regression');
  });

  it('old and short URLs redirect and keep the step', async () => {
    for (const r of REDIRECTS) {
      const from = r.from.replace(':step', 'verify');
      expect(await h1At(from), from).not.toBe('Page not found');
    }
    expect(await h1At('/journeys/send-payment/fixes/verify')).toBe('Fixes: Verify');
    expect(await h1At('/journeys/send-payment/fixes/regression')).toBe('Fixes: Regression');
    expect(await h1At('/journeys/send-payment/possession')).toBe('Possession Mode');
    expect(await h1At('/fixes/fix')).toBe('Fixes: Fix');
    expect(await h1At('/app/regression')).toBe('Fixes: Regression');
  });

  it.each(['/no-such-page', '/app/no-such-page'])('%s shows Page not found with a way back', async (path) => {
    renderAt(path);
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Page not found');
    const back = screen.getByRole('navigation', { name: 'Ways back' });
    expect(within(back).getByRole('link', { name: 'Home' }).getAttribute('href')).toBe(to('home'));
    expect(within(back).getByRole('link', { name: 'Possession Mode' }).getAttribute('href')).toBe(to('possession'));
  });

  it('the breadcrumb ends with the page H1', async () => {
    renderAt(to('possession'));
    await screen.findByRole('heading', { level: 1, name: 'Possession Mode' });
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getAllByRole('listitem');
    expect(crumbs.map((c) => c.textContent?.replace('/', '').trim())).toEqual(['App', 'Journeys', 'Possession Mode']);
  });
});
