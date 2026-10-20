import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.pw\.ts$/,
  use: { baseURL: 'http://localhost:5199', channel: process.env.PW_CHANNEL },
  webServer: {
    command: 'npx vite --config e2e/vite.harness.config.ts',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
