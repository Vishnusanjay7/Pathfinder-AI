import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.mock_interview_v2.audio.tts_service import tts_service_v2
from app.mock_interview_v2.lipsync.lipsync_service import lipsync_service_v2

router = APIRouter(prefix="/tts", tags=["Mock Interview v2 - TTS"])


class TTSRequestV2(BaseModel):
    text: str
    voice_id: str = "aura-asteria-en"
    interviewer_id: str = "female_hr"
    generate_video: bool = True


@router.post("", summary="Synthesize Speech Audio & Optional Lip-Sync Video (v2)")
async def synthesize_tts_v2(payload: TTSRequestV2) -> Dict[str, Any]:
    tts_res = tts_service_v2.synthesize(text=payload.text, voice_id=payload.voice_id)
    if not tts_res.get("success"):
        raise HTTPException(status_code=500, detail=tts_res.get("error", "TTS synthesis failed"))

    video_url = None
    video_dur = None
    proc_ms = None

    if payload.generate_video and tts_res.get("audio_bytes"):
        sync_res = await lipsync_service_v2.generate_lipsynced_video(
            audio_bytes=tts_res["audio_bytes"],
            interviewer_id=payload.interviewer_id
        )
        if sync_res.get("success"):
            video_url = sync_res.get("video_url")
            video_dur = sync_res.get("duration")
            proc_ms = sync_res.get("processing_time_ms")

    return {
        "success": True,
        "audio_base64": tts_res.get("audio_base64"),
        "content_type": tts_res.get("content_type", "audio/mp3"),
        "video_url": video_url,
        "video_duration": video_dur,
        "processing_time_ms": proc_ms,
        "voice_id": payload.voice_id,
        "text": payload.text
    }
