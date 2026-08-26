import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = 'C:/Users/vishn/.gemini/antigravity-ide/brain/af10335d-7e98-46d5-8acb-716e385cda71';

async function main() {
  console.log('======================================================================');
  console.log('  TAVUS REMOTE INTERVIEWER VIDEO STREAM AUDIT');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['microphone', 'camera']
  });

  const page = await context.newPage();

  const events = [];
  page.on('console', (msg) => {
    const txt = msg.text();
    if (
      txt.includes('[Interview]') ||
      txt.includes('[LiveKit]') ||
      txt.includes('[Tavus]') ||
      txt.includes('[Browser]')
    ) {
      console.log(`  ${txt}`);
      events.push({ text: txt, time: Date.now() });
    }
  });

  const t0 = Date.now();
  let t_livekit_connected = 0;
  let t_tavus_created = 0;
  let t_avatar_joined = 0;
  let t_video_subscribed = 0;
  let t_first_frame = 0;

  try {
    // 1. Authenticate candidate
    console.log('[1/5] Authenticating candidate...');
    const token = execSync(
      'python -c "from app.auth.jwt_handler import create_access_token; from app.database.session import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.query(User).first(); print(create_access_token({\'sub\': str(u.id), \'email\': u.email}))"',
      { cwd: 'c:/AI-Career-Coach/AI-Career-Coach-Backend' }
    ).toString().trim();

    await context.addInitScript((t) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('token', t);
    }, token);

    // 2. Mock Interview Selection
    console.log('[2/5] Selecting "AI HR Interviewer – Professional"...');
    await page.goto(`${BASE_URL}/mock-interview`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.click('text=Proceed with AI HR Interviewer – Professional');
    await page.waitForSelector('text=Configure Interview Session', { timeout: 15000 });

    // 3. Launch Interview Room
    console.log('[3/5] Starting LiveKit Room & Tavus AvatarSession...');
    const t_interview_start = Date.now();

    await page.click('text=Start Real-Time Interview');
    await page.waitForURL(/\/mock-interview\/room\/\d+/, { timeout: 60000 });
    console.log(`  ✓ Room URL reached: ${page.url()}`);

    // 4. Specifically monitor the main stage interviewer video element
    console.log('[4/5] Monitoring Remote Tavus Interviewer Video Element...');

    let remoteVideoPlaying = false;
    let remoteVideoStats = {};

    for (let sec = 1; sec <= 35; sec++) {
      await page.waitForTimeout(1000);

      const status = await page.evaluate(() => {
        // Find the interviewer video element inside the left main stage
        const mainStage = document.querySelector('.lg\\:col-span-7, .xl\\:col-span-8');
        const interviewerVideo = mainStage ? mainStage.querySelector('video') : null;
        
        return {
          interviewerVideoExists: !!interviewerVideo,
          hasSrcObject: interviewerVideo ? !!interviewerVideo.srcObject : false,
          readyState: interviewerVideo ? interviewerVideo.readyState : 0,
          paused: interviewerVideo ? interviewerVideo.paused : true,
          videoWidth: interviewerVideo ? interviewerVideo.videoWidth : 0,
          videoHeight: interviewerVideo ? interviewerVideo.videoHeight : 0,
          currentTime: interviewerVideo ? interviewerVideo.currentTime : 0,
          opacityClass: interviewerVideo ? interviewerVideo.className : '',
        };
      });

      if (status.videoWidth > 0 && status.videoHeight > 0 && !status.paused) {
        remoteVideoPlaying = true;
        remoteVideoStats = status;
        t_first_frame = Date.now();
        console.log(`  ✓ Remote Tavus Video Playing: ${status.videoWidth}x${status.videoHeight} at ${sec}s!`);
        break;
      } else if (sec % 5 === 0) {
        console.log(`  [Poll ${sec}s] Video state: readyState=${status.readyState}, srcObject=${status.hasSrcObject}, dim=${status.videoWidth}x${status.videoHeight}, paused=${status.paused}`);
      }
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_tavus_remote_interviewer_live.png') });
    console.log('  ✓ Screenshot saved: 03_tavus_remote_interviewer_live.png');

    console.log('\n======================================================================');
    console.log('  FINAL VERDICT');
    console.log('======================================================================');
    console.log(`  - Remote Video Playing: ${remoteVideoPlaying ? 'PASS' : 'CONNECTING'}`);
    console.log(`  - Remote Video Stats: ${JSON.stringify(remoteVideoStats)}`);
    console.log(`  - Total Setup → Video Latency: ${t_first_frame ? ((t_first_frame - t_interview_start) / 1000).toFixed(2) + 's' : 'N/A'}`);

  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error_debug.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
