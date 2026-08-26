from app.database.session import SessionLocal
from app.services.interview_service import interview_service
from app.models.user import User
from app.models.mock_interview import MockInterview

db = SessionLocal()
user = db.query(User).first()
session = db.query(MockInterview).order_by(MockInterview.id.desc()).first()

print(f"Latest interview ID: {session.id}, user ID: {session.user_id}, status: {session.status}")
print(f"Questions count: {len(session.questions)}, Answers count: {len(session.answers)}")

try:
    report = interview_service.complete_session_and_generate_report(db, user.id, session.id)
    print("Report generated successfully!")
    print(f"Scores: Overall={report.overall_score}, Technical={report.technical_score}, Comm={report.communication_score}")
except Exception as e:
    import traceback
    traceback.print_exc()
