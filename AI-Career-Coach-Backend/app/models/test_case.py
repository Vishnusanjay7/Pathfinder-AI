from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Boolean

from sqlalchemy.orm import relationship

from app.database.base import Base


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    question_id = Column(
        Integer,
        ForeignKey("coding_questions.id", ondelete="CASCADE"),
        nullable=False
    )

    input_data = Column(
        Text,
        nullable=False
    )

    expected_output = Column(
        Text,
        nullable=False
    )

    is_public = Column(
        Boolean,
        default=True
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

    question = relationship(
        "CodingQuestion",
        back_populates="test_cases"
    )

    def __repr__(self):
        return (
            f"<TestCase("
            f"id={self.id}, "
            f"question_id={self.question_id}, "
            f"is_public={self.is_public})>"
        )