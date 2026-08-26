from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

from runner import runner

app = FastAPI(
    title="Code Execution Engine",
    version="1.0.0"
)


class TestCase(BaseModel):
    input: str
    expected_output: str


class ExecuteRequest(BaseModel):
    language: str
    source_code: str
    test_cases: List[TestCase]


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Code Execution Engine Running"
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "status": "healthy"
    }


@app.get("/languages")
def languages():
    return {
        "success": True,
        "languages": [
            "python",
            "java",
            "c",
            "cpp",
            "javascript"
        ]
    }


@app.post("/execute")
def execute(request: ExecuteRequest):
    return runner.execute(
        language=request.language,
        source_code=request.source_code,
        test_cases=request.test_cases
    )