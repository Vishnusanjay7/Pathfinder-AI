from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.orm import relationship

from app.database.base import Base


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

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

    assessment_id = Column(
        Integer,
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False
    )

    question_id = Column(
        Integer,
        ForeignKey("coding_questions.id", ondelete="CASCADE"),
        nullable=False
    )

    language = Column(
        String(50),
        nullable=False
    )

    source_code = Column(
        Text,
        nullable=False
    )

    submitted_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    execution_time = Column(
        Float,
        default=0.0
    )

    memory = Column(
        Integer,
        default=0
    )

    status = Column(
        String(50),
        default="Submitted"
    )

    score = Column(
        Float,
        default=0.0
    )

    is_passed = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # =====================================
    # Relationships
    # =====================================

    user = relationship(
        "User",
        back_populates="coding_submissions"
    )

    assessment = relationship(
        "Assessment"
    )

    question = relationship(
        "CodingQuestion"
    )

    def __repr__(self):
        return (
            f"<CodingSubmission("
            f"id={self.id}, "
            f"user_id={self.user_id}, "
            f"question_id={self.question_id}, "
            f"language='{self.language}', "
            f"status='{self.status}')>"
        )