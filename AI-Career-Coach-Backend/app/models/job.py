from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.orm import relationship

from app.database.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    location = Column(
        String(200),
        nullable=True
    )

    employment_type = Column(
        String(100),
        nullable=True
    )

    experience = Column(
        String(100),
        nullable=True
    )

    salary = Column(
        String(100),
        nullable=True
    )

    required_skills = Column(
        Text,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(50),
        default="Open"
    )

    apply_link = Column(
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

    # ======================================
    # Relationships
    # ======================================

    company = relationship(
        "Company",
        back_populates="jobs"
    )

    user = relationship(
        "User",
        back_populates="jobs"
    )

    def __repr__(self):
        return (
            f"<Job("
            f"id={self.id}, "
            f"title='{self.title}', "
            f"company_id={self.company_id})>"
        )