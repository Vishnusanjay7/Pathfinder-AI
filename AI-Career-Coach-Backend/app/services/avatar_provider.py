from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseAvatarProvider(ABC):
    """
    Abstract interface for 3D human avatars.
    """

    @abstractmethod
    def get_avatars(self) -> List[Dict[str, Any]]:
        """
        Returns catalog of available 3D human interviewers.
        """
        pass

    @abstractmethod
    def get_avatar_by_id(self, avatar_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves avatar metadata and model URL.
        """
        pass
