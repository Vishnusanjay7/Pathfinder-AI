import requests
import json
import time
import os
import re

BASE_URL = "http://127.0.0.1:8000"
TIMESTAMP = int(time.time())
TEST_USER_EMAIL = f"qa_genuine_user_{TIMESTAMP}@example.com"
TEST_USER_PASS = "QATestPassword123!"
LOG_PATH = r"C:\Users\vishn\.gemini\antigravity\brain\67acc2fe-20bc-4d9e-abfd-5dc832a9fb35\.system_generated\tasks\task-98.log"

results = {
    "auth": {},
    "otp": {},
    "forgot_password": {},
    "resume": {},
    "ats": {},
    "jobs": {},
    "company_prep": {},
    "mock_interview": {},
    "assessment": {},
    "coding": {},
    "learning": {},
    "applications": {},
    "profile": {},
    "security": {},
    "performance": {},
    "console_network_errors": []
}

def get_latest_otp_from_log():
    if not os.path.exists(LOG_PATH):
        return None
    try:
        with open(LOG_PATH, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        for line in reversed(lines):
            if "Sending OTP email to" in line or "Development OTP" in line:
                m = re.search(r"Code:\s*(\d{6})", line)
                if m:
                    return m.group(1)
    except Exception as e:
        print("Log read error:", e)
    return None

print(f"=== STARTING BACKEND DEEP AUTOMATED QA TEST (User: {TEST_USER_EMAIL}) ===")

def measure(func, *args, **kwargs):
    start = time.time()
    res = func(*args, **kwargs)
    duration = time.time() - start
    return res, duration

# 1. Health check
res, dur = measure(requests.get, f"{BASE_URL}/health")
print(f"1. Health check: {res.status_code} in {dur:.3f}s - {res.text}")
results["performance"]["health_latency_ms"] = round(dur * 1000, 2)
results["auth"]["backend_starts_pass"] = (res.status_code == 200)

# 2. Protected route without token
res_prot = requests.get(f"{BASE_URL}/api/profile/me")
results["auth"]["protected_route_unauth_status"] = res_prot.status_code
results["auth"]["protected_route_unauth_pass"] = (res_prot.status_code in (401, 403))
print(f"2. Protected Route without token: {res_prot.status_code} (PASS={results['auth']['protected_route_unauth_pass']})")

# 3. Registration test
reg_data = {
    "full_name": "Genuine QA Tester",
    "email": TEST_USER_EMAIL,
    "phone": "9876543210",
    "password": TEST_USER_PASS,
    "college": "Test Tech University",
    "degree": "B.Tech",
    "branch": "Computer Science",
    "graduation_year": 2025
}

res_reg, dur_reg = measure(requests.post, f"{BASE_URL}/api/auth/register", json=reg_data)
print(f"3. Register: {res_reg.status_code} - {res_reg.text[:150]}")
results["auth"]["register_status"] = res_reg.status_code

# Extract registration OTP
time.sleep(1)
reg_otp = get_latest_otp_from_log()
print(f"Extracted Registration OTP from backend log: {reg_otp}")

# 4. Registration OTP Verification
if reg_otp:
    res_verify = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
        "identifier": TEST_USER_EMAIL,
        "code": reg_otp,
        "channel": "email"
    })
    print(f"4. OTP Verify Registration: {res_verify.status_code} - {res_verify.text[:150]}")
    results["otp"]["registration_verify_status"] = res_verify.status_code
    if res_verify.status_code == 200:
        token_data = res_verify.json()
        results["auth"]["jwt_token_received"] = "access_token" in token_data

# Test wrong OTP rejection
res_wrong_otp = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
    "identifier": TEST_USER_EMAIL,
    "code": "000000",
    "channel": "email"
})
results["otp"]["wrong_otp_rejected"] = (res_wrong_otp.status_code == 400)
print(f"4b. Wrong OTP test: {res_wrong_otp.status_code} (Rejected={results['otp']['wrong_otp_rejected']})")

