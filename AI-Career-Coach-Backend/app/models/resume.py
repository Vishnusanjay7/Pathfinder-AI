from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database.base import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    original_filename = Column(
        String(255),
        nullable=False
    )

    stored_filename = Column(
        String(255),
        nullable=False
    )

    ats_score = Column(
        Integer,
        default=0
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    raw_text = Column(
        Text,
        nullable=True
    )

    analysis_data = Column(
        JSON,
        nullable=True
    )

    ats_breakdown = Column(
        JSON,
        nullable=True
    )

    extracted_skills = Column(
        JSON,
        nullable=True
    )

    education_data = Column(
        JSON,
        nullable=True
    )

    experience_data = Column(
        JSON,
        nullable=True
    )

    projects_data = Column(
        JSON,
        nullable=True
    )

    certifications_data = Column(
        JSON,
        nullable=True
    )

    upload_date = Column(
        DateTime,
        default=datetime.utcnow
    )

    # ==========================================
    # Relationships
    # ==========================================

    user = relationship(
        "User",
        back_populates="resumes"
    )

    def __repr__(self):
        return (
            f"<Resume("
            f"id={self.id}, "
            f"user_id={self.user_id}, "
            f"ats_score={self.ats_score})>"
        )