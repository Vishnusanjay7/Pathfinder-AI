from pydantic import BaseModel, EmailStr, model_validator
from typing import Optional


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str | None = None
    phone: str | None = None
    college: str | None = None
    degree: str | None = None
    branch: str | None = None
    graduation_year: int | None = None

    @model_validator(mode="after")
    def passwords_match(self):
        if self.confirm_password is not None and self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True


# Two-Step Auth Challenge Schemas
class LoginStep1Request(BaseModel):
    username: str
    password: str


class LoginStep1Response(BaseModel):
    success: bool
    message: str
    challenge_id: str
    masked_identifier: str
    channel: str


class LoginStep2Request(BaseModel):
    challenge_id: str
    otp: str


class ResendChallengeOTPRequest(BaseModel):
    challenge_id: str


# Password Reset Schemas
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str | None = None

    @model_validator(mode="after")
    def passwords_match(self):
        if self.confirm_password is not None and self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self
