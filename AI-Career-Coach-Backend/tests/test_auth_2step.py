import unittest
from fastapi.testclient import TestClient
from main import app
from app.database.database import SessionLocal, engine
from app.database.base import Base
from app.models.user import User
from app.models.otp_code import OTPCode
from app.models.auth_challenge import AuthChallenge
from app.auth.password_handler import hash_password

class TestTwoStepAuthFlow(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Seed test user
        user = cls.db.query(User).filter(User.email == "twostep_user@example.com").first()
        if not user:
            user = User(
                full_name="Two Step User",
                email="twostep_user@example.com",
                phone="+15550001111",
                password_hash=hash_password("Password123!"),
                is_verified=True
            )
            cls.db.add(user)
            cls.db.commit()
            cls.db.refresh(user)
        cls.test_user = user

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_invalid_password_returns_401_no_otp(self):
        resp = self.client.post("/api/auth/login/step1", json={
            "username": "twostep_user@example.com",
            "password": "WrongPassword!"
        })
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid email/mobile or password.", resp.json()["detail"])

    def test_valid_password_issues_challenge_without_jwt(self):
        resp = self.client.post("/api/auth/login/step1", json={
            "username": "twostep_user@example.com",
            "password": "Password123!"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("challenge_id", data)
        self.assertNotIn("access_token", data)  # NO JWT token issued at Step 1!

    def test_invalid_otp_step2_fails(self):
        s1 = self.client.post("/api/auth/login/step1", json={
            "username": "twostep_user@example.com",
            "password": "Password123!"
        }).json()

        challenge_id = s1["challenge_id"]

        s2 = self.client.post("/api/auth/login/step2", json={
            "challenge_id": challenge_id,
            "otp": "000000"
        })
        self.assertEqual(s2.status_code, 400)

    def test_full_two_step_auth_flow(self):
        # Step 1: Verify Password
        s1_resp = self.client.post("/api/auth/login/step1", json={
            "username": "twostep_user@example.com",
            "password": "Password123!"
        })
        self.assertEqual(s1_resp.status_code, 200)
        s1_data = s1_resp.json()
        challenge_id = s1_data["challenge_id"]

        # Retrieve the latest active OTPCode created for purpose challenge_challenge_id
        otp_rec = (
            self.db.query(OTPCode)
            .filter(OTPCode.purpose == f"challenge_{challenge_id}")
            .order_by(OTPCode.created_at.desc())
            .first()
        )
        self.assertIsNotNone(otp_rec)

        # In dev mode, LoggingOTPProvider logs it. We can test with valid hash matching by verifying step2 endpoint
        # Let's test with the actual hash by injecting a known code for test
        from app.services.otp_service import otp_service
        known_code = "123456"
        otp_rec.code_hash = otp_service._hash(known_code)
        self.db.commit()

        # Step 2: Verify OTP
        s2_resp = self.client.post("/api/auth/login/step2", json={
            "challenge_id": challenge_id,
            "otp": known_code
        })
        self.assertEqual(s2_resp.status_code, 200)
        s2_data = s2_resp.json()
        self.assertTrue(s2_data["success"])
        self.assertIn("access_token", s2_data)

        # Test JWT token against protected endpoint
        jwt_token = s2_data["access_token"]
        prof_resp = self.client.get(
            "/api/profile/me",
            headers={"Authorization": f"Bearer {jwt_token}"}
        )
        self.assertEqual(prof_resp.status_code, 200)
        self.assertEqual(prof_resp.json()["user"]["email"], "twostep_user@example.com")

        # Test Replay rejection: Reusing the same challenge_id or OTP fails
        replay_resp = self.client.post("/api/auth/login/step2", json={
            "challenge_id": challenge_id,
            "otp": known_code
        })
        self.assertEqual(replay_resp.status_code, 400)

if __name__ == "__main__":
    unittest.main()
