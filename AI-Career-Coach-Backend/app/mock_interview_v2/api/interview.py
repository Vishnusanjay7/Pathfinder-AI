import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from app.mock_interview_v2.schemas.interview import (
    InterviewStartRequestV2,
    InterviewTurnRequestV2,
    InterviewQuestionV2
)
from app.mock_interview_v2.interview.session_manager import session_manager_v2
from app.mock_interview_v2.ai.interview_brain import interview_brain_v2
from app.mock_interview_v2.audio.tts_service import tts_service_v2
from app.mock_interview_v2.lipsync.lipsync_service import lipsync_service_v2
from app.mock_interview_v2.reports.report_generator import report_generator_v2
from app.mock_interview_v2.websocket.manager import ws_manager_v2

logger = logging.getLogger("career_coach.v2.api.interview")
router = APIRouter(tags=["Mock Interview v2 - Session Management"])


@router.post("/start", summary="Start a new Mock Interview Session (v2)")
async def start_interview_v2(payload: InterviewStartRequestV2) -> Dict[str, Any]:
    session = session_manager_v2.create_session(
        interviewer_id=payload.interviewer_id,
        target_role=payload.target_role,
        difficulty=payload.difficulty,
        candidate_name=payload.candidate_name or "Candidate",
        job_description=payload.job_description,
        resume_context=payload.resume_context
    )

    # Generate First Question (WELCOME / INTRODUCTION)
    q_res = await interview_brain_v2.get_next_question(
        session_id=session.session_id,
        phase="WELCOME",
        question_number=1,
        interviewer=session.interviewer_profile,
        target_role=payload.target_role,
        difficulty=payload.difficulty,
        job_description=payload.job_description,
        resume_context=payload.resume_context
    )

    question_text = q_res.get("question", f"Welcome! Could you please introduce yourself and your background in {payload.target_role}?")
    voice_id = session.interviewer_profile.get("default_voice_id", "aura-asteria-en")

    # Synthesize Audio & Lip-Sync Video
    tts_res = tts_service_v2.synthesize(text=question_text, voice_id=voice_id)
    video_url = None
    if tts_res.get("success") and tts_res.get("audio_bytes"):
        sync_res = await lipsync_service_v2.generate_lipsynced_video(
            audio_bytes=tts_res["audio_bytes"],
            interviewer_id=payload.interviewer_id
        )
        if sync_res.get("success"):
            video_url = sync_res.get("video_url")

    first_question = {
        "id": f"q_1_{session.session_id}",
        "number": 1,
        "phase": "WELCOME",
        "question": question_text,
        "category": session.interviewer_profile.get("specialization", "Introduction"),
        "expected_competency": "Communication, Self-Introduction, Role Motivation",
        "audio_base64": tts_res.get("audio_base64"),
        "video_url": video_url,
        "created_at": datetime.utcnow().isoformat()
    }

    session.active_question = first_question
    return {
        "success": True,
        "session": session.to_dict(),
        "first_question": first_question
    }


@router.get("/interview/{session_id}", summary="Get Interview Session Details (v2)")
def get_interview_session_v2(session_id: str) -> Dict[str, Any]:
    session = session_manager_v2.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    return {
        "success": True,
        "session": session.to_dict()
    }


