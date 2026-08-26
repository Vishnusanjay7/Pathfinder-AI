import os
from dotenv import load_dotenv
from livekit import api

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

print("LIVEKIT_URL:", LIVEKIT_URL)
print("LIVEKIT_API_KEY:", LIVEKIT_API_KEY)

# 1. Official LiveKit AccessToken
official_tok = (
    api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    .with_identity("test_candidate_001")
    .with_name("Candidate User")
    .with_grants(api.VideoGrants(room_join=True, room="test_room_123", can_publish=True, can_subscribe=True, can_publish_data=True))
    .to_jwt()
)

print("\nOfficial LiveKit token:", official_tok[:50] + "...")

verifier = api.TokenVerifier(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
claims = verifier.verify(official_tok)
print("Verified claims:", claims)

# Test connecting to LiveKit Cloud with official token using livekit.rtc
import asyncio
from livekit import rtc

async def test_connect():
    room = rtc.Room()
    print("\nConnecting to LiveKit Cloud with official token...")
    try:
        await room.connect(LIVEKIT_URL, official_tok)
        print("SUCCESS! Connected to LiveKit Cloud room:", room.name)
        print("Local participant SID:", room.local_participant.sid)
        await room.disconnect()
        print("Disconnected cleanly.")
    except Exception as e:
        print("FAILED to connect:", e)

asyncio.run(test_connect())
