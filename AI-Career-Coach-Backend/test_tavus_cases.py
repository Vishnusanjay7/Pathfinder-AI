import os
import httpx
import jwt
import time
import datetime
from dotenv import load_dotenv
from livekit import api

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")

print("======================================================================")
print("  TAVUS API CONVERSATION CREATION CASES")
print("======================================================================")

# Generate clock-skew safe token
grant = api.VideoGrants(
    room_join=True,
    room="test_diagnostic_room",
    can_publish=True,
    can_subscribe=True,
    can_publish_data=True,
)
raw_jwt = (
    api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    .with_kind("agent")
    .with_identity("tavus_avatar_interviewer")
    .with_name("AI HR Interviewer – Professional")
    .with_grants(grant)
    .with_ttl(datetime.timedelta(hours=2))
    .to_jwt()
)
decoded = jwt.decode(raw_jwt, LIVEKIT_API_SECRET, algorithms=["HS256"])
now = int(time.time())
decoded["nbf"] = now - 120
decoded["iat"] = now - 120
skew_safe_token = jwt.encode(decoded, LIVEKIT_API_SECRET, algorithm="HS256")

with httpx.Client(timeout=30.0) as client:
    headers = {
        "x-api-key": TAVUS_API_KEY,
        "Content-Type": "application/json"
    }

    # Case A: pal_id only
    print("\n[Case A] Testing pal_id ONLY ('p5277ac17937')...")
    resp_a = client.post(
        "https://tavusapi.com/v2/conversations",
        headers=headers,
        json={
            "pal_id": "p5277ac17937",
            "properties": {
                "livekit_ws_url": LIVEKIT_URL,
                "livekit_room_token": skew_safe_token,
            }
        }
    )
    print(f"Status: {resp_a.status_code}")
    print(f"Body: {resp_a.text}")
    if resp_a.status_code in (200, 201):
        cid = resp_a.json().get("conversation_id")
        client.delete(f"https://tavusapi.com/v2/conversations/{cid}", headers=headers)
        print("  -> Cleaned up Case A")

    # Case B: pal_id + face_id
    print("\n[Case B] Testing pal_id + face_id ('p5277ac17937' + 'r3f427f43c9d')...")
    resp_b = client.post(
        "https://tavusapi.com/v2/conversations",
        headers=headers,
        json={
            "pal_id": "p5277ac17937",
            "face_id": "r3f427f43c9d",
            "properties": {
                "livekit_ws_url": LIVEKIT_URL,
                "livekit_room_token": skew_safe_token,
            }
        }
    )
    print(f"Status: {resp_b.status_code}")
    print(f"Body: {resp_b.text}")
    if resp_b.status_code in (200, 201):
        cid = resp_b.json().get("conversation_id")
        client.delete(f"https://tavusapi.com/v2/conversations/{cid}", headers=headers)
        print("  -> Cleaned up Case B")

    # Case C: Check PAL layers / pipeline mode patch if needed
    print("\n[Case C] Inspecting PAL p5277ac17937 layers & patchability...")
    pal_get = client.get(f"https://tavusapi.com/v2/pals/p5277ac17937", headers=headers)
    print(f"PAL Get Status: {pal_get.status_code}")
    if pal_get.status_code == 200:
        d = pal_get.json()
        print(f"  Name: {d.get('name')}")
        print(f"  Pipeline Mode: {d.get('pipeline_mode')}")
        print(f"  Face: {d.get('face_id') or d.get('default_face_id')}")
