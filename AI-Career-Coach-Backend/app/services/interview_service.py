import json
import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from app.models.mock_interview import (
    MockInterview,
    MockInterviewQuestion,
    MockInterviewAnswer,
    MockInterviewReport
)
from app.models.adaptive_assessment import AdaptiveAssessment
from app.models.coding_result import CodingResult
from app.models.learning_progress import LearningProgress
from app.models.skill import Skill
from app.services.resume_service import resume_service
from app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)


class InterviewService:
    """
    Handles AI Mock Interview session creation, personalized question generation,
    answer evaluation (technical & communication), body language reporting,
    Placement Readiness computation, and report generation.
    
    Depends ONLY on BaseAIProvider abstraction via get_ai_provider().
    """

    def generate_personalized_questions(
        self,
        role: str,
        interview_type: str,
        difficulty: str,
        count: int,
        skills: List[str],
        projects: List[Dict[str, Any]],
        experience: List[Dict[str, Any]],
        weak_topics: List[str],
        company: Optional[str] = None,
        job_title: Optional[str] = None,
        job_description: Optional[str] = None,
        required_skills: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate structured personalized interview questions via current AIProvider.
        Supports optional company/job personalization.
        Enforces strict question sequence:
        1. HR ("Please introduce yourself...") -> 2. Personal/Background -> 3. Resume -> 4. Projects -> 5. Company/Job -> 6. Behavioral -> 7. Technical.
        """
        ai_provider = get_ai_provider()
        return ai_provider.generate_question(
            role=role,
            interview_type=interview_type,
            difficulty=difficulty,
            count=count,
            skills=skills,
            projects=projects,
            experience=experience,
            weak_topics=weak_topics,
            company=company,
            job_title=job_title,
            job_description=job_description,
            required_skills=required_skills
        )

    def create_session(
        self,
        db: Session,
        user_id: int,
        target_role: str,
        interview_type: str,
        difficulty: str,
        question_count: int,
        avatar_id: str = "female_hr_01",
        voice_id: str = "en_female_01",
        language: str = "en-US",
        company: Optional[str] = None,
        job_title: Optional[str] = None,
        job_description: Optional[str] = None,
        required_skills: Optional[List[str]] = None
    ) -> MockInterview:
        active_resume = resume_service.get_active_resume(db, user_id)
        skills = active_resume.extracted_skills if active_resume and active_resume.extracted_skills else []
        if not skills:
            skills = [s.name for s in db.query(Skill).filter(Skill.user_id == user_id).all()]

        projects = active_resume.projects_data if active_resume and active_resume.projects_data else []
        experience = active_resume.experience_data if active_resume and active_resume.experience_data else []

        # Load weak topics from past adaptive assessments
        adaptive = db.query(AdaptiveAssessment).filter(AdaptiveAssessment.user_id == user_id).order_by(AdaptiveAssessment.created_at.desc()).first()
        weak_topics = adaptive.mcq_result.get("weak_topics", []) if adaptive and adaptive.mcq_result else []

        raw_questions = self.generate_personalized_questions(
            role=target_role,
            interview_type=interview_type,
            difficulty=difficulty,
            count=question_count,
            skills=skills,
            projects=projects,
            experience=experience,
            weak_topics=weak_topics,
            company=company,
            job_title=job_title,
            job_description=job_description,
            required_skills=required_skills
        )

        interview = MockInterview(
            user_id=user_id,
            resume_id=active_resume.id if active_resume else None,
            target_role=target_role,
            interview_type=interview_type,
            difficulty=difficulty,
            question_count=question_count,
            avatar_id=avatar_id,
            voice_id=voice_id,
            language=language,
            status="in_progress"
        )
        db.add(interview)
        db.flush()

        for idx, q in enumerate(raw_questions, 1):
            db_q = MockInterviewQuestion(
                interview_id=interview.id,
                question_number=idx,
                question=q["question"],
                question_type=q.get("question_type", "HR"),
                difficulty=q.get("difficulty", difficulty),
                topic=q.get("topic", target_role)
            )
            db.add(db_q)

        db.commit()
        db.refresh(interview)

        return interview

    def _compute_filler_metrics(self, transcript: str):
        """Deterministic filler word analysis — no AI required."""
        word_count = len(transcript.split()) if transcript else 0
        filler_list = ["um", "uh", "like", "you know", "actually", "basically", "so"]
        text_lower = (transcript or "").lower()
        filler_counts = {}
        total_fillers = 0

        for filler in filler_list:
            count = len(re.findall(rf"\b{re.escape(filler)}\b", text_lower))
            if count > 0:
                filler_counts[filler] = count
                total_fillers += count

        filler_frequency_pct = round((total_fillers / max(word_count, 1)) * 100, 1)
        return {
            "word_count": word_count,
            "filler_count": total_fillers,
            "filler_frequency_pct": filler_frequency_pct,
            "filler_breakdown": filler_counts,
        }

    def store_answer(
        self,
        db: Session,
        user_id: int,
        interview_id: int,
        question_id: int,
        transcript: str,
        body_language_obs: List[str] = None
    ) -> MockInterviewAnswer:
        """
        Store a candidate answer transcript WITHOUT invoking AI evaluation.
        Used during the live interview so the next question fires immediately.
        AI scoring happens later in batch via complete_session_and_generate_report().
        """
        question = db.query(MockInterviewQuestion).filter(
            MockInterviewQuestion.id == question_id,
            MockInterviewQuestion.interview_id == interview_id
        ).first()

        if not question:
            raise ValueError("Question not found for this interview.")

        filler_metrics = self._compute_filler_metrics(transcript)

        answer = MockInterviewAnswer(
            interview_id=interview_id,
            question_id=question_id,
            transcript=transcript,
            answer_score=0,
            technical_score=0,
            communication_score=0,
            grammar_score=0,
            fluency_score=0,
            clarity_score=0,
            relevance_score=0,
            feedback={
                "body_language": body_language_obs or [],
                "spoken_english_metrics": filler_metrics,
                "pending_evaluation": True,
            }
        )

        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer

    def process_conversational_turn(
        self,
        db: Session,
        user_id: int,
        interview_id: int,
        current_question_id: int,
        candidate_transcript: str,
        body_language_obs: Optional[List[str]] = None,
        voice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a real-time conversational turn:
        1. Stores candidate answer to database without mid-interview evaluation latency.
        2. Detects if candidate asked a company-specific question (e.g. culture, tech stack, products).
        3. Retrieves factual company context via CompanyRAGService.
        4. Generates intelligent conversational follow-up or advances to next phase.
        5. Synthesizes interviewer speech via Deepgram TTS or returns client speech payload.
        """
        from app.services.rag_service import company_rag_service
        from app.services.deepgram_tts_service import deepgram_tts_service

        session = db.query(MockInterview).filter(
            MockInterview.id == interview_id,
            MockInterview.user_id == user_id
        ).first()
        if not session:
            raise ValueError("Interview session not found.")

        # Store answer
        stored_answer = self.store_answer(
            db=db,
            user_id=user_id,
            interview_id=interview_id,
            question_id=current_question_id,
            transcript=candidate_transcript,
            body_language_obs=body_language_obs
        )

        current_q = db.query(MockInterviewQuestion).filter(
            MockInterviewQuestion.id == current_question_id
        ).first()

        transcript_lower = (candidate_transcript or "").lower()
        company_inquiry_keywords = ["your company", "company culture", "company mission", "what tech", "what technologies", "what products", "achievements", "work at", "tell me about"]
        is_company_inquiry = any(kw in transcript_lower for kw in company_inquiry_keywords)

        rag_context = ""
        if is_company_inquiry and session.target_role:
            rag_res = company_rag_service.query_company_knowledge(session.target_role.split()[0] if session.target_role else "Tech", candidate_transcript)
            if rag_res.get("has_context"):
                rag_context = rag_res.get("context", "")

        # Find next question in sequence
        next_q = db.query(MockInterviewQuestion).filter(
            MockInterviewQuestion.interview_id == interview_id,
            MockInterviewQuestion.question_number > (current_q.question_number if current_q else 0)
        ).order_by(MockInterviewQuestion.question_number.asc()).first()

        is_final = next_q is None

        # Build natural conversational transition
        interviewer_text = ""
        if is_final:
            interviewer_text = "Thank you very much for sharing your detailed experience with me today. That concludes all our interview questions. I will now compile your comprehensive evaluation report."
        elif rag_context:
            interviewer_text = f"Regarding our company: {rag_context[:160]}... Now, moving to our next topic: {next_q.question}"
        else:
            interviewer_text = next_q.question

        # TTS Synthesis
        tts_res = deepgram_tts_service.synthesize_speech(
            text=interviewer_text,
            voice_id=voice_id or session.voice_id or "aura-asteria-en",
            language=session.language or "en-US"
        )

        return {
            "success": True,
            "answer_id": stored_answer.id,
            "is_final_question": is_final,
            "next_question_id": next_q.id if next_q else None,
            "next_question_number": next_q.question_number if next_q else None,
            "next_question_text": interviewer_text,
            "tts": tts_res,
            "rag_applied": bool(rag_context)
        }

    def evaluate_answer(
        self,
        db: Session,
        user_id: int,
        interview_id: int,
        question_id: int,
        transcript: str,
        body_language_obs: List[str] = None
    ) -> MockInterviewAnswer:
        """
        Evaluate a single answer via AI (legacy path).
        Prefer store_answer() during the interview and batch evaluation at the end.
        """
        question = db.query(MockInterviewQuestion).filter(
            MockInterviewQuestion.id == question_id,
            MockInterviewQuestion.interview_id == interview_id
        ).first()

        if not question:
            raise ValueError("Question not found for this interview.")

        filler_metrics = self._compute_filler_metrics(transcript)

        ai_provider = get_ai_provider()
        eval_data = ai_provider.evaluate_answer(
            question=question.question,
            question_type=question.question_type,
            topic=question.topic,
            transcript=transcript,
            body_language_obs=body_language_obs
        )

        answer = MockInterviewAnswer(
            interview_id=interview_id,
            question_id=question_id,
            transcript=transcript,
            answer_score=eval_data.get("score", eval_data.get("overall_answer_score", 75)),
            technical_score=eval_data.get("technical_score", 75),
            communication_score=eval_data.get("communication_score", 80),
            grammar_score=eval_data.get("english_score", eval_data.get("grammar_score", 80)),
            fluency_score=eval_data.get("fluency_score", 80),
            clarity_score=eval_data.get("clarity_score", 80),
            relevance_score=eval_data.get("relevance_score", 80),
            feedback={
                "strengths": eval_data.get("strengths", []),
                "weaknesses": eval_data.get("weaknesses", []),
                "missing_concepts": eval_data.get("missing_concepts", []),
                "comment": eval_data.get("feedback", eval_data.get("feedback_comment", "")),
                "follow_up_question": eval_data.get("follow_up_question", ""),
                "body_language": body_language_obs or [],
                "spoken_english_metrics": filler_metrics,
            }
        )

        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer

    def complete_session_and_generate_report(
        self,
        db: Session,
        user_id: int,
        interview_id: int
    ) -> MockInterviewReport:
        interview = db.query(MockInterview).filter(
            MockInterview.id == interview_id,
            MockInterview.user_id == user_id
        ).first()

        if not interview:
            raise ValueError("Interview session not found.")

        answers = db.query(MockInterviewAnswer).filter(MockInterviewAnswer.interview_id == interview_id).all()

        # Single unified LLM call for complete interview analysis & report generation
        answers_dict = [
            {
                "question": a.question.question if a.question else "",
                "question_type": a.question.question_type if a.question else "",
                "transcript": a.transcript or "",
                "score": a.answer_score,
                "technical_score": a.technical_score,
                "communication_score": a.communication_score,
                "english_score": a.grammar_score,
                "relevance_score": a.relevance_score,
                "clarity_score": a.clarity_score,
                "fluency_score": a.fluency_score,
            }
            for a in answers
        ]

        ai_provider = get_ai_provider()
        report_data = ai_provider.generate_report(answers=answers_dict, target_role=interview.target_role)

        # Update pending answers with per-question evaluation from unified report
        q_feedback_list = report_data.get("question_feedback", [])
        for idx, ans in enumerate(answers):
            q_eval = q_feedback_list[idx] if idx < len(q_feedback_list) else {}
            ans_score = q_eval.get("score", report_data.get("overall_score", 75))
            tech_score = q_eval.get("technical_score", report_data.get("technical_score", 75))
            comm_score = q_eval.get("communication_score", report_data.get("communication_score", 80))
            eng_score = report_data.get("english_score", 80)
            ans.answer_score = ans_score
            ans.technical_score = tech_score
            ans.communication_score = comm_score
            ans.grammar_score = eng_score
            ans.fluency_score = eng_score
            ans.clarity_score = comm_score
            ans.relevance_score = ans_score
            merged_feedback = dict(ans.feedback or {})
            merged_feedback.pop("pending_evaluation", None)
            merged_feedback.update({
                "strengths": q_eval.get("strengths", report_data.get("strengths", [])),
                "weaknesses": q_eval.get("weaknesses", report_data.get("weaknesses", [])),
                "comment": q_eval.get("feedback", ""),
            })
            ans.feedback = merged_feedback
        db.commit()

        # Collect body language observations objectively
        body_obs = []
        for a in answers:
            if a.feedback and "body_language" in a.feedback:
                for obs in a.feedback["body_language"]:
                    if obs not in body_obs:
                        body_obs.append(obs)
        if not body_obs:
            body_obs = [
                "Consistent camera-facing posture maintained.",
                "Stable framing and engagement observed."
            ]

        # Calculate Placement Readiness Score
        active_resume = resume_service.get_active_resume(db, user_id)
        resume_ats = active_resume.ats_score if active_resume else 50

        latest_assessment = db.query(AdaptiveAssessment).filter(AdaptiveAssessment.user_id == user_id).order_by(AdaptiveAssessment.created_at.desc()).first()
        assessment_score = latest_assessment.report.get("overall_career_score", 70) if latest_assessment and latest_assessment.report else 65

        coding_submissions = db.query(CodingResult).filter(CodingResult.user_id == user_id).all()
        coding_score = round(sum(c.score for c in coding_submissions) / len(coding_submissions)) if coding_submissions else 70

        learning_records = db.query(LearningProgress).filter(LearningProgress.user_id == user_id).all()
        learning_score = round(sum(l.progress for l in learning_records) / len(learning_records)) if learning_records else 60

        overall_interview = report_data.get("overall_score", 75)

        readiness_score = round(
            (resume_ats * 0.15) +
            (assessment_score * 0.20) +
            (coding_score * 0.20) +
            (overall_interview * 0.30) +
            (learning_score * 0.15)
        )

        readiness_breakdown = {
            "resume_ats_score": resume_ats,
            "adaptive_assessment_score": assessment_score,
            "coding_score": coding_score,
            "mock_interview_score": overall_interview,
            "learning_progress_score": learning_score,
            "weights": {
                "resume_ats": "15%",
                "adaptive_assessment": "20%",
                "coding": "20%",
                "mock_interview": "30%",
                "learning_progress": "15%"
            },
            "question_feedback": report_data.get("question_feedback", []),
            "skill_gaps": report_data.get("skill_gaps", []),
        }

        report = MockInterviewReport(
            interview_id=interview_id,
            technical_score=report_data.get("technical_score", 75),
            communication_score=report_data.get("communication_score", 80),
            english_score=report_data.get("english_score", 80),
            body_language_score=report_data.get("body_language_score", 85),
            overall_score=overall_interview,
            readiness_score=readiness_score,
            readiness_breakdown=readiness_breakdown,
            strengths=report_data.get("strengths", []),
            weaknesses=report_data.get("weaknesses", []),
            body_language_observations=body_obs,
            recommendations=report_data.get("recommendations", []),
            # Store additional report data in readiness_breakdown
            # since the model doesn't have dedicated columns for these
        )

        interview.status = "completed"
        interview.completed_at = datetime.utcnow()
        interview.overall_score = overall_interview

        db.add(report)
        db.commit()
        db.refresh(report)

        return report


interview_service = InterviewService()
