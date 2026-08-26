from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.company_preparation import CompanyPreparation
from app.schemas.company_preparation_schema import CompanyPrepAnalyzeRequest, ProgressUpdateRequest
from app.services.company_preparation_service import company_preparation_service

router = APIRouter(
    prefix="/api/company-preparation",
    tags=["Company Job Preparation"]
)


@router.post("/analyze", summary="Analyze Job vs Candidate and Generate Company Preparation Plan")
def analyze_company_prep(
    request: CompanyPrepAnalyzeRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    try:
        prep = company_preparation_service.analyze_job_prep(
            db=db,
            user_id=user_id,
            job_key=request.job_key,
            company=request.company,
            job_title=request.job_title,
            job_description=request.job_description or "",
            location=request.location,
            salary_range=request.salary_range,
            apply_url=request.apply_url,
            duration_days=request.duration_days or 7
        )
        return {"success": True, "preparation": prep}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", summary="Get User Preparation Sessions")
def get_preparation_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    sessions = db.query(CompanyPreparation).filter(CompanyPreparation.user_id == user_id).order_by(CompanyPreparation.updated_at.desc()).all()
    return {"success": True, "preparations": sessions}


@router.get("/{prep_id}", summary="Get Specific Preparation Session")
def get_company_prep(
    prep_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    prep = db.query(CompanyPreparation).filter(
        CompanyPreparation.id == prep_id,
        CompanyPreparation.user_id == user_id
    ).first()
    if not prep:
        raise HTTPException(status_code=404, detail="Preparation session not found.")
    return {"success": True, "preparation": prep}


@router.post("/{prep_id}/progress", summary="Update Task Completion Progress")
def update_progress(
    prep_id: int,
    request: ProgressUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    prep = db.query(CompanyPreparation).filter(
        CompanyPreparation.id == prep_id,
        CompanyPreparation.user_id == user_id
    ).first()
    if not prep:
        raise HTTPException(status_code=404, detail="Preparation session not found.")

    prep.completed_tasks = request.completed_tasks
    total_tasks = sum(len(day.get("tasks", [])) for day in (prep.roadmap or []))
    if total_tasks > 0:
        prep.progress_percentage = round(len(request.completed_tasks) / total_tasks * 100, 1)
    else:
        prep.progress_percentage = 0.0

    db.commit()
    db.refresh(prep)
    return {"success": True, "progress_percentage": prep.progress_percentage, "completed_tasks": prep.completed_tasks}
