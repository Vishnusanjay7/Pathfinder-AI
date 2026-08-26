import os
import json
import base64
import time
from dotenv import load_dotenv
from livekit import api

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

tok = (
    api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    .with_kind("agent")
    .with_identity("tavus_avatar_interviewer")
    .with_name("AI HR Interviewer")
    .with_grants(api.VideoGrants(room_join=True, room="test_room", can_publish=True, can_subscribe=True))
    .to_jwt()
)

parts = tok.split(".")
header = json.loads(base64.b64decode(parts[0] + "==").decode())
payload = json.loads(base64.b64decode(parts[1] + "==").decode())

print("Header:", header)
print("Payload:", json.dumps(payload, indent=2))
print("Current time:", int(time.time()))
print("nbf:", payload.get("nbf"))
print("Difference (nbf - now):", payload.get("nbf", 0) - int(time.time()))
