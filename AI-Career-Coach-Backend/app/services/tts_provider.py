from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List


class BaseTTSProvider(ABC):
    """
    Abstract interface for Text-to-Speech (TTS) services.
    """

    @abstractmethod
    def synthesize_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Synthesizes text to audio stream or URL.
        """
        pass

    @abstractmethod
    def get_supported_voices(self, gender: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns supported voice profiles.
        """
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """
        Returns True if TTS API credentials are configured.
        """
        pass
