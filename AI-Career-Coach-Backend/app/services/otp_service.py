import hashlib
import hmac
import logging
import secrets
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Protocol, Dict, Any, Optional

import requests
from uuid import uuid4
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.otp_code import OTPCode
from app.models.pending_registration import PendingRegistration
from app.models.auth_challenge import AuthChallenge
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)


class OTPDeliveryProvider(Protocol):
    def send(self, identifier: str, code: str, channel: str, purpose: str = "registration") -> None: ...


class LoggingOTPProvider:
    """Development-only provider that logs OTP to backend console."""

    def send(self, identifier: str, code: str, channel: str, purpose: str = "registration") -> None:
        logging.info("Development OTP for %s (%s) [purpose=%s]: %s", identifier, channel, purpose, code)


class OTPConfigurationError(RuntimeError):
    """Raised when an enabled OTP provider is missing required settings."""


class SMTPOTPProvider:
    """Delivers 6-digit OTP codes via SMTP (Gmail / Custom SMTP)."""

    def send(self, identifier: str, code: str, channel: str, purpose: str = "registration") -> None:
        if channel != "email":
            raise ValueError("SMTP delivery supports email OTPs only.")
        sender = settings.SMTP_FROM or settings.OTP_FROM_EMAIL
        if not all([settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD, sender]):
            raise OTPConfigurationError("Email OTP is not configured. Please contact the administrator.")

        message = EmailMessage()
        if purpose == "password_reset":
            subject = "Reset Your AI Career Coach Password"
            plain_body = (
                f"Hello,\n\n"
                f"We received a request to reset your AI Career Coach password.\n\n"
                f"Your verification code is: {code}\n\n"
                f"This code expires in 5 minutes.\n\n"
                f"If you did not request this password reset, you can safely ignore this email."
            )
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #07111F; color: #E2E8F0; padding: 24px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #0D1728; border: 1px solid #1E3150; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                    <h2 style="color: #3B82F6; text-align: center; margin-bottom: 8px;">AI Career Coach</h2>
                    <h3 style="color: #FFFFFF; text-align: center; margin-top: 0;">Password Reset Code</h3>
                    <p style="color: #94A3B8; font-size: 14px; text-align: center;">We received a request to reset your password. Use the verification code below:</p>
                    <div style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38BDF8;">{code}</span>
                    </div>
                    <p style="color: #94A3B8; font-size: 12px; text-align: center;">This code will expire in <strong>5 minutes</strong>.</p>
                    <hr style="border: 0; border-top: 1px solid #1E3150; margin: 24px 0;">
                    <p style="color: #64748B; font-size: 11px; text-align: center;">If you did not request a password reset, you can safely ignore this message.</p>
                </div>
            </body>
            </html>
            """
        else:
            subject = "Your AI Career Coach Verification Code"
            plain_body = f"Your AI Career Coach verification code is {code}. It expires in 5 minutes. Do not share this code."
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #07111F; color: #E2E8F0; padding: 24px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #0D1728; border: 1px solid #1E3150; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                    <h2 style="color: #3B82F6; text-align: center; margin-bottom: 8px;">AI Career Coach</h2>
                    <h3 style="color: #FFFFFF; text-align: center; margin-top: 0;">Verification Code</h3>
                    <p style="color: #94A3B8; font-size: 14px; text-align: center;">Please use the 6-digit verification code below to proceed:</p>
                    <div style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38BDF8;">{code}</span>
                    </div>
                    <p style="color: #94A3B8; font-size: 12px; text-align: center;">This code will expire in <strong>5 minutes</strong>. Never share this code with anyone.</p>
                </div>
            </body>
            </html>
            """

        message["Subject"] = subject
        message["From"] = sender
        message["To"] = identifier
        message.set_content(plain_body)
        message.add_alternative(html_body, subtype="html")

        # Log for dev visibility as well
        logging.info("Sending OTP email to %s via SMTP (Code: %s, Purpose: %s)", identifier, code, purpose)

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(message)
        except Exception as exc:
            logging.warning("SMTP email delivery to %s timed out or failed (%s). OTP code logged above.", identifier, exc)


