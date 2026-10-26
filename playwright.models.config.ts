import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  testMatch: 'live-models.spec.ts',
  workers: 1,
  timeout: 180000,
  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3100',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results/models',
  reporter: [['list']],
  projects: [{ name: 'chromium' }],
});
