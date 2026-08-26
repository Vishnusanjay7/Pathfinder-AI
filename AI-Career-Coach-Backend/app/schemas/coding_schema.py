from typing import List
from pydantic import BaseModel


# ===========================
# Test Cases
# ===========================

class TestCase(BaseModel):
    input: str
    output: str


# ===========================
# Coding Question
# ===========================

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


# ===========================
# Generate Coding Questions
# ===========================

class CodingQuestionResponse(BaseModel):
    success: bool
    message: str
    questions: List[CodingQuestion]


# ===========================
# Code Submission
# ===========================

class CodeSubmission(BaseModel):
    assessment_id: int
    question_id: int

    language: str

    source_code: str


# ===========================
# Execution Result
# ===========================

class ExecutionResult(BaseModel):
    stdout: str
    stderr: str

    execution_time: str
    memory: str

    status: str


# ===========================
# AI Review
# ===========================

class CodeReview(BaseModel):

    correctness: int

    readability: int

    best_practices: int

    optimization: int

    time_complexity: str

    space_complexity: str

    feedback: List[str]


# ===========================
# Final Coding Report
# ===========================

class CodingResult(BaseModel):

    test_case_score: int

    ai_review_score: int

    overall_score: int

    execution: ExecutionResult

    review: CodeReview


class CodingResultResponse(BaseModel):
    success: bool
    message: str
    result: CodingResult