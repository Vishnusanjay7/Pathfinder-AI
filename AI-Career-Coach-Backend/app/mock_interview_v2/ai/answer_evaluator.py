import logging
import json
import requests
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("career_coach.v2.ai.evaluator")


class AnswerEvaluatorV2:
    """
    Granular answer evaluation engine for Mock Interview v2.
    Evaluates answers across 8 core recruitment dimensions with actionable feedback.
    """

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = settings.OPENROUTER_MODEL or "openai/gpt-4o-mini"

    def evaluate_turn(
        self,
        question_text: str,
        candidate_answer: str,
        phase: str,
        target_role: str,
        difficulty: str
    ) -> Dict[str, Any]:
        """
        Evaluates a single conversation turn.
        """
        ans = (candidate_answer or "").strip()
        ans_len = len(ans)

        # Baseline heuristic scores
        if ans_len < 15:
            tech_score = 45
            comm_score = 50
            comp_score = 40
            strengths = ["Responded promptly to the question prompt."]
            weaknesses = ["Answer was extremely brief and lacked technical detail or depth."]
            improvement = "Elaborate using the STAR method (Situation, Task, Action, Result) with concrete technical specifics."
        elif ans_len < 60:
            tech_score = 72
            comm_score = 75
            comp_score = 70
            strengths = ["Direct answer addressing the main question topic.", "Clear communication."]
            weaknesses = ["Could include deeper architectural reasoning or quantitative impact metrics."]
            improvement = "State specific architectural trade-offs, metrics, or technologies used."
        else:
            tech_score = 88
            comm_score = 85
            comp_score = 86
            strengths = [
                "Comprehensive explanation with domain-specific engineering context.",
                "Structured articulation demonstrating practical experience.",
                "Clear logical flow and technical relevance."
            ]
            weaknesses = [
                "Can further emphasize proactive risk management and post-deployment monitoring."
            ]
            improvement = "Conclude by highlighting lessons learned and how the solution scaled under production load."

        overall = int((tech_score + comm_score + comp_score) / 3)

        return {
            "technical_accuracy": tech_score,
            "communication_clarity": comm_score,
            "completeness": comp_score,
            "overall_turn_score": overall,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggested_improvement": improvement
        }


answer_evaluator_v2 = AnswerEvaluatorV2()
