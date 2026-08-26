from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String

from sqlalchemy.orm import relationship

from app.database.base import Base


class Skill(Base):
    __tablename__ = "skills"

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

    name = Column(
        String(100),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=True
    )

    proficiency = Column(
        String(50),
        default="Beginner"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    # ==========================================
    # Relationships
    # ==========================================

    user = relationship(
        "User",
        back_populates="skills"
    )

    def __repr__(self):
        return (
            f"<Skill("
            f"id={self.id}, "
            f"name='{self.name}', "
            f"user_id={self.user_id})>"
        )