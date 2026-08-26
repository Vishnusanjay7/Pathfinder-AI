from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, BinaryIO


class BaseSTTProvider(ABC):
    """
    Abstract interface for Speech-to-Text (STT) services.
    """

    @abstractmethod
    def transcribe_audio(
        self,
        audio_data: bytes,
        content_type: str = "audio/webm",
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Transcribes recorded or streamed audio into text.
        """
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """
        Returns True if STT API credentials are configured.
        """
        pass
