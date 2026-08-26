from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, root_validator


class StartInterviewRequest(BaseModel):
    target_role: str = Field(default="Software Engineer", description="Target job role")
    role: Optional[str] = None
    interview_type: str = Field(default="Technical", description="HR, Technical, Behavioral, or Mixed")
    difficulty: str = Field(default="Intermediate", description="Beginner, Intermediate, Advanced, Easy, Medium, Hard")
    question_count: int = Field(default=5, description="Number of questions (5, 10, 15)")
    count: Optional[int] = None
    avatar_id: Optional[str] = "female_hr_01"
    voice_id: Optional[str] = "en_female_01"
    language: Optional[str] = "en-US"
    skills: Optional[List[str]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    weak_topics: Optional[List[str]] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    resume: Optional[str] = None
    resume_text: Optional[str] = None

    @root_validator(pre=True)
    def normalize_aliases(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(values, dict):
            return values
        # Map role -> target_role if provided
        if "role" in values and values["role"] and not values.get("target_role"):
            values["target_role"] = values["role"]
        elif not values.get("target_role") and values.get("role"):
            values["target_role"] = values["role"]
            
        # Map count -> question_count if provided
        if "count" in values and values["count"] is not None and not values.get("question_count"):
            values["question_count"] = values["count"]
            
        # Normalize difficulty
        diff = values.get("difficulty")
        if diff:
            diff_str = str(diff).capitalize()
            if diff_str in ["Easy", "Beginner"]:
                values["difficulty"] = "Beginner"
            elif diff_str in ["Medium", "Intermediate"]:
                values["difficulty"] = "Intermediate"
            elif diff_str in ["Hard", "Advanced"]:
                values["difficulty"] = "Advanced"

        # Ensure question_count is int
        qc = values.get("question_count")
        if qc is not None:
            try:
                values["question_count"] = max(1, min(20, int(qc)))
            except (ValueError, TypeError):
                values["question_count"] = 5
        else:
            values["question_count"] = 5

        return values


class InterviewQuestionSchema(BaseModel):
    id: Optional[int] = None
    question_number: int
    question: str
    question_type: str
    difficulty: str
    topic: Optional[str] = None


class QuestionGenerationResponse(BaseModel):
    success: bool
    target_role: Optional[str] = None
    role: Optional[str] = None
    interview_type: Optional[str] = None
    difficulty: Optional[str] = None
    question_count: Optional[int] = None
    questions: List[InterviewQuestionSchema]


class InterviewSessionResponse(BaseModel):
    success: bool
    interview_id: int
    target_role: str
    interview_type: str
    difficulty: str
    question_count: int
    avatar_id: Optional[str] = "female_hr_01"
    voice_id: Optional[str] = "en_female_01"
    language: Optional[str] = "en-US"
    questions: List[InterviewQuestionSchema]


class AnswerSubmissionRequest(BaseModel):
    question_id: int
    transcript: str
    body_language_observations: Optional[List[str]] = []


class AnswerEvaluationResponse(BaseModel):
    success: bool
    answer_id: int
    answer_score: int
    technical_score: int
    communication_score: int
    grammar_score: int
    fluency_score: int
    clarity_score: int
    relevance_score: int
    feedback: Dict[str, Any]


class InterviewReportData(BaseModel):
    interview_id: int
    target_role: str
    interview_type: str
    difficulty: str
    technical_score: int
    communication_score: int
    english_score: int
    body_language_score: int
    overall_score: int
    readiness_score: int
    readiness_breakdown: Dict[str, Any]
    strengths: List[str]
    weaknesses: List[str]
    body_language_observations: List[str]
    recommendations: List[str]
    created_at: str


class InterviewReportResponse(BaseModel):
    success: bool
    report: InterviewReportData


class InterviewHistoryItem(BaseModel):
    id: int
    target_role: str
    interview_type: str
    difficulty: str
    question_count: int
    status: str
    overall_score: Optional[int] = None
    started_at: str
    completed_at: Optional[str] = None
