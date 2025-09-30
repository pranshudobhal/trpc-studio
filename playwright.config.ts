import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Point to UI component test directory for Playwright specs (distinct from Vitest .test.tsx files)
  testDir: './packages/ui/src/components/__tests__',
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report' }], ['list']]
    : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'pnpm --filter next-basic dev',
          port: 3000,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
