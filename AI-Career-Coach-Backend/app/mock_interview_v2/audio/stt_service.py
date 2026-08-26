import logging
import requests
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("career_coach.v2.stt")


class STTServiceV2:
    """
    Deepgram Nova-2 Speech-to-Text service for Mock Interview v2.
    Transcribes candidate spoken answers with high accuracy.
    """

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1/listen"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def transcribe_audio(
        self,
        audio_bytes: bytes,
        content_type: str = "audio/wav",
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Transcribes raw audio bytes using Deepgram Nova-2.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Deepgram API key not configured."
            }

        try:
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": content_type
            }
            params = {
                "model": "nova-2",
                "language": language,
                "smart_format": "true",
                "punctuate": "true"
            }

            response = requests.post(
                self.base_url,
                headers=headers,
                params=params,
                data=audio_bytes,
                timeout=20
            )

            if response.status_code == 200:
                data = response.json()
                transcript = (
                    data.get("results", {})
                    .get("channels", [{}])[0]
                    .get("alternatives", [{}])[0]
                    .get("transcript", "")
                )
                confidence = (
                    data.get("results", {})
                    .get("channels", [{}])[0]
                    .get("alternatives", [{}])[0]
                    .get("confidence", 0.0)
                )
                return {
                    "success": True,
                    "transcript": transcript,
                    "confidence": confidence
                }

            logger.error(f"[STT-v2] Deepgram STT error HTTP {response.status_code}: {response.text}")
            return {
                "success": False,
                "error": f"Deepgram STT HTTP {response.status_code}"
            }

        except Exception as e:
            logger.error(f"[STT-v2] Exception during STT transcription: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }


stt_service_v2 = STTServiceV2()
