from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseRealtimeVoiceProvider(ABC):
    """
    Abstract interface for real-time WebRTC voice sessions (e.g. LiveKit).
    """

    @abstractmethod
    def create_session(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates or registers a room and generates an authentication token.
        """
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """
        Returns True if provider credentials are fully configured.
        """
        pass
