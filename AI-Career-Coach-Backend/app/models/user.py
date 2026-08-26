from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String

from sqlalchemy.orm import relationship

from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    full_name = Column(
        String(150),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    phone = Column(
        String(20),
        nullable=True
    )

    college = Column(
        String(255),
        nullable=True
    )

    degree = Column(
        String(100),
        nullable=True
    )

    branch = Column(
        String(100),
        nullable=True
    )

    graduation_year = Column(
        Integer,
        nullable=True
    )

    profile_image = Column(
        String(255),
        nullable=True
    )

    is_verified = Column(
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

    # ==========================================
    # Relationships
    # ==========================================

    resumes = relationship(
        "Resume",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    assessments = relationship(
        "Assessment",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    coding_submissions = relationship(
        "CodingSubmission",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    coding_results = relationship(
        "CodingResult",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    jobs = relationship(
        "Job",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    skills = relationship(
        "Skill",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    education = relationship(
        "Education",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    experience = relationship(
        "Experience",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    certifications = relationship(
        "Certification",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    languages = relationship(
        "Language",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return (
            f"<User(id={self.id}, "
            f"name='{self.full_name}', "
            f"email='{self.email}')>"
        )