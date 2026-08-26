import sys
import requests
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def test_v2_backend():
    print("[1/4] Testing GET /api/mock-interview-v2/interviewers...")
    res = requests.get(f"{BASE_URL}/api/mock-interview-v2/interviewers")
    assert res.status_code == 200, f"Status {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["total"] == 4
    print(f"  [OK] 4 Interviewers listed: {[i['name'] for i in data['interviewers']]}")

    print("[2/4] Testing POST /api/mock-interview-v2/start...")
    start_payload = {
        "interviewer_id": "female_tech",
        "target_role": "Principal Software Engineer",
        "difficulty": "Hard",
        "candidate_name": "Test Engineer",
        "job_description": "Design distributed microservices with high concurrency and fault-tolerance."
    }
    start_res = requests.post(f"{BASE_URL}/api/mock-interview-v2/start", json=start_payload)
    assert start_res.status_code == 200, f"Status {start_res.status_code}: {start_res.text}"
    start_data = start_res.json()
    assert start_data["success"] is True
    session_id = start_data["session"]["session_id"]
    first_q = start_data["first_question"]
    print(f"  [OK] Session started: {session_id}")
    print(f"  [OK] First question: '{first_q['question']}'")

    print("[3/4] Testing POST /api/mock-interview-v2/turn...")
    turn_payload = {
        "session_id": session_id,
        "phase": "WELCOME",
        "question_number": 1,
        "question_text": first_q["question"],
        "candidate_answer": "I have over 8 years of experience building distributed streaming systems using Kafka and Kubernetes."
    }
    turn_res = requests.post(f"{BASE_URL}/api/mock-interview-v2/turn", json=turn_payload)
    assert turn_res.status_code == 200, f"Status {turn_res.status_code}: {turn_res.text}"
    turn_data = turn_res.json()
    assert turn_data["success"] is True
    print(f"  [OK] Turn evaluated. Overall score: {turn_data['evaluation']['overall_turn_score']}%")
    print(f"  [OK] Next question generated: '{turn_data['next_question']['question']}'")

    print("[4/4] Testing GET /api/mock-interview-v2/interview/{id}/report...")
    rep_res = requests.get(f"{BASE_URL}/api/mock-interview-v2/interview/{session_id}/report")
    assert rep_res.status_code == 200, f"Status {rep_res.status_code}: {rep_res.text}"
    rep_data = rep_res.json()
    assert rep_data["success"] is True
    report = rep_data["report"]
    print(f"  [OK] Report generated: Overall Score={report['overall_score']}%, Recommendation={report['hiring_recommendation']}")

    print("\n[SUCCESS] All Mock Interview v2 Backend Endpoints Verified!")

if __name__ == "__main__":
    test_v2_backend()
