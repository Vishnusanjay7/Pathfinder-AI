import logging
import json
from typing import Dict, Any, List
from fastapi import WebSocket

logger = logging.getLogger("career_coach.v2.ws")


class ConnectionManagerV2:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info(f"[WS-V2] Client connected to session={session_id} (active: {len(self.active_connections[session_id])})")

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        logger.info(f"[WS-V2] Client disconnected from session={session_id}")

    async def send_event(self, session_id: str, event_type: str, payload: Dict[str, Any]):
        if session_id in self.active_connections:
            msg = json.dumps({"event": event_type, "session_id": session_id, "payload": payload})
            for ws in list(self.active_connections[session_id]):
                try:
                    await ws.send_text(msg)
                except Exception as e:
                    logger.warning(f"[WS-V2] Failed to send message to socket in {session_id}: {e}")


ws_manager_v2 = ConnectionManagerV2()
