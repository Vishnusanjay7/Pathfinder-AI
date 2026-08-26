from pathlib import Path
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

USER = {
    "full_name": "Test User",
    "email": "verify@example.com",
    "password": "StrongPass123!",
    "phone": "1234567890",
    "college": "Test University",
    "degree": "BSc Computer Science",
    "branch": "Computer Science",
    "graduation_year": 2024
}

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT /F1 24 Tf 72 132 Td (Test Resume) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000100 00000 n \n0000000200 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n280\n%%EOF"

REPORT = {
    "register": None,
    "login": None,
    "jwt": None,
    "upload_resume": None,
    "resume_history": None,
    "profile": None,
    "job_recommendation": None,
    "coding": None,
    "issues": []
}


def assert_response(resp, status_code=200):
    if resp.status_code != status_code:
        raise AssertionError(f"Expected {status_code}, got {resp.status_code}: {resp.text}")
    try:
        return resp.json()
    except ValueError:
        raise AssertionError("Response is not valid JSON")


def run():
    # Cleanup previously created user if exists
    token = None

    # Ensure coding question 1 and test case exist
    from app.database.session import get_db
    from app.models.coding_question import CodingQuestion
    from app.models.test_case import TestCase

    db_seed = next(get_db())
    cq = db_seed.query(CodingQuestion).filter(CodingQuestion.id == 1).first()
    if not cq:
        cq = CodingQuestion(id=1, title="Sum of Array", description="Calculate sum of numbers", difficulty="Easy")
        db_seed.add(cq)
        db_seed.commit()
    tc = db_seed.query(TestCase).filter(TestCase.question_id == 1).first()
    if not tc:
        tc = TestCase(question_id=1, input_data="1 2 3", expected_output="6", is_public=True)
        db_seed.add(tc)
        db_seed.commit()


    # Register
    resp = client.post("/api/auth/register", json=USER)
    if resp.status_code not in (200, 201):
        REPORT["register"] = False
        REPORT["issues"].append(("register", resp.status_code, resp.text))
    else:
        REPORT["register"] = True

    # Complete registration by creating user in DB if pending
    from app.database.session import get_db
    from app.models.user import User as UserModel
    from app.models.pending_registration import PendingRegistration
    from app.auth.password_handler import hash_password

    db = next(get_db())
    existing_user = db.query(UserModel).filter(UserModel.email == USER["email"]).first()
    if not existing_user:
        pending = db.query(PendingRegistration).filter(PendingRegistration.email == USER["email"]).first()
        new_user = UserModel(
            full_name=USER["full_name"],
            email=USER["email"],
            phone=USER["phone"],
            password_hash=hash_password(USER["password"]),
            college=USER["college"],
            degree=USER["degree"],
            branch=USER["branch"],
            graduation_year=USER["graduation_year"],
            is_verified=True,
        )
        db.add(new_user)
        if pending:
            db.delete(pending)
        db.commit()


    # Login
    resp = client.post(
        "/api/auth/login",
        data={"username": USER["email"], "password": USER["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if resp.status_code != 200:
        REPORT["login"] = False
        REPORT["issues"].append(("login", resp.status_code, resp.text))
        return REPORT
    data = resp.json()
    REPORT["login"] = True
    token = data.get("access_token")
    REPORT["jwt"] = token is not None
    headers = {"Authorization": f"Bearer {token}"}

    # Profile
    resp = client.get("/api/profile/me", headers=headers)
    PROFILE = assert_response(resp)
    REPORT["profile"] = PROFILE.get("success", False)

    # Resume upload
    files = {"file": ("resume.pdf", PDF_BYTES, "application/pdf")}
    resp = client.post("/api/resume/upload", files=files, headers=headers)
    result = assert_response(resp)
    REPORT["upload_resume"] = result.get("success", False)

    # Resume history
    resp = client.get("/api/resumes/", headers=headers)
    history = assert_response(resp)
    REPORT["resume_history"] = history.get("success", False)
    if history.get("count", 0) > 0:
        REPORT["resume_id"] = history["resumes"][0]["id"] if isinstance(history["resumes"], list) and history["resumes"] else None

    # Job recommendation
    files = {"file": ("resume.pdf", PDF_BYTES, "application/pdf")}
    resp = client.post("/api/jobs/recommend", files=files, headers=headers)
    rec = assert_response(resp)
    REPORT["job_recommendation"] = rec.get("success", False)

    # Coding assessment submit
    resp = client.post(
        "/api/coding/submit",
        json={
            "assessment_id": 1,
            "question_id": 1,
            "language": "python",
            "source_code": "print(sum(map(int, input().split())))"
        },
        headers=headers
    )
    coding = assert_response(resp)
    REPORT["coding"] = coding.get("passed", False)

    return REPORT


if __name__ == "__main__":
    report = run()
    print(report)
