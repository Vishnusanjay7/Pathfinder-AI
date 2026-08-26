import os
import datetime
import httpx
from dotenv import load_dotenv
from livekit import api

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")

grant = api.VideoGrants(
    room_join=True,
    room="test_official_tavus_room",
    can_publish=True,
    can_subscribe=True,
    can_publish_data=True,
)

tok = (
    api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    .with_kind("agent")
    .with_identity("tavus_avatar_interviewer")
    .with_name("AI HR Interviewer – Professional")
    .with_grants(grant)
    .with_ttl(datetime.timedelta(hours=2))
    .to_jwt()
)

print("Generated token successfully:", tok[:50] + "...")

with httpx.Client(timeout=30.0) as client:
    resp = client.post(
        "https://tavusapi.com/v2/conversations",
        headers={
            "x-api-key": TAVUS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "pal_id": "p5277ac17937",
            "face_id": "r3f427f43c9d",
            "properties": {
                "livekit_ws_url": LIVEKIT_URL,
                "livekit_room_token": tok,
            }
        }
    )
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
    if resp.status_code in (200, 201):
        cid = resp.json()["conversation_id"]
        client.delete(f"https://tavusapi.com/v2/conversations/{cid}", headers={"x-api-key": TAVUS_API_KEY})
        print("Cleaned up successfully.")
