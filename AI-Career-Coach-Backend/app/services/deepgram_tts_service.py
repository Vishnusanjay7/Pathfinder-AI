import logging
import requests
from typing import Dict, Any, Optional, List

from app.core.config import settings
from app.services.tts_provider import BaseTTSProvider

logger = logging.getLogger(__name__)


class DeepgramTTSService(BaseTTSProvider):
    """
    Deepgram Text-to-Speech (Aura) Service.
    Converts interviewer text to natural conversational audio with accurate pacing.
    """

    SUPPORTED_VOICES = [
        {"id": "aura-asteria-en", "name": "Asteria (Professional Female)", "gender": "female", "accent": "en-US"},
        {"id": "aura-luna-en", "name": "Luna (Attentive Female)", "gender": "female", "accent": "en-US"},
        {"id": "aura-stella-en", "name": "Stella (Corporate Female)", "gender": "female", "accent": "en-GB"},
        {"id": "aura-orion-en", "name": "Orion (Executive Male)", "gender": "male", "accent": "en-US"},
        {"id": "aura-arcas-en", "name": "Arcas (Technical Lead Male)", "gender": "male", "accent": "en-US"},
        {"id": "aura-perseus-en", "name": "Perseus (Global Hiring Male)", "gender": "male", "accent": "en-US"},
    ]

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1/speak"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_supported_voices(self, gender: Optional[str] = None) -> List[Dict[str, Any]]:
        if not gender:
            return self.SUPPORTED_VOICES
        return [v for v in self.SUPPORTED_VOICES if v["gender"] == gender.lower()]

    def synthesize_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Synthesizes text using Deepgram Aura TTS.
        Falls back smoothly to client SpeechSynthesis metadata if unconfigured.
        """
        selected_voice = voice_id or "aura-asteria-en"

        if not self.is_configured():
            return {
                "success": True,
                "provider": "browser_speech_synthesis",
                "text": text,
                "voice_id": selected_voice,
                "mode": "client_fallback",
                "message": "Deepgram API key not set. Using browser SpeechSynthesis engine."
            }

        try:
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "application/json"
            }
            params = {"model": selected_voice}
            payload = {"text": text}

            response = requests.post(
                self.base_url,
                headers=headers,
                params=params,
                json=payload,
                timeout=12
            )

            if response.status_code == 200:
                # Return audio bytes or base64
                import base64
                audio_b64 = base64.b64encode(response.content).decode("utf-8")
                return {
                    "success": True,
                    "provider": "deepgram",
                    "audio_base64": audio_b64,
                    "content_type": "audio/mp3",
                    "voice_id": selected_voice,
                    "text": text
                }

            logger.warning(f"Deepgram TTS returned status {response.status_code}: {response.text}")
            return {
                "success": True,
                "provider": "browser_speech_synthesis",
                "text": text,
                "voice_id": selected_voice,
                "mode": "client_fallback",
                "error": f"Deepgram status {response.status_code}"
            }
        except Exception as e:
            logger.error(f"Deepgram TTS exception: {e}")
            return {
                "success": True,
                "provider": "browser_speech_synthesis",
                "text": text,
                "voice_id": selected_voice,
                "mode": "client_fallback",
                "error": str(e)
            }


deepgram_tts_service = DeepgramTTSService()
