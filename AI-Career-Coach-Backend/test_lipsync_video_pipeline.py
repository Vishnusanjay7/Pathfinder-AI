import asyncio
import os
import cv2
import base64
from app.services.lipsync_service import lipsync_service
from app.services.deepgram_tts_service import deepgram_tts_service

async def test_synthesis():
    text = "Tell me about yourself and your experience with Java software development."
    print(f"[TEST] Synthesizing Deepgram TTS speech for: '{text}'")
    tts_res = deepgram_tts_service.synthesize_speech(text, voice_id="aura-asteria-en")
    assert tts_res["success"], f"TTS failed: {tts_res.get('error')}"
    audio_bytes = base64.b64decode(tts_res["audio_base64"])
    print(f"  [OK] Deepgram TTS generated {len(audio_bytes)} bytes audio.")

    print("[TEST] Running AI Video Lip-Sync Engine on attached interviewer video...")
    sync_res = await lipsync_service.generate_lipsynced_video(
        audio_bytes=audio_bytes,
        interviewer_id="ai_hr_interviewer_professional",
        question_text=text
    )

    print(f"  [OK] LipSync Result: {sync_res}")
    assert sync_res["success"], f"LipSync failed: {sync_res.get('error')}"

    video_url = sync_res["videoUrl"]
    filename = video_url.split("/")[-1]
    video_path = os.path.join(
        os.path.dirname(__file__), "static", "videos", filename
    )

    assert os.path.exists(video_path), f"Output video file not found at {video_path}"
    file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
    print(f"  [OK] Output file exists: {video_path} ({file_size_mb:.2f} MB)")

    cap = cv2.VideoCapture(video_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    fc = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    dur = fc / fps if fps > 0 else 0
    cap.release()

    print(f"  [OK] Video Container Specs: {w}x{h} @ {fps} FPS, {fc} frames, {dur:.2f}s duration")
    print(f"  [OK] Reported Audio Duration: {sync_res['duration']:.2f}s")
    assert abs(dur - sync_res["duration"]) < 0.2, "Video duration and audio duration mismatch!"

    print("\n[SUCCESS] AI Video Lip-Sync Pipeline validated successfully!")

if __name__ == "__main__":
    asyncio.run(test_synthesis())
