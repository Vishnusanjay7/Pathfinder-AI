import asyncio
import os
import sys
import base64

sys.path.insert(0, os.path.abspath("."))
from app.services.deepgram_tts_service import deepgram_tts_service
from app.services.lipsync_service import lipsync_service

async def test_synthesis():
    print("Testing Deepgram TTS + AI Lip-Sync Engine Pipeline...")
    test_question = "Welcome to the interview. Could you please introduce yourself and discuss your technical background?"
    
    # 1. Synthesize audio via Deepgram TTS
    print(f"Synthesizing speech for: '{test_question}'...")
    tts_res = deepgram_tts_service.synthesize_speech(text=test_question, voice_id="aura-asteria-en")
    print(f"  TTS Provider: {tts_res.get('provider')}")

    if "audio_base64" in tts_res:
        audio_bytes = base64.b64decode(tts_res["audio_base64"])
    else:
        print("  Generating fallback sinusoidal speech PCM for testing...")
        import numpy as np
        import soundfile as sf
        import io
        sr = 16000
        t = np.linspace(0, 3.5, int(sr * 3.5), endpoint=False)
        sig = 0.5 * np.sin(2 * np.pi * 220 * t) * (np.sin(2 * np.pi * 3 * t) ** 2)
        bio = io.BytesIO()
        sf.write(bio, sig, sr, format='WAV', subtype='PCM_16')
        audio_bytes = bio.getvalue()

    print(f"  [OK] Audio ready ({len(audio_bytes)} bytes)")

    # 2. Run Lip-Sync Engine
    print("Running AI Lip-Sync Engine...")
    result = await lipsync_service.generate_lipsynced_video(
        audio_bytes=audio_bytes,
        interviewer_id="priya_sharma",
        question_text=test_question
    )
    print("  Lip-Sync Result:", result)

    if result.get("success"):
        video_url = result.get("videoUrl")
        output_file = os.path.basename(video_url)
        file_path = os.path.join("static", "videos", output_file)
        print(f"  [OK] Generated Lip-Synced Video: {file_path} ({os.path.getsize(file_path)} bytes)")
    else:
        print("  [FAIL] Lip-sync synthesis failed:", result.get("error"))

if __name__ == "__main__":
    asyncio.run(test_synthesis())
