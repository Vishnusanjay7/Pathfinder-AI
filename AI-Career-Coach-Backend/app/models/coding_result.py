from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.orm import relationship

from app.database.base import Base


class CodingResult(Base):
    __tablename__ = "coding_results"

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

    score = Column(
        Float,
        default=0.0
    )

    passed = Column(
        Integer,
        default=0
    )

    failed = Column(
        Integer,
        default=0
    )

    execution_time = Column(
        Float,
        default=0.0
    )

    memory = Column(
        Integer,
        default=0
    )

    ai_review = Column(
        JSON,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    # ==========================
    # Relationships
    # ==========================

    user = relationship(
        "User",
        back_populates="coding_results"
    )

    assessment = relationship(
        "Assessment",
        back_populates="coding_results"
    )

    question = relationship(
        "CodingQuestion"
    )

    def __repr__(self):
        return (
            f"<CodingResult("
            f"id={self.id}, "
            f"user_id={self.user_id}, "
            f"assessment_id={self.assessment_id}, "
            f"question_id={self.question_id}, "
            f"score={self.score})>"
        )