from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.database.base import Base


class AdaptiveAssessment(Base):
    """Persistent state for the unified MCQ -> coding -> report workflow."""

    __tablename__ = "adaptive_assessments"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(100), nullable=False)
    experience_level = Column(String(30), nullable=False)
    status = Column(String(30), default="mcq", nullable=False)
    skills = Column(JSON, default=list, nullable=False)
    mcq_questions = Column(JSON, default=list, nullable=False)
    mcq_result = Column(JSON, nullable=True)
    coding_question_id = Column(Integer, ForeignKey("coding_questions.id"), nullable=True)
    report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    assessment = relationship("Assessment")
    coding_question = relationship("CodingQuestion")
