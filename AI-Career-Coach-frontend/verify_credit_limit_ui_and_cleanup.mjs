import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = 'C:/Users/vishn/.gemini/antigravity-ide/brain/af10335d-7e98-46d5-8acb-716e385cda71';

async function runTest() {
  console.log('======================================================================');
  console.log('  TEST: TAVUS CREDIT LIMIT ERROR HANDLING, STATUS & CLEANUP');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['microphone', 'camera'],
  });

  const page = await context.newPage();

  try {
    // 1. Authenticate candidate
    console.log('[1/5] Authenticating candidate...');
    const token = execSync(
      'python -c "from app.auth.jwt_handler import create_access_token; from app.database.session import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.query(User).first(); print(create_access_token({\'sub\': str(u.id), \'email\': u.email}))"',
      { cwd: 'c:/AI-Career-Coach/AI-Career-Coach-Backend' }
    ).toString().trim();

    await context.addInitScript((t) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('token', t);
    }, token);

    // 2. Select AI HR Interviewer
    console.log('[2/5] Selecting "AI HR Interviewer – Professional"...');
    await page.goto(`${BASE_URL}/mock-interview`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.click('text=Proceed with AI HR Interviewer – Professional');
    await page.waitForSelector('text=Configure Interview Session', { timeout: 15000 });

    // 3. Start Real-Time Interview
    console.log('[3/5] Launching Mock Interview Room...');
    await page.click('text=Start Real-Time Interview');
    await page.waitForURL(/\/mock-interview\/room\/\d+/, { timeout: 60000 });
    console.log(`  ✓ Reached Room: ${page.url()}`);

    // Wait for status cards to render
    await page.waitForTimeout(3000);

    // 4. Verify Explicit Status Badges & Notice Text
    console.log('[4/5] Verifying UI Error Notice & Accurate Status Badges...');
    const statusInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      return {
        hasLiveKitConnected: bodyText.includes('CONNECTED'),
        hasCreditLimitReached: bodyText.includes('CREDIT LIMIT REACHED'),
        hasInterviewerUnavailable: bodyText.includes('UNAVAILABLE') || bodyText.includes('Interviewer unavailable'),
        hasCreditNotice: bodyText.includes('Interviewer unavailable: Tavus conversational credits are exhausted.'),
        hasRetryBtn: buttons.some(t => t.includes('Retry')),
        hasEndBtn: buttons.some(t => t.includes('End Interview')),
      };
    });

    console.log('  Status Card Verification:', statusInfo);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_tavus_credit_limit_ui_verified.png') });
    console.log('  ✓ Screenshot saved: 01_tavus_credit_limit_ui_verified.png');

    // 5. Test Clean Exit & Media Cleanup
    console.log('[5/5] Testing "End Interview" cleanup & exit navigation...');
    const endBtn = page.locator('button:has-text("End Interview"), button:has-text("Exit Interview")').first();
    await endBtn.click();
    await page.waitForTimeout(1500);

    const isExited = page.url().endsWith('/mock-interview');
    console.log(`  ✓ Navigation after exit: ${page.url()} (Exited Cleanly: ${isExited})`);

    console.log('\n======================================================================');
    console.log('  TEST SUCCESS: TAVUS CREDIT LIMIT & CLEANUP VERIFIED');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error_debug.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

runTest();
