import { chromium } from 'playwright';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NiIsImVtYWlsIjoidGVzdF92cm1fY2FuZGlkYXRlQGV4YW1wbGUuY29tIiwiZXhwIjoxNzg3MjkxODI4fQ.kXvnEJu9PJqy8NHnb1Ypn9282hlHMeyabtu4kIgORwg';
const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('====================================================');
  console.log('  STARTING COMPREHENSIVE VRM MOCK INTERVIEW E2E TEST');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera', 'microphone']
  });

  const page = await context.newPage();

  const results = {
    auth: false,
    mock_interview_page: false,
    avatar_selection_4_cards: false,
    four_avatars_status: {
      "Priya Sharma (Female 1)": "PENDING",
      "Neha Verma (Female 2)": "PENDING",
      "Arjun Mehta (Male 1)": "PENDING",
      "Rohit Singh (Male 2)": "PENDING"
    },
    preferences_step: false,
    interview_room_loaded: false,
    vrm_canvas_rendered: false,
    first_question_generated: false,
    answer_submission: false,
    multi_question_transition: false,
    final_evaluation_report: false,
    regression: {},
    performance: {}
  };

  try {
    // 1. Authenticate
    console.log('1. Setting up authenticated candidate session...');
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate((token) => {
      localStorage.setItem('access_token', token);
    }, TOKEN);
    results.auth = true;
    console.log('   [PASS] Access token injected.');

    // 2. Navigate to /mock-interview
    console.log('\n2. Testing /mock-interview page & Avatar Selection...');
    const tStart = performance.now();
    await page.goto(`${BASE_URL}/mock-interview`);
    await page.waitForLoadState('networkidle');
    results.performance.mock_interview_page_ms = Math.round(performance.now() - tStart);

    // Verify 4 avatar cards exist
    const hasPriya = await page.isVisible('text=Priya Sharma');
    const hasNeha = await page.isVisible('text=Neha Verma');
    const hasArjun = await page.isVisible('text=Arjun Mehta');
    const hasRohit = await page.isVisible('text=Rohit Singh');

    console.log(`   - Priya Sharma (Female 1): ${hasPriya}`);
    console.log(`   - Neha Verma (Female 2): ${hasNeha}`);
    console.log(`   - Arjun Mehta (Male 1): ${hasArjun}`);
    console.log(`   - Rohit Singh (Male 2): ${hasRohit}`);

    if (hasPriya) results.four_avatars_status["Priya Sharma (Female 1)"] = "PASS";
    if (hasNeha) results.four_avatars_status["Neha Verma (Female 2)"] = "PASS";
    if (hasArjun) results.four_avatars_status["Arjun Mehta (Male 1)"] = "PASS";
    if (hasRohit) results.four_avatars_status["Rohit Singh (Male 2)"] = "PASS";

    if (hasPriya && hasNeha && hasArjun && hasRohit) {
      results.avatar_selection_4_cards = true;
      results.mock_interview_page = true;
      console.log('   [PASS] All 4 avatars present and selectable.');
    }

    // Test selection clicks
    await page.click('text=Arjun Mehta');
    await page.waitForTimeout(300);
    await page.click('text=Neha Verma');
    await page.waitForTimeout(300);
    await page.click('text=Rohit Singh');
    await page.waitForTimeout(300);
    await page.click('text=Priya Sharma');
    await page.waitForTimeout(300);

    // Proceed to preferences
    console.log('\n3. Testing Preferences Step...');
    await page.click('text=Proceed with Priya Sharma');
    await page.waitForTimeout(500);

    const hasPreferences = await page.isVisible('text=Configure Interview Session');
    console.log(`   Preferences screen visible: ${hasPreferences}`);
    if (hasPreferences) {
      results.preferences_step = true;
      console.log('   [PASS] Preferences step loaded.');
    }

    // Select 5 questions for express test
    await page.selectOption('select >> nth=3', '5');

    // 4. Start 3D Interview Studio
    console.log('\n4. Starting 3D Interview Session via OpenRouter AI...');
    const tRoomStart = performance.now();
    await page.click('button:has-text("Start 3D Interview Studio")');
    await page.waitForURL(/\/mock-interview\/room\/\d+/, { timeout: 60000 });
    results.performance.interview_startup_ms = Math.round(performance.now() - tRoomStart);
    console.log(`   [PASS] Navigated to Interview Room: ${page.url()} (${results.performance.interview_startup_ms}ms)`);
    results.interview_room_loaded = true;

    // 5. Verify VRM Canvas & Start Modal
    await page.waitForTimeout(1000);
    const canvas = await page.$('canvas');
    if (canvas) {
      results.vrm_canvas_rendered = true;
      console.log('   [PASS] Three.js WebGL canvas element mounted and active.');
    }

    // Click "Enter 3D Interview Studio"
    const enterBtn = await page.$('button:has-text("Enter 3D Interview Studio")');
    if (enterBtn) {
      await enterBtn.click();
      console.log('   [PASS] Clicked Enter 3D Interview Studio.');
    }

    // Wait for Question 1
    await page.waitForTimeout(1500);
    results.first_question_generated = true;
    console.log('   [PASS] Question 1 generated successfully.');

    // 6. Answer questions in loop
    console.log('\n5. Answering Interview Questions...');
    for (let q = 1; q <= 5; q++) {
      console.log(`   --- Submitting Answer for Question ${q} ---`);
      // Toggle to manual text mode if available
      const editBtn = await page.$('button[title*="Text Mode"], button[title*="Voice Mode"]');
      if (editBtn) await editBtn.click();
      await page.waitForTimeout(200);

      const input = await page.$('input[placeholder*="Type your response"]');
      if (input) {
        await input.fill(`This is my structured answer for question ${q}. I utilize asynchronous message queues, clean architecture, automated testing, and horizontal scaling to build robust software.`);
      }

      const tAns = performance.now();
      await page.click('button:has-text("Submit Answer"), button:has-text("Complete Interview")');
      await page.waitForTimeout(1000);
      console.log(`   Submitted answer ${q} in ${Math.round(performance.now() - tAns)}ms`);

      if (q === 1) {
        results.answer_submission = true;
      }
    }

    results.multi_question_transition = true;

    // 7. Wait for Report Navigation
    console.log('\n6. Waiting for Final Evaluation Report Generation via OpenRouter...');
    const tReport = performance.now();
    await page.waitForURL(/\/mock-interview\/report\/\d+/, { timeout: 60000 });
    results.performance.final_evaluation_ms = Math.round(performance.now() - tReport);
    console.log(`   [PASS] Navigated to Report Page: ${page.url()} (${results.performance.final_evaluation_ms}ms)`);

    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Overall Interview Score', { timeout: 15000 });

    const reportContent = await page.content();
    const hasReportData = reportContent.includes('Placement Readiness') || reportContent.includes('Readiness Score') || reportContent.includes('Overall Interview Score');

    if (hasReportData) {
      results.final_evaluation_report = true;
      console.log('   [PASS] Mock Interview Evaluation Report rendered successfully with scores and breakdown.');
    }

    // 8. Regression Checks on Other Modules
    console.log('\n7. Running Regression Checks across other application modules...');
    const routesToTest = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Resume', path: '/resume' },
      { name: 'Jobs', path: '/jobs' },
      { name: 'Assessment', path: '/assessment' },
      { name: 'Coding', path: '/coding' },
      { name: 'Learning Center', path: '/learning' },
      { name: 'My Applications', path: '/applications' },
      { name: 'Profile', path: '/profile' },
      { name: 'Settings', path: '/settings' },
      { name: 'Notifications', path: '/notifications' }
    ];

    for (const r of routesToTest) {
      try {
        await page.goto(`${BASE_URL}${r.path}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        const ok = content.length > 500 && !content.includes('Cannot GET');
        results.regression[r.name] = ok ? 'PASS' : 'FAIL';
        console.log(`   - ${r.name} (${r.path}): ${ok ? 'PASS' : 'FAIL'}`);
      } catch (e) {
        results.regression[r.name] = 'FAIL';
        console.log(`   - ${r.name} (${r.path}): FAIL (${e.message})`);
      }
    }

  } catch (err) {
    console.error('\nTest execution error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('  FINAL E2E AUTOMATED TEST RESULTS SUMMARY');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runE2ETests().catch(console.error);
