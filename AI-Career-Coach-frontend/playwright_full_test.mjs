import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const scratchDir = 'C:\\Users\\vishn\\.gemini\\antigravity\\brain\\67acc2fe-20bc-4d9e-abfd-5dc832a9fb35\\scratch';

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

const consoleErrors = [];
const networkFailures = [];
const screenshots = [];

console.log('=== STARTING PLAYWRIGHT END-TO-END BROWSER TEST SUITE ===');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
    { name: 'Laptop (1366x768)', width: 1366, height: 768 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile (375x812)', width: 375, height: 812 }
  ];

  const context = await browser.newContext({
    viewport: viewports[0],
    permissions: ['camera', 'microphone']
  });

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
      networkFailures.push(`[HTTP ${response.status()}] ${response.request().method()} ${response.url()}`);
    }
  });

  const results = {
    auth_ui: {},
    navigation: {},
    responsive: {},
    security_keys: {},
    console_errors_count: 0,
    network_errors_count: 0
  };

  try {
    // 1. Visit Login Page
    console.log('1. Navigating to Login Page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    
    const ssLogin = path.join(scratchDir, 'playwright_1_login.png');
    await page.screenshot({ path: ssLogin, fullPage: true });
    screenshots.push(ssLogin);

    // Audit Security: Check if API keys are exposed in localStorage, sessionStorage, DOM
    const storageData = await page.evaluate(() => {
      return {
        local: JSON.stringify(window.localStorage),
        session: JSON.stringify(window.sessionStorage),
        html: document.documentElement.innerHTML.substring(0, 10000)
      };
    });

    const keyRegex = /(OPENROUTER_API_KEY|DID_API_KEY|gsk_[a-zA-Z0-9]+|sk-or-v1-[a-zA-Z0-9]+)/i;
    const exposedInStorage = keyRegex.test(storageData.local) || keyRegex.test(storageData.session) || keyRegex.test(storageData.html);
    results.security_keys.exposed_in_frontend = exposedInStorage;
    console.log(`Security Audit - Secret API Keys Exposed in FE: ${exposedInStorage ? 'FAIL (Exposed!)' : 'PASS (Secure)'}`);

    // 2. Perform Login Flow in UI
    console.log('2. Testing Registration & Login Flow in UI...');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    if (await emailInput.count() > 0) {
      await emailInput.first().fill('qa_genuine_user_1787236315@example.com');
      await passwordInput.first().fill('QATestPassword123!');
      await submitBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('Clicked Login button.');
    }

    const ssPostLogin = path.join(scratchDir, 'playwright_2_post_login.png');
    await page.screenshot({ path: ssPostLogin, fullPage: true });
    screenshots.push(ssPostLogin);

    // 3. Test Navigation Routes
    const routesToTest = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Resume Upload', path: '/resume' },
      { name: 'Resume History', path: '/resume/history' },
      { name: 'Assessments', path: '/assessment' },
      { name: 'Coding', path: '/coding' },
      { name: 'Jobs', path: '/jobs' },
      { name: 'Applications', path: '/applications' },
      { name: 'Learning Center', path: '/learning' },
      { name: 'Mock Interview', path: '/mock-interview' },
      { name: 'Profile', path: '/profile' },
      { name: 'Settings', path: '/settings' },
      { name: 'Notifications', path: '/notifications' }
    ];

    for (const route of routesToTest) {
      try {
        const startNav = Date.now();
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(1000);
        const navTime = Date.now() - startNav;
        console.log(`Visited ${route.name} (${route.path}) in ${navTime}ms`);
        results.navigation[route.name] = 'PASS';
      } catch (err) {
        console.log(`Failed navigating to ${route.name}: ${err.message}`);
        results.navigation[route.name] = 'FAIL';
      }
    }

    // 4. Test Viewport Layout Responsiveness
    console.log('4. Testing Responsive Viewports...');
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      results.responsive[vp.name] = { overflow: hasHorizontalScrollbar };
      console.log(`Viewport ${vp.name}: Horizontal Overflow = ${hasHorizontalScrollbar ? 'YES (FAIL)' : 'NO (PASS)'}`);
    }

    const ssMobile = path.join(scratchDir, 'playwright_3_mobile_dashboard.png');
    await page.screenshot({ path: ssMobile, fullPage: true });
    screenshots.push(ssMobile);

  } catch (err) {
    console.error('Playwright execution error:', err);
  } finally {
    await browser.close();

    results.console_errors_count = consoleErrors.length;
    results.network_errors_count = networkFailures.length;

    console.log('\n--- PLAYWRIGHT QA SUMMARY ---');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Failures: ${networkFailures.length}`);
    console.log(`Screenshots Captured: ${screenshots.length}`);

    const summaryReport = {
      results,
      consoleErrorsSample: consoleErrors.slice(0, 10),
      networkFailuresSample: networkFailures.slice(0, 10),
      screenshots
    };

    fs.writeFileSync(path.join(scratchDir, 'playwright_qa_results.json'), JSON.stringify(summaryReport, null, 2));
    console.log(`Saved results to ${path.join(scratchDir, 'playwright_qa_results.json')}`);
  }
})();
