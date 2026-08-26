from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.database.base import Base


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True)
    identifier = Column(String(255), index=True, nullable=False)
    channel = Column(String(10), nullable=False)
    purpose = Column(String(50), nullable=False, default="registration", server_default="registration")
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

