import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/**
 * Browser tests that need the real API (user-typed-test-details REQ-TD-10). Run: npm run test:e2e:api
 * Starts uvicorn on 8099 with a fresh database and vite on 5198 pointed at it.
 * PYTHON picks the interpreter (CI sets it to `python`); locally it is the repo's .venv.
 */
const API_PORT = 8099;
const WEB_PORT = 5198;
const DB = join(mkdtempSync(join(tmpdir(), 'ha-e2e-')), 'runs.db');
const PYTHON = process.env.PYTHON ?? '.venv/bin/python';
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.api-e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `${PYTHON} -m uvicorn agent.api.main:app --host 127.0.0.1 --port ${API_PORT}`,
      cwd: '..',
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: {
        HAUNTED_AUDIT_DB: DB,
        CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${WEB_PORT}`,
        RATE_PER_MINUTE: '30',
        RATE_PER_HOUR: '120',
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: `http://127.0.0.1:${WEB_PORT}/`,
      env: { VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
