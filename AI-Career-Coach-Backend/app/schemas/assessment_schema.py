from pydantic import BaseModel
from typing import List


class MCQQuestion(BaseModel):
    question: str
    options: List[str]
    answer: str
    difficulty: str


class CodingQuestion(BaseModel):
    title: str
    description: str
    difficulty: str
    language: str
    constraints: List[str]
    sample_input: str
    sample_output: str


class AptitudeQuestion(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: str


class HRQuestion(BaseModel):
    question: str


class AssessmentResult(BaseModel):
    technical_mcq: List[MCQQuestion]
    coding_questions: List[CodingQuestion]
    aptitude_questions: List[AptitudeQuestion]
    hr_questions: List[HRQuestion]


class AssessmentResponse(BaseModel):
    success: bool
    message: str
    result: AssessmentResult