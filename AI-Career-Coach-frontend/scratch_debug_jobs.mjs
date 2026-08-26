import { chromium } from 'playwright';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://127.0.0.1:8000';

async function testJobs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const testEmail = `debug_cand_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Debug Candidate',
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

  const verifyResp = await fetch(`${BACKEND_URL}/api/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, channel: 'email', code: '654321' })
  });
  const verifyData = await verifyResp.json();
  const token = verifyData.access_token;

  const pythonSeedResume = `python -c "from app.database.session import SessionLocal; from app.models.user import User; from app.models.resume import Resume; db=SessionLocal(); u=db.query(User).filter(User.email=='${testEmail}').first(); r=Resume(user_id=u.id, original_filename='QA_Candidate_Resume.pdf', stored_filename='QA_Candidate_Resume_stored.pdf', raw_text='Senior Backend Engineer with 5 years experience in Python, FastAPI, React, PostgreSQL, Docker, AWS, Distributed Systems.', extracted_skills=['Python', 'FastAPI', 'React', 'PostgreSQL', 'Docker', 'AWS', 'System Design'], ats_score=88, ats_breakdown={'keyword_match': 90, 'formatting': 85}, experience_data=[{'role': 'Senior Backend Engineer', 'company': 'Tech Corp', 'duration': '3 yrs'}], projects_data=[{'title': 'Cloud Microservices', 'skills': ['Python', 'Docker']}], is_active=True); db.add(r); db.commit(); db.close()"`;
  execSync(pythonSeedResume, { cwd: '../AI-Career-Coach-Backend' });

  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((t) => localStorage.setItem('access_token', t), token);

  await page.goto(`${BASE_URL}/jobs`);
  await page.waitForTimeout(3000);

  const text = await page.innerText('body');
  console.log('PAGE_FULL_TEXT:\n', text);

  await browser.close();
}

testJobs().catch(console.error);
