from typing import Dict, Any, List, Optional
from datetime import datetime


class InterviewMemoryV2:
    """
    Session conversational memory for Mock Interview v2.
    Tracks questions, candidate answers, key technical claims, strengths, and weaknesses.
    """

    def __init__(self, session_id: str, candidate_name: str, target_role: str):
        self.session_id = session_id
        self.candidate_name = candidate_name
        self.target_role = target_role
        self.turns: List[Dict[str, Any]] = []
        self.extracted_topics: List[str] = []
        self.identified_strengths: List[str] = []
        self.identified_gaps: List[str] = []
        self.created_at = datetime.utcnow().isoformat()

    def add_turn(
        self,
        question_number: int,
        phase: str,
        question: str,
        answer: str,
        evaluation: Optional[Dict[str, Any]] = None
    ) -> None:
        turn_data = {
            "number": question_number,
            "phase": phase,
            "question": question,
            "answer": answer,
            "evaluation": evaluation or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.turns.append(turn_data)

    def get_history(self) -> List[Dict[str, Any]]:
        return self.turns

    def get_last_answer(self) -> Optional[str]:
        if self.turns:
            return self.turns[-1].get("answer")
        return None

    def get_total_turns(self) -> int:
        return len(self.turns)
