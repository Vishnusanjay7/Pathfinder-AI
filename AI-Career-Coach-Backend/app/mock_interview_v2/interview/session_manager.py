import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.mock_interview_v2.interview.state_machine import InterviewStateMachineV2, InterviewPhase
from app.mock_interview_v2.avatars.avatar_profiles import get_interviewer_profile_by_id_v2

logger = logging.getLogger("career_coach.v2.session")


class InterviewSessionV2:
    def __init__(
        self,
        session_id: str,
        interviewer_id: str,
        target_role: str,
        difficulty: str = "Hard",
        candidate_name: str = "Candidate",
        job_description: Optional[str] = None,
        resume_context: Optional[str] = None
    ):
        self.session_id = session_id
        self.interviewer_id = interviewer_id
        self.interviewer_profile = get_interviewer_profile_by_id_v2(interviewer_id)
        self.target_role = target_role
        self.difficulty = difficulty
        self.candidate_name = candidate_name
        self.job_description = job_description
        self.resume_context = resume_context
        self.state_machine = InterviewStateMachineV2(InterviewPhase.WELCOME)
        self.current_question_number = 1
        self.status = "IN_PROGRESS"
        self.created_at = datetime.utcnow().isoformat()
        self.completed_at: Optional[str] = None
        self.active_question: Optional[Dict[str, Any]] = None
        self.turns: list = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "interviewer_id": self.interviewer_id,
            "interviewer_name": self.interviewer_profile.get("name"),
            "target_role": self.target_role,
            "difficulty": self.difficulty,
            "current_phase": self.state_machine.get_phase(),
            "question_number": self.current_question_number,
            "status": self.status,
            "current_question": self.active_question,
            "created_at": self.created_at,
            "completed_at": self.completed_at
        }


class SessionManagerV2:
    def __init__(self):
        self._sessions: Dict[str, InterviewSessionV2] = {}

    def create_session(
        self,
        interviewer_id: str,
        target_role: str,
        difficulty: str = "Hard",
        candidate_name: str = "Candidate",
        job_description: Optional[str] = None,
        resume_context: Optional[str] = None
    ) -> InterviewSessionV2:
        session_id = f"v2_{uuid.uuid4().hex[:12]}"
        session = InterviewSessionV2(
            session_id=session_id,
            interviewer_id=interviewer_id,
            target_role=target_role,
            difficulty=difficulty,
            candidate_name=candidate_name,
            job_description=job_description,
            resume_context=resume_context
        )
        self._sessions[session_id] = session
        logger.info(f"[SESSION-V2] Created session {session_id} with interviewer {interviewer_id}")
        return session

    def get_session(self, session_id: str) -> Optional[InterviewSessionV2]:
        return self._sessions.get(session_id)


session_manager_v2 = SessionManagerV2()
