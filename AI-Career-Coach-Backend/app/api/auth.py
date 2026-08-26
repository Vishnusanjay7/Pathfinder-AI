from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import traceback

from app.database.session import get_db

from app.schemas.auth_schema import (
    UserRegister,
    TokenResponse,
    LoginStep1Request,
    LoginStep1Response,
    LoginStep2Request,
    ResendChallengeOTPRequest,
    ForgotPasswordRequest,
    VerifyResetOTPRequest,
    ResetPasswordRequest
)

from app.services.user_service import user_service

from app.auth.jwt_handler import create_access_token
from app.schemas.otp_schema import OTPRequest, OTPVerify, OTPLoginRequest, OTPLoginVerify
from app.services.otp_service import OTPConfigurationError, otp_service
from app.auth.password_handler import hash_password
from app.models.pending_registration import PendingRegistration

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post("/otp/request")
def request_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """Compatibility endpoint: resend an OTP for an existing pending registration."""
    try:
        channel = otp_service.resend_registration(db, request.identifier)
    except ValueError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except OTPConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to send OTP. Please try again later.") from exc
    return {"success": True, "message": "A verification code has been sent.", "channel": channel}


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    """Compatibility endpoint: verify a pending registration; never signs in existing users."""
    user = otp_service.verify_registration(db, request.identifier, request.code)
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    return TokenResponse(success=True, access_token=create_access_token({"sub": str(user.id), "email": user.email}), token_type="bearer")


@router.post("/register/resend")
def resend_registration(request: OTPRequest, db: Session = Depends(get_db)):
    try:
        res = otp_service.resend_registration(db, request.identifier)
    except ValueError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except OTPConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to send OTP. Please try again later.") from exc
    return {
        "success": True,
        "message": "A verification code has been resent.",
        "channel": res["channel"]
    }


# ======================================================
# Register
# ======================================================

@router.post("/register")
def register(
    request: UserRegister,
    db: Session = Depends(get_db)
):
    try:

        pending = PendingRegistration(
            full_name=request.full_name,
            email=request.email,
            phone=request.phone,
            password_hash=hash_password(request.password),
            college=request.college,
            degree=request.degree,
            branch=request.branch,
            graduation_year=request.graduation_year,
        )
        if not pending.phone:
            raise ValueError("Mobile number is required.")
        res = otp_service.start_registration(db, pending)

        return {
            "success": True,
            "message": "Verification code sent. Verify it to complete registration.",
            "channel": res["channel"]
        }

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except OTPConfigurationError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ======================================================
# Login (OAuth2 Password Flow)
# ======================================================

@router.post("/login", response_model=TokenResponse, summary="Direct Token Login")
@router.post("/token", response_model=TokenResponse, summary="Legacy Direct Token Login")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = user_service.authenticate_user(
        db=db,
        email=form_data.username,
        password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email/mobile or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email
    })
    return TokenResponse(
        success=True,
        access_token=token,
        token_type="bearer"
    )


# ======================================================
# OTP Login Endpoints
# ======================================================

@router.post("/otp/login/request")
def request_login_otp(request: OTPLoginRequest, db: Session = Depends(get_db)):
    try:
        channel = otp_service.request_login_otp(db, request.email)
    except ValueError as exc:
        detail_str = str(exc)
        if "wait" in detail_str.lower():
            raise HTTPException(status_code=429, detail=detail_str) from exc
        raise HTTPException(status_code=400, detail=detail_str) from exc
    except OTPConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to send OTP. Please try again later.") from exc
    return {"success": True, "message": "A verification code has been sent.", "channel": channel}


@router.post("/otp/login/verify", response_model=TokenResponse)
def verify_login_otp(request: OTPLoginVerify, db: Session = Depends(get_db)):
    user = otp_service.verify_login_otp(db, request.email, request.otp)
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    return TokenResponse(
        success=True,
        access_token=create_access_token({"sub": str(user.id), "email": user.email}),
        token_type="bearer",
    )


