from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.orm import relationship

from app.database.base import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(200),
        nullable=False,
        unique=True
    )

    website = Column(
        String(500),
        nullable=True
    )

    careers_url = Column(
        String(500),
        nullable=True
    )

    linkedin_url = Column(
        String(500),
        nullable=True
    )

    location = Column(
        String(200),
        nullable=True
    )

    logo = Column(
        String(500),
        nullable=True
    )

    description = Column(
        Text,
        nullable=True
    )

    industry = Column(
        String(150),
        nullable=True
    )

    company_size = Column(
        String(100),
        nullable=True
    )

    founded_year = Column(
        Integer,
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

    jobs = relationship(
        "Job",
        back_populates="company",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return (
            f"<Company("
            f"id={self.id}, "
            f"name='{self.name}')>"
        )