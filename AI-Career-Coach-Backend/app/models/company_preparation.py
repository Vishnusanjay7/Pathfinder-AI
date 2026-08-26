from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, Float
from sqlalchemy.orm import relationship

from app.database.base import Base


class CompanyPreparation(Base):
    """Stores company-specific job preparation plans, skill gaps, and progress."""

    __tablename__ = "company_preparations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_key = Column(String(200), nullable=False, index=True)
    company = Column(String(200), nullable=False)
    job_title = Column(String(200), nullable=False)
    job_description = Column(Text, nullable=True)
    location = Column(String(150), nullable=True)
    salary_range = Column(String(100), nullable=True)
    apply_url = Column(String(500), nullable=True)

    readiness_score = Column(Float, default=0.0, nullable=False)
    readiness_level = Column(String(50), default="Moderate", nullable=False)
    score_breakdown = Column(JSON, default=dict, nullable=False)

    matched_skills = Column(JSON, default=list, nullable=False)
    missing_skills = Column(JSON, default=list, nullable=False)
    partial_skills = Column(JSON, default=list, nullable=False)

    roadmap = Column(JSON, default=list, nullable=False)
    technical_questions = Column(JSON, default=list, nullable=False)
    coding_recommendations = Column(JSON, default=list, nullable=False)
    behavioral_questions = Column(JSON, default=list, nullable=False)
    learning_resources = Column(JSON, default=list, nullable=False)

    completed_tasks = Column(JSON, default=list, nullable=False)
    progress_percentage = Column(Float, default=0.0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
