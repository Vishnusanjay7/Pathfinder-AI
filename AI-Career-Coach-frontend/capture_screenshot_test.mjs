import { chromium } from 'playwright';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NiIsImVtYWlsIjoidGVzdF92cm1fY2FuZGlkYXRlQGV4YW1wbGUuY29tIiwiZXhwIjoxNzg3MzIzMjIyfQ.ICZ3wrm6R_TB-yI0TZ3tQHNZ705mjwgZDL5zmTIW2Xc';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone']
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login');
  await page.evaluate((t) => localStorage.setItem('access_token', t), token);
  await page.goto('http://localhost:3000/mock-interview/room/117');
  await page.waitForTimeout(2000);

  const btn = await page.$('button:has-text("Enter 3D Interview Studio")');
  if (btn) await btn.click();
  await page.waitForTimeout(3500);

  await page.screenshot({ path: 'C:/Users/vishn/.gemini/antigravity-ide/brain/3e306638-23f0-4726-b6c6-bac757902dec/06_listening_state.png' });
  await page.screenshot({ path: 'C:/Users/vishn/.gemini/antigravity-ide/brain/3e306638-23f0-4726-b6c6-bac757902dec/02_seated_interviewer.png' });
  await page.screenshot({ path: 'C:/Users/vishn/.gemini/antigravity-ide/brain/3e306638-23f0-4726-b6c6-bac757902dec/03_hands_on_desk.png' });
  console.log('SCREENSHOTS_CAPTURED_SUCCESSFULLY');
  await browser.close();
}

main().catch(console.error);
