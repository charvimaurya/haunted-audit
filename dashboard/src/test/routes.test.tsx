/// <reference types="vitest/globals" />
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../AppRoutes';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { NAV, PAGES, titleFor } from '../routes';

expect.extend(toHaveNoViolations);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ImmersionProvider>
        <AppRoutes />
      </ImmersionProvider>
    </MemoryRouter>,
  );
}

describe('route manifest', () => {
  it('has unique paths and unique titles', () => {
    expect(new Set(PAGES.map((p) => p.path)).size).toBe(PAGES.length);
    // Journey + app Agents share the product title "Agents · Haunted Audit".
    expect(new Set(PAGES.map((p) => titleFor(p.path))).size).toBeGreaterThanOrEqual(
      PAGES.length - 1,
    );
  });

  it('every nav item points at a real page', () => {
    for (const item of NAV) expect(PAGES.some((p) => p.path === item.to)).toBe(true);
  });
});

describe('every page', () => {
  for (const page of PAGES) {
    it(`${page.path}: one H1, one current nav item, title set, no axe violations`, async () => {
      const { container } = renderAt(page.path);
      const h1s = await screen.findAllByRole('heading', { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toBe(page.h1);
      await waitFor(() => expect(document.title).toBe(titleFor(page.path)));

      // Marketing pages use the top nav (or the footer nav for footer pages); app pages use the sidebar + top nav.
      const navName = page.shell === 'app' ? 'App' : 'Primary navigation';
      const navs = screen.getAllByRole('navigation', { name: navName });
      expect(navs.length).toBeGreaterThanOrEqual(1);
      if (page.shell === 'app') {
        expect(within(navs[0]).getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
      }
      const current = Array.from(container.querySelectorAll('nav [aria-current="page"]'));
      expect(current.length).toBeGreaterThanOrEqual(1);
      // Skip link is the first focusable element
      expect(container.querySelector('a')?.textContent).toBe('Skip to main content');
      expect(await axe(container)).toHaveNoViolations();
    });
  }
});

describe('navigation', () => {
  it('Possess This App goes to Possession Mode in the App workspace and starts no run', async () => {
    renderAt('/');
    const link = await screen.findByRole('link', { name: /possess this app/i });
    expect(link.getAttribute('href')).toBe('/app/journeys/send-payment/possession');
    await userEvent.click(link);
    expect(await screen.findByRole('heading', { level: 1, name: 'Possession Mode' })).toBeTruthy();
    expect(screen.queryByText(/running/i)).toBeNull();
  });

  it('moves focus to the new H1 and announces the page', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1, name: 'Haunted Audit' });
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    await userEvent.click(within(nav).getByRole('link', { name: 'App' }));
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    await waitFor(() => expect(document.activeElement).toBe(h1));
    await waitFor(() =>
      expect(document.getElementById('live-region')?.textContent).toBe('Navigated to Dashboard'),
    );
  });

  it('unknown steps redirect to Find, unknown paths show the not-found page', async () => {
    const a = renderAt('/app/fixes/nope');
    expect(await screen.findByRole('heading', { level: 1, name: 'Fixes: Find' })).toBeTruthy();
    a.unmount();
    renderAt('/does-not-exist');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
  }, 15_000);

  it('the fix pipeline shows one step at a time with Back and Next', async () => {
    renderAt('/app/fixes/fix');
    await screen.findByRole('heading', { level: 1, name: 'Fixes: Fix' });
    expect(screen.getByRole('link', { name: /back: find/i })).toBeTruthy();
    await userEvent.click(screen.getByRole('link', { name: /next: verify/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Fixes: Verify' })).toBeTruthy();
  });
});