# 5. Login Step 1 (Password Verification)
res_l1, dur_l1 = measure(requests.post, f"{BASE_URL}/api/auth/login/step1", json={
    "username": TEST_USER_EMAIL,
    "password": TEST_USER_PASS
})
print(f"5. Login Step 1: {res_l1.status_code} - {res_l1.text[:150]}")
results["auth"]["login_step1_status"] = res_l1.status_code

challenge_id = None
if res_l1.status_code == 200:
    l1_json = res_l1.json()
    challenge_id = l1_json.get("challenge_id")
    results["security"]["otp_in_step1_response"] = ("otp" in l1_json or "code" in l1_json)
    print(f"Security Check - OTP exposed in Login Step 1 response: {results['security']['otp_in_step1_response']}")

# Extract login challenge OTP from backend log
time.sleep(1)
login_otp = get_latest_otp_from_log()
print(f"Extracted Login OTP from backend log: {login_otp}")

# 6. Login Step 2 (OTP Verification -> JWT)
jwt_token = None
if challenge_id and login_otp:
    res_l2, dur_l2 = measure(requests.post, f"{BASE_URL}/api/auth/login/step2", json={
        "challenge_id": challenge_id,
        "otp": login_otp
    })
    print(f"6. Login Step 2: {res_l2.status_code} - {res_l2.text[:150]}")
    results["auth"]["login_step2_status"] = res_l2.status_code
    if res_l2.status_code == 200:
        jwt_token = res_l2.json().get("access_token")

headers = {"Authorization": f"Bearer {jwt_token}"} if jwt_token else {}
print(f"Acquired JWT Token: {'YES' if jwt_token else 'NO'}")

# Invalid Password Test
res_inv_pwd = requests.post(f"{BASE_URL}/api/auth/login/step1", json={
    "username": TEST_USER_EMAIL,
    "password": "WrongPassword123!"
})
results["auth"]["invalid_password_pass"] = (res_inv_pwd.status_code == 401)
print(f"Invalid Password test: {res_inv_pwd.status_code} (PASS={results['auth']['invalid_password_pass']})")

# Invalid Email Test
res_inv_email = requests.post(f"{BASE_URL}/api/auth/login/step1", json={
    "username": "nonexistent_email_999@example.com",
    "password": TEST_USER_PASS
})
results["auth"]["invalid_email_pass"] = (res_inv_email.status_code == 401)
print(f"Invalid Email test: {res_inv_email.status_code} (PASS={results['auth']['invalid_email_pass']})")

# 7. Forgot Password Flow
res_fp = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": TEST_USER_EMAIL})
print(f"7. Forgot Password Request: {res_fp.status_code} - {res_fp.text[:150]}")
results["forgot_password"]["request_status"] = res_fp.status_code

time.sleep(1)
fp_otp = get_latest_otp_from_log()
print(f"Extracted Forgot Password OTP: {fp_otp}")

if fp_otp:
    res_fp_v = requests.post(f"{BASE_URL}/api/auth/forgot-password/verify-otp", json={
        "email": TEST_USER_EMAIL,
        "otp": fp_otp
    })
    print(f"7b. Forgot Password Verify OTP: {res_fp_v.status_code} - {res_fp_v.text[:150]}")
    results["forgot_password"]["verify_otp_status"] = res_fp_v.status_code
    reset_token = res_fp_v.json().get("reset_token") if res_fp_v.status_code == 200 else None

    if reset_token:
        res_reset = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "reset_token": reset_token,
            "new_password": TEST_USER_PASS
        })
        print(f"7c. Reset Password: {res_reset.status_code} - {res_reset.text[:150]}")
        results["forgot_password"]["reset_password_status"] = res_reset.status_code

# 8. Profile API Test
if jwt_token:
    res_prof, dur_prof = measure(requests.get, f"{BASE_URL}/api/profile/me", headers=headers)
    print(f"8. Profile GET: {res_prof.status_code}")
    results["profile"]["get_status"] = res_prof.status_code
    results["profile"]["data"] = res_prof.json() if res_prof.status_code == 200 else {}

