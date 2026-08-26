from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.services.resume_service import resume_service

router = APIRouter(
    prefix="/api/resumes",
    tags=["Resume History"]
)


@router.get("/")
def get_resume_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    resumes = resume_service.get_user_resumes(
        db,
        int(current_user["sub"])
    )

    return {
        "success": True,
        "count": len(resumes),
        "resumes": resumes
    }


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    deleted_resume = resume_service.delete_resume(
        db,
        resume_id,
        int(current_user["sub"])
    )

    if deleted_resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found or user not authorized."
        )

    return {
        "success": True,
        "message": "Resume deleted successfully."
    }