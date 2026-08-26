import os
import httpx
import json
import jwt
import time
import datetime
from dotenv import load_dotenv
from livekit import api
from app.auth.jwt_handler import create_access_token
from app.database.session import SessionLocal
from app.models.user import User

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

BASE_URL = "http://127.0.0.1:8000"
TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
PAL_ID = "p5277ac17937"
FACE_ID = "r3f427f43c9d"

print("======================================================================")
print("  STEP 1: VERIFY FASTAPI MOCK INTERVIEW ROUTES")
print("======================================================================")

db = SessionLocal()
user = db.query(User).first()
token = create_access_token({"sub": str(user.id), "email": user.email})
auth_headers = {"Authorization": f"Bearer {token}"}

with httpx.Client(timeout=90.0) as client:
    # 1. GET /api/mock-interview/avatars
    r_avatars = client.get(f"{BASE_URL}/api/mock-interview/avatars", headers=auth_headers)
    print(f"1. GET  /api/mock-interview/avatars         -> Status: {r_avatars.status_code}")
    assert r_avatars.status_code == 200, f"Failed avatars route: {r_avatars.text}"

    # 2. GET /api/mock-interview/history
    r_hist = client.get(f"{BASE_URL}/api/mock-interview/history", headers=auth_headers)
    print(f"2. GET  /api/mock-interview/history         -> Status: {r_hist.status_code}")
    assert r_hist.status_code == 200, f"Failed history route: {r_hist.text}"

    # 3. POST /api/mock-interview/start
    r_start = client.post(
        f"{BASE_URL}/api/mock-interview/start",
        headers=auth_headers,
        json={
            "target_role": "Software Engineer",
            "interview_type": "HR",
            "difficulty": "Medium",
            "question_count": 3,
            "avatar_id": "ai_hr_interviewer_professional"
        }
    )
    print(f"3. POST /api/mock-interview/start           -> Status: {r_start.status_code}")
    assert r_start.status_code == 200, f"Failed start route: {r_start.text}"
    interview_data = r_start.json()
    interview_id = interview_data["interview_id"]
    print(f"   Created Interview ID: {interview_id} with {len(interview_data['questions'])} questions")

    # 4. POST /api/mock-interview/voice/session
    r_voice = client.post(
        f"{BASE_URL}/api/mock-interview/voice/session",
        headers=auth_headers,
        json={
            "room_name": f"interview_room_{interview_id}",
            "avatar_id": "ai_hr_interviewer_professional"
        }
    )
    print(f"4. POST /api/mock-interview/voice/session   -> Status: {r_voice.status_code}")
    assert r_voice.status_code == 200, f"Failed voice/session route: {r_voice.text}"

    # 5. GET /api/mock-interview/{interview_id}
    r_get = client.get(f"{BASE_URL}/api/mock-interview/{interview_id}", headers=auth_headers)
    print(f"5. GET  /api/mock-interview/{interview_id}         -> Status: {r_get.status_code}")
    assert r_get.status_code == 200, f"Failed get interview route: {r_get.text}"

    # Complete interview to verify report route
    r_comp = client.post(f"{BASE_URL}/api/mock-interview/{interview_id}/complete", headers=auth_headers)
    print(f"   POST /api/mock-interview/{interview_id}/complete -> Status: {r_comp.status_code}")

    # 6. GET /api/mock-interview/{interview_id}/report
    r_rep = client.get(f"{BASE_URL}/api/mock-interview/{interview_id}/report", headers=auth_headers)
    print(f"6. GET  /api/mock-interview/{interview_id}/report  -> Status: {r_rep.status_code}")
    assert r_rep.status_code == 200, f"Failed report route: {r_rep.text}"

print("\n  ALL 6 MOCK INTERVIEW ROUTES VERIFIED: PASS (Zero 404/422 errors)\n")

print("======================================================================")
print("  STEP 2: ISOLATED TAVUS PAL & SESSION TEST")
print("======================================================================")

with httpx.Client(timeout=30.0) as client:
    tavus_headers = {
        "x-api-key": TAVUS_API_KEY,
        "Content-Type": "application/json"
    }

    # Inspect PAL
    pal_res = client.get(f"https://tavusapi.com/v2/pals/{PAL_ID}", headers=tavus_headers)
    print(f"PAL ID {PAL_ID} Check: Status={pal_res.status_code}")
    if pal_res.status_code == 200:
        pd = pal_res.json()
        print(f"  Name: {pd.get('pal_name') or pd.get('name')}")
        print(f"  Pipeline Mode: {pd.get('pipeline_mode')}")
        print(f"  Face: {pd.get('default_face_id') or pd.get('face_id')}")

    # Generate token
    test_room = f"test_iso_room_{int(time.time())}"
    grant = api.VideoGrants(room_join=True, room=test_room, can_publish=True, can_subscribe=True, can_publish_data=True)
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

    # Call Tavus conversation creation
    payload = {
        "pal_id": PAL_ID,
        "face_id": FACE_ID,
        "properties": {
            "livekit_ws_url": LIVEKIT_URL,
            "livekit_room_token": skew_safe_token,
            "max_call_duration": 3600
        }
    }
    conv_res = client.post("https://tavusapi.com/v2/conversations", headers=tavus_headers, json=payload)
    print(f"\nTavus Conversation Creation Test:")
    print(f"  HTTP Status: {conv_res.status_code}")
    print(f"  Sanitized Body: {conv_res.text}")
    if conv_res.status_code in (200, 201):
        cid = conv_res.json().get("conversation_id")
        print(f"  Conversation ID created: {cid}")
        client.delete(f"https://tavusapi.com/v2/conversations/{cid}", headers=tavus_headers)
        print("  Cleaned up conversation.")
