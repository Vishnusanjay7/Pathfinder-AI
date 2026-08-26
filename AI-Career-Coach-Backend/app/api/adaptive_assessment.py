from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.adaptive_assessment import AdaptiveAssessment
from app.models.assessment import Assessment
from app.models.coding_question import CodingQuestion
from app.models.coding_result import CodingResult
from app.models.resume import Resume
from app.models.skill import Skill
from app.models.test_case import TestCase
from app.schemas.adaptive_assessment_schema import AdaptiveAssessmentCreate, AdaptiveReportRequest, MCQAnswerSubmission
from app.services.adaptive_assessment_service import build_report, coding_blueprint, multiple_coding_blueprints, evaluate_mcqs, extract_skills, generate_mcqs

router = APIRouter(prefix="/api/skill-assessment", tags=["AI Skill Assessment"])


def owned_assessment(db: Session, assessment_id: int, user_id: int) -> AdaptiveAssessment:
    assessment = db.query(AdaptiveAssessment).filter(AdaptiveAssessment.id == assessment_id, AdaptiveAssessment.user_id == user_id).first()
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return assessment


@router.post("/generate")
def generate(request: AdaptiveAssessmentCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = int(current_user["sub"])
    latest_resume = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.upload_date.desc()).first()
    stored_skills = [item.name for item in db.query(Skill).filter(Skill.user_id == user_id).all()]
    resume_context = request.resume_text or " ".join(stored_skills)
    if not resume_context and latest_resume is None:
        raise HTTPException(status_code=400, detail="Upload a resume or provide resume text before generating an assessment.")
    skills = list(dict.fromkeys(stored_skills + extract_skills(resume_context, request.role)))
    questions = generate_mcqs(request.role, request.experience_level, skills)
    assessment = Assessment(user_id=user_id, title=f"{request.role} AI Skill Assessment", difficulty=request.experience_level, language="python", total_questions=len(questions))
    db.add(assessment)
    db.flush()
    adaptive = AdaptiveAssessment(assessment_id=assessment.id, user_id=user_id, role=request.role, experience_level=request.experience_level, skills=skills, mcq_questions=questions)
    db.add(adaptive)
    db.commit()
    db.refresh(adaptive)
    public_questions = [{key: value for key, value in question.items() if key != "answer"} for question in questions]
    return {"success": True, "assessment_id": adaptive.id, "legacy_assessment_id": assessment.id, "role": request.role, "skills": skills, "resume_source": "uploaded_resume" if latest_resume and not request.resume_text else "provided_text", "questions": public_questions}


@router.post("/{assessment_id}/evaluate-mcq")
def evaluate(
    assessment_id: int,
    request: MCQAnswerSubmission,
    count: int = 5,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    adaptive = owned_assessment(db, assessment_id, int(current_user["sub"]))
    if adaptive.status != "mcq":
        raise HTTPException(status_code=409, detail="The MCQ round has already been evaluated.")
    
    # Ensure question count is between 5 and 7
    question_count = max(5, min(7, count))
    
    result = evaluate_mcqs(adaptive.mcq_questions, request.answers, request.time_taken_seconds)
    previous_questions = [cq.title for cq in db.query(CodingQuestion).filter(CodingQuestion.id.in_(
        db.query(CodingResult.question_id).filter(CodingResult.user_id == int(current_user["sub"]))
    )).all() if cq.title]
    
    blueprints = multiple_coding_blueprints(
        role=adaptive.role,
        level=adaptive.experience_level,
        weak_topics=result["weak_topics"],
        skills=adaptive.skills,
        mcq_accuracy=result["percentage"],
        history=previous_questions,
        count=question_count
    )

    safe_questions = []
    for bp in blueprints:
        question = CodingQuestion(**{key: value for key, value in bp.items() if key not in {"test_cases", "visible_test_cases"}})
        db.add(question)
        db.flush()
        for input_data, expected_output, is_public in bp["test_cases"]:
            db.add(TestCase(question_id=question.id, input_data=input_data, expected_output=expected_output, is_public=is_public))
        
        safe_questions.append({
            "id": question.id,
            "title": question.title,
            "description": question.description,
            "difficulty": question.difficulty,
            "language": question.language,
            "topic": question.topic,
            "tags": question.tags or [],
            "constraints": question.constraints or [],
            "input_format": question.input_format,
            "output_format": question.output_format,
            "sample_input": question.sample_input,
            "sample_output": question.sample_output,
            "explanation": question.explanation,
            "expected_time_complexity": question.expected_time_complexity,
            "expected_space_complexity": question.expected_space_complexity,
            "time_limit": question.time_limit,
            "memory_limit": question.memory_limit,
            "visible_test_cases": bp["visible_test_cases"],
        })

    adaptive.mcq_result = result
    adaptive.coding_question_id = safe_questions[0]["id"]
    adaptive.status = "coding"
    db.commit()

    return {
        "success": True,
        "mcq_result": result,
        "coding_question": safe_questions[0],
        "coding_questions": safe_questions
    }


@router.post("/{assessment_id}/report")
def report(assessment_id: int, request: AdaptiveReportRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    adaptive = owned_assessment(db, assessment_id, int(current_user["sub"]))
    if adaptive.mcq_result is None:
        raise HTTPException(status_code=409, detail="Complete the MCQ round before requesting a report.")
    adaptive.report = build_report(adaptive.role, adaptive.skills, adaptive.mcq_result, request.coding_score, request.coding_feedback)
    adaptive.status = "complete"
    adaptive.completed_at = datetime.utcnow()
    parent = db.query(Assessment).filter(Assessment.id == adaptive.assessment_id).first()
    if parent:
        parent.score = round(adaptive.report["overall_career_score"])
    db.commit()
    return {"success": True, "report": adaptive.report}


@router.get("/history")
def history(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    records = db.query(AdaptiveAssessment).filter(AdaptiveAssessment.user_id == int(current_user["sub"])).order_by(AdaptiveAssessment.created_at.desc()).all()
    return {"success": True, "assessments": [{"id": record.id, "role": record.role, "experience_level": record.experience_level, "status": record.status, "score": record.report.get("overall_career_score") if record.report else None, "created_at": record.created_at} for record in records]}
