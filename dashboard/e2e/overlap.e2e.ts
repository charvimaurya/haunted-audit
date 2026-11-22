/**
 * Ghosts never cover content (site-shell-repair REQ-SH-08).
 *
 * The ambient ghosts have `pointer-events: none`, so `elementFromPoint` normally skips them and a plain
 * check could never fail. Each test therefore turns pointer events ON for the ghost layer first. Then
 * `elementFromPoint` returns whatever is painted on top. While the ghosts move, the centre and four
 * corners of the H1 and of the page's primary button must still hit that element.
 */
import { expect, test, type Page } from '@playwright/test';

const SIZES = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
];

const PAGES = [
  { path: '/', primary: () => ({ role: 'link' as const, name: /possess this app/i }), ghosts: true },
  { path: '/app/journeys/send-payment/possession', primary: () => ({ role: 'button' as const, name: 'Run Journey' }), ghosts: false },
];

async function makeGhostsHittable(page: Page) {
  await page.addStyleTag({
    content: '.ambient-layer, .ambient-layer * { pointer-events: auto !important; }',
  });
}

/** For each target: is any of its five points painted over by something else? */
async function coveredPoints(page: Page, selectors: string[]) {
  return page.evaluate((sels) => {
    const out: string[] = [];
    for (const sel of sels) {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) {
        out.push(`${sel}: missing`);
        continue;
      }
      const b = el.getBoundingClientRect();
      // Corner points sit just inside the painted shape: a rounded corner of radius r curves in by
      // r(1 - 1/sqrt 2) = 0.293r on each axis, so the point is moved in by that plus 2px.
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, b.height / 2, b.width / 2);
      const d = 0.293 * r + 2;
      const pts: [string, number, number][] = [
        ['centre', b.left + b.width / 2, b.top + b.height / 2],
        ['top-left', b.left + d, b.top + d],
        ['top-right', b.right - d, b.top + d],
        ['bottom-left', b.left + d, b.bottom - d],
        ['bottom-right', b.right - d, b.bottom - d],
      ];
      for (const [name, x, y] of pts) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !(el === hit || el.contains(hit))) {
          out.push(`${sel} ${name} covered by <${hit?.tagName.toLowerCase()} class="${hit?.getAttribute('class') ?? ''}">`);
        }
      }
    }
    return out;
  }, selectors);
}

for (const size of SIZES) {
  for (const p of PAGES) {
    test(`${p.path} at ${size.width}px: H1 and primary button are never covered`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(p.path);
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
      const primary = page.getByRole(p.primary().role, { name: p.primary().name });
      await expect(primary).toBeVisible();
      await primary.evaluate((e) => e.setAttribute('data-e2e-primary', ''));
      await h1.evaluate((e) => e.setAttribute('data-e2e-h1', ''));

      if (p.ghosts) {
        const layer = page.getByTestId('ambient-layer');
        await expect(layer).toHaveAttribute('aria-hidden', 'true');
        await expect(layer).toHaveAttribute('data-ambient', 'on'); // the ghosts are active
        await expect(layer).toHaveCSS('pointer-events', 'none');
        await expect(page.locator('.ambient-roam').first()).toBeVisible();
      }
      await makeGhostsHittable(page);

      const problems = new Set<string>();
      let overlaps = 0;
      for (let i = 0; i < 24; i += 1) { // 24 samples over about 6 seconds of movement
        (await coveredPoints(page, ['[data-e2e-h1]', '[data-e2e-primary]'])).forEach((x) => problems.add(x));
        overlaps += await page.evaluate(() => {
          const targets = ['[data-e2e-h1]', '[data-e2e-primary]'].map((s) => document.querySelector(s)!.getBoundingClientRect());
          return [...document.querySelectorAll('.ambient-roam')].some((g) => {
            const r = g.getBoundingClientRect();
            return targets.some((t) => r.right > t.left && r.left < t.right && r.bottom > t.top && r.top < t.bottom);
          }) ? 1 : 0;
        });
        await page.waitForTimeout(250);
      }
      expect([...problems]).toEqual([]);
      expect(overlaps, 'a ghost box crossed the H1 or the primary button').toBe(0);
    });
  }
}

test('control: the check does see a ghost that is put in front of the H1', async ({ page }) => {
  await page.setViewportSize(SIZES[0]);
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();
  await h1.evaluate((e) => e.setAttribute('data-e2e-h1', ''));
  await makeGhostsHittable(page);
  await page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>('.ambient-layer')!;
    const h = document.querySelector('[data-e2e-h1]')!.getBoundingClientRect();
    const ghost = document.createElement('span');
    ghost.textContent = 'G';
    Object.assign(ghost.style, {
      position: 'fixed', left: `${h.left + h.width / 2 - 20}px`, top: `${h.top + h.height / 2 - 20}px`,
      width: '40px', height: '40px', display: 'block',
    });
    layer.style.zIndex = '10';
    layer.appendChild(ghost);
  });
  const problems = await coveredPoints(page, ['[data-e2e-h1]']);
  expect(problems.some((x) => x.includes('centre covered'))).toBe(true);
});
