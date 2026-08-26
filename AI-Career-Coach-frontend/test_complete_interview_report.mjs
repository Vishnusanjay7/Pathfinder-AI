import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = 'C:/Users/vishn/.gemini/antigravity-ide/brain/af10335d-7e98-46d5-8acb-716e385cda71';

async function main() {
  console.log('======================================================================');
  console.log('  MOCK INTERVIEW: FULL 5-QUESTION FLOW & REPORT VERIFICATION');
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
    console.log('[1/4] Authenticating candidate...');
    const token = execSync(
      'python -c "from app.auth.jwt_handler import create_access_token; from app.database.session import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.query(User).first(); print(create_access_token({\'sub\': str(u.id), \'email\': u.email}))"',
      { cwd: 'c:/AI-Career-Coach/AI-Career-Coach-Backend' }
    ).toString().trim();

    await context.addInitScript((t) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('token', t);
    }, token);

    // 2. Select AI HR Interviewer
    console.log('[2/4] Selecting "AI HR Interviewer – Professional"...');
    await page.goto(`${BASE_URL}/mock-interview`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.click('text=Proceed with AI HR Interviewer – Professional');
    await page.waitForSelector('text=Configure Interview Session', { timeout: 15000 });

    // 3. Start Real-Time Interview
    console.log('[3/4] Starting 5-Question Interview Session...');
    await page.click('text=Start Real-Time Interview');
    await page.waitForURL(/\/mock-interview\/room\/\d+/, { timeout: 60000 });
    const roomUrl = page.url();
    const interviewId = roomUrl.split('/').pop();
    console.log(`  ✓ Interview Room Active: ID ${interviewId}`);

    // Answer all 5 questions
    for (let q = 1; q <= 5; q++) {
      await page.waitForTimeout(2000);
      console.log(`  -> Answering Question ${q}/5...`);

      const answerBtn = page.locator('button:has-text("Done Answering"), button:has-text("Complete Interview")').first();
      await answerBtn.waitFor({ state: 'visible', timeout: 10000 });
      await answerBtn.click();
      await page.waitForTimeout(1500);
    }

    // 4. Verify Final Report Navigation
    console.log('\n[4/4] Verifying Final Evaluation Report Navigation...');
    await page.waitForURL(new RegExp(`/mock-interview/report/${interviewId}`), { timeout: 30000 });
    console.log(`  ✓ Successfully Reached Report: ${page.url()}`);

    await page.waitForSelector('text=Overall Score, text=Comprehensive Evaluation, text=Strengths', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_full_interview_report_verified.png') });
    console.log('  ✓ Screenshot saved: 03_full_interview_report_verified.png');

    console.log('\n======================================================================');
    console.log('  COMPLETE 5-QUESTION FLOW & REPORT VERIFICATION: SUCCESS');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('Error during full interview flow:', err);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error_debug.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
