from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database.base import Base


class JobReadinessRecord(Base):
    __tablename__ = "job_readiness_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_key = Column(String(255), nullable=False, index=True)
    job_title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    resume_version = Column(String(100), nullable=False)

    assessment_attempt = Column(Integer, default=1, nullable=False)
    assessment_status = Column(String(50), default="not_started", nullable=False)  # not_started, completed
    assessment_score = Column(Float, default=0.0, nullable=False)
    assessment_data = Column(JSON, nullable=True)

    resume_analysis_data = Column(JSON, nullable=True)
    eligibility_status = Column(String(50), default="ASSESSMENT_REQUIRED", nullable=False)
    eligibility_reason = Column(Text, nullable=True)
    is_valid = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="job_readiness_records")
    resume = relationship("Resume", backref="job_readiness_records")

    def __repr__(self):
        return (
            f"<JobReadinessRecord("
            f"id={self.id}, user_id={self.user_id}, job_key='{self.job_key}', "
            f"status='{self.eligibility_status}', score={self.assessment_score})>"
        )
