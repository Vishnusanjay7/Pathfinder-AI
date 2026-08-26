from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.adaptive_assessment import AdaptiveAssessment
from app.models.learning_progress import LearningProgress
from app.schemas.learning_schema import LearningProgressUpdate

router = APIRouter(prefix="/api/learning-center", tags=["Learning Center"])


def serialize_progress(item: LearningProgress):
    return {"id": item.id, "resource_type": item.resource_type, "resource_key": item.resource_key, "title": item.title, "status": item.status, "completed_at": item.completed_at}


@router.get("/overview")
def overview(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = int(current_user["sub"])
    assessment = db.query(AdaptiveAssessment).filter(AdaptiveAssessment.user_id == user_id, AdaptiveAssessment.report.isnot(None)).order_by(AdaptiveAssessment.completed_at.desc()).first()
    progress = db.query(LearningProgress).filter(LearningProgress.user_id == user_id).order_by(LearningProgress.completed_at.desc()).all()
    if assessment is None:
        return {"success": True, "report": None, "progress": [], "charts": {"weekly": [], "monthly": []}}
    weekly = Counter(item.completed_at.strftime("%Y-W%W") for item in progress)
    monthly = Counter(item.completed_at.strftime("%Y-%m") for item in progress)
    return {"success": True, "report": assessment.report, "progress": [serialize_progress(item) for item in progress], "charts": {"weekly": [{"label": key, "completed": value} for key, value in sorted(weekly.items())], "monthly": [{"label": key, "completed": value} for key, value in sorted(monthly.items())]}}


@router.post("/progress")
def mark_complete(request: LearningProgressUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = int(current_user["sub"])
    item = db.query(LearningProgress).filter(LearningProgress.user_id == user_id, LearningProgress.resource_type == request.resource_type, LearningProgress.resource_key == request.resource_key).first()
    if item is None:
        item = LearningProgress(user_id=user_id, **request.model_dump())
        db.add(item)
    else:
        item.title = request.title
        item.status = request.status
        item.completed_at = datetime.utcnow()
    db.commit(); db.refresh(item)
    return {"success": True, "progress": serialize_progress(item)}


@router.get("/history")
def history(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(LearningProgress).filter(LearningProgress.user_id == int(current_user["sub"])).order_by(LearningProgress.completed_at.desc()).all()
    return {"success": True, "history": [serialize_progress(item) for item in items]}
