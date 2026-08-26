import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/vishn/.gemini/antigravity-ide/brain/674b8a17-fd68-4283-b91a-dc366bb1c5b5';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const token = execSync(
    'python -c "from app.auth.jwt_handler import create_access_token; from app.database.session import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.query(User).filter(User.id == 38).first(); print(create_access_token({\'sub\': str(u.id), \'email\': u.email}))"',
    { cwd: '../AI-Career-Coach-Backend' }
  ).toString().trim();

  await context.addInitScript((t) => localStorage.setItem('access_token', t), token);
  const page = await context.newPage();

  await page.goto('http://localhost:3000/mock-interview/report/125');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mock_interview_report.png'), fullPage: true });
  console.log('Saved mock_interview_report.png');
  await browser.close();
}

run();
