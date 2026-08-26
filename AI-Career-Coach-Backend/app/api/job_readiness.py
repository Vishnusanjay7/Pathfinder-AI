from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.services.job_readiness_service import job_readiness_service

router = APIRouter(
    prefix="/api/job-readiness",
    tags=["Job Readiness & Application Gating"]
)


class StartAssessmentRequest:
    job_title: str
    company: str
    job_description: Optional[str] = ""
    required_skills: Optional[List[str]] = []


@router.post("/{job_key}/assessment/start", summary="Start Job-Specific Self Assessment")
def start_assessment(
    job_key: str,
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = int(current_user["sub"])
        job_title = payload.get("job_title", "Software Developer")
        company = payload.get("company", "Employer")
        job_description = payload.get("job_description", "")
        required_skills = payload.get("required_skills", [])

        res = job_readiness_service.start_assessment(
            db=db,
            user_id=user_id,
            job_key=job_key,
            job_title=job_title,
            company=company,
            job_description=job_description,
            required_skills=required_skills
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start assessment: {str(e)}")


@router.post("/{job_key}/assessment/submit", summary="Submit Assessment Answers")
def submit_assessment(
    job_key: str,
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = int(current_user["sub"])
        answers = payload.get("answers", {})
        res = job_readiness_service.submit_assessment(
            db=db,
            user_id=user_id,
            job_key=job_key,
            user_answers=answers
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit assessment: {str(e)}")


@router.get("/{job_key}/assessment", summary="Get Active Assessment Status")
def get_assessment(
    job_key: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = int(current_user["sub"])
        report = job_readiness_service.get_match_report(db, user_id, job_key)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_key}/resume-analysis", summary="Run Deep Resume vs Job Analysis")
def run_resume_analysis(
    job_key: str,
    payload: Dict[str, Any] = Body(default={}),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = int(current_user["sub"])
        job_title = payload.get("job_title", "Software Developer")
        company = payload.get("company", "Employer")
        job_description = payload.get("job_description", "")

        res = job_readiness_service.perform_deep_resume_analysis(
            db=db,
            user_id=user_id,
            job_key=job_key,
            job_title=job_title,
            company=company,
            job_description=job_description
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_key}/match-report", summary="Get Combined Match & Readiness Report")
def get_match_report(
    job_key: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = int(current_user["sub"])
        res = job_readiness_service.get_match_report(db, user_id, job_key)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_key}/eligibility", summary="Check Application Eligibility Status")
def get_eligibility(
    job_key: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = int(current_user["sub"])
        is_eligible, status, reason, record = job_readiness_service.check_eligibility_for_apply(db, user_id, job_key)
        return {
            "success": True,
            "is_eligible": is_eligible,
            "eligibility_status": status,
            "reason": reason,
            "match_score": (record.resume_analysis_data.get("overall_fit_score") if record and record.resume_analysis_data else 0.0),
            "assessment_score": (record.assessment_score if record else 0.0),
            "attempt": (record.assessment_attempt if record else 1),
            "resume_version": (record.resume_version if record else None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_key}/retake", summary="Retake Job Assessment")
def retake_assessment(
    job_key: str,
    payload: Dict[str, Any] = Body(default={}),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_id = int(current_user["sub"])
        job_title = payload.get("job_title", "Software Developer")
        company = payload.get("company", "Employer")
        job_description = payload.get("job_description", "")

        res = job_readiness_service.retake_assessment(
            db=db,
            user_id=user_id,
            job_key=job_key,
            job_title=job_title,
            company=company,
            job_description=job_description
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
