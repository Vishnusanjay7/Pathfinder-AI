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

grant = api.VideoGrants(
    room_join=True,
    room="test_echo_room",
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

    # Standard echo conversation request
    payload = {
        "pal_id": "p5277ac17937",
        "face_id": "r3f427f43c9d",
        "properties": {
            "livekit_ws_url": LIVEKIT_URL,
            "livekit_room_token": skew_safe_token,
            "max_call_duration": 3600
        }
    }
    resp = client.post("https://tavusapi.com/v2/conversations", headers=headers, json=payload)
    print("Echo conversation POST status:", resp.status_code)
    print("Echo conversation POST body:", resp.text)
