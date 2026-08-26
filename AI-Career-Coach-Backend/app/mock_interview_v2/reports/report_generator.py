import logging
from typing import Dict, Any, List
from datetime import datetime
from app.mock_interview_v2.evaluation.rubric import calculate_overall_scores, EVALUATION_METRICS_V2

logger = logging.getLogger("career_coach.v2.report")


class ReportGeneratorV2:
    """
    Final evaluation report generation engine for Mock Interview v2.
    Produces comprehensive structured assessments for candidates and recruiters.
    """

    def generate_report(
        self,
        session_id: str,
        candidate_name: str,
        target_role: str,
        interviewer_name: str,
        difficulty: str,
        turns: List[Dict[str, Any]],
        total_duration_seconds: int = 180
    ) -> Dict[str, Any]:
        scores = calculate_overall_scores(turns)

        metrics_breakdown = [
            {"name": "Technical Knowledge", "score": scores["technical_score"], "description": "Depth of architectural concepts, frameworks, and domain-specific engineering principles.", "benchmark": "Industry Standard (75%)"},
            {"name": "Communication Clarity", "score": scores["communication_score"], "description": "Structured articulation, concise explanations, and effective communication.", "benchmark": "Industry Standard (75%)"},
            {"name": "Problem Solving", "score": scores["problem_solving_score"], "description": "Logical breakdown of complex problems and systematic reasoning through trade-offs.", "benchmark": "Industry Standard (75%)"},
            {"name": "Confidence & Composure", "score": scores["confidence_score"], "description": "Self-assurance, poise, and constructive handling of challenging scenarios.", "benchmark": "Industry Standard (75%)"},
            {"name": "Professionalism", "score": scores["professionalism_score"], "description": "Executive demeanor, collaborative mindset, and alignment with corporate culture.", "benchmark": "Industry Standard (75%)"},
            {"name": "Relevance & Focus", "score": scores["relevance_score"], "description": "Directly answering the core question without unnecessary tangents.", "benchmark": "Industry Standard (75%)"},
            {"name": "Clarity of Thought", "score": scores["clarity_score"], "description": "Clean logical progression, avoidance of buzzwords, and sound technical justification.", "benchmark": "Industry Standard (75%)"}
        ]

        top_strengths = [
            "Demonstrated strong practical engineering problem-solving with concrete examples.",
            "Articulate communication style using clear logical sequencing.",
            "Good composure and professional composure under challenging technical inquiries."
        ]

        areas_for_improvement = [
            "Quantify business and performance impacts with specific metrics (e.g. latency reduction, throughput % increase).",
            "Incorporate proactive failure mode analysis when explaining architectural trade-offs."
        ]

        technical_gaps = [
            "Deep-dive telemetry and distributed tracing strategies under massive traffic spikes."
        ]

        turn_evaluations = []
        for t in turns:
            eval_data = t.get("evaluation", {})
            turn_evaluations.append({
                "question_number": t.get("number", 1),
                "phase": t.get("phase", "TECHNICAL"),
                "question_text": t.get("question", ""),
                "candidate_answer": t.get("answer", ""),
                "technical_accuracy": eval_data.get("technical_accuracy", 80),
                "communication_clarity": eval_data.get("communication_clarity", 80),
                "completeness": eval_data.get("completeness", 80),
                "strengths": eval_data.get("strengths", ["Answered directly."]),
                "weaknesses": eval_data.get("weaknesses", []),
                "suggested_improvement": eval_data.get("suggested_improvement", "Continue demonstrating STAR methodology."),
                "overall_turn_score": eval_data.get("overall_turn_score", 80)
            })

        return {
            "session_id": session_id,
            "candidate_name": candidate_name,
            "target_role": target_role,
            "interviewer_name": interviewer_name,
            "interview_type": "Comprehensive HR & Technical (v2)",
            "difficulty": difficulty,
            "total_duration_seconds": total_duration_seconds,
            "completed_at": datetime.utcnow().isoformat(),
            "overall_score": scores["overall_score"],
            "technical_score": scores["technical_score"],
            "communication_score": scores["communication_score"],
            "problem_solving_score": scores["problem_solving_score"],
            "confidence_score": scores["confidence_score"],
            "professionalism_score": scores["professionalism_score"],
            "relevance_score": scores["relevance_score"],
            "clarity_score": scores["clarity_score"],
            "metrics_breakdown": metrics_breakdown,
            "hiring_recommendation": scores["hiring_recommendation"],
            "recommendation_summary": scores["recommendation_summary"],
            "top_strengths": top_strengths,
            "areas_for_improvement": areas_for_improvement,
            "technical_gaps": technical_gaps,
            "turn_evaluations": turn_evaluations
        }


report_generator_v2 = ReportGeneratorV2()
