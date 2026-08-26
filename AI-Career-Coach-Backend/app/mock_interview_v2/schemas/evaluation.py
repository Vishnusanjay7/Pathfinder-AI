from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class TurnEvaluationMetric(BaseModel):
    score: int = Field(..., ge=0, le=100)
    feedback: str


class TurnEvaluation(BaseModel):
    question_number: int
    phase: str
    question_text: str
    candidate_answer: str
    technical_accuracy: int
    communication_clarity: int
    completeness: int
    strengths: List[str] = []
    weaknesses: List[str] = []
    suggested_improvement: str
    overall_turn_score: int


class MetricScore(BaseModel):
    name: str
    score: int
    description: str
    benchmark: str = "Industry Standard (75%)"


class FinalEvaluationReportV2(BaseModel):
    session_id: str
    candidate_name: str
    target_role: str
    interviewer_name: str
    interview_type: str
    difficulty: str
    total_duration_seconds: int
    completed_at: str
    
    # 8 Core Recruitment Metrics
    overall_score: int
    technical_score: int
    communication_score: int
    problem_solving_score: int
    confidence_score: int
    professionalism_score: int
    relevance_score: int
    clarity_score: int
    
    # Granular Breakdown
    metrics_breakdown: List[MetricScore]
    hiring_recommendation: str  # Strong Hire, Hire, Leaning Hire, Do Not Hire
    recommendation_summary: str
    
    top_strengths: List[str]
    areas_for_improvement: List[str]
    technical_gaps: List[str]
    strongest_answer_excerpt: Optional[str] = None
    weakest_answer_excerpt: Optional[str] = None
    
    turn_evaluations: List[TurnEvaluation] = []
