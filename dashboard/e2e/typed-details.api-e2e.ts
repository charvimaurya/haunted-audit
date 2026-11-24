/**
 * user-typed-test-details REQ-TD-10, with the real API and the real scripted walker.
 * Keyboard only: every move is Tab, Shift+Tab, typing or Enter.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const API = 'http://127.0.0.1:8099';
// Built from parts so this test file does not itself contain the name the scans look for.
const NAME = ['Alex', 'Carter'].join(' ');
const POSSESSION = '/app/journeys/send-payment/possession';

async function tabTo(page: Page, name: string, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
    if (label === name) return;
  }
  throw new Error(`Tab never reached "${name}"`);
}

async function axeOnForm(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    // @ts-expect-error axe is injected above
    const r = await window.axe.run({ include: [['fieldset']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    return r.violations.map((v: { id: string }) => v.id);
  });
}

for (const path of [POSSESSION, '/try']) {
  test(`${path}: on first load no field holds a value and no test name is on screen`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const values = await page.locator('input:not([type=radio]):not([type=checkbox]), textarea').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(values.length).toBeGreaterThanOrEqual(6); // three setup fields + three bank drawing fields
    expect(values.every((v) => v === '')).toBe(true);
    expect(await page.locator('body').innerText()).not.toContain(NAME);
    expect(await axeOnForm(page)).toEqual([]);
  });
}

test('keyboard only: empty Recipient is refused, then the typed details are what the agent types and the checklist shows', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.goto(POSSESSION);
  await page.getByRole('heading', { level: 1 }).waitFor();

  // Run Journey with Recipient empty: inline error, focus moves to the field, no run starts.
  let posted = false;
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/runs')) posted = true; });
  await tabTo(page, 'Run Journey');
  await page.keyboard.press('Enter');
  const recipient = page.getByLabel('Recipient', { exact: true }).first();
  await expect(recipient).toBeFocused();
  await expect(recipient).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Type a made-up name to continue')).toBeVisible();
  expect(posted).toBe(false);
  expect(await axeOnForm(page)).toEqual([]);

  // Type made-up details from the keyboard, Tab to Run Journey, press Enter.
  await page.keyboard.type('Test Ghost Q');
  await page.keyboard.press('Tab');
  await page.keyboard.type('10.00');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Ref 7');
  const runPosted = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/runs'));
  await tabTo(page, 'Run Journey');
  await page.keyboard.press('Enter');
  const created = await (await runPosted).json();
  expect(created.status).toBe('running');
  await expect(page.getByText('Run status: Complete')).toBeVisible({ timeout: 90_000 });

  // The record: the agent typed exactly these, and test_details holds them.
  const record = await (await request.get(`${API}/runs/${created.run_id}`)).json();
  expect(record.test_details).toEqual({ recipient: 'Test Ghost Q', amount: '10.00', reference: 'Ref 7' });
  const typed = record.result.step_events.filter((e: { tool: string }) => e.tool === 'type_text').map((e: { args: { text: string } }) => e.args.text);
  expect(typed).toEqual(['Test Ghost Q', '10.00', 'Ref 7']);
  expect(record.verdict).toBe('BLOCKED');
  expect(record.reason_code).toBe('TARGET_NOT_FOCUSABLE');

  // The checklist replays them; the bank drawing stays empty for a judge.
  const checklist = page.getByRole('list', { name: 'Tab step results' });
  await expect(checklist).toContainText('Typed: Test Ghost Q');
  await expect(checklist).toContainText('Typed: 10.00');
  await expect(checklist).toContainText('Typed: Ref 7');
  for (const id of ['#pm-recipient', '#pm-amount', '#pm-reference']) await expect(page.locator(id)).toHaveValue('');
  expect(await page.locator('body').innerText()).not.toContain(NAME);
});
