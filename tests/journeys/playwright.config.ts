import { defineConfig } from "@playwright/test";

// Journey tests open a local copy of the Haunted Bank given in JOURNEY_URL. No web server, no outside site.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "../../artifacts/journeys/test-results",
  retries: 0,
  workers: 1,
  timeout: 30_000,
  reporter: "line",
  use: {
    browserName: "chromium",
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
});
