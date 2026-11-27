import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 640, height: 900 },
  { width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  test(`focus trail replay layout stays clean at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/app/journeys/send-payment/possession');
    await expect(page.getByRole('heading', { level: 1, name: 'Possession Mode' })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(vp.width);
  });
}
