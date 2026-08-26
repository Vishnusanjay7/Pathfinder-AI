from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.database.base import Base


class LearningProgress(Base):
    __tablename__ = "learning_progress"
    __table_args__ = (UniqueConstraint("user_id", "resource_type", "resource_key", name="uq_learning_progress_resource"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_type = Column(String(40), nullable=False)
    resource_key = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="completed")
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
