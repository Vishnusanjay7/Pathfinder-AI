from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String

from sqlalchemy.orm import relationship

from app.database.base import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title = Column(
        String(255),
        nullable=False
    )

    difficulty = Column(
        String(50),
        default="Medium"
    )

    language = Column(
        String(50),
        default="Java"
    )

    total_questions = Column(
        Integer,
        default=0
    )

    score = Column(
        Integer,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="assessments"
    )

    results = relationship(
        "AssessmentResult",
        back_populates="assessment",
        cascade="all, delete"
    )

    coding_results = relationship(
        "CodingResult",
        back_populates="assessment",
        cascade="all, delete"
    )