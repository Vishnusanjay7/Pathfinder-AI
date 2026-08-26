import logging
import requests
from typing import Dict, Any, Optional

from app.core.config import settings
from app.services.stt_provider import BaseSTTProvider

logger = logging.getLogger(__name__)


class DeepgramSTTService(BaseSTTProvider):
    """
    Deepgram Speech-to-Text Service.
    Supports real-time stream transcription & audio buffer transcription.
    """

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1/listen"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def transcribe_audio(
        self,
        audio_data: bytes,
        content_type: str = "audio/webm",
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Transcribes audio data using Deepgram REST endpoint.
        Gracefully falls back if unconfigured or on network failure.
        """
        if not self.is_configured():
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "provider": "deepgram_unconfigured",
                "error": "Deepgram API key is not configured. Falling back to browser STT."
            }

        try:
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": content_type
            }
            params = {
                "model": "nova-2",
                "smart_format": "true",
                "punctuate": "true",
                "language": language.split("-")[0] if language else "en"
            }
            response = requests.post(
                self.base_url,
                headers=headers,
                params=params,
                data=audio_data,
                timeout=12
            )

            if response.status_code == 200:
                data = response.json()
                channels = data.get("results", {}).get("channels", [])
                if channels:
                    alt = channels[0].get("alternatives", [{}])[0]
                    transcript = alt.get("transcript", "").strip()
                    confidence = alt.get("confidence", 0.95)
                    return {
                        "success": True,
                        "transcript": transcript,
                        "confidence": confidence,
                        "provider": "deepgram"
                    }

            logger.warning(f"Deepgram STT API returned status {response.status_code}: {response.text}")
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "provider": "deepgram_error",
                "error": f"Deepgram status {response.status_code}"
            }
        except Exception as e:
            logger.error(f"Deepgram STT request exception: {e}")
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "provider": "deepgram_exception",
                "error": str(e)
            }


deepgram_stt_service = DeepgramSTTService()
