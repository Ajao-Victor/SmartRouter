import { defineConfig, devices } from '@playwright/test';

/**
 * E2E on mocks. By default boots its own `next dev` on port 3100 with a separate build dir
 * (`.next-e2e`) so it never collides with a developer's `pnpm dev` on 3000.
 * Override with E2E_PORT / PLAYWRIGHT_BASE_URL.
 */
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${String(port)}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm dev -p ${String(port)}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_MOCK: '1', NEXT_PUBLIC_TEMPO_NETWORK: 'testnet', NEXT_DIST_DIR: '.next-e2e' },
  },
});
