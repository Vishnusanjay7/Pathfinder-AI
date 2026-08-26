from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Float

from sqlalchemy.orm import relationship

from app.database.base import Base


class CodingQuestion(Base):
    __tablename__ = "coding_questions"

    id = Column(Integer, primary_key=True)

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    difficulty = Column(
        String(50),
        nullable=False
    )

    language = Column(
        String(50),
        nullable=False
    )

    test_cases = relationship(
        "TestCase",
        back_populates="question",
        cascade="all, delete-orphan"
    )

    constraints = Column(
        JSON,
        nullable=True
    )

    sample_input = Column(Text)

    sample_output = Column(Text)

    expected_time_complexity = Column(
        String(50)
    )

    expected_space_complexity = Column(
        String(50)
    )

    public_test_cases = Column(
        JSON
    )

    # ======================================
    # Interview-Quality Question Metadata
    # ======================================

    topic = Column(
        String(100),
        nullable=True
    )

    tags = Column(
        JSON,
        nullable=True
    )

    input_format = Column(
        Text,
        nullable=True
    )

    output_format = Column(
        Text,
        nullable=True
    )

    explanation = Column(
        Text,
        nullable=True
    )

    time_limit = Column(
        Float,
        default=2.0
    )

    memory_limit = Column(
        Integer,
        default=256
    )

    # Admin-only / server-only fields
    hints = Column(
        JSON,
        nullable=True
    )

    reference_solution = Column(
        Text,
        nullable=True
    )
