from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationService:
    def create(self, db: Session, user_id: int, category: str, title: str, message: str) -> Notification:
        notification = Notification(user_id=user_id, category=category, title=title, message=message)
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification


notification_service = NotificationService()