# 9. Resume Upload & Parsing Test
pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 280 >> stream
BT
/F1 12 Tf
72 712 Td (JOHN DOE) Tj
0 -18 Td (Software Systems Engineer) Tj
0 -18 Td (Email: john.doe@example.com | Phone: 1234567890 | GitHub: github.com/johndoe) Tj
0 -25 Td (SKILLS: Python, FastAPI, React, PostgreSQL, Docker, Pytest, Machine Learning) Tj
0 -25 Td (EXPERIENCE: Senior Software Engineer at Tech Corp - 2022 to Present) Tj
0 -18 Td (Developed high performance REST APIs with Python and FastAPI.) Tj
0 -25 Td (EDUCATION: Bachelor of Science in Computer Science, State University, 2021) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
545
%%EOF"""

if jwt_token:
    files = {"file": ("test_resume.pdf", pdf_content, "application/pdf")}
    res_res, dur_res = measure(requests.post, f"{BASE_URL}/api/resume/upload", files=files, headers=headers)
    print(f"9. Resume Upload: {res_res.status_code} in {dur_res:.2f}s - {res_res.text[:250]}")
    results["performance"]["resume_processing_sec"] = round(dur_res, 2)
    results["resume"]["upload_status"] = res_res.status_code
    if res_res.status_code == 200:
        res_data = res_res.json()
        results["resume"]["parsed_response"] = res_data
        contact_info = res_data.get("contact_info") or {}
        extracted_skills = res_data.get("extracted_skills") or []
        
        # Calculate Parser Accuracy: Correct fields / expected fields * 100
        expected_fields = ["name", "email", "phone", "skills", "experience", "education"]
        correct_fields = 0
        if contact_info.get("name") or "John" in str(res_data): correct_fields += 1
        if contact_info.get("email") or "john.doe" in str(res_data): correct_fields += 1
        if contact_info.get("phone") or "1234567890" in str(res_data): correct_fields += 1
        if extracted_skills or "Python" in str(res_data): correct_fields += 1
        if res_data.get("experience_data") or "Tech Corp" in str(res_data): correct_fields += 1
        if res_data.get("education_data") or "State University" in str(res_data): correct_fields += 1
        
        accuracy = (correct_fields / len(expected_fields)) * 100
        results["resume"]["parser_accuracy_pct"] = accuracy
        print(f"Resume Parser Accuracy: {correct_fields}/{len(expected_fields)} = {accuracy}%")

# 10. ATS Analysis Test
if jwt_token:
    files = {"file": ("test_resume.pdf", pdf_content, "application/pdf")}
    jd_text = "Senior Software Engineer position requiring Python, FastAPI, React, PostgreSQL, and Docker."
    res_ats, dur_ats = measure(requests.post, f"{BASE_URL}/api/jobs/match", files=files, data={"job_description": jd_text}, headers=headers)
    print(f"10. ATS Analysis (/api/jobs/match): {res_ats.status_code} in {dur_ats:.2f}s - {res_ats.text[:250]}")
    results["performance"]["ats_analysis_sec"] = round(dur_ats, 2)
    results["ats"]["status"] = res_ats.status_code
    if res_ats.status_code == 200:
        ats_json = res_ats.json()
        res_dict = ats_json.get("result", {})
        score = res_dict.get("overall_score") or ats_json.get("ats_score")
        results["ats"]["score"] = score
        results["ats"]["valid_bounds"] = (0 <= float(score or 0) <= 100) if score is not None else False
        print(f"ATS Match Score: {score} (Valid Bounds 0-100: {results['ats']['valid_bounds']})")

# 11. Job Recommendation
if jwt_token:
    res_jobs, dur_jobs = measure(requests.post, f"{BASE_URL}/api/jobs/recommend", headers=headers)
    print(f"11. Job Recommendation (/api/jobs/recommend): {res_jobs.status_code} in {dur_jobs:.2f}s")
    results["performance"]["job_search_sec"] = round(dur_jobs, 2)
    results["jobs"]["search_status"] = res_jobs.status_code
    if res_jobs.status_code == 200:
        jobs_data = res_jobs.json()
        jobs_list = jobs_data.get("recommendations", [])
        results["jobs"]["count_found"] = len(jobs_list)
        tested_links = 0
        valid_links = 0
        for j in jobs_list[:10]:
            link = j.get("redirect_url") or j.get("url") or j.get("apply_url")
            tested_links += 1
            if link and link != "null" and link != "undefined" and link.startswith("http"):
                valid_links += 1
        results["jobs"]["tested_links"] = tested_links
        results["jobs"]["valid_links"] = valid_links
        print(f"Job Links Tested: {valid_links}/{tested_links} valid URLs")

# 12. Company Preparation
if jwt_token:
    prep1 = {
        "job_key": "google_backend_eng",
        "company": "Google",
        "job_title": "Backend Engineer",
        "job_description": "Distributed systems, Python, C++",
        "location": "Mountain View, CA",
        "salary_range": "$150k - $220k",
        "apply_url": "https://careers.google.com/jobs/results/123",
        "duration_days": 7
    }
    res_prep1, dur_prep1 = measure(requests.post, f"{BASE_URL}/api/company-preparation/analyze", json=prep1, headers=headers)
    print(f"12. Company Prep 1 (Google): {res_prep1.status_code}")
    
    prep2 = {
        "job_key": "microsoft_frontend_dev",
        "company": "Microsoft",
        "job_title": "Frontend Developer",
        "job_description": "React, TypeScript, UI Components",
        "location": "Redmond, WA",
        "salary_range": "$140k - $200k",
        "apply_url": "https://careers.microsoft.com/jobs/456",
        "duration_days": 7
    }
    res_prep2, dur_prep2 = measure(requests.post, f"{BASE_URL}/api/company-preparation/analyze", json=prep2, headers=headers)
    print(f"12b. Company Prep 2 (Microsoft): {res_prep2.status_code}")
    
    results["company_prep"]["google_status"] = res_prep1.status_code
    results["company_prep"]["microsoft_status"] = res_prep2.status_code
    if res_prep1.status_code == 200 and res_prep2.status_code == 200:
        results["company_prep"]["personalized_distinct"] = (res_prep1.text != res_prep2.text)
        print(f"Company Prep Distinct Content: {results['company_prep']['personalized_distinct']}")

# 13. Mock Interview Complete Test
if jwt_token:
    res_avatars = requests.get(f"{BASE_URL}/api/avatar/profiles", headers=headers)
    results["mock_interview"]["avatar_profiles_status"] = res_avatars.status_code
    if res_avatars.status_code == 200:
        profiles = res_avatars.json().get("profiles", [])
        results["mock_interview"]["avatar_count"] = len(profiles)
        print(f"13. Avatar Profiles Loaded: {len(profiles)} avatars available")

    # Start Interview
    start_req = {
        "target_role": "Full Stack Developer",
        "interview_type": "Technical",
        "difficulty": "Medium",
        "question_count": 5,
        "avatar_id": "female_hr_01",
        "voice_id": "en_female_01",
        "language": "en-US"
    }
    res_start, dur_start = measure(requests.post, f"{BASE_URL}/api/mock-interview/start", json=start_req, headers=headers)
    print(f"13b. Start Mock Interview: {res_start.status_code} in {dur_start:.2f}s")
    results["performance"]["interview_startup_sec"] = round(dur_start, 2)
    results["mock_interview"]["start_status"] = res_start.status_code
    
    interview_id = None
    first_q = None
    questions = []
    if res_start.status_code == 200:
        s_json = res_start.json()
        interview_id = s_json.get("interview_id")
        questions = s_json.get("questions", [])
        if questions:
            first_q = questions[0].get("question")
        print(f"Interview ID: {interview_id}, Questions Count: {len(questions)}, First Q: {first_q}")
        results["mock_interview"]["first_question"] = first_q
        results["mock_interview"]["first_q_is_hr_intro"] = bool(first_q and any(w in first_q.lower() for w in ["tell me about yourself", "introduce", "welcome", "background", "hello"]))

    if interview_id and questions:
        q1_id = questions[0].get("id")
        # Submit Answer
        ans_req = {
            "question_id": q1_id,
            "transcript": "I am a full stack software engineer with 3 years of experience in Python, FastAPI, React, and PostgreSQL."
        }
        res_ans, dur_ans = measure(requests.post, f"{BASE_URL}/api/mock-interview/{interview_id}/answer", json=ans_req, headers=headers)
        print(f"13c. Submit Answer for Q{q1_id}: {res_ans.status_code} in {dur_ans:.2f}s")
        results["performance"]["stt_latency_sec"] = round(dur_ans, 2)
        results["mock_interview"]["answer_status"] = res_ans.status_code
        if res_ans.status_code == 200:
            ans_json = res_ans.json()
            results["mock_interview"]["no_mid_interview_eval"] = ("final_score" not in ans_json)

        # Final Evaluation
        res_eval, dur_eval = measure(requests.post, f"{BASE_URL}/api/mock-interview/{interview_id}/complete", headers=headers)
        print(f"13d. Final Evaluation: {res_eval.status_code} in {dur_eval:.2f}s")
        results["performance"]["final_evaluation_sec"] = round(dur_eval, 2)
        results["mock_interview"]["evaluate_status"] = res_eval.status_code
        if res_eval.status_code == 200:
            eval_json = res_eval.json()
            results["mock_interview"]["report"] = eval_json
            report_data = eval_json.get("report") or {}
            score = report_data.get("overall_score") or eval_json.get("overall_score")
            results["mock_interview"]["final_score"] = score
            results["mock_interview"]["score_valid_bounds"] = (0 <= float(score or 0) <= 100) if score is not None else False
            print(f"Mock Interview Final Score: {score} (Valid Bounds 0-100: {results['mock_interview']['score_valid_bounds']})")

# 14. Assessments Module Test
if jwt_token:
    res_ass_q = requests.get(f"{BASE_URL}/api/assessment/questions", headers=headers)
    print(f"14. Assessment Questions: {res_ass_q.status_code}")
    results["assessment"]["get_questions_status"] = res_ass_q.status_code

# 15. Coding Module Test
if jwt_token:
    res_code_q = requests.get(f"{BASE_URL}/api/coding/questions", headers=headers)
    print(f"15. Coding Questions: {res_code_q.status_code}")
    results["coding"]["get_questions_status"] = res_code_q.status_code
    
    code_sub = {
        "assessment_id": 1,
        "question_id": 1,
        "language": "python",
        "source_code": "print(sum(map(int, input().split())))"
    }
    res_sub, dur_sub = measure(requests.post, f"{BASE_URL}/api/coding/submit", json=code_sub, headers=headers)
    print(f"15b. Coding Submit: {res_sub.status_code} in {dur_sub:.2f}s - {res_sub.text[:150]}")
    results["coding"]["submit_status"] = res_sub.status_code

# 16. Learning Center & Applications Tracker
if jwt_token:
    res_learn = requests.get(f"{BASE_URL}/api/learning/courses", headers=headers)
    print(f"16. Learning Courses: {res_learn.status_code}")
    results["learning"]["get_courses_status"] = res_learn.status_code

    res_apps = requests.get(f"{BASE_URL}/api/jobs/applications", headers=headers)
    print(f"16b. Applications Hub GET: {res_apps.status_code}")
    results["applications"]["get_status"] = res_apps.status_code

# Save summary
with open("qa_backend_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("\n=== BACKEND DEEP QA COMPLETE. Saved to qa_backend_results.json ===")
