import { chromium } from 'playwright';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://127.0.0.1:8000';

async function testAuth() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const testEmail = `qa_auth_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // Register candidate
  await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'QA Candidate',
      email: testEmail,
      password: testPassword,
      phone: '9876543210',
      college: 'Stanford',
      degree: 'B.S.',
      branch: 'CS',
      graduation_year: 2025
    })
  });

  const pySetRegOtp = `python -c "from app.database.session import SessionLocal; from app.models.otp_code import OTPCode; from app.services.otp_service import otp_service; db=SessionLocal(); rec=db.query(OTPCode).filter(OTPCode.identifier=='${testEmail}').order_by(OTPCode.created_at.desc()).first(); rec.code_hash = otp_service._hash('654321'); db.commit(); db.close()"`;
  execSync(pySetRegOtp, { cwd: '../AI-Career-Coach-Backend' });

  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((email) => {
    sessionStorage.setItem('pending_registration_email', email);
    sessionStorage.setItem('pending_registration_channel', 'email');
  }, testEmail);

  await page.goto(`${BASE_URL}/register/verify`);
  await page.waitForSelector('input[placeholder="123456"]');
  await page.fill('input[placeholder="123456"]', '654321');
  await page.click('button:has-text("Verify & Create Account")');
  await page.waitForURL(/\/dashboard/);
  console.log('✓ Registered and reached /dashboard');

  // Logout
  await page.evaluate(() => localStorage.removeItem('access_token'));
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[placeholder="you@example.com"]');

  // Step 1
  await page.locator('input[placeholder="you@example.com"]').fill(testEmail);
  await page.locator('input[placeholder="••••••••••••"]').fill(testPassword);
  await page.click('button:has-text("Verify Password & Continue")');

  // Wait for Step 2 screen
  await page.waitForSelector('text=Verify Your Identity', { timeout: 25000 });
  console.log('✓ Step 2 screen visible');

  // Set Step 2 OTP
  const pySetLoginOtp = `python -c "from app.database.session import SessionLocal; from app.models.otp_code import OTPCode; from app.services.otp_service import otp_service; db=SessionLocal(); rec=db.query(OTPCode).filter(OTPCode.identifier=='${testEmail}').order_by(OTPCode.created_at.desc()).first(); rec.code_hash = otp_service._hash('777888'); db.commit(); db.close()"`;
  execSync(pySetLoginOtp, { cwd: '../AI-Career-Coach-Backend' });

  const digitInputs = page.locator('input[inputmode="numeric"]');
  const count = await digitInputs.count();
  console.log(`Found ${count} digit inputs`);

  for (let i = 0; i < 6; i++) {
    await digitInputs.nth(i).fill('777888'[i]);
  }

  await page.click('button:has-text("Verify Code & Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  console.log('✓ 2-Step Login successful!');

  await browser.close();
}

testAuth().catch(console.error);
