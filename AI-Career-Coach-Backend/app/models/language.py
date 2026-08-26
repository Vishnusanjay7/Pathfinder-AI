from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String

from sqlalchemy.orm import relationship

from app.database.base import Base


class Language(Base):
    __tablename__ = "languages"

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

    language = Column(
        String(100),
        nullable=False
    )

    proficiency = Column(
        String(50),
        default="Intermediate"
    )

    certification = Column(
        String(255),
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
        back_populates="languages"
    )

    def __repr__(self):
        return (
            f"<Language("
            f"id={self.id}, "
            f"language='{self.language}', "
            f"proficiency='{self.proficiency}')>"
        )