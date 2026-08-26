import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.mock_interview import MockInterview, MockInterviewQuestion
from app.schemas.mock_interview_schema import (
    StartInterviewRequest,
    InterviewQuestionSchema,
    QuestionGenerationResponse,
    InterviewSessionResponse
)
from app.services.interview_service import interview_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview", tags=["Interview Questions & Evaluation"])


@router.post("/questions", response_model=QuestionGenerationResponse, summary="Generate Personalized Interview Questions")
@router.post("/generate", response_model=QuestionGenerationResponse, summary="Generate Personalized Interview Questions Alias")
def generate_questions(
    payload: StartInterviewRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate structured, personalized interview questions via OpenRouter AI brain.
    Accepts role/target_role, count/question_count, skills, projects, difficulty, interview_type.
    """
    user_id = int(current_user["sub"])
    try:
        # Load user resume context if not explicitly provided
        skills = payload.skills or []
        projects = payload.projects or []
        experience = payload.experience or []
        weak_topics = payload.weak_topics or []

        if not skills:
            from app.services.resume_service import resume_service
            from app.models.skill import Skill
            active_resume = resume_service.get_active_resume(db, user_id)
            if active_resume and active_resume.extracted_skills:
                skills = active_resume.extracted_skills
                projects = active_resume.projects_data or []
                experience = active_resume.experience_data or []
            else:
                skills = [s.name for s in db.query(Skill).filter(Skill.user_id == user_id).all()]

        raw_questions = interview_service.generate_personalized_questions(
            role=payload.target_role,
            interview_type=payload.interview_type,
            difficulty=payload.difficulty,
            count=payload.question_count,
            skills=skills,
            projects=projects,
            experience=experience,
            weak_topics=weak_topics,
            company=payload.company,
            job_title=payload.job_title,
            job_description=payload.job_description,
            required_skills=payload.required_skills
        )

        questions_schema = [
            InterviewQuestionSchema(
                id=idx,
                question_number=q.get("question_number", idx),
                question=q["question"],
                question_type=q.get("question_type", "HR"),
                difficulty=q.get("difficulty", payload.difficulty),
                topic=q.get("topic", payload.target_role)
            )
            for idx, q in enumerate(raw_questions, 1)
        ]

        return QuestionGenerationResponse(
            success=True,
            target_role=payload.target_role,
            role=payload.target_role,
            interview_type=payload.interview_type,
            difficulty=payload.difficulty,
            question_count=len(questions_schema),
            questions=questions_schema
        )
    except Exception as e:
        logger.exception("Failed to generate interview questions.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}"
        )


@router.post("/start", response_model=InterviewSessionResponse, summary="Start Mock Interview Session via Interview Router")
def start_interview_session(
    payload: StartInterviewRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start mock interview session, persisting questions to database.
    """
    user_id = int(current_user["sub"])
    try:
        session = interview_service.create_session(
            db=db,
            user_id=user_id,
            target_role=payload.target_role,
            interview_type=payload.interview_type,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
            avatar_id=payload.avatar_id or "female_hr_01",
            voice_id=payload.voice_id or "en_female_01",
            language=payload.language or "en-US",
            company=payload.company,
            job_title=payload.job_title,
            job_description=payload.job_description,
            required_skills=payload.required_skills
        )
        questions_schema = [
            InterviewQuestionSchema(
                id=q.id,
                question_number=q.question_number,
                question=q.question,
                question_type=q.question_type,
                difficulty=q.difficulty,
                topic=q.topic
            )
            for q in session.questions
        ]
        return InterviewSessionResponse(
            success=True,
            interview_id=session.id,
            target_role=session.target_role,
            interview_type=session.interview_type,
            difficulty=session.difficulty,
            question_count=session.question_count,
            avatar_id=session.avatar_id,
            voice_id=session.voice_id,
            language=session.language,
            questions=questions_schema
        )
    except Exception as e:
        logger.exception("Failed to start interview session.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}"
        )
