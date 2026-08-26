from typing import Dict, Any, List, Optional
from app.services.avatar_provider import BaseAvatarProvider


class LocalAvatarService(BaseAvatarProvider):
    """
    Local AI Lip-Synced Human Interviewer Catalog.
    Provides the verified corporate HR Interviewer configuration with Wav2Lip / local AI lip-sync.
    """

    @property
    def AVATAR_CATALOG(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "ai_hr_interviewer_professional",
                "name": "AI HR Interviewer – Professional",
                "gender": "female",
                "role": "Senior Talent Acquisition Director & HR Lead",
                "experience": "12+ Years Executive Hiring Experience",
                "default_voice": "aura-asteria-en",
                "voice_preference": "en-US",
                "description": "Executive HR interviewer assessing behavioral competencies, communication clarity, problem-solving, and role alignment with real audio-driven lip synchronization.",
                "is_photorealistic": True,
                "provider": "local_lipsync"
            }
        ]

    def get_avatars(self) -> List[Dict[str, Any]]:
        return self.AVATAR_CATALOG

    def get_avatar_by_id(self, avatar_id: str) -> Optional[Dict[str, Any]]:
        for a in self.AVATAR_CATALOG:
            if a["id"] == avatar_id:
                return a
        return self.AVATAR_CATALOG[0]


local_avatar_service = LocalAvatarService()
