import unittest
from fastapi.testclient import TestClient
from main import app
from app.database.database import SessionLocal, engine
from app.database.base import Base
from app.models.user import User
from app.auth.password_handler import hash_password

class TestApplicationsHubModule(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Seed test user
        user = cls.db.query(User).filter(User.email == "apphub_user@example.com").first()
        if not user:
            user = User(
                full_name="App Hub User",
                email="apphub_user@example.com",
                phone="+15551112222",
                password_hash=hash_password("Password123!"),
                is_verified=True
            )
            cls.db.add(user)
            cls.db.commit()
            cls.db.refresh(user)
        cls.test_user = user

        # Authenticate
        s1 = cls.client.post("/api/auth/login/step1", json={
            "username": "apphub_user@example.com",
            "password": "Password123!"
        }).json()
        cid = s1["challenge_id"]

        from app.models.otp_code import OTPCode
        from app.services.otp_service import otp_service
        rec = cls.db.query(OTPCode).filter(OTPCode.purpose == f"challenge_{cid}").first()
        code = "654321"
        rec.code_hash = otp_service._hash(code)
        cls.db.commit()

        s2 = cls.client.post("/api/auth/login/step2", json={
            "challenge_id": cid,
            "otp": code
        }).json()
        cls.token = s2["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_save_and_apply_job_lifecycle(self):
        # 1. Save Job
        save_resp = self.client.post("/api/jobs/apply", json={
            "job_key": "microsoft_sr_dev",
            "job_title": "Senior Software Engineer",
            "company": "Microsoft",
            "location": "Bengaluru, India",
            "status": "Saved",
            "salary_range": "₹35,000,000 - ₹50,000,000",
            "apply_url": "https://careers.microsoft.com/job/123"
        }, headers=self.headers)
        self.assertEqual(save_resp.status_code, 200)

        # 2. Get Applications -> Verify Saved
        apps_resp = self.client.get("/api/jobs/applications", headers=self.headers)
        self.assertEqual(apps_resp.status_code, 200)
        apps = apps_resp.json()["applications"]
        saved_job = next((a for a in apps if a["job_key"] == "microsoft_sr_dev"), None)
        self.assertIsNotNone(saved_job)
        self.assertEqual(saved_job["status"], "Saved")
        self.assertIsNotNone(saved_job["saved_date_formatted"])

        # 3. Update status to Applied
        status_resp = self.client.post("/api/jobs/status", json={
            "job_key": "microsoft_sr_dev",
            "status": "Applied"
        }, headers=self.headers)
        self.assertEqual(status_resp.status_code, 200)

        # 4. Verify status updated to Applied with applied_date
        apps_resp2 = self.client.get("/api/jobs/applications", headers=self.headers)
        apps2 = apps_resp2.json()["applications"]
        applied_job = next((a for a in apps2 if a["job_key"] == "microsoft_sr_dev"), None)
        self.assertEqual(applied_job["status"], "Applied")
        self.assertIsNotNone(applied_job["applied_date_formatted"])

if __name__ == "__main__":
    unittest.main()
