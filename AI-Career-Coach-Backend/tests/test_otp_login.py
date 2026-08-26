import logging
from fastapi.testclient import TestClient
from main import app
from app.database.session import get_db
from app.models.user import User
from app.models.otp_code import OTPCode
from app.models.pending_registration import PendingRegistration
from app.auth.password_handler import hash_password

client = TestClient(app)

def test_otp_login_flow():
    print("\n--- RUNNING OTP LOGIN & AUTH REGRESSION TESTS ---")

    # Step 1: Create a test user directly or via registration flow
    test_email = "otptestuser@example.com"
    test_password = "TestPassword123!"
    
    # Cleanup any existing test data
    db = next(get_db())
    db.query(OTPCode).filter(OTPCode.identifier == test_email).delete()
    db.query(PendingRegistration).filter(PendingRegistration.email == test_email).delete()
    db.query(User).filter(User.email == test_email).delete()
    db.commit()

    # Test Registration Flow
    reg_payload = {
        "full_name": "OTP Test User",
        "email": test_email,
        "password": test_password,
        "phone": "9876543210",
        "college": "Tech Institute",
        "degree": "B.Tech",
        "branch": "Computer Science",
        "graduation_year": 2025
    }
    resp = client.post("/api/auth/register", json=reg_payload)
    assert resp.status_code == 200, f"Register failed: {resp.text}"
    print("1. Registration request succeeded.")

    # Get generated OTP from DB for registration
    reg_otp_record = db.query(OTPCode).filter(
        OTPCode.identifier == test_email,
        OTPCode.purpose == "registration"
    ).order_by(OTPCode.created_at.desc()).first()
    assert reg_otp_record is not None, "Registration OTP code not stored in DB"

    # We need to verify registration. Since the code is hashed in DB, let's verify with wrong OTP first
    wrong_reg_resp = client.post("/api/auth/otp/verify", json={
        "identifier": test_email,
        "channel": "email",
        "code": "000000"
    })
    assert wrong_reg_resp.status_code == 400, "Wrong OTP should be rejected"
    print("2. Invalid registration OTP correctly rejected.")

    # Now manually set a known OTP hash or get code if logging provider captured it.
    # In dev mode, we can create user directly or simulate verification.
    # Let's verify registration via otp_service or create user
    user = User(
        full_name=reg_payload["full_name"],
        email=test_email,
        phone=reg_payload["phone"],
        password_hash=hash_password(test_password),
        college=reg_payload["college"],
        degree=reg_payload["degree"],
        branch=reg_payload["branch"],
        graduation_year=reg_payload["graduation_year"],
        is_verified=True
    )
    db.add(user)
    db.query(PendingRegistration).filter(PendingRegistration.email == test_email).delete()
    db.commit()
    print("3. User account created and verified.")

    # Test 1: Password Login
    pwd_resp = client.post(
        "/api/auth/login",
        data={"username": test_email, "password": test_password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert pwd_resp.status_code == 200, f"Password login failed: {pwd_resp.text}"
    pwd_data = pwd_resp.json()
    assert pwd_data["success"] is True
    assert "access_token" in pwd_data
    print("4. Password login succeeded.")

    # Test 2: Request OTP Login for non-existent email
    bad_req = client.post("/api/auth/otp/login/request", json={"email": "nonexistent_12345@example.com"})
    assert bad_req.status_code == 400 or bad_req.status_code == 404, "Non-existent user OTP request should fail"
    print("5. OTP login request for non-existent email correctly rejected.")

    # Test 3: Request OTP Login for existing user
    otp_req = client.post("/api/auth/otp/login/request", json={"email": test_email})
    assert otp_req.status_code == 200, f"OTP login request failed: {otp_req.text}"
    assert otp_req.json()["success"] is True
    print("6. OTP login request for existing user succeeded.")

    # Test 4: Immediate duplicate request before cooldown expires (Resend Cooldown Test)
    cooldown_req = client.post("/api/auth/otp/login/request", json={"email": test_email})
    assert cooldown_req.status_code == 429, f"Cooldown enforcement failed: {cooldown_req.text}"
    print("7. Resend cooldown correctly enforced (HTTP 429).")

    # Inspect stored login OTP record in DB
    login_otp_record = db.query(OTPCode).filter(
        OTPCode.identifier == test_email,
        OTPCode.purpose == "login",
        OTPCode.consumed.is_(False)
    ).first()
    assert login_otp_record is not None, "Login OTP record missing in DB"
    assert login_otp_record.purpose == "login", "OTP purpose mismatch"

    # Test 5: Verify OTP Login with invalid code
    bad_verify = client.post("/api/auth/otp/login/verify", json={"email": test_email, "otp": "999999"})
    assert bad_verify.status_code == 400, "Invalid OTP code should be rejected"
    print("8. Invalid OTP code verification correctly rejected.")

    # Test 6: Verify OTP Login with valid code (by simulating matched hash)
    from app.services.otp_service import otp_service
    test_code = "654321"
    login_otp_record.code_hash = otp_service._hash(test_code)
    db.commit()

    good_verify = client.post("/api/auth/otp/login/verify", json={"email": test_email, "otp": test_code})
    assert good_verify.status_code == 200, f"Valid OTP verification failed: {good_verify.text}"
    otp_jwt_data = good_verify.json()
    assert otp_jwt_data["success"] is True
    assert "access_token" in otp_jwt_data
    jwt_token = otp_jwt_data["access_token"]
    print("9. OTP login verification succeeded and returned valid JWT token.")

    # Test 7: OTP reuse prevention (single-use test)
    reuse_verify = client.post("/api/auth/otp/login/verify", json={"email": test_email, "otp": test_code})
    assert reuse_verify.status_code == 400, "Reusing consumed OTP must be rejected"
    print("10. Single-use enforcement verified (reusing consumed OTP rejected).")

    # Test 8: Verify JWT with Protected API (/api/profile/me)
    profile_resp = client.get("/api/profile/me", headers={"Authorization": f"Bearer {jwt_token}"})
    assert profile_resp.status_code == 200, f"Protected API call failed: {profile_resp.text}"
    profile_data = profile_resp.json()
    assert profile_data["success"] is True
    assert profile_data["user"]["email"] == test_email
    print("11. Protected API (/api/profile/me) successfully authenticated with OTP login JWT!")

    # Clean up test user
    db.query(OTPCode).filter(OTPCode.identifier == test_email).delete()
    db.query(User).filter(User.email == test_email).delete()
    db.commit()

    print("\n--- ALL OTP LOGIN & REGRESSION TESTS PASSED SUCCESSFULLY! ---\n")

if __name__ == "__main__":
    test_otp_login_flow()
