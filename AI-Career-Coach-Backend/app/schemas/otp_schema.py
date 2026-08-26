from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, model_validator


class OTPRequest(BaseModel):
    identifier: str
    channel: Literal["email", "sms"]

    @model_validator(mode="after")
    def validate_identifier(self):
        if self.channel == "email":
            from pydantic import TypeAdapter
            TypeAdapter(EmailStr).validate_python(self.identifier)
        elif len("".join(character for character in self.identifier if character.isdigit())) < 8:
            raise ValueError("Enter a valid mobile number.")
        self.identifier = self.identifier.strip()
        return self


class OTPVerify(OTPRequest):
    code: str
    full_name: Optional[str] = None


class OTPLoginRequest(BaseModel):
    email: EmailStr


class OTPLoginVerify(BaseModel):
    email: EmailStr
    otp: Optional[str] = None
    code: Optional[str] = None

    @model_validator(mode="after")
    def validate_otp_code(self):
        code_val = self.otp or self.code
        if not code_val or not code_val.isdigit() or len(code_val) != 6:
            raise ValueError("OTP code must be exactly 6 digits.")
        self.otp = code_val
        return self

