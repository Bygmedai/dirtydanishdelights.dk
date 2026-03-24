/**
 * QA-Regime v3 — Visual Regression Tests
 *
 * Driven by .qa-config.yml via environment variables set in
 * .github/actions/visual-regression/action.yml.
 *
 * Each page gets two screenshots: desktop (1280×720) and mobile (375×812).
 * Baselines live in tests/visual-baselines/ and are committed to the repo.
 *
 * DO NOT run this file with the default playwright.config.js — use:
 *   npx playwright test tests/visual-regression.spec.ts --config playwright.qa.config.ts
 */

import { test, expect } from '@playwright/test'

// ── Config from environment (set by action.yml) ───────────────────────────────

const BASE_URL  = process.env.QA_BASE_URL  ?? 'http://localhost:8080'
const THRESHOLD = parseFloat(process.env.QA_THRESHOLD ?? '0.01')
const PAGES: string[]  = JSON.parse(process.env.QA_PAGES  ?? '["/"]')
const DESKTOP = JSON.parse(process.env.QA_VIEWPORT        ?? '{"width":1280,"height":720}')
const MOBILE  = JSON.parse(process.env.QA_MOBILE_VIEWPORT ?? '{"width":375,"height":812}')

/** URL path → safe filename prefix (e.g. "/om/" → "om") */
function slug(p: string): string {
  return p.replace(/^\/|\/$/g, '').replace(/\//g, '--') || 'home'
}

const SCREENSHOT_OPTS = {
  maxDiffPixelRatio: THRESHOLD,
  animations:        'disabled' as const,
  // Mask dynamic timestamps/dates that change between runs
  mask:              [] as ReturnType<typeof expect>['not'][],
}

// ── Generate one test per page × viewport ────────────────────────────────────

for (const pagePath of PAGES) {
  const s = slug(pagePath)
  const url = BASE_URL + pagePath

  test.describe(`${pagePath}`, () => {
    test(`desktop — ${s}`, async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
      // Let fonts/animations settle
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot(`${s}-desktop.png`, SCREENSHOT_OPTS)
    })

    test(`mobile — ${s}`, async ({ page }) => {
      await page.setViewportSize(MOBILE)
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot(`${s}-mobile.png`, SCREENSHOT_OPTS)
    })
  })
}
