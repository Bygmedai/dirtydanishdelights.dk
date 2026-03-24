/**
 * QA-Regime v3 — E2E Flow Tests
 *
 * Driven by .qa-config.yml via QA_FLOWS environment variable.
 * Each flow is a named sequence of steps (goto, click, assert, assert_url_contains).
 *
 * If no flows are defined, a single no-op test runs and passes.
 *
 * DO NOT run this file with the default playwright.config.js — use:
 *   npx playwright test tests/flow-tests.spec.ts --config playwright.qa.config.ts
 */

import { test, expect } from '@playwright/test'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlowStep {
  goto?:                string   // navigate to BASE_URL + path
  click?:               string   // CSS selector to click
  assert?:              string   // CSS selector that must be visible
  assert_url_contains?: string   // substring the current URL must contain
}

interface Flow {
  name:  string
  type:  string
  steps: FlowStep[]
}

// ── Config from environment ───────────────────────────────────────────────────

const BASE_URL = process.env.QA_BASE_URL ?? 'http://localhost:8080'
const FLOWS: Flow[] = JSON.parse(process.env.QA_FLOWS ?? '[]')

// ── Tests ─────────────────────────────────────────────────────────────────────

if (FLOWS.length === 0) {
  test('no flows configured — ok', async () => {
    // Site has no interactive flows to test. This is expected for simple sites.
  })
} else {
  for (const flow of FLOWS) {
    test(`[${flow.type}] ${flow.name}`, async ({ page }) => {
      for (const step of flow.steps) {

        if (step.goto !== undefined) {
          await page.goto(BASE_URL + step.goto, {
            waitUntil: 'networkidle',
            timeout:   30_000,
          })
        }

        if (step.click !== undefined) {
          await page.locator(step.click).first().click({ timeout: 10_000 })
        }

        if (step.assert !== undefined) {
          await expect(page.locator(step.assert).first()).toBeVisible({ timeout: 10_000 })
        }

        if (step.assert_url_contains !== undefined) {
          await expect(page).toHaveURL(new RegExp(step.assert_url_contains), { timeout: 10_000 })
        }
      }
    })
  }
}
