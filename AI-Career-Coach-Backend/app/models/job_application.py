from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.base import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_key = Column(String(255), nullable=False, index=True)
    job_title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    status = Column(String(50), default="Saved", nullable=False)  # Options: Recommended, Saved, Applied, Interview, Rejected, Offer, Closed
    application_date = Column(DateTime, nullable=True)
    deadline = Column(String(100), nullable=True)
    apply_url = Column(Text, nullable=True)
    salary_range = Column(String(100), nullable=True)
    readiness_score = Column(Float, nullable=True)
    match_score = Column(Float, nullable=True)
    eligibility_status = Column(String(50), nullable=True)
    resume_version = Column(String(100), nullable=True)
    assessment_attempt = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="job_applications")

