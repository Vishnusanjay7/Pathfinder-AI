from fastapi import APIRouter, HTTPException
from fastapi import Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user

from app.schemas.coding_schema import CodeSubmission

from app.services.execution_service import execution_service
from app.services.coding_result_service import coding_result_service
from app.models.test_case import TestCase
from app.models.coding_question import CodingQuestion

router = APIRouter(prefix="/api/coding", tags=["Coding"])


@router.get("/")
def coding_home():
    return {
        "success": True,
        "message": "Coding Module Working"
    }


def _load_question(db: Session, question_id: int) -> CodingQuestion:
    question = db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Coding question not found.")
    return question


def _load_test_cases(db: Session, question_id: int, include_hidden: bool = True) -> list:
    """Load test cases from DB. Filters hidden cases when include_hidden is False."""
    query = db.query(TestCase).filter(TestCase.question_id == question_id)
    if not include_hidden:
        query = query.filter(TestCase.is_public == True)  # noqa: E712
    return [
        {
            "input": item.input_data,
            "expected_output": item.expected_output,
            "is_public": item.is_public,
        }
        for item in query.all()
    ]


@router.post("/run")
def run_code(
    request: CodeSubmission,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run code against the VISIBLE test cases only.
    This does NOT persist any result and never exposes hidden cases.
    """
    question = _load_question(db, request.question_id)
    test_cases = _load_test_cases(db, request.question_id, include_hidden=False)
    if not test_cases:
        raise HTTPException(status_code=400, detail="No visible test cases available for this question.")
    try:
        result = execution_service.execute_code(
            language=request.language,
            source_code=request.source_code,
            test_cases=test_cases,
            question={
                "title": question.title,
                "description": question.description,
                "constraints": question.constraints or [],
                "expected_time_complexity": question.expected_time_complexity,
                "expected_space_complexity": question.expected_space_complexity,
            },
            include_public=True,
            include_hidden=False,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Code execution service is temporarily unavailable. Please try again later.") from exc
    return result


@router.post("/submit")
def submit_code(
    request: CodeSubmission,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute code against visible AND hidden test cases.
    Hidden test cases and their expected outputs are NEVER returned to the client.
    """
    question = _load_question(db, request.question_id)
    test_cases = _load_test_cases(db, request.question_id, include_hidden=True)
    if not test_cases:
        raise HTTPException(status_code=400, detail="No test cases available for this question.")
    try:
        result = execution_service.execute_code(
            language=request.language,
            source_code=request.source_code,
            test_cases=test_cases,
            question={
                "title": question.title,
                "description": question.description,
                "constraints": question.constraints or [],
                "expected_time_complexity": question.expected_time_complexity,
                "expected_space_complexity": question.expected_space_complexity,
            },
            include_public=True,
            include_hidden=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Code execution service is temporarily unavailable. Please try again later.") from exc

    save_data = {
        "user_id": int(current_user["sub"]),
        "assessment_id": request.assessment_id,
        "question_id": request.question_id,
        "language": request.language,
        "source_code": request.source_code,
        "score": result["score"],
        "passed": result["passed"],
        "failed": result["failed"],
        "execution_time": result["average_execution_time"],
        "memory": result["maximum_memory"],
        "ai_review": result["ai_review"]
    }

    coding_result_service.save(
        db,
        save_data
    )

    return result


@router.get("/history")
def get_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return [item for item in coding_result_service.get_all(db) if item.user_id == int(current_user["sub"])]


@router.get("/history/{result_id}")
def get_result(
    result_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = coding_result_service.get_by_id(
        db,
        result_id
    )
    if result is None or result.user_id != int(current_user["sub"]):
        raise HTTPException(status_code=404, detail="Submission not found.")
    return result


@router.delete("/history/{result_id}")
def delete_result(
    result_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    result = coding_result_service.get_by_id(db, result_id)
    if result is None or result.user_id != int(current_user["sub"]):
        raise HTTPException(status_code=404, detail="Submission not found.")
    success = coding_result_service.delete(
        db,
        result_id
    )

    return {
        "success": success
    }
