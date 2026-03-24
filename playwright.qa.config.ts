/**
 * QA-Regime v3 — Playwright config for visual regression + E2E flow tests.
 *
 * SEPARATE from the existing playwright.config.js (which is used by the main
 * test suite). This config is only used by the qa.yml GitHub Actions workflow
 * via: --config playwright.qa.config.ts
 *
 * Baselines are stored in tests/visual-baselines/ and committed to the repo.
 */

import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',

  // Baseline screenshots live here (committed to repo)
  snapshotDir: './tests/visual-baselines',

  // Platform-independent path so baselines work across CI runs on ubuntu-latest
  snapshotPathTemplate: 'tests/visual-baselines/{arg}-chromium-linux{ext}',

  timeout:  45_000,
  retries:  0,       // No retries — diffs should be deterministic
  workers:  1,       // Sequential: one page at a time

  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/qa-results.json' }],
  ],

  use: {
    screenshot: 'only-on-failure',
    trace:      'off',
    video:      'off',
  },

  projects: [
    {
      name: 'chromium',
      use:  { browserName: 'chromium' },
    },
  ],
})
