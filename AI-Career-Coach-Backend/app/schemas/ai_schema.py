from typing import List, Optional
from pydantic import BaseModel, Field


class QuestionItemSchema(BaseModel):
    question_number: int = Field(..., description="1-indexed sequence number of the question")
    question: str = Field(..., description="The interview question text")
    question_type: str = Field(..., description="HR, Personal, Resume, Project, Company, Behavioral, or Technical")
    topic: str = Field(default="General", description="Primary topic or domain tested")
    difficulty: str = Field(default="Medium", description="Easy, Medium, or Hard")


class QuestionListSchema(BaseModel):
    questions: List[QuestionItemSchema] = Field(..., description="Array of generated interview questions")


class AnswerEvaluationSchema(BaseModel):
    score: int = Field(default=75, description="Overall answer score (0-100)")
    technical_score: int = Field(default=75, description="Technical depth and accuracy score (0-100)")
    communication_score: int = Field(default=80, description="Communication and expression score (0-100)")
    english_score: int = Field(default=80, description="Spoken English and grammar score (0-100)")
    relevance_score: int = Field(default=80, description="Relevance to question score (0-100)")
    clarity_score: int = Field(default=80, description="Clarity and conciseness score (0-100)")
    fluency_score: int = Field(default=80, description="Pacing and fluency score (0-100)")
    strengths: List[str] = Field(default_factory=list, description="Key strengths identified in response")
    weaknesses: List[str] = Field(default_factory=list, description="Key areas for improvement")
    feedback: str = Field(default="", description="Detailed qualitative feedback comment")
    follow_up_question: str = Field(default="", description="Targeted follow-up question probing response details")


class InterviewReportSchema(BaseModel):
    technical_score: int = Field(default=75, description="Average technical score")
    communication_score: int = Field(default=80, description="Average communication score")
    english_score: int = Field(default=80, description="Average English fluency score")
    body_language_score: int = Field(default=85, description="Body language and engagement score")
    overall_score: int = Field(default=78, description="Overall interview score")
    readiness_score: int = Field(default=75, description="Placement readiness score")
    strengths: List[str] = Field(default_factory=list, description="Overall strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Overall weaknesses")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations")