class TwilioOTPProvider:
    def send(self, identifier: str, code: str, channel: str, purpose: str = "registration") -> None:
        if channel != "sms":
            raise ValueError("Twilio delivery supports SMS OTPs only.")
        sender = settings.TWILIO_PHONE_NUMBER or settings.TWILIO_FROM_NUMBER
        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, sender]):
            raise OTPConfigurationError("Mobile OTP is not configured. Please contact the administrator.")
        
        logging.info("Sending SMS OTP to %s via Twilio (Code: %s)", identifier, code)
        response = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            data={"To": identifier, "From": sender, "Body": f"Your AI Career Coach verification code is {code}. It expires in 5 minutes."},
            timeout=20,
        )
        response.raise_for_status()


class OTPService:
    @staticmethod
    def _provider(channel: str) -> OTPDeliveryProvider:
        mode = (settings.OTP_PROVIDER or settings.OTP_DELIVERY_MODE or "development").lower()
        if mode in {"development", "log"}:
            return LoggingOTPProvider()
        if mode in {"smtp", "auto"}:
            if channel == "email":
                return SMTPOTPProvider()
            else:
                return LoggingOTPProvider()
        if mode == "twilio":
            if channel == "sms":
                return TwilioOTPProvider()
            else:
                return LoggingOTPProvider()
        return LoggingOTPProvider()

    @staticmethod
    def _hash(code: str) -> str:
        # Keyed digest prevents offline brute-force attacks on leaked OTP tables
        return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def registration_channel() -> str:
        """SMS registration enabled only when Twilio provider is selected."""
        mode = (settings.OTP_PROVIDER or settings.OTP_DELIVERY_MODE or "development").lower()
        return "sms" if mode == "twilio" else "email"

    def request(self, db: Session, identifier: str, channel: str, purpose: str = "registration") -> str:
        now = datetime.utcnow()
        # Clean expired OTP codes
        db.query(OTPCode).filter(OTPCode.expires_at < now).delete(synchronize_session=False)

        latest = (
            db.query(OTPCode)
            .filter(
                OTPCode.identifier == identifier,
                OTPCode.channel == channel,
                OTPCode.purpose == purpose,
            )
            .order_by(OTPCode.created_at.desc())
            .first()
        )
        if latest and (now - latest.created_at).total_seconds() < settings.OTP_RESEND_SECONDS:
            raise ValueError(f"Please wait {settings.OTP_RESEND_SECONDS} seconds before requesting another verification code.")

        # Invalidate previous unconsumed OTPs for same purpose
        db.query(OTPCode).filter(
            OTPCode.identifier == identifier,
            OTPCode.channel == channel,
            OTPCode.purpose == purpose,
            OTPCode.consumed.is_(False),
        ).update({OTPCode.consumed: True})

        # Generate cryptographically secure 6-digit OTP
        code = f"{secrets.randbelow(1_000_000):06d}"
        record = OTPCode(
            identifier=identifier,
            channel=channel,
            purpose=purpose,
            code_hash=self._hash(code),
            expires_at=now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES),
        )
        db.add(record)
        db.flush()

        try:
            provider = self._provider(channel)
            provider.send(identifier, code, channel, purpose=purpose)
            db.commit()
            return code
        except Exception as e:
            db.rollback()
            logger.error("Failed to send OTP to %s via %s: %s", identifier, channel, e)
            raise

    def start_registration(self, db: Session, registration: PendingRegistration) -> dict:
        """Persist pending registration and dispatch OTP."""
        clean_email = registration.email.strip().lower()
        registration.email = clean_email
        if db.query(User).filter(func.lower(User.email) == clean_email).first():
            raise ValueError("Email is already registered.")

        now = datetime.utcnow()
        db.query(PendingRegistration).filter(
            PendingRegistration.updated_at < now - timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        ).delete(synchronize_session=False)

        pending = db.query(PendingRegistration).filter(func.lower(PendingRegistration.email) == clean_email).first()
        if pending:
            pending.full_name = registration.full_name
            pending.phone = registration.phone
            pending.password_hash = registration.password_hash
            pending.college = registration.college
            pending.degree = registration.degree
            pending.branch = registration.branch
            pending.graduation_year = registration.graduation_year
        else:
            pending = registration
            db.add(pending)

        db.flush()
        channel = self.registration_channel()
        identifier = pending.phone if channel == "sms" else pending.email
        self.request(db, identifier, channel, purpose="registration")
        return {"channel": channel}

    def resend_registration(self, db: Session, email: str) -> dict:
        pending = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()
        if pending is None:
            raise ValueError("No pending registration was found. Please register again.")
        channel = self.registration_channel()
        self.request(db, pending.phone if channel == "sms" else pending.email, channel, purpose="registration")
        return {"channel": channel}

    def verify_registration(self, db: Session, email: str, code: str) -> User | None:
        deleted = db.query(OTPCode).filter(OTPCode.expires_at < datetime.utcnow()).delete(synchronize_session=False)
        deleted += db.query(PendingRegistration).filter(
            PendingRegistration.updated_at < datetime.utcnow() - timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        ).delete(synchronize_session=False)
        if deleted:
            db.commit()

        pending = db.query(PendingRegistration).filter(PendingRegistration.email == email).first()
        if pending is None:
            return None

        channel = self.registration_channel()
        identifier = pending.phone if channel == "sms" else pending.email
        record = (
            db.query(OTPCode)
            .filter(
                OTPCode.identifier == identifier,
                OTPCode.channel == channel,
                OTPCode.purpose == "registration",
                OTPCode.consumed.is_(False),
            )
            .order_by(OTPCode.created_at.desc())
            .first()
        )
        if record is None or record.expires_at < datetime.utcnow():
            if record:
                db.delete(record)
                db.commit()
            return None

        code = code.strip()
        if not secrets.compare_digest(record.code_hash, self._hash(code)):
            record.attempts += 1
            if record.attempts >= settings.OTP_MAX_VERIFY_ATTEMPTS:
                record.consumed = True
            db.commit()
            return None

        record.consumed = True
        user = User(
            full_name=pending.full_name,
            email=pending.email,
            phone=pending.phone,
            password_hash=pending.password_hash,
            college=pending.college,
            degree=pending.degree,
            branch=pending.branch,
            graduation_year=pending.graduation_year,
            is_verified=True,
        )
        db.add(user)
        db.delete(pending)
        db.delete(record)
        db.commit()
        db.refresh(user)
        return user

    def request_login_otp(self, db: Session, email: str) -> str:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError("No account registered with this email address.")
        channel = "email"
        self.request(db, email, channel, purpose="login")
        return channel

    def verify_login_otp(self, db: Session, email: str, code: str) -> User | None:
        deleted = db.query(OTPCode).filter(OTPCode.expires_at < datetime.utcnow()).delete(synchronize_session=False)
        if deleted:
            db.commit()
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            return None

        record = (
            db.query(OTPCode)
            .filter(
                OTPCode.identifier == email,
                OTPCode.channel == "email",
                OTPCode.purpose == "login",
                OTPCode.consumed.is_(False),
            )
            .order_by(OTPCode.created_at.desc())
            .first()
        )
        if record is None or record.expires_at < datetime.utcnow():
            if record:
                record.consumed = True
                db.commit()
            return None

        if not secrets.compare_digest(record.code_hash, self._hash(code.strip())):
            record.attempts += 1
            if record.attempts >= settings.OTP_MAX_VERIFY_ATTEMPTS:
                record.consumed = True
            db.commit()
            return None

        record.consumed = True
        db.commit()
        return user

    def mask_identifier(self, identifier: str) -> str:
        if not identifier:
            return ""
        if "@" in identifier:
            parts = identifier.split("@")
            name = parts[0]
            domain = parts[1]
            if len(name) <= 2:
                masked_name = name[0] + "*"
            else:
                masked_name = name[0] + "*" * (len(name) - 1)
            return f"{masked_name}@{domain}"
        else:
            if len(identifier) <= 4:
                return "****"
            return identifier[:3] + "*" * (len(identifier) - 5) + identifier[-2:]

    def start_login_challenge(self, db: Session, user: User) -> dict:
        """Create a 2-step login challenge after password verification and send OTP."""
        now = datetime.utcnow()
        db.query(AuthChallenge).filter(AuthChallenge.expires_at < now).delete(synchronize_session=False)

        challenge_id = uuid4().hex
        expires_at = now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

        challenge = AuthChallenge(
            challenge_id=challenge_id,
            user_id=user.id,
            password_verified_at=now,
            expires_at=expires_at,
            consumed=False
        )
        db.add(challenge)

        channel = self.registration_channel()
        identifier = user.phone if channel == "sms" and user.phone else user.email
        self.request(db, identifier, channel, purpose=f"challenge_{challenge_id}")

        db.commit()
        db.refresh(challenge)

        return {
            "challenge_id": challenge_id,
            "masked_identifier": self.mask_identifier(identifier),
            "channel": channel
        }

    def verify_login_challenge(self, db: Session, challenge_id: str, code: str) -> User | None:
        """Verify OTP for a specific 2-step login challenge and return the user on success."""
        now = datetime.utcnow()
        challenge = db.query(AuthChallenge).filter(
            AuthChallenge.challenge_id == challenge_id,
            AuthChallenge.consumed.is_(False)
        ).first()

        if not challenge or challenge.expires_at < now:
            if challenge:
                challenge.consumed = True
                db.commit()
            return None

        user = challenge.user
        if not user:
            return None

        channel = self.registration_channel()
        identifier = user.phone if channel == "sms" and user.phone else user.email

        record = (
            db.query(OTPCode)
            .filter(
                OTPCode.identifier == identifier,
                OTPCode.channel == channel,
                OTPCode.purpose == f"challenge_{challenge_id}",
                OTPCode.consumed.is_(False),
            )
            .order_by(OTPCode.created_at.desc())
            .first()
        )

        if record is None or record.expires_at < now:
            if record:
                record.consumed = True
                db.commit()
            return None

        code = code.strip()
        if not secrets.compare_digest(record.code_hash, self._hash(code)):
            record.attempts += 1
            if record.attempts >= settings.OTP_MAX_VERIFY_ATTEMPTS:
                record.consumed = True
                challenge.consumed = True
            db.commit()
            return None

        record.consumed = True
        challenge.consumed = True
        db.commit()
        return user

    def resend_login_challenge(self, db: Session, challenge_id: str) -> dict:
        """Resend OTP for an active 2-step login challenge."""
        now = datetime.utcnow()
        challenge = db.query(AuthChallenge).filter(
            AuthChallenge.challenge_id == challenge_id,
            AuthChallenge.consumed.is_(False)
        ).first()

        if not challenge or challenge.expires_at < now:
            raise ValueError("Invalid or expired login session. Please enter your password again.")

        user = challenge.user
        if not user:
            raise ValueError("User not found for this login session.")

        channel = self.registration_channel()
        identifier = user.phone if channel == "sms" and user.phone else user.email
        self.request(db, identifier, channel, purpose=f"challenge_{challenge_id}")

        return {
            "challenge_id": challenge_id,
            "masked_identifier": self.mask_identifier(identifier),
            "channel": channel
        }

    def request_password_reset_otp(self, db: Session, email: str) -> dict:
        """
        Request password reset OTP for a registered email.
        Applies strict user enumeration protection: returns generic success message regardless of email existence.
        """
        user = db.query(User).filter(User.email == email).first()
        if user:
            self.request(db, email, "email", purpose="password_reset")

        return {
            "message": "If an account exists for this email, a verification code has been sent."
        }

    def verify_password_reset_otp(self, db: Session, email: str, code: str) -> str | None:
        """
        Verify password reset OTP and return a 10-minute reset token on success.
        Requires purpose == 'password_reset' and enforces max 5 verify attempts.
        """
        from app.auth.jwt_handler import create_access_token
        now = datetime.utcnow()
        db.query(OTPCode).filter(OTPCode.expires_at < now).delete(synchronize_session=False)

        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None

        record = (
            db.query(OTPCode)
            .filter(
                OTPCode.identifier == email,
                OTPCode.channel == "email",
                OTPCode.purpose == "password_reset",
                OTPCode.consumed.is_(False),
            )
            .order_by(OTPCode.created_at.desc())
            .first()
        )

        if record is None or record.expires_at < now:
            return None

        code = code.strip()
        if not secrets.compare_digest(record.code_hash, self._hash(code)):
            record.attempts += 1
            if record.attempts >= 5:
                record.consumed = True
            db.commit()
            return None

        record.consumed = True
        db.commit()

        reset_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "purpose": "password_reset"},
            expires_delta=timedelta(minutes=10)
        )
        return reset_token

    def reset_password_with_token(self, db: Session, reset_token: str, new_password: str) -> bool:
        """
        Reset user password using a verified single-purpose reset token.
        Invalidates reset token and remaining password reset OTPs.
        """
        from app.auth.jwt_handler import verify_token
        from app.auth.password_handler import hash_password

        payload = verify_token(reset_token)
        if not payload or payload.get("purpose") != "password_reset":
            return False

        email = payload.get("email")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return False

        user.password_hash = hash_password(new_password)
        db.query(OTPCode).filter(
            OTPCode.identifier == email,
            OTPCode.purpose == "password_reset"
        ).update({OTPCode.consumed: True})

        db.commit()
        return True


otp_service = OTPService()
