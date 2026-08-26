import asyncio
import os
import httpx
from dotenv import load_dotenv
from livekit import rtc, api

load_dotenv("c:/AI-Career-Coach/AI-Career-Coach-Backend/.env")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
TAVUS_PAL_ID = "p5277ac17937"
TAVUS_FACE_ID = "r3f427f43c9d"

print(f"LIVEKIT_URL: {LIVEKIT_URL}")
print(f"LIVEKIT_API_KEY exists: {bool(LIVEKIT_API_KEY)}")
print(f"LIVEKIT_API_SECRET exists: {bool(LIVEKIT_API_SECRET)}")
print(f"TAVUS_API_KEY exists: {bool(TAVUS_API_KEY)}")

ROOM_NAME = "test_diagnose_room_001"

async def main():
    # 1. Create LiveKit Token for Avatar
    avatar_token = (
        api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
        .with_kind("agent")
        .with_identity("tavus_avatar_interviewer")
        .with_name("AI HR Interviewer – Professional")
        .with_grants(api.VideoGrants(room_join=True, room=ROOM_NAME, can_publish=True, can_subscribe=True))
        .to_jwt()
    )

    # 2. Create LiveKit Token for Candidate / Diagnostic Listener
    listener_token = (
        api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
        .with_identity("candidate_diagnose_listener")
        .with_name("Candidate Listener")
        .with_grants(api.VideoGrants(room_join=True, room=ROOM_NAME, can_publish=True, can_subscribe=True))
        .to_jwt()
    )

    # 3. Connect diagnostic listener to the room
    room = rtc.Room()

    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        print(f"\n[EVENT] Participant Connected: identity={participant.identity}, name={participant.name}, sid={participant.sid}")

    @room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        print(f"\n[EVENT] Participant Disconnected: identity={participant.identity}, sid={participant.sid}")

    @room.on("track_published")
    def on_track_published(publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        print(f"\n[EVENT] Track Published: kind={publication.kind}, name={publication.name}, sid={publication.sid} by {participant.identity}")

    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        print(f"\n[EVENT] Track Subscribed: kind={track.kind}, sid={track.sid} from {participant.identity}")

    @room.on("track_unsubscribed")
    def on_track_unsubscribed(track: rtc.Track, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        print(f"\n[EVENT] Track Unsubscribed: kind={track.kind} from {participant.identity}")

    print(f"\nConnecting diagnostic listener to room {ROOM_NAME}...")
    await room.connect(LIVEKIT_URL, listener_token)
    print(f"Connected! Local participant: {room.local_participant.identity} (sid={room.local_participant.sid})")
    print(f"Existing remote participants count: {len(room.remote_participants)}")

    # 4. Call Tavus API to start conversation
    print(f"\nCalling Tavus API to create conversation with pal_id={TAVUS_PAL_ID}, face_id={TAVUS_FACE_ID}...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
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
        print(f"Tavus response status: {resp.status_code}")
        print(f"Tavus response body: {resp.text}")

        conv_data = resp.json()
        conv_id = conv_data.get("conversation_id")

    # 5. Wait and monitor room for 30 seconds
    print(f"\nMonitoring room events for up to 30 seconds for conversation_id={conv_id}...")
    for i in range(30):
        await asyncio.sleep(1)
        if i % 5 == 0:
            print(f"  [{i}s] Remote participants: {len(room.remote_participants)} -> {[p.identity for p in room.remote_participants.values()]}")
            if conv_id:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    c_resp = await client.get(
                        f"https://tavusapi.com/v2/conversations/{conv_id}",
                        headers={"x-api-key": TAVUS_API_KEY}
                    )
                    print(f"      Tavus status check: {c_resp.status_code} -> {c_resp.text[:200]}")

    # 6. Cleanup
    if conv_id:
        print(f"\nCleaning up Tavus conversation {conv_id}...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            del_resp = await client.delete(
                f"https://tavusapi.com/v2/conversations/{conv_id}",
                headers={"x-api-key": TAVUS_API_KEY}
            )
            print(f"Delete status: {del_resp.status_code}")

    await room.disconnect()
    print("Test finished.")

if __name__ == "__main__":
    asyncio.run(main())
