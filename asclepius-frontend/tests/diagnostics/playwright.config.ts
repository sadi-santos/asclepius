import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/diagnostics/e2e',
  testMatch: '**/*.e2e.spec.ts',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173'
  }
});
