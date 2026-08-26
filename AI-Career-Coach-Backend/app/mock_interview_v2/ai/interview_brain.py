import logging
from typing import Dict, Any, List, Optional
from app.mock_interview_v2.ai.question_generator import question_generator_v2
from app.mock_interview_v2.ai.answer_evaluator import answer_evaluator_v2
from app.mock_interview_v2.ai.interview_memory import InterviewMemoryV2

logger = logging.getLogger("career_coach.v2.ai.brain")


class InterviewBrainV2:
    """
    High-level conversational AI controller for Mock Interview v2.
    Integrates question synthesis, memory tracking, and real-time answer evaluation.
    """

    def __init__(self):
        self._memories: Dict[str, InterviewMemoryV2] = {}

    def get_or_create_memory(self, session_id: str, candidate_name: str, target_role: str) -> InterviewMemoryV2:
        if session_id not in self._memories:
            self._memories[session_id] = InterviewMemoryV2(session_id, candidate_name, target_role)
        return self._memories[session_id]

    async def get_next_question(
        self,
        session_id: str,
        phase: str,
        question_number: int,
        interviewer: Dict[str, Any],
        target_role: str,
        difficulty: str,
        job_description: Optional[str] = None,
        resume_context: Optional[str] = None,
        previous_answer: Optional[str] = None
    ) -> Dict[str, Any]:
        mem = self.get_or_create_memory(session_id, "Candidate", target_role)
        history = mem.get_history()

        res = await question_generator_v2.generate_question(
            phase=phase,
            question_number=question_number,
            interviewer=interviewer,
            target_role=target_role,
            difficulty=difficulty,
            job_description=job_description,
            resume_context=resume_context,
            conversation_history=history,
            previous_answer=previous_answer or mem.get_last_answer()
        )
        return res

    def process_turn(
        self,
        session_id: str,
        question_number: int,
        phase: str,
        question_text: str,
        candidate_answer: str,
        target_role: str,
        difficulty: str
    ) -> Dict[str, Any]:
        eval_res = answer_evaluator_v2.evaluate_turn(
            question_text=question_text,
            candidate_answer=candidate_answer,
            phase=phase,
            target_role=target_role,
            difficulty=difficulty
        )

        mem = self.get_or_create_memory(session_id, "Candidate", target_role)
        mem.add_turn(
            question_number=question_number,
            phase=phase,
            question=question_text,
            answer=candidate_answer,
            evaluation=eval_res
        )

        return eval_res

    def get_memory(self, session_id: str) -> Optional[InterviewMemoryV2]:
        return self._memories.get(session_id)


interview_brain_v2 = InterviewBrainV2()
