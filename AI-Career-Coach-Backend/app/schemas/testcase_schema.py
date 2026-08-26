from pydantic import BaseModel
from typing import List


class TestCase(BaseModel):
    input: str
    expected_output: str


class CodeExecutionRequest(BaseModel):
    assessment_id: int
    question_id: int
    language: str
    source_code: str
    test_cases: List[TestCase]