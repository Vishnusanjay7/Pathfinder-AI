"""
coding.py

Pydantic schemas for Coding Assessment APIs.
"""

from typing import Any
from typing import Dict
from typing import List
from typing import Optional

from pydantic import BaseModel
from pydantic import Field


# ==========================================================
# Test Case
# ==========================================================

class TestCase(BaseModel):
    input: str = Field(
        ...,
        description="Input for the test case"
    )

    expected_output: str = Field(
        ...,
        description="Expected output"
    )


# ==========================================================
# Execute Code Request
# ==========================================================

class ExecuteCodeRequest(BaseModel):
    language: str = Field(
        ...,
        example="python"
    )

    source_code: str = Field(
        ...,
        description="Source code"
    )

    test_cases: List[TestCase]


# ==========================================================
# Execute Code Result
# ==========================================================

class ExecuteResult(BaseModel):
    input: str

    expected_output: str

    actual_output: str

    passed: bool

    execution_time: float

    memory: int

    status: str


# ==========================================================
# Execute Code Response
# ==========================================================

class ExecuteCodeResponse(BaseModel):
    success: bool

    message: str

    score: float

    passed: int

    failed: int

    total: int

    execution_time: float

    memory: int

    results: List[ExecuteResult]


# ==========================================================
# AI Review Request
# ==========================================================

class ReviewRequest(BaseModel):
    language: str

    question: str

    source_code: str


# ==========================================================
# AI Review Result
# ==========================================================

class ReviewResult(BaseModel):
    correctness: float

    readability: float

    best_practices: float

    optimization: float

    time_complexity: str

    space_complexity: str

    strengths: List[str]

    weaknesses: List[str]

    optimization_suggestions: List[str]

    feedback: List[str]

    overall_score: float


# ==========================================================
# Coding Assessment Request
# ==========================================================

class AssessmentRequest(BaseModel):
    language: str

    question: str

    source_code: str

    test_cases: List[TestCase]


# ==========================================================
# Coding Assessment Response
# ==========================================================

class AssessmentResponse(BaseModel):
    success: bool

    execution: ExecuteCodeResponse

    ai_review: ReviewResult


# ==========================================================
# Coding Question
# ==========================================================

class CodingQuestion(BaseModel):
    id: int

    title: str

    description: str

    difficulty: str

    language: str

    constraints: List[str]

    sample_input: str

    sample_output: str

    expected_time_complexity: str

    expected_space_complexity: str

    public_test_cases: List[TestCase]


# ==========================================================
# Question Generation Response
# ==========================================================

class CodingQuestionResponse(BaseModel):
    questions: List[CodingQuestion]


# ==========================================================
# Save Submission Request
# ==========================================================

class SaveSubmissionRequest(BaseModel):
    user_id: int

    assessment_id: int

    question_id: int

    language: str

    source_code: str


# ==========================================================
# Save Result Response
# ==========================================================

class SaveResultResponse(BaseModel):
    success: bool

    message: str

    score: float

    ai_review: Dict[str, Any]