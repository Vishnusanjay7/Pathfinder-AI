import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NiIsImVtYWlsIjoidGVzdF92cm1fY2FuZGlkYXRlQGV4YW1wbGUuY29tIiwiZXhwIjoxNzg3MzIzMjIyfQ.ICZ3wrm6R_TB-yI0TZ3tQHNZ705mjwgZDL5zmTIW2Xc';

const routes = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/resume', name: 'Resume Builder' },
  { path: '/jobs', name: 'Job Search' },
  { path: '/assessment', name: 'Assessments' },
  { path: '/coding', name: 'Coding Sandbox' },
  { path: '/learning', name: 'Learning Center' },
  { path: '/applications', name: 'Applications Tracker' },
  { path: '/profile', name: 'Profile' },
  { path: '/settings', name: 'Settings' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/auth/login', name: 'Auth Login', public: true },
  { path: '/auth/register', name: 'Auth Register', public: true }
];

async function runRegression() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║               FULL REGRESSION SUITE (12 MODULES)                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((t) => localStorage.setItem('access_token', t), token);

  const results = [];

  for (const r of routes) {
    const t0 = performance.now();
    try {
      const resp = await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const duration = Math.round(performance.now() - t0);
      const ok = resp && resp.status() < 400;
      results.push({ name: r.name, path: r.path, status: ok ? 'PASS' : 'FAIL', duration });
      console.log(`   - ${r.name.padEnd(22)} | ${r.path.padEnd(16)} | Status: ${ok ? 'PASS' : 'FAIL'} (${duration}ms)`);
    } catch (e) {
      results.push({ name: r.name, path: r.path, status: 'FAIL', error: e.message });
      console.log(`   - ${r.name.padEnd(22)} | ${r.path.padEnd(16)} | Status: FAIL (${e.message})`);
    }
  }

  await browser.close();
  console.log('\n=== REGRESSION RESULT ===');
  const allPass = results.every(r => r.status === 'PASS');
  console.log(`All 12 modules status: ${allPass ? 'ALL PASS' : 'SOME FAILED'}`);
}

runRegression().catch(console.error);
