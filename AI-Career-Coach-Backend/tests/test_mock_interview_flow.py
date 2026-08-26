import unittest
from fastapi.testclient import TestClient
from main import app
from app.database.session import get_db
from app.models.user import User
from app.auth.password_handler import hash_password

client = TestClient(app)


def setup_interview_user():
    db = next(get_db())
    email = "interviewer_test@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            full_name="Interview Tester",
            email=email,
            phone="9876543210",
            password_hash=hash_password("Pass123!"),
            is_verified=True
        )
        db.add(user)
        db.commit()

    resp = client.post(
        "/api/auth/login",
        data={"username": email, "password": "Pass123!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestMockInterviewFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.headers = setup_interview_user()

    def test_end_to_end_mock_interview(self):
        # 1. Start session
        start_payload = {
            "target_role": "Backend Developer",
            "interview_type": "Technical",
            "difficulty": "Intermediate",
            "question_count": 5
        }
        resp = client.post("/api/mock-interview/start", json=start_payload, headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        interview_id = data["interview_id"]
        questions = data["questions"]
        self.assertEqual(len(questions), 5)

        # 2. Get session details
        resp_get = client.get(f"/api/mock-interview/{interview_id}", headers=self.headers)
        self.assertEqual(resp_get.status_code, 200)

        # 3. Submit answer for first question
        q1 = questions[0]
        ans_payload = {
            "question_id": q1["id"],
            "transcript": "I built REST APIs using FastAPI with SQLAlchemy ORM and PostgreSQL.",
            "body_language_observations": ["Upright posture and camera-facing alignment observed."]
        }
        ans_resp = client.post(f"/api/mock-interview/{interview_id}/answer", json=ans_payload, headers=self.headers)
        self.assertEqual(ans_resp.status_code, 200)
        ans_data = ans_resp.json()
        self.assertTrue(ans_data["success"])
        self.assertGreaterEqual(ans_data["answer_score"], 0)

        # 4. Complete interview & generate report
        comp_resp = client.post(f"/api/mock-interview/{interview_id}/complete", headers=self.headers)
        self.assertEqual(comp_resp.status_code, 200)
        report_data = comp_resp.json()["report"]
        self.assertGreaterEqual(report_data["readiness_score"], 0)
        self.assertIn("resume_ats_score", report_data["readiness_breakdown"])

        # 5. Get report
        rep_resp = client.get(f"/api/mock-interview/{interview_id}/report", headers=self.headers)
        self.assertEqual(rep_resp.status_code, 200)

        # 6. Check history
        hist_resp = client.get("/api/mock-interview/history", headers=self.headers)
        self.assertEqual(hist_resp.status_code, 200)
        self.assertTrue(any(item["id"] == interview_id for item in hist_resp.json()["history"]))


if __name__ == "__main__":
    unittest.main()
