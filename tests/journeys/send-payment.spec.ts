import { expect, test } from "@playwright/test";

// Send Payment journey, keyboard only. It catches the planted barrier (a div used as a button) when it comes back.
// The control is found by its accessible name. Checker config (target and success selectors) is never read here.
const url = process.env.JOURNEY_URL;
const MAX_TABS = 30;

test("Send Payment can be reached with Tab and pressed with Enter", async ({ page }) => {
  expect(url, "Set JOURNEY_URL to the bank page to test").toBeTruthy();
  await page.goto(url as string);

  // Fill the form. Amount has no label on the haunted page, so it is filled by id; this test is about Send Payment.
  await page.locator("#recipient").fill("Test Recipient");
  await page.locator("#amount").fill("10.00");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  let reached = false;
  for (let i = 0; i < MAX_TABS && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const name = (el.getAttribute("aria-label") || el.textContent || "").trim();
      return name === "Send Payment";
    });
  }
  expect(reached, `Send Payment is not keyboard focusable: ${MAX_TABS} presses of Tab never reached it`).toBe(true);

  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status"),
    "Send Payment has keyboard focus but Enter did not confirm the payment",
  ).toBeVisible({ timeout: 5_000 });
});
