from pydantic import BaseModel
from datetime import datetime


class CodingResultResponse(BaseModel):

    id: int

    user_id: int

    assessment_id: int

    question_id: int

    language: str

    score: float

    passed: int

    failed: int

    execution_time: float

    memory: int

    ai_review: dict

    created_at: datetime

    class Config:
        from_attributes = True