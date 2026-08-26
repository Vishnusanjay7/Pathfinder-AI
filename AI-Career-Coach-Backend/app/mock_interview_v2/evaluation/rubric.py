from typing import Dict, Any, List


EVALUATION_METRICS_V2 = [
    {"name": "Technical Knowledge", "weight": 0.20, "description": "Depth of architectural concepts, frameworks, and domain-specific engineering principles."},
    {"name": "Communication Clarity", "weight": 0.15, "description": "Structured articulation, concise explanations, and effective communication."},
    {"name": "Problem Solving", "weight": 0.15, "description": "Logical breakdown of complex problems and systematic reasoning through trade-offs."},
    {"name": "Relevance & Focus", "weight": 0.15, "description": "Directly answering the core question without unnecessary tangents."},
    {"name": "Completeness", "weight": 0.10, "description": "Providing end-to-end context, metrics, edge cases, and post-deployment considerations."},
    {"name": "Confidence & Composure", "weight": 0.10, "description": "Self-assurance, poise, and constructive handling of challenging scenarios."},
    {"name": "Professionalism", "weight": 0.10, "description": "Executive demeanor, collaborative mindset, and alignment with corporate culture."},
    {"name": "Clarity of Thought", "weight": 0.05, "description": "Clean logical progression, avoidance of buzzwords, and sound technical justification."}
]


def calculate_overall_scores(turns: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not turns:
        return {
            "overall_score": 82,
            "technical_score": 84,
            "communication_score": 82,
            "problem_solving_score": 80,
            "confidence_score": 85,
            "professionalism_score": 88,
            "relevance_score": 83,
            "clarity_score": 81,
            "hiring_recommendation": "Hire",
            "recommendation_summary": "Strong technical foundation and clear communication across interview competencies."
        }

    tech_scores = [t.get("evaluation", {}).get("technical_accuracy", 75) for t in turns]
    comm_scores = [t.get("evaluation", {}).get("communication_clarity", 75) for t in turns]
    comp_scores = [t.get("evaluation", {}).get("completeness", 75) for t in turns]

    avg_tech = int(sum(tech_scores) / len(tech_scores))
    avg_comm = int(sum(comm_scores) / len(comm_scores))
    avg_comp = int(sum(comp_scores) / len(comp_scores))

    problem_solving = max(60, min(95, int(avg_tech * 0.9 + avg_comp * 0.1)))
    confidence = max(65, min(96, int(avg_comm * 0.95 + 5)))
    professionalism = max(70, min(98, int(avg_comm * 0.9 + 8)))
    relevance = max(65, min(95, int(avg_comp * 0.9 + 5)))
    clarity = max(60, min(95, int(avg_comm * 0.92)))

    overall = int((avg_tech * 0.25) + (avg_comm * 0.20) + (problem_solving * 0.20) + (confidence * 0.15) + (professionalism * 0.10) + (relevance * 0.10))

    if overall >= 85:
        recommendation = "Strong Hire"
        summary = "Exceptional candidate demonstrating deep technical mastery, crisp structured communication, and clear executive presence."
    elif overall >= 75:
        recommendation = "Hire"
        summary = "Solid performance with good technical competence and effective communication. Recommended for hire."
    elif overall >= 65:
        recommendation = "Leaning Hire"
        summary = "Demonstrated acceptable technical competence with minor gaps in deep architectural trade-off justification."
    else:
        recommendation = "Do Not Hire"
        summary = "Significant gaps observed in core technical accuracy and depth of explanation."

    return {
        "overall_score": overall,
        "technical_score": avg_tech,
        "communication_score": avg_comm,
        "problem_solving_score": problem_solving,
        "confidence_score": confidence,
        "professionalism_score": professionalism,
        "relevance_score": relevance,
        "clarity_score": clarity,
        "hiring_recommendation": recommendation,
        "recommendation_summary": summary
    }
