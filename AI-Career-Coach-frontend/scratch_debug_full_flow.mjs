import { chromium } from 'playwright';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://127.0.0.1:8000';

async function testFullFlow() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));

  const testEmail = `qa_cand_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // 1. Register candidate
  console.log('1. Registering candidate...');
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
  await page.waitForSelector('text=Dashboard, text=Career Command Center', { timeout: 25000 });
  console.log('✓ Registered and authenticated on /dashboard');

  // Seed active resume
  const pythonSeedResume = `python -c "from app.database.session import SessionLocal; from app.models.user import User; from app.models.resume import Resume; db=SessionLocal(); u=db.query(User).filter(User.email=='${testEmail}').first(); r=Resume(user_id=u.id, original_filename='QA_Candidate_Resume.pdf', stored_filename='QA_Candidate_Resume_stored.pdf', raw_text='Senior Backend Engineer with 5 years experience in Python, FastAPI, React, PostgreSQL, Docker, AWS, Distributed Systems.', extracted_skills=['Python', 'FastAPI', 'React', 'PostgreSQL', 'Docker', 'AWS', 'System Design'], ats_score=88, ats_breakdown={'keyword_match': 90, 'formatting': 85}, experience_data=[{'role': 'Senior Backend Engineer', 'company': 'Tech Corp', 'duration': '3 yrs'}], projects_data=[{'title': 'Cloud Microservices', 'skills': ['Python', 'Docker']}], is_active=True); db.add(r); db.commit(); print('RESUME_SEEDED_FOR_USER:', u.id); db.close()"`;
  const seedOut = execSync(pythonSeedResume, { cwd: '../AI-Career-Coach-Backend' }).toString();
  console.log('Seed Output:', seedOut.trim());

  // 2. Open /jobs
  console.log('2. Navigating to /jobs...');
  await page.goto(`${BASE_URL}/jobs`);
  await page.waitForSelector('text=Job Description Matcher', { timeout: 25000 });
  console.log('✓ Found Job Description Matcher tab');

  await page.click('button:has-text("Insert Sample JD")');
  console.log('✓ Clicked Insert Sample JD');

  const [matchResp] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/jobs/match') && res.status() === 200, { timeout: 25000 }),
    page.click('button:has-text("Analyze Job Description & Match Skills")')
  ]);
  console.log('✓ Match API responded with HTTP 200');

  await page.waitForSelector('text=Role Compatibility Report', { timeout: 15000 });
  console.log('✓ Role Compatibility Report rendered successfully!');

  // 3. Applications and Prepare For This Job
  console.log('3. Testing Applications module and Prepare for Job flow...');
  const pythonSeedApp = `python -c "from app.database.session import SessionLocal; from app.models.user import User; from app.models.job_application import JobApplication; db=SessionLocal(); u=db.query(User).filter(User.email=='${testEmail}').first(); app_rec=JobApplication(user_id=u.id, job_key='google_senior_backend_dev', job_title='Senior Backend Engineer', company='Google', location='Mountain View, CA', status='Saved', salary_range='$180,000 - $240,000'); db.add(app_rec); db.commit(); db.close()"`;
  execSync(pythonSeedApp, { cwd: '../AI-Career-Coach-Backend' });

  await page.goto(`${BASE_URL}/applications`);
  await page.waitForSelector('text=Senior Backend Engineer', { timeout: 20000 });
  console.log('✓ Found application for Senior Backend Engineer at Google');

  await page.click('button:has-text("Prepare for This Job")');
  await page.waitForSelector('text=Target Job Context Loaded', { timeout: 20000 });
  console.log('✓ Target Job Context Loaded banner verified in Mock Interview Setup!');

  // 4. Avatar Selection and Preferences
  console.log('4. Testing Avatar Selection and Preference Wizard...');
  await page.click('button:has-text("Proceed with Arjun Mehta")');
  await page.waitForSelector('text=Configure Interview Preferences');
  await page.click('button:has-text("Launch Live Interview Session")');

  // 5. Mock Interview Room
  console.log('5. Entering Mock Interview Room...');
  await page.waitForURL('**/mock-interview/room/**', { timeout: 35000 });
  const roomId = page.url().split('/').pop();
  console.log(`✓ Arrived in Live Room Session #${roomId}`);

  await page.waitForSelector('video', { timeout: 25000 });
  await page.waitForTimeout(2000);

  console.log('6. Submitting response via text drawer...');
  await page.click('button:has-text("Type Answer")');
  await page.waitForSelector('textarea[placeholder*="Type your response"]', { timeout: 10000 });
  await page.locator('textarea[placeholder*="Type your response"]').first().fill('I am an experienced Senior Backend Engineer specializing in Python, FastAPI, distributed microservices, and cloud infrastructure.');
  await page.click('button:has-text("Submit Text")');
  console.log('✓ Response submitted to conversational AI engine');

  await page.waitForTimeout(3000);

  // 6. Complete interview and check Report
  console.log('7. Completing interview session...');
  const userToken = await page.evaluate(() => localStorage.getItem('access_token'));
  await fetch(`${BACKEND_URL}/api/mock-interview/${roomId}/complete`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
  });

  await page.goto(`${BASE_URL}/mock-interview/report/${roomId}`);
  await page.waitForSelector('text=Placement Readiness', { timeout: 25000 });
  console.log('✓ Evaluation Report rendered Placement Readiness Score!');

  // 7. Check History
  await page.goto(`${BASE_URL}/mock-interview/history`);
  await page.waitForSelector(`text=#${roomId}`, { timeout: 20000 });
  console.log(`✓ Verified historical session #${roomId} in history!`);

  console.log('\n=========================================');
  console.log('ALL QA FLOWS PASSED PERFECTLY!');
  console.log('=========================================\n');

  await browser.close();
}

testFullFlow().catch(console.error);
