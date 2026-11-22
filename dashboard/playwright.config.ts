import { defineConfig, devices } from '@playwright/test';

/** Browser tests (site-shell-repair REQ-SH-08). Run: npm run test:e2e */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    reducedMotion: 'no-preference',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
