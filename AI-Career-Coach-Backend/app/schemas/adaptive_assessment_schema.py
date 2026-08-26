from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class AdaptiveAssessmentCreate(BaseModel):
    role: str = Field(min_length=2, max_length=100)
    experience_level: str = Field(pattern="^(Beginner|Intermediate|Advanced)$")
    resume_text: str = ""
    ats_score: Optional[int] = Field(default=None, ge=0, le=100)


class MCQAnswerSubmission(BaseModel):
    answers: Dict[str, str]
    time_taken_seconds: int = Field(ge=0, le=14400)


class AdaptiveReportRequest(BaseModel):
    coding_score: float = Field(ge=0, le=100)
    coding_feedback: List[str] = []

