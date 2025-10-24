import * as dotenv from 'dotenv';
dotenv.config({ path: './tests/.env' });

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
	outputDir: './tests/test-results',
  timeout: 10_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    viewport: { width: 1720, height: 900 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});


// npx playwright codegen --viewport-size="1720,900" http://localhost:4200/             