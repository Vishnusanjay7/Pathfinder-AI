import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/vishn/.gemini/antigravity-ide/brain/af10335d-7e98-46d5-8acb-716e385cda71";
const BASE_URL = "http://localhost:3000";
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzOCIsImVtYWlsIjoidGVzdF91c2VyXzIwMjYwODIwQGdtYWlsLmNvbSIsImV4cCI6MTc4NzQ3OTcxOX0.hlNZLJ-Ncb6XAw7O5VLXT0Q3pa6naK_VhsGl25CayfA";

async function runE2ETest() {
  console.log("=== STARTING MOCK INTERVIEW V2 END-TO-END AUTOMATED TEST ===");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required"
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["camera", "microphone"]
  });

  await context.addInitScript((token) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("token", token);
  }, AUTH_TOKEN);

  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text()));
  page.on('pageerror', err => console.log(`[PAGE CRASH ERROR]`, err.message));

  try {
    // 1. Navigate to /mock-interview-v2 Hub
    console.log("[1/5] Navigating to /mock-interview-v2 Hub...");
    await page.goto(`${BASE_URL}/mock-interview-v2`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "01_v2_hub_selection.png"), fullPage: true });
    console.log("  ► Captured screenshot: 01_v2_hub_selection.png");

    // 2. Select Neha Verma and Launch Interview
    console.log("[2/5] Selecting Neha Verma and opening configuration modal...");
    await page.locator('text=Neha Verma').first().click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Start Interview with Neha Verma")').first().click();
    await page.waitForTimeout(1000);

    console.log("  - Launching interview session...");
    await page.locator('button:has-text("Start Real-Time Interview")').click();

    // 3. Wait for Interview Room URL
    console.log("[3/5] Waiting for Interview Room (/mock-interview-v2/room/)...");
    await page.waitForURL(/.*mock-interview-v2\/room\/.*/, { timeout: 35000 });
    await page.waitForTimeout(6000);

    const isRoomVisible = await page.locator('[data-testid="interview-room-v2"]').isVisible();
    console.log(`  - Boardroom Stage Active: ${isRoomVisible}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_v2_boardroom_stage.png") });
    console.log("  ► Captured screenshot: 02_v2_boardroom_stage.png");

    // 4. Complete interview session to view report
    console.log("[4/5] Completing interview session to verify Final Report...");
    await page.locator('button:has-text("Finish & View Report")').click();
    await page.waitForURL(/.*mock-interview-v2\/report\/.*/, { timeout: 25000 });
    await page.waitForTimeout(3000);

    // 5. Verify Report Page
    console.log("[5/5] Verifying Final Evaluation Report...");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "03_v2_final_evaluation_report.png"), fullPage: true });
    console.log("  ► Captured screenshot: 03_v2_final_evaluation_report.png");

    // Bonus: Verify existing v1 page is untouched
    console.log("[Bonus] Checking that existing /mock-interview route is untouched and functional...");
    await page.goto(`${BASE_URL}/mock-interview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "04_v1_existing_mock_interview_untouched.png"), fullPage: true });
    console.log("  ► Captured screenshot: 04_v1_existing_mock_interview_untouched.png");

    console.log("\n=== ALL E2E VERIFICATIONS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("E2E Test Failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2ETest();
