import os
import httpx
from dotenv import load_dotenv
from livekit import api

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
TAVUS_PAL_ID = "p5277ac17937"
TAVUS_FACE_ID = "r3f427f43c9d"

print(f"LIVEKIT_URL={LIVEKIT_URL}", flush=True)

# Generate LiveKit Token for Avatar
avatar_token = (
    api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    .with_kind("agent")
    .with_identity("tavus_avatar_interviewer")
    .with_name("AI HR Interviewer – Professional")
    .with_grants(api.VideoGrants(room_join=True, room="test_room_direct", can_publish=True, can_subscribe=True))
    .to_jwt()
)

print("Created agent token. Now calling Tavus API...", flush=True)

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
                "livekit_room_token": avatar_token,
            }
        }
    )
    print(f"Tavus POST status: {resp.status_code}", flush=True)
    print(f"Tavus response body: {resp.text}", flush=True)
    
    if resp.status_code in (200, 201):
        conv_id = resp.json().get("conversation_id")
        print(f"Polling conversation {conv_id}...", flush=True)
        import time
        for i in range(10):
            time.sleep(2)
            c_resp = client.get(
                f"https://tavusapi.com/v2/conversations/{conv_id}",
                headers={"x-api-key": TAVUS_API_KEY}
            )
            print(f"Poll [{i*2}s]: status={c_resp.status_code} data={c_resp.text}", flush=True)
        
        # delete
        client.delete(f"https://tavusapi.com/v2/conversations/{conv_id}", headers={"x-api-key": TAVUS_API_KEY})
        print("Deleted conversation.", flush=True)