# ======================================================
# Combined Two-Step Authentication (Password -> OTP -> JWT)
# ======================================================

@router.post("/login/step1", response_model=LoginStep1Response, summary="Step 1: Verify Password and Send OTP")
def login_step1(request: LoginStep1Request, db: Session = Depends(get_db)):
    """
    Step 1 of two-factor login flow:
    Verifies user password. If correct, dispatches 6-digit OTP and returns a challenge_id.
    Does NOT issue a JWT token at this step.
    """
    user = user_service.authenticate_user(
        db=db,
        email=request.username,
        password=request.password
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email/mobile or password."
        )

    try:
        challenge_info = otp_service.start_login_challenge(db, user)
        return LoginStep1Response(
            success=True,
            message="Password verified successfully. Verification code sent.",
            challenge_id=challenge_info["challenge_id"],
            masked_identifier=challenge_info["masked_identifier"],
            channel=challenge_info["channel"]
        )
    except ValueError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except OTPConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to initialize verification step.") from exc


@router.post("/login/step2", response_model=TokenResponse, summary="Step 2: Verify OTP and Issue JWT Access Token")
def login_step2(request: LoginStep2Request, db: Session = Depends(get_db)):
    """
    Step 2 of two-factor login flow:
    Verifies 6-digit OTP against active challenge_id. If valid, invalidates challenge and issues final JWT token.
    """
    user = otp_service.verify_login_challenge(db, request.challenge_id, request.otp)
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email
    })

    return TokenResponse(
        success=True,
        access_token=token,
        token_type="bearer"
    )


@router.post("/login/resend", response_model=LoginStep1Response, summary="Resend OTP for active login challenge")
def login_resend_otp(request: ResendChallengeOTPRequest, db: Session = Depends(get_db)):
    try:
        challenge_info = otp_service.resend_login_challenge(db, request.challenge_id)
        return LoginStep1Response(
            success=True,
            message="A new verification code has been sent.",
            challenge_id=challenge_info["challenge_id"],
            masked_identifier=challenge_info["masked_identifier"],
            channel=challenge_info["channel"]
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OTPConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to resend verification code.") from exc


# ======================================================
# Forgot Password & Password Reset Flow
# ======================================================

@router.post("/forgot-password", summary="Request Password Reset OTP")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 1: Dispatches a 6-digit OTP to the requested email.
    Protects against user enumeration by returning the same generic message regardless of email existence.
    """
    try:
        return otp_service.request_password_reset_otp(db, str(request.email).lower().strip())
    except ValueError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except OTPConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        return {"message": "If an account exists for this email, a verification code has been sent."}


@router.post("/forgot-password/verify-otp", summary="Verify Password Reset OTP and issue short-lived Reset Token")
def verify_forgot_password_otp(request: VerifyResetOTPRequest, db: Session = Depends(get_db)):
    """
    Step 2: Verifies 6-digit password reset OTP and returns a 10-minute reset_token.
    Does NOT log the user in or issue a login JWT.
    """
    try:
        reset_token = otp_service.verify_password_reset_otp(
            db=db,
            email=str(request.email).lower().strip(),
            code=request.otp
        )
        if not reset_token:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        return {"success": True, "reset_token": reset_token}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to verify verification code.") from exc


@router.post("/reset-password", summary="Set New Password using Reset Token")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 3: Validates reset_token and updates the user password in the database.
    Invalidates reset token and remaining password reset OTPs.
    """
    if not request.new_password or len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    try:
        success = otp_service.reset_password_with_token(
            db=db,
            reset_token=request.reset_token,
            new_password=request.new_password
        )
        if not success:
            raise HTTPException(status_code=400, detail="Invalid or expired password reset token. Please request a new code.")
        return {"success": True, "message": "Password reset successfully."}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to reset password.") from exc

