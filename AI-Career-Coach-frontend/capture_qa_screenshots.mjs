import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/vishn/.gemini/antigravity-ide/brain/674b8a17-fd68-4283-b91a-dc366bb1c5b5';

async function captureScreenshots() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone']
  });

  const token = execSync(
    'python -c "from app.auth.jwt_handler import create_access_token; from app.database.session import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.query(User).first(); print(create_access_token({\'sub\': str(u.id), \'email\': u.email}))"',
    { cwd: '../AI-Career-Coach-Backend' }
  ).toString().trim();

  await context.addInitScript((t) => {
    localStorage.setItem('access_token', t);
  }, token);

  const page = await context.newPage();

  // 1. Capture Interviewer Selection Studio
  await page.goto('http://localhost:3000/mock-interview');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mock_interview_selection.png'), fullPage: true });
  console.log('Saved mock_interview_selection.png');

  // 2. Start Interview Room and Capture Corporate Room
  await page.click('text=Proceed with Priya Sharma');
  await page.waitForTimeout(500);
  await page.click('text=Start Real-Time Interview');
  await page.waitForURL(/\/mock-interview\/room\/\d+/, { timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mock_interview_room.png'), fullPage: true });
  console.log('Saved mock_interview_room.png');

  // 3. Capture Evaluation Report
  await page.goto('http://localhost:3000/mock-interview/report/117');
  await page.waitForSelector('text=Overall Interview Score', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mock_interview_report.png'), fullPage: true });
  console.log('Saved mock_interview_report.png');

  await browser.close();
}

captureScreenshots();
