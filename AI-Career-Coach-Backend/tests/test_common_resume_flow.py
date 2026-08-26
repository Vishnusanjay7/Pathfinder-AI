from fastapi.testclient import TestClient
from main import app
from app.database.session import get_db
from app.models.user import User
from app.auth.password_handler import hash_password

client = TestClient(app)

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT /F1 24 Tf 72 132 Td (Experienced Software Engineer Python FastAPI React Docker SQL PostgreSQL) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000100 00000 n \n0000000200 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n340\n%%EOF"


def setup_user():
    db = next(get_db())
    email = "resume_test@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            full_name="Resume Tester",
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


def test_active_resume_and_modules_flow():
    headers = setup_user()

    # 1. Upload Resume
    files = {"file": ("my_central_resume.pdf", PDF_BYTES, "application/pdf")}
    res_upload = client.post("/api/resume/upload", files=files, headers=headers)
    assert res_upload.status_code == 200, res_upload.text
    upload_data = res_upload.json()
    assert upload_data["success"] is True

    # 2. Get Current Active Resume
    res_current = client.get("/api/resume/current", headers=headers)
    assert res_current.status_code == 200
    current_data = res_current.json()
    assert current_data["has_resume"] is True
    assert current_data["resume"]["filename"] == "my_central_resume.pdf"
    assert current_data["resume"]["is_active"] is True

    # 3. Recommend Jobs using active resume automatically (No file provided)
    res_recs = client.post("/api/jobs/recommend", headers=headers)
    assert res_recs.status_code == 200, res_recs.text
    recs_data = res_recs.json()
    assert recs_data["success"] is True
    assert len(recs_data["recommendations"]) > 0

    # 4. Job Match using active resume automatically (No file provided)
    res_match = client.post(
        "/api/jobs/match",
        data={"job_description": "We are seeking a Senior Python FastAPI Software Engineer with SQL and Docker experience."},
        headers=headers
    )
    assert res_match.status_code == 200, res_match.text
    match_data = res_match.json()
    assert match_data["success"] is True
    assert match_data["result"]["ats_score"] > 0
    assert "keyword_match_pct" in match_data["result"]

    # 5. Apply for job and track status
    job_key = recs_data["recommendations"][0]["job_key"]
    res_apply = client.post(
        "/api/jobs/apply",
        json={
            "job_key": job_key,
            "job_title": recs_data["recommendations"][0]["job_title"],
            "company": recs_data["recommendations"][0]["company"] or "Company",
            "status": "Applied"
        },
        headers=headers
    )
    assert res_apply.status_code == 200, res_apply.text
    apply_data = res_apply.json()
    assert apply_data["application"]["status"] == "Applied"
    assert apply_data["application"]["application_date"] is not None

    # Fetch applications list
    res_apps = client.get("/api/jobs/applications", headers=headers)
    assert res_apps.status_code == 200
    apps_list = res_apps.json()["applications"]
    assert len(apps_list) > 0

    # Update status to Interview
    res_status = client.post(
        "/api/jobs/status",
        json={"job_key": job_key, "status": "Interview"},
        headers=headers
    )
    assert res_status.status_code == 200

    # 6. Unified AI Skill Assessment Generation & Hidden Test Cases Security Check
    res_gen = client.post(
        "/api/skill-assessment/generate",
        json={"role": "Backend Developer", "experience_level": "Intermediate"},
        headers=headers
    )
    assert res_gen.status_code == 200, res_gen.text
    gen_data = res_gen.json()
    assessment_id = gen_data["assessment_id"]
    assert len(gen_data["questions"]) == 20

    # Answers dict
    answers = {q["id"]: q["options"][0] for q in gen_data["questions"]}

    res_eval = client.post(
        f"/api/skill-assessment/{assessment_id}/evaluate-mcq",
        json={"answers": answers, "time_taken_seconds": 120},
        headers=headers
    )
    assert res_eval.status_code == 200, res_eval.text
    eval_data = res_eval.json()
    coding_q = eval_data["coding_question"]

    # CRITICAL SECURITY ASSERTION: Hidden test cases and reference solutions MUST NOT be in public payload!
    assert "hidden_test_cases" not in coding_q
    assert "reference_solution" not in coding_q
    assert "visible_test_cases" in coding_q

    print("\n[SUCCESS] Common Resume Flow, Job Application Tracking, ATS Scoring, and Hidden Test Case Security verified!")


if __name__ == "__main__":
    test_active_resume_and_modules_flow()
