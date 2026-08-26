from typing import List, Optional
from enum import Enum


class InterviewPhase(str, Enum):
    WELCOME = "WELCOME"
    INTRODUCTION = "INTRODUCTION"
    RESUME_DISCUSSION = "RESUME_DISCUSSION"
    TECHNICAL = "TECHNICAL"
    PROJECT_DISCUSSION = "PROJECT_DISCUSSION"
    BEHAVIORAL = "BEHAVIORAL"
    FOLLOW_UP = "FOLLOW_UP"
    CANDIDATE_QUESTIONS = "CANDIDATE_QUESTIONS"
    FINAL = "FINAL"
    REPORT = "REPORT"


PHASE_SEQUENCE: List[InterviewPhase] = [
    InterviewPhase.WELCOME,
    InterviewPhase.INTRODUCTION,
    InterviewPhase.RESUME_DISCUSSION,
    InterviewPhase.TECHNICAL,
    InterviewPhase.PROJECT_DISCUSSION,
    InterviewPhase.BEHAVIORAL,
    InterviewPhase.FOLLOW_UP,
    InterviewPhase.CANDIDATE_QUESTIONS,
    InterviewPhase.FINAL,
    InterviewPhase.REPORT
]


class InterviewStateMachineV2:
    """
    Deterministic 10-Phase State Machine for Mock Interview v2.
    """

    def __init__(self, initial_phase: InterviewPhase = InterviewPhase.WELCOME):
        self.current_phase = initial_phase

    def get_phase(self) -> str:
        return self.current_phase.value

    def next_phase(self) -> str:
        try:
            curr_idx = PHASE_SEQUENCE.index(self.current_phase)
            if curr_idx < len(PHASE_SEQUENCE) - 1:
                self.current_phase = PHASE_SEQUENCE[curr_idx + 1]
            else:
                self.current_phase = InterviewPhase.REPORT
        except ValueError:
            self.current_phase = InterviewPhase.REPORT
        return self.current_phase.value

    def is_completed(self) -> bool:
        return self.current_phase == InterviewPhase.REPORT
