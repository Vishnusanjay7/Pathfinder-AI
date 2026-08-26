import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.mock_interview_v2.websocket.manager import ws_manager_v2
from app.mock_interview_v2.interview.session_manager import session_manager_v2

logger = logging.getLogger("career_coach.v2.ws.router")
ws_router_v2 = APIRouter()


@ws_router_v2.websocket("/ws/mock-interview-v2/{session_id}")
async def websocket_endpoint_v2(websocket: WebSocket, session_id: str):
    await ws_manager_v2.connect(session_id, websocket)
    try:
        # Send initial connection acknowledgment
        session = session_manager_v2.get_session(session_id)
        await ws_manager_v2.send_event(
            session_id=session_id,
            event_type="connection_established",
            payload={"session": session.to_dict() if session else None}
        )

        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                event_name = msg.get("event")
                payload = msg.get("payload", {})
                logger.info(f"[WS-V2] Received event '{event_name}' from session={session_id}")

                # Handle ping/pong heartbeat
                if event_name == "ping":
                    await websocket.send_text(json.dumps({"event": "pong", "session_id": session_id}))

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        ws_manager_v2.disconnect(session_id, websocket)
    except Exception as e:
        logger.error(f"[WS-V2] WebSocket error in session {session_id}: {e}", exc_info=True)
        ws_manager_v2.disconnect(session_id, websocket)
