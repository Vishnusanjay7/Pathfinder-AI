from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.notification import Notification

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/")
def list_notifications(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Notification).filter(Notification.user_id == int(current_user["sub"])).order_by(Notification.created_at.desc()).all()
    return {"success": True, "notifications": items, "unread_count": sum(not item.is_read for item in items)}


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == int(current_user["sub"])).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    item.is_read = True
    db.commit()
    return {"success": True}
