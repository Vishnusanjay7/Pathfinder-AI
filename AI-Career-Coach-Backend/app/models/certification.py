from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String

from sqlalchemy.orm import relationship

from app.database.base import Base


class Certification(Base):
    __tablename__ = "certifications"

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
        String(255),
        nullable=False
    )

    provider = Column(
        String(255),
        nullable=True
    )

    issue_date = Column(
        String(100),
        nullable=True
    )

    expiry_date = Column(
        String(100),
        nullable=True
    )

    credential_id = Column(
        String(255),
        nullable=True
    )

    credential_url = Column(
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
        back_populates="certifications"
    )

    def __repr__(self):
        return (
            f"<Certification("
            f"id={self.id}, "
            f"name='{self.name}', "
            f"provider='{self.provider}')>"
        )