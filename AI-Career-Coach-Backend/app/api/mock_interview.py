import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.mock_interview import MockInterview, MockInterviewQuestion, MockInterviewReport
from app.schemas.mock_interview_schema import (
    StartInterviewRequest,
    InterviewSessionResponse,
    AnswerSubmissionRequest,
    AnswerEvaluationResponse,
    InterviewReportResponse,
    InterviewHistoryItem,
    InterviewQuestionSchema,
    InterviewReportData
)
from app.services.interview_service import interview_service

router = APIRouter(prefix="/api/mock-interview", tags=["AI Mock Interview"])


@router.post("/start", response_model=InterviewSessionResponse, summary="Start AI Mock Interview Session")
@router.post("/questions", response_model=InterviewSessionResponse, summary="Start AI Mock Interview Session Alias")
def start_interview(
    payload: StartInterviewRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
        logging.exception("Failed to start mock interview session.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to start interview session: {str(e)}"
        )


@router.get("/history", summary="Get User Mock Interview History")
def get_interview_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    sessions = db.query(MockInterview).filter(MockInterview.user_id == user_id).order_by(MockInterview.started_at.desc()).all()
    history = [
        {
            "id": s.id,
            "target_role": s.target_role,
            "interview_type": s.interview_type,
            "difficulty": s.difficulty,
            "question_count": s.question_count,
            "avatar_id": s.avatar_id or "female_hr_01",
            "voice_id": s.voice_id or "en_female_01",
            "language": s.language or "en-US",
            "status": s.status,
            "overall_score": s.overall_score,
            "started_at": s.started_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        }
        for s in sessions
    ]
    return {"success": True, "history": history}


@router.get("/avatars", summary="Get 3D Human Interviewer Avatars")
def get_avatars():
    from app.services.local_avatar_service import local_avatar_service
    return {"success": True, "avatars": local_avatar_service.get_avatars()}


@router.get("/{interview_id}", summary="Get Mock Interview Details")
def get_interview(
    interview_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    session = db.query(MockInterview).filter(
        MockInterview.id == interview_id,
        MockInterview.user_id == user_id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    questions_schema = [
        {
            "id": q.id,
            "question_number": q.question_number,
            "question": q.question,
            "question_type": q.question_type,
            "difficulty": q.difficulty,
            "topic": q.topic
        }
        for q in session.questions
    ]

    return {
        "success": True,
        "interview_id": session.id,
        "target_role": session.target_role,
        "interview_type": session.interview_type,
        "difficulty": session.difficulty,
        "question_count": session.question_count,
        "avatar_id": session.avatar_id or "female_hr_01",
        "voice_id": session.voice_id or "en_female_01",
        "language": session.language or "en-US",
        "status": session.status,
        "questions": questions_schema
    }


class VoiceSessionRequest(BaseModel):
    room_name: str
    participant_identity: Optional[str] = None
    avatar_id: Optional[str] = "female_hr_01"


@router.post("/voice/session", summary="Generate Real-Time Voice Token (LiveKit)")
async def create_voice_session(
    payload: VoiceSessionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.livekit_service import livekit_service
    user_id = str(current_user["sub"])
    res = livekit_service.create_session(
        room_name=payload.room_name,
        participant_identity=payload.participant_identity or f"candidate_{user_id}"
    )

    res["avatar_session"] = {
        "success": True,
        "provider": "local_lipsync",
        "avatar_participant_identity": "local_ai_interviewer",
        "avatar_participant_name": "AI HR Interviewer – Professional",
        "status": "connected"
    }
    return res


class AvatarSessionControlRequest(BaseModel):
    avatar_id: Optional[str] = "female_hr_01"
    custom_greeting: Optional[str] = None


@router.post("/{interview_id}/avatar/start", summary="Start AI Interviewer Video Session")
async def start_avatar_session_route(
    interview_id: int,
    payload: Optional[AvatarSessionControlRequest] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room_name = f"interview_room_{interview_id}"
    avatar_id = payload.avatar_id if payload else "female_hr_01"
    return {
        "success": True,
        "provider": "local_lipsync",
        "room_name": room_name,
        "avatar_id": avatar_id,
        "status": "connected"
    }


@router.post("/{interview_id}/avatar/stop", summary="Stop AI Interviewer Video Session")
async def stop_avatar_session_route(
    interview_id: int,
    current_user=Depends(get_current_user)
):
    room_name = f"interview_room_{interview_id}"
    return {"success": True, "stopped": True, "room_name": room_name}


class RAGQueryRequest(BaseModel):
    company_name: str
    query: str


@router.post("/rag/query", summary="Query Company Knowledge Base")
def query_company_rag(
    payload: RAGQueryRequest,
    current_user=Depends(get_current_user)
):
    from app.services.rag_service import company_rag_service
    return company_rag_service.query_company_knowledge(
        company_name=payload.company_name,
        query=payload.query
    )


class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "aura-asteria-en"
    language: Optional[str] = "en-US"
    interviewer_id: Optional[str] = "priya_sharma"
    generate_video: Optional[bool] = True


@router.post("/tts", summary="Synthesize Text-to-Speech and Lip-Synced Video")
async def synthesize_tts(
    payload: TTSRequest,
    current_user=Depends(get_current_user)
):
    from app.services.deepgram_tts_service import deepgram_tts_service
    from app.services.lipsync_service import lipsync_service
    import base64

    res = deepgram_tts_service.synthesize_speech(
        text=payload.text,
        voice_id=payload.voice_id or "aura-asteria-en",
        language=payload.language or "en-US"
    )

    if payload.generate_video and res.get("audio_base64"):
        try:
            audio_bytes = base64.b64decode(res["audio_base64"])
            video_res = await lipsync_service.generate_lipsynced_video(
                audio_bytes=audio_bytes,
                interviewer_id=payload.interviewer_id or "priya_sharma",
                question_text=payload.text
            )
            if video_res.get("success"):
                res["video_url"] = video_res.get("videoUrl")
                res["video_duration"] = video_res.get("duration")
                res["lip_sync_engine"] = video_res.get("lipSyncEngine")
        except Exception as e:
            logging.error(f"[LIPSYNC] Auto video generation notice: {e}")

    return res


class LipSyncRequest(BaseModel):
    text: Optional[str] = None
    voice_id: Optional[str] = "aura-asteria-en"
    interviewer_id: Optional[str] = "priya_sharma"
    audio_base64: Optional[str] = None


@router.post("/lipsync", summary="Generate AI Lip-Synced Interviewer Video")
async def generate_lipsync_video(
    payload: LipSyncRequest,
    current_user=Depends(get_current_user)
):
    """
    Generate audio-driven lip-synced interviewer video.
    If audio_base64 is provided, uses that audio; otherwise synthesizes speech via Deepgram TTS first.
    """
    from app.services.deepgram_tts_service import deepgram_tts_service
    from app.services.lipsync_service import lipsync_service
    import base64

    audio_bytes = None
    if payload.audio_base64:
        try:
            audio_bytes = base64.b64decode(payload.audio_base64)
        except Exception:
            pass

    if not audio_bytes and payload.text:
        tts_res = deepgram_tts_service.synthesize_speech(
            text=payload.text,
            voice_id=payload.voice_id or "aura-asteria-en"
        )
        if tts_res.get("audio_base64"):
            audio_bytes = base64.b64decode(tts_res["audio_base64"])

    if not audio_bytes:
        return {
            "success": False,
            "error": "No valid audio or text provided for lip-sync generation.",
            "fallbackAvailable": True
        }

    res = await lipsync_service.generate_lipsynced_video(
        audio_bytes=audio_bytes,
        interviewer_id=payload.interviewer_id or "priya_sharma",
        question_text=payload.text
    )
    return res


class STTRequest(BaseModel):
    audio_base64: str
    content_type: Optional[str] = "audio/webm"
    language: Optional[str] = "en-US"


@router.post("/stt", summary="Transcribe Candidate Speech via Deepgram STT")
def transcribe_stt(
    payload: STTRequest,
    current_user=Depends(get_current_user)
):
    from app.services.deepgram_stt_service import deepgram_stt_service
    import base64
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
        return deepgram_stt_service.transcribe_audio(
            audio_data=audio_bytes,
            content_type=payload.content_type or "audio/webm",
            language=payload.language or "en-US"
        )
    except Exception as e:
        return {"success": False, "transcript": "", "error": str(e)}


class ConversationalTurnRequest(BaseModel):
    question_id: int
    transcript: str
    body_language_observations: Optional[List[str]] = None
    voice_id: Optional[str] = None


@router.post("/{interview_id}/turn", summary="Process Conversational Turn")
def conversational_turn(
    interview_id: int,
    payload: ConversationalTurnRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    try:
        return interview_service.process_conversational_turn(
            db=db,
            user_id=user_id,
            interview_id=interview_id,
            current_question_id=payload.question_id,
            candidate_transcript=payload.transcript,
            body_language_obs=payload.body_language_observations,
            voice_id=payload.voice_id
        )
    except Exception as e:
        logging.exception("Failed to process conversational turn.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{interview_id}/answer", summary="Submit Answer for Question (Store Only)")
def submit_answer(
    interview_id: int,
    payload: AnswerSubmissionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Store the candidate's transcript for a question WITHOUT triggering AI evaluation.
    AI scoring happens in batch when the interview is completed.
    """
    user_id = int(current_user["sub"])
    session = db.query(MockInterview).filter(
        MockInterview.id == interview_id,
        MockInterview.user_id == user_id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    try:
        answer = interview_service.store_answer(
            db=db,
            user_id=user_id,
            interview_id=interview_id,
            question_id=payload.question_id,
            transcript=payload.transcript,
            body_language_obs=payload.body_language_observations
        )

        return {
            "success": True,
            "answer_id": answer.id,
            "answer_score": 0,
            "technical_score": 0,
            "communication_score": 0,
            "grammar_score": 0,
            "fluency_score": 0,
            "clarity_score": 0,
            "relevance_score": 0,
            "feedback": {}
        }
    except Exception as e:
        logging.exception("Failed to store answer.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{interview_id}/complete", response_model=InterviewReportResponse, summary="Complete Interview and Generate Report")
async def complete_interview(
    interview_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    try:
        from app.services.tavus_avatar_service import tavus_avatar_service
        try:
            await tavus_avatar_service.stop_avatar_session(f"interview_room_{interview_id}")
        except Exception:
            pass

        report = interview_service.complete_session_and_generate_report(
            db=db,
            user_id=user_id,
            interview_id=interview_id
        )
        session = report.interview
        report_data = InterviewReportData(
            interview_id=report.interview_id,
            target_role=session.target_role,
            interview_type=session.interview_type,
            difficulty=session.difficulty,
            technical_score=report.technical_score,
            communication_score=report.communication_score,
            english_score=report.english_score,
            body_language_score=report.body_language_score,
            overall_score=report.overall_score,
            readiness_score=report.readiness_score,
            readiness_breakdown=report.readiness_breakdown or {},
            strengths=report.strengths or [],
            weaknesses=report.weaknesses or [],
            body_language_observations=report.body_language_observations or [],
            recommendations=report.recommendations or [],
            created_at=report.created_at.isoformat()
        )
        return InterviewReportResponse(success=True, report=report_data)
    except Exception as e:
        logging.exception("Failed to generate interview report.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{interview_id}/report", response_model=InterviewReportResponse, summary="Get Interview Report")
def get_report(
    interview_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    session = db.query(MockInterview).filter(
        MockInterview.id == interview_id,
        MockInterview.user_id == user_id
    ).first()

    if not session or not session.report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview report not found.")

    report = session.report
    report_data = InterviewReportData(
        interview_id=report.interview_id,
        target_role=session.target_role,
        interview_type=session.interview_type,
        difficulty=session.difficulty,
        technical_score=report.technical_score,
        communication_score=report.communication_score,
        english_score=report.english_score,
        body_language_score=report.body_language_score,
        overall_score=report.overall_score,
        readiness_score=report.readiness_score,
        readiness_breakdown=report.readiness_breakdown or {},
        strengths=report.strengths or [],
        weaknesses=report.weaknesses or [],
        body_language_observations=report.body_language_observations or [],
        recommendations=report.recommendations or [],
        created_at=report.created_at.isoformat()
    )
    return InterviewReportResponse(success=True, report=report_data)


@router.delete("/{interview_id}", summary="Delete Interview Session")
def delete_interview(
    interview_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    session = db.query(MockInterview).filter(
        MockInterview.id == interview_id,
        MockInterview.user_id == user_id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    db.delete(session)
    db.commit()
    return {"success": True, "message": "Interview session deleted successfully."}
