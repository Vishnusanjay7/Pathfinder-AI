import logging
import base64
import requests
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("career_coach.v2.tts")


class TTSServiceV2:
    """
    Deepgram Aura Text-to-Speech service for Mock Interview v2.
    Converts interviewer question text to natural conversational audio streams.
    """

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1/speak"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def synthesize(
        self,
        text: str,
        voice_id: str = "aura-asteria-en"
    ) -> Dict[str, Any]:
        """
        Synthesizes text using Deepgram Aura TTS.
        Returns base64-encoded PCM/MP3 audio payload.
        """
        if not self.is_configured():
            logger.warning("[TTS-v2] Deepgram API key unconfigured.")
            return {
                "success": False,
                "error": "Deepgram API key not configured."
            }

        try:
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "application/json"
            }
            params = {"model": voice_id}
            payload = {"text": text}

            response = requests.post(
                self.base_url,
                headers=headers,
                params=params,
                json=payload,
                timeout=15
            )

            if response.status_code == 200:
                audio_bytes = response.content
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                return {
                    "success": True,
                    "provider": "deepgram",
                    "voice_id": voice_id,
                    "audio_base64": audio_b64,
                    "audio_bytes": audio_bytes,
                    "content_type": "audio/mp3",
                    "text": text
                }

            logger.error(f"[TTS-v2] Deepgram API error: HTTP {response.status_code} - {response.text}")
            return {
                "success": False,
                "error": f"Deepgram TTS HTTP {response.status_code}"
            }

        except Exception as e:
            logger.error(f"[TTS-v2] Exception during speech synthesis: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }


tts_service_v2 = TTSServiceV2()
