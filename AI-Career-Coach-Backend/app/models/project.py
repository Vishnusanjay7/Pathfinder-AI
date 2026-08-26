from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.orm import relationship

from app.database.base import Base


class Project(Base):
    __tablename__ = "projects"

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

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    technologies = Column(
        Text,
        nullable=True
    )

    github_url = Column(
        String(500),
        nullable=True
    )

    live_url = Column(
        String(500),
        nullable=True
    )

    role = Column(
        String(100),
        nullable=True
    )

    start_date = Column(
        String(50),
        nullable=True
    )

    end_date = Column(
        String(50),
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
        back_populates="projects"
    )

    def __repr__(self):
        return (
            f"<Project("
            f"id={self.id}, "
            f"title='{self.title}', "
            f"user_id={self.user_id})>"
        )