from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class WebSocketEvent(BaseModel):
    event: str
    session_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    payload: Dict[str, Any] = {}
