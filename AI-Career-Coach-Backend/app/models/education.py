from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String

from sqlalchemy.orm import relationship

from app.database.base import Base


class Education(Base):
    __tablename__ = "education"

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

    institution = Column(
        String(255),
        nullable=False
    )

    degree = Column(
        String(150),
        nullable=False
    )

    field_of_study = Column(
        String(150),
        nullable=True
    )

    start_year = Column(
        Integer,
        nullable=True
    )

    end_year = Column(
        Integer,
        nullable=True
    )

    grade = Column(
        String(50),
        nullable=True
    )

    description = Column(
        String(500),
        nullable=True
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

    # ==========================================
    # Relationships
    # ==========================================

    user = relationship(
        "User",
        back_populates="education"
    )

    def __repr__(self):
        return (
            f"<Education("
            f"id={self.id}, "
            f"institution='{self.institution}', "
            f"degree='{self.degree}')>"
        )