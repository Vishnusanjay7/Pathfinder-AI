import unittest
from fastapi.testclient import TestClient
from main import app
from app.database.database import SessionLocal, engine
from app.database.base import Base
from app.models.user import User
from app.models.otp_code import OTPCode
from app.auth.password_handler import hash_password

client = TestClient(app)

class TestMockInterviewAvatarAndOrder(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()
        user = cls.db.query(User).filter(User.email == "avatar_tester@example.com").first()
        if not user:
            user = User(
                full_name="Avatar Tester",
                email="avatar_tester@example.com",
                phone="+15559990000",
                password_hash=hash_password("Password123!"),
                is_verified=True
            )
            cls.db.add(user)
            cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_start_interview_with_avatar_and_question_order(self):
        # Step 1: Login
        r_step1 = client.post("/api/auth/login/step1", json={
            "username": "avatar_tester@example.com",
            "password": "Password123!"
        })
        self.assertEqual(r_step1.status_code, 200)
        challenge_id = r_step1.json()["challenge_id"]

        from app.services.otp_service import otp_service
        otp_rec = self.db.query(OTPCode).filter(OTPCode.purpose == f"challenge_{challenge_id}").first()
        if otp_rec:
            otp_rec.code_hash = otp_service._hash("123456")
            self.db.commit()

        # Step 2: Verify OTP
        r_step2 = client.post("/api/auth/login/step2", json={
            "challenge_id": challenge_id,
            "otp": "123456"
        })
        self.assertEqual(r_step2.status_code, 200)
        token = r_step2.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Start mock interview with custom avatar and voice
        start_payload = {
            "target_role": "Backend Java Engineer",
            "interview_type": "Technical",
            "difficulty": "Intermediate",
            "question_count": 5,
            "avatar_id": "male_tech_01",
            "voice_id": "en_male_02",
            "language": "en-GB"
        }

        r_start = client.post("/api/mock-interview/start", json=start_payload, headers=headers)
        self.assertEqual(r_start.status_code, 200)
        data = r_start.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["avatar_id"], "male_tech_01")
        self.assertEqual(data["voice_id"], "en_male_02")
        self.assertEqual(data["language"], "en-GB")

        # 3. CRITICAL QUESTION ORDER VERIFICATION: Question 1 MUST NOT be Technical
        questions = data["questions"]
        self.assertGreaterEqual(len(questions), 5)
        first_q = questions[0]
        self.assertNotEqual(first_q["question_type"], "Technical", "Question 1 MUST NOT start with Technical!")
        self.assertIn(first_q["question_type"], ["HR", "Behavioral", "Self Introduction"])

        # 4. Fetch details to verify persistence
        interview_id = data["interview_id"]
        r_get = client.get(f"/api/mock-interview/{interview_id}", headers=headers)
        self.assertEqual(r_get.status_code, 200)
        get_data = r_get.json()
        self.assertEqual(get_data["avatar_id"], "male_tech_01")
        self.assertEqual(get_data["voice_id"], "en_male_02")

if __name__ == "__main__":
    unittest.main()
