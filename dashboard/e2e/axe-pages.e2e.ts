/**
 * axe in a real browser on every page (WCAG 2.2 AA tags), including colour contrast.
 * The jsdom axe tests cannot measure contrast (no layout), so this is where contrast is checked.
 * Every page in the route table, in normal and in Calm mode.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ROUTES = readFileSync(new URL('../src/routes.ts', import.meta.url), 'utf8');
const APP = /const APP = '([^']+)'/.exec(ROUTES)![1];
const BLOCK = ROUTES.slice(ROUTES.indexOf('export const PATHS = {'), ROUTES.indexOf('} as const;'));
const PAGES = [...new Set(
  [...BLOCK.matchAll(/:\s*[`']([^`']+)[`']|:\s*(APP)\s*,/g)].map((m) => (m[2] ? APP : m[1].replace('${APP}', APP))),
)];

for (const calm of [false, true]) {
  test(`axe finds no WCAG 2.2 AA violation on any page${calm ? ' (Calm mode)' : ''}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    if (calm) await page.addInitScript(() => localStorage.setItem('haunted-audit.calm', 'on'));
    const problems: string[] = [];
    expect(PAGES.length).toBeGreaterThanOrEqual(20);
    for (const path of PAGES) {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.waitForLoadState('networkidle');
      await page.addScriptTag({ content: AXE });
      const result = await page.evaluate(async () => {
        // @ts-expect-error axe is injected above
        const r = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        });
        return r.violations.map((v: { id: string; nodes: { target: string[] }[] }) =>
          `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
      });
      result.forEach((v: string) => problems.push(`${path} ${v}`));
    }
    expect(problems).toEqual([]);
  });
}
