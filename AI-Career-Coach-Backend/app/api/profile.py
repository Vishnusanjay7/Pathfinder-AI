from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.services.user_service import user_service

router = APIRouter(
    prefix="/api/profile",
    tags=["Profile"]
)


@router.get("/me")
def get_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = user_service.get_user(
        db,
        int(current_user["sub"])
    )

    return {
        "success": True,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "college": user.college,
            "degree": user.degree,
            "branch": user.branch,
            "graduation_year": user.graduation_year,
            "profile_image": user.profile_image,
            "is_verified": user.is_verified
        }
    }


@router.put("/update")
def update_profile(
    request: dict,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed_fields = {
        key: value for key, value in request.items()
        if key in {"full_name", "phone", "college", "degree", "branch", "graduation_year"}
    }
    user = user_service.update_user(
        db=db,
        user_id=int(current_user["sub"]),
        **allowed_fields
    )

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "college": user.college,
            "degree": user.degree,
            "branch": user.branch,
            "graduation_year": user.graduation_year
        }
    }
