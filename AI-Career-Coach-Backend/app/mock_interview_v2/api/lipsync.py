import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.mock_interview_v2.lipsync.lipsync_service import lipsync_service_v2

router = APIRouter(prefix="/lipsync", tags=["Mock Interview v2 - LipSync"])


class LipSyncRequestV2(BaseModel):
    audio_base64: str
    interviewer_id: str = "female_hr"
    question_text: Optional[str] = None


@router.post("", summary="Generate Synchronized Video from TTS Audio (v2)")
async def generate_lipsync_v2(payload: LipSyncRequestV2) -> Dict[str, Any]:
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio string.")

    sync_res = await lipsync_service_v2.generate_lipsynced_video(
        audio_bytes=audio_bytes,
        interviewer_id=payload.interviewer_id
    )

    if not sync_res.get("success"):
        raise HTTPException(status_code=500, detail=sync_res.get("error", "Lip-sync synthesis failed."))

    return sync_res
