from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class InterviewStartRequestV2(BaseModel):
    interviewer_id: str = "female_hr"
    target_role: str = "Senior Software Engineer"
    job_description: Optional[str] = None
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    experience_level: str = "Mid-Senior"
    interview_type: str = "Comprehensive HR & Technical"
    difficulty: str = "Hard"
    candidate_name: Optional[str] = "Candidate"
    resume_context: Optional[str] = None


class InterviewTurnRequestV2(BaseModel):
    session_id: str
    phase: str
    question_number: int
    question_text: str
    candidate_answer: str
    elapsed_seconds: Optional[int] = 0


class InterviewQuestionV2(BaseModel):
    id: str
    number: int
    phase: str
    question: str
    category: str
    expected_competency: str
    context_reason: Optional[str] = None
    created_at: str


class InterviewSessionResponseV2(BaseModel):
    success: bool = True
    session_id: str
    interviewer_id: str
    target_role: str
    difficulty: str
    status: str
    current_phase: str
    current_question: Optional[InterviewQuestionV2] = None
    created_at: str