@router.post("/turn", summary="Submit Candidate Answer & Get Next Question (v2)")
async def submit_turn_v2(payload: InterviewTurnRequestV2) -> Dict[str, Any]:
    session = session_manager_v2.get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # 1. Process and evaluate candidate answer
    eval_res = interview_brain_v2.process_turn(
        session_id=payload.session_id,
        question_number=payload.question_number,
        phase=payload.phase,
        question_text=payload.question_text,
        candidate_answer=payload.candidate_answer,
        target_role=session.target_role,
        difficulty=session.difficulty
    )

    session.turns.append({
        "number": payload.question_number,
        "phase": payload.phase,
        "question": payload.question_text,
        "answer": payload.candidate_answer,
        "evaluation": eval_res
    })

    # Broadcast turn evaluated event over WebSocket
    await ws_manager_v2.send_event(
        session_id=payload.session_id,
        event_type="answer_evaluated",
        payload={"turn_number": payload.question_number, "evaluation": eval_res}
    )

    # 2. Advance state machine phase
    next_phase = session.state_machine.next_phase()
    next_q_num = payload.question_number + 1
    session.current_question_number = next_q_num

    # 3. Check if interview completed
    if session.state_machine.is_completed() or next_q_num > 5:
        session.status = "COMPLETED"
        session.completed_at = datetime.utcnow().isoformat()
        await ws_manager_v2.send_event(
            session_id=payload.session_id,
            event_type="interview_completed",
            payload={"session_id": payload.session_id}
        )
        return {
            "success": True,
            "interview_completed": True,
            "evaluation": eval_res,
            "next_phase": "REPORT"
        }

    # 4. Generate next question
    q_res = await interview_brain_v2.get_next_question(
        session_id=payload.session_id,
        phase=next_phase,
        question_number=next_q_num,
        interviewer=session.interviewer_profile,
        target_role=session.target_role,
        difficulty=session.difficulty,
        job_description=session.job_description,
        resume_context=session.resume_context,
        previous_answer=payload.candidate_answer
    )

    question_text = q_res.get("question", f"Could you elaborate further on how you would address key architectural challenges in {session.target_role}?")
    voice_id = session.interviewer_profile.get("default_voice_id", "aura-asteria-en")

    # Synthesize Audio & Lip-Sync Video
    tts_res = tts_service_v2.synthesize(text=question_text, voice_id=voice_id)
    video_url = None
    if tts_res.get("success") and tts_res.get("audio_bytes"):
        sync_res = await lipsync_service_v2.generate_lipsynced_video(
            audio_bytes=tts_res["audio_bytes"],
            interviewer_id=session.interviewer_id
        )
        if sync_res.get("success"):
            video_url = sync_res.get("video_url")

    next_question = {
        "id": f"q_{next_q_num}_{session.session_id}",
        "number": next_q_num,
        "phase": next_phase,
        "question": question_text,
        "category": session.interviewer_profile.get("specialization", "Core Competency"),
        "expected_competency": "Technical Proficiency & Problem Solving",
        "audio_base64": tts_res.get("audio_base64"),
        "video_url": video_url,
        "created_at": datetime.utcnow().isoformat()
    }

    session.active_question = next_question

    # Broadcast next question event
    await ws_manager_v2.send_event(
        session_id=payload.session_id,
        event_type="next_question_ready",
        payload={"question": next_question}
    )

    return {
        "success": True,
        "interview_completed": False,
        "evaluation": eval_res,
        "next_question": next_question,
        "phase": next_phase
    }


@router.post("/complete", summary="Manually Complete Interview Session (v2)")
async def complete_interview_v2(session_id: str) -> Dict[str, Any]:
    session = session_manager_v2.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    session.status = "COMPLETED"
    session.completed_at = datetime.utcnow().isoformat()
    await ws_manager_v2.send_event(
        session_id=session_id,
        event_type="interview_completed",
        payload={"session_id": session_id}
    )
    return {"success": True, "status": "COMPLETED", "session_id": session_id}


@router.get("/interview/{session_id}/report", summary="Get Final Evaluation Report (v2)")
def get_interview_report_v2(session_id: str) -> Dict[str, Any]:
    session = session_manager_v2.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    report = report_generator_v2.generate_report(
        session_id=session.session_id,
        candidate_name=session.candidate_name,
        target_role=session.target_role,
        interviewer_name=session.interviewer_profile.get("name", "HR Interviewer"),
        difficulty=session.difficulty,
        turns=session.turns
    )

    return {
        "success": True,
        "report": report
    }
