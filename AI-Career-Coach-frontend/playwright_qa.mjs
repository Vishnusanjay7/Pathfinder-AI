import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:5173';
const scratchDir = 'C:\\Users\\vishn\\.gemini\\antigravity\\brain\\b4041985-85a7-4ce3-b44f-ea7b8871a6ac\\scratch';

const consoleErrors = [];
const networkFailures = [];
const screenshots = [];

console.log('=== STARTING PLAYWRIGHT REAL BROWSER QA SUITE ===');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
    { name: 'Laptop (1366x768)', width: 1366, height: 768 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile (375x812)', width: 375, height: 812 }
  ];

  const context = await browser.newContext({ viewport: viewports[0] });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });

  page.on('requestfailed', request => {
    networkFailures.push(`[Network Failure] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkFailures.push(`[HTTP Error ${response.status()}] ${response.request().method()} ${response.url()}`);
    }
  });

  try {
    // 1. Visit Home/Login
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    console.log('Opened home/login page');

    const ss1 = path.join(scratchDir, 'qa_step1_login.png');
    await page.screenshot({ path: ss1, fullPage: true });
    screenshots.push(ss1);

    // 2. Perform Login Flow
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');

    if (await emailInput.count() > 0) {
      await emailInput.first().fill('qa_genuine_test_2026@example.com');
      await passwordInput.first().fill('StrongPassword123!');
      await submitButton.first().click();
      await page.waitForTimeout(2000);
      console.log('Submitted login form');
    }

    const ss2 = path.join(scratchDir, 'qa_step2_dashboard.png');
    await page.screenshot({ path: ss2, fullPage: true });
    screenshots.push(ss2);

    // 3. Navigation through application routes
    const routes = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Resume', path: '/resume' },
      { name: 'ATS', path: '/ats' },
      { name: 'Jobs', path: '/jobs' },
      { name: 'Company Preparation', path: '/company-prep' },
      { name: 'Mock Interview', path: '/mock-interview' },
      { name: 'Assessments', path: '/assessment' },
      { name: 'Coding', path: '/coding' },
      { name: 'Learning', path: '/learning' },
      { name: 'Applications', path: '/applications' },
      { name: 'Profile', path: '/profile' }
    ];

    for (const route of routes) {
      try {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(1000);
        console.log(`Visited ${route.name} (${route.path})`);
      } catch (navErr) {
        console.log(`Failed navigating to ${route.name}: ${navErr.message}`);
      }
    }

    // 4. Test Viewport Layout Responsiveness
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      console.log(`Viewport ${vp.name}: Horizontal Overflow = ${hasHorizontalScrollbar ? 'YES' : 'NO'}`);
    }

  } catch (err) {
    console.error('Playwright exception:', err);
  } finally {
    await browser.close();

    const report = {
      consoleErrorsCount: consoleErrors.length,
      consoleErrorsSample: consoleErrors.slice(0, 10),
      networkErrorsCount: networkFailures.length,
      networkErrorsSample: networkFailures.slice(0, 10),
      screenshotsCaptured: screenshots
    };

    console.log('\n--- PLAYWRIGHT QA SUMMARY ---');
    console.log(JSON.stringify(report, null, 2));
  }
})();
