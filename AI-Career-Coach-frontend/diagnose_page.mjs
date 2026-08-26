import { chromium } from 'playwright';
import { execSync } from 'child_process';

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });

  const token = execSync(
    'python -c "from app.auth.jwt_handler import create_access_token; from app.database.session import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.query(User).first(); print(create_access_token({\'sub\': str(u.id), \'email\': u.email}))"',
    { cwd: '../AI-Career-Coach-Backend' }
  ).toString().trim();

  await context.addInitScript((t) => {
    localStorage.setItem('access_token', t);
  }, token);

  const page = await context.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

  console.log('Navigating to http://localhost:3000/mock-interview ...');
  await page.goto('http://localhost:3000/mock-interview');
  await page.waitForTimeout(3000);

  console.log('Current URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body Text:\n', bodyText);

  await browser.close();
}

diagnose();
