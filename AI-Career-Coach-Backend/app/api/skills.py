from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.skill_service import skill_service

router = APIRouter(
    prefix="/skills",
    tags=["Skills"]
)


@router.get("/{user_id}")
def get_user_skills(
    user_id: int,
    db: Session = Depends(get_db)
):
    return {
        "success": True,
        "skills": skill_service.get_skills(
            db,
            user_id
        )
    }