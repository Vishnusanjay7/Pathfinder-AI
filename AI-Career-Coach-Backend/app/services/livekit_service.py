import os
import time
import datetime
import logging
import jwt
from typing import Dict, Any, Optional

from livekit import api
from app.core.config import settings
from app.services.realtime_voice_provider import BaseRealtimeVoiceProvider

logger = logging.getLogger(__name__)


class LiveKitService(BaseRealtimeVoiceProvider):
    """
    LiveKit Real-Time Audio & Video Service.
    Uses official livekit.api.AccessToken with clock-skew immunity to generate valid WebRTC JWT tokens for LiveKit Cloud.
    """

    def __init__(self):
        self.url = settings.LIVEKIT_URL or "wss://mockinterview-vvkfm0cf.livekit.cloud"
        self.api_key = settings.LIVEKIT_API_KEY
        self.api_secret = settings.LIVEKIT_API_SECRET

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_secret and self.api_key != "devkey")

    def create_session(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: Optional[str] = None,
        is_avatar_agent: bool = False,
    ) -> Dict[str, Any]:
        """
        Generates official LiveKit JWT token for client WebRTC room connection with full video/audio grants.
        """
        if not self.is_configured():
            logger.warning("[LiveKit] LIVEKIT_API_KEY or LIVEKIT_API_SECRET not configured.")
            return {
                "success": False,
                "error": "LiveKit credentials not configured.",
                "server_url": self.url,
                "room_name": room_name,
            }

        try:
            grant = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )

            token_builder = (
                api.AccessToken(api_key=self.api_key, api_secret=self.api_secret)
                .with_identity(participant_identity)
                .with_name(participant_name or participant_identity)
                .with_grants(grant)
                .with_ttl(datetime.timedelta(hours=2))
            )

            if is_avatar_agent:
                token_builder = token_builder.with_kind("agent").with_attributes({"is_avatar_agent": "true", "avatar_provider": "tavus"})

            raw_jwt = token_builder.to_jwt()

            # Apply clock-skew immunity (nbf/iat 120 seconds in past)
            decoded = jwt.decode(raw_jwt, self.api_secret, algorithms=["HS256"])
            now = int(time.time())
            decoded["nbf"] = now - 120
            decoded["iat"] = now - 120
            token = jwt.encode(decoded, self.api_secret, algorithm="HS256")

            return {
                "success": True,
                "provider": "livekit",
                "server_url": self.url,
                "room_name": room_name,
                "participant_identity": participant_identity,
                "token": token,
                "expires_at": int(time.time()) + 7200,
            }
        except Exception as e:
            logger.error(f"[LiveKit] Token generation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "server_url": self.url,
                "room_name": room_name,
            }


livekit_service = LiveKitService()
