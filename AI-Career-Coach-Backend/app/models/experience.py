from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

from sqlalchemy.orm import relationship

from app.database.base import Base


class Experience(Base):
    __tablename__ = "experience"

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

    company = Column(
        String(255),
        nullable=False
    )

    position = Column(
        String(150),
        nullable=False
    )

    employment_type = Column(
        String(100),
        nullable=True
    )

    location = Column(
        String(200),
        nullable=True
    )

    description = Column(
        Text,
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

    is_current = Column(
        String(10),
        default="No"
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
        back_populates="experience"
    )

    def __repr__(self):
        return (
            f"<Experience("
            f"id={self.id}, "
            f"company='{self.company}', "
            f"position='{self.position}')>"
        )