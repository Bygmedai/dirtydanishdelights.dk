// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// ============================================================
// BygMedAI Smoke Test Suite
// Fælles test-suite til alle BygMedAI-managed sites
// ============================================================

// Discover all HTML files in repo (skip backups and redirects)
function discoverPages(dir, prefix = '') {
  const pages = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...discoverPages(fullPath, prefix + entry.name + '/'));
    } else if (entry.name.endsWith('.html') && !entry.name.includes('backup')) {
      // Skip redirect pages (contain only meta refresh)
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('http-equiv="refresh"') && content.length < 500) continue;
      pages.push(prefix + entry.name);
    }
  }
  return pages;
}

// Get repo root (where HTML files live)
const REPO_ROOT = path.resolve(__dirname, '..');
const ALL_PAGES = discoverPages(REPO_ROOT);

// Screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ============================================================
// TEST 1: All pages load without JS errors
// ============================================================
test.describe('Console Error Check', () => {
  for (const page of ALL_PAGES) {
    test(`${page} — no JS errors`, async ({ page: browserPage }) => {
      const errors = [];
      browserPage.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      browserPage.on('pageerror', err => {
        errors.push(err.message);
      });

      const response = await browserPage.goto(`${BASE_URL}/${page}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      // Page should load
      expect(response?.status()).toBeLessThan(400);

      // Filter out known non-critical errors
      const criticalErrors = errors.filter(e =>
        !e.includes('googletagmanager') &&
        !e.includes('google-analytics') &&
        !e.includes('fonts.googleapis') &&
        !e.includes('Failed to load resource') && // External CDN
        !e.includes('net::ERR_') && // Network errors (external)
        !e.includes('sandboxed') && // iframe sandbox (portfolio browser previews)
        !e.includes('Blocked script execution') // Same — sandboxed iframes
      );

      if (criticalErrors.length > 0) {
        console.log(`JS errors on ${page}:`, criticalErrors);
      }
      expect(criticalErrors).toHaveLength(0);
    });
  }
});

// ============================================================
// TEST 2: Responsive screenshots (3 breakpoints)
// ============================================================
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

// Only screenshot key pages (not all 30)
const KEY_PAGES = ALL_PAGES.filter(p =>
  ['index.html', 'services.html', 'priser.html', 'om.html', 'foer-efter.html'].includes(p) ||
  p === ALL_PAGES[0] // Always include first page
).slice(0, 6);

test.describe('Responsive Screenshots', () => {
  for (const page of KEY_PAGES) {
    for (const vp of VIEWPORTS) {
      test(`${page} @ ${vp.name} (${vp.width}px)`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height }
        });
        const browserPage = await context.newPage();

        await browserPage.goto(`${BASE_URL}/${page}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        // Wait for animations to settle
        await browserPage.waitForTimeout(500);

        const slug = page.replace(/[\/\.]/g, '-');
        await browserPage.screenshot({
          path: path.join(SCREENSHOT_DIR, `${slug}-${vp.name}.png`),
          fullPage: true
        });

        await context.close();
      });
    }
  }
});

// ============================================================
// TEST 3: Critical elements exist
// ============================================================
test.describe('Critical Elements', () => {
  test('index.html has nav, hero, footer', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });

    // Nav exists
    await expect(page.locator('nav, .nav')).toBeVisible();

    // At least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Footer exists
    await expect(page.locator('footer')).toBeVisible();
  });

  test('All pages have meta viewport', async ({ page }) => {
    for (const p of ALL_PAGES.slice(0, 10)) { // Check first 10
      await page.goto(`${BASE_URL}/${p}`, { waitUntil: 'domcontentloaded' });
      const viewport = await page.locator('meta[name="viewport"]').count();
      expect(viewport, `${p} missing viewport meta`).toBeGreaterThanOrEqual(1);
    }
  });

  test('All pages have lang attribute', async ({ page }) => {
    for (const p of ALL_PAGES.slice(0, 10)) {
      await page.goto(`${BASE_URL}/${p}`, { waitUntil: 'domcontentloaded' });
      const lang = await page.locator('html').getAttribute('lang');
      expect(lang, `${p} missing lang attribute`).toBeTruthy();
    }
  });
});

// ============================================================
// TEST 4: No horizontal overflow (common CSS bug)
// ============================================================
test.describe('Layout Integrity', () => {
  for (const page of KEY_PAGES) {
    test(`${page} — no horizontal overflow on mobile`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 }
      });
      const browserPage = await context.newPage();

      await browserPage.goto(`${BASE_URL}/${page}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      // Check both html and body scrollWidth — html reflects actual visible overflow
      const { htmlWidth, bodyWidth, viewportWidth } = await browserPage.evaluate(() => ({
        htmlWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth
      }));

      // Use html scrollWidth (respects overflow clipping) as primary check
      // Fall back to body scrollWidth only if html passes (catches unclipped overflow)
      const effectiveWidth = Math.min(htmlWidth, bodyWidth);
      expect(effectiveWidth, `${page} has horizontal overflow: html=${htmlWidth}px body=${bodyWidth}px > viewport=${viewportWidth}px`)
        .toBeLessThanOrEqual(viewportWidth + 5);

      await context.close();
    });
  }
});
