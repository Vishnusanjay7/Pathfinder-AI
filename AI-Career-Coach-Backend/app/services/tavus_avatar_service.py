import os
import logging
import time
import jwt
import datetime
from typing import Optional, Dict, Any
import aiohttp
from livekit import api
from app.core.config import settings

logger = logging.getLogger(__name__)

# Registered photorealistic human interviewer PALs
AVATAR_PERSONAS = {
    "female_hr_01": {
        "pal_id": "p5277ac17937",
        "face_id": "r3f427f43c9d",
        "name": "AI HR Interviewer – Professional",
        "role": "Senior Talent Acquisition Director",
    },
    "ai_hr_interviewer_professional": {
        "pal_id": "p5277ac17937",
        "face_id": "r3f427f43c9d",
        "name": "AI HR Interviewer – Professional",
        "role": "Senior Talent Acquisition Director & HR Lead",
    },
    "male_tech_01": {
        "pal_id": "p5277ac17937",
        "face_id": "r3f427f43c9d",
        "name": "Alex Vance",
        "role": "Principal Engineering Lead",
    },
    "female_lead_02": {
        "pal_id": "p5277ac17937",
        "face_id": "r3f427f43c9d",
        "name": "Elena Rostova",
        "role": "Head of Engineering & Executive Recruiter",
    },
    "male_recruiter_02": {
        "pal_id": "p5277ac17937",
        "face_id": "r3f427f43c9d",
        "name": "Marcus Hayes",
        "role": "Staff Technical Recruiter",
    }
}

class TavusAvatarService:
    def __init__(self):
        self.api_key = settings.TAVUS_API_KEY
        self.api_url = "https://tavusapi.com/v2"
        # Track active avatar conversation sessions per room
        self._active_conversations: Dict[str, str] = {}

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_persona_config(self, avatar_id: str) -> Dict[str, Any]:
        return AVATAR_PERSONAS.get(avatar_id, AVATAR_PERSONAS["ai_hr_interviewer_professional"])

    def generate_avatar_livekit_token(self, room_name: str, identity: str = "tavus_avatar_interviewer") -> str:
        """
        Generates a clock-skew-safe LiveKit Access Token for the Tavus CVI Agent with full permissions.
        """
        grant = api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        )

        raw_jwt = (
            api.AccessToken(
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET
            )
            .with_kind("agent")
            .with_identity(identity)
            .with_name("AI HR Interviewer – Professional")
            .with_grants(grant)
            .with_ttl(datetime.timedelta(hours=2))
            .to_jwt()
        )

        try:
            decoded = jwt.decode(raw_jwt, settings.LIVEKIT_API_SECRET, algorithms=["HS256"])
            now = int(time.time())
            # Backdate nbf and iat by 120 seconds to prevent clock skew rejection (HTTP 400)
            decoded["nbf"] = now - 120
            decoded["iat"] = now - 120
            return jwt.encode(decoded, settings.LIVEKIT_API_SECRET, algorithm="HS256")
        except Exception as e:
            logger.warning(f"[TAVUS] Could not adjust clock skew on token: {e}")
            return raw_jwt

    async def get_conversation_status(self, conversation_id: str) -> Dict[str, Any]:
        """
        Retrieves status of a Tavus CVI conversation.
        """
        if not self.is_configured():
            return {"status": "unconfigured"}

        headers = {"x-api-key": self.api_key}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_url}/conversations/{conversation_id}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=8)
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return {"status": "error", "status_code": resp.status}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def start_avatar_session(
        self,
        room_name: str,
        avatar_id: str = "ai_hr_interviewer_professional",
        custom_greeting: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls Tavus CVI API to join the LiveKit room as a photorealistic video avatar.
        """
        persona = self.get_persona_config(avatar_id)

        # Idempotency guard: if a conversation is already running for this room, check if active
        existing_conv_id = self._active_conversations.get(room_name)
        if existing_conv_id:
            status_data = await self.get_conversation_status(existing_conv_id)
            if status_data.get("status") in ("active", "starting", "created"):
                logger.info(f"[TAVUS] Reusing active avatar session: conversation_id={existing_conv_id} for room={room_name}")
                return {
                    "success": True,
                    "provider": "tavus",
                    "conversation_id": existing_conv_id,
                    "room_name": room_name,
                    "avatar_participant_identity": "tavus_avatar_interviewer",
                    "avatar_participant_name": "AI HR Interviewer – Professional",
                    "persona": persona,
                    "status": "connected"
                }
            else:
                self._active_conversations.pop(room_name, None)

        if not self.is_configured():
            logger.warning("[TAVUS] TAVUS_API_KEY not configured.")
            return {
                "success": False,
                "error": "TAVUS_API_KEY is not configured.",
                "mode": "audio_direct",
                "persona": persona
            }

        livekit_url = settings.LIVEKIT_URL or "wss://mockinterview-vvkfm0cf.livekit.cloud"
        avatar_token = self.generate_avatar_livekit_token(room_name)

        payload = {
            "pal_id": persona["pal_id"],
            "face_id": persona["face_id"],
            "properties": {
                "livekit_ws_url": livekit_url,
                "livekit_room_token": avatar_token,
                "max_call_duration": 3600,
            }
        }

        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_url}/conversations",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    resp_data = await resp.json()
                    if resp.status in (200, 201):
                        conversation_id = resp_data.get("conversation_id")
                        self._active_conversations[room_name] = conversation_id
                        logger.info(f"[TAVUS] Avatar session started: conversation_id={conversation_id} for room={room_name}")
                        return {
                            "success": True,
                            "provider": "tavus",
                            "conversation_id": conversation_id,
                            "room_name": room_name,
                            "avatar_participant_identity": "tavus_avatar_interviewer",
                            "avatar_participant_name": "AI HR Interviewer – Professional",
                            "persona": persona,
                            "status": "connected"
                        }
                    else:
                        raw_err = resp_data.get("message") or resp_data.get("error") or f"Tavus API HTTP {resp.status}"
                        if resp.status == 402 or "conversational credits" in str(raw_err).lower():
                            err_code = "TAVUS_CONVERSATIONAL_CREDITS_EXHAUSTED"
                            err_msg = "Tavus conversational credits are exhausted."
                        else:
                            err_code = f"TAVUS_HTTP_{resp.status}"
                            err_msg = str(raw_err)

                        logger.error(f"[TAVUS] Failed to start avatar conversation ({err_code}): {err_msg}")
                        return {
                            "success": False,
                            "error": err_msg,
                            "error_code": err_code,
                            "status_code": resp.status,
                            "persona": persona
                        }
        except Exception as e:
            logger.error(f"[TAVUS] Exception starting avatar conversation: {e}")
            return {
                "success": False,
                "error": str(e),
                "persona": persona
            }

    async def stop_avatar_session(self, room_name: str) -> bool:
        """
        Ends the Tavus avatar conversation session.
        """
        conversation_id = self._active_conversations.pop(room_name, None)
        if not conversation_id or not self.is_configured():
            return False

        headers = {"x-api-key": self.api_key}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(
                    f"{self.api_url}/conversations/{conversation_id}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=8)
                ) as resp:
                    logger.info(f"[TAVUS] Ended avatar conversation {conversation_id}: status={resp.status}")
                    return resp.status in (200, 204)
        except Exception as e:
            logger.warning(f"[TAVUS] Error ending avatar conversation {conversation_id}: {e}")
            return False

tavus_avatar_service = TavusAvatarService()
