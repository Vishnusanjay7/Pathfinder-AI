import os
import time
import httpx
from jose import jwt
from dotenv import load_dotenv

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
TAVUS_PAL_ID = "p5277ac17937"
TAVUS_FACE_ID = "r3f427f43c9d"

def make_avatar_token(room_name: str) -> str:
    now = int(time.time())
    payload = {
        "sub": "tavus_avatar_interviewer",
        "name": "AI HR Interviewer – Professional",
        "iss": LIVEKIT_API_KEY,
        "nbf": now - 120,  # 2 minutes in past for clock skew protection
        "exp": now + 7200,
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
            "canPublishSources": ["camera", "microphone"],
        },
        "attributes": {
            "is_avatar_agent": "true",
            "avatar_provider": "tavus",
        }
    }
    return jwt.encode(payload, LIVEKIT_API_SECRET, algorithm="HS256")

token = make_avatar_token("test_skew_room")

with httpx.Client(timeout=30.0) as client:
    resp = client.post(
        "https://tavusapi.com/v2/conversations",
        headers={
            "x-api-key": TAVUS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "pal_id": TAVUS_PAL_ID,
            "face_id": TAVUS_FACE_ID,
            "properties": {
                "livekit_ws_url": LIVEKIT_URL,
                "livekit_room_token": token,
            }
        }
    )
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
    if resp.status_code in (200, 201):
        conv_id = resp.json()["conversation_id"]
        client.delete(f"https://tavusapi.com/v2/conversations/{conv_id}", headers={"x-api-key": TAVUS_API_KEY})
        print("Cleaned up.")
