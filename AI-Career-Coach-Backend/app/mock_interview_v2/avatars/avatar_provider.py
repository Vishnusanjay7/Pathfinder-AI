from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseAvatarProvider(ABC):
    """
    Abstract Base Class for Mock Interview v2 Avatar Providers.
    Encapsulates avatar lifecycle, state transitions, speech, and rendering.
    """

    @abstractmethod
    def initialize(self, interviewer_id: str) -> Dict[str, Any]:
        """Initialize avatar provider session and load model resources."""
        pass

    @abstractmethod
    def get_profile(self, interviewer_id: str) -> Dict[str, Any]:
        """Retrieve the interviewer profile configuration."""
        pass

    @abstractmethod
    async def speak(self, text: str, voice_id: str) -> Dict[str, Any]:
        """Synthesize speech and generate lip-synchronized video frames."""
        pass

    @abstractmethod
    def set_state(self, state: str) -> None:
        """Set avatar behavior state (IDLE, LISTENING, THINKING, SPEAKING, NODDING)."""
        pass

    @abstractmethod
    def dispose(self) -> None:
        """Release any allocated memory, buffers, or streaming handles."""
        pass
