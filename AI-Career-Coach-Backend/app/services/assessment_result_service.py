from typing import Dict


class AssessmentResultService:
    """
    Combines all assessment modules and
    calculates the final placement score.
    """

    # ----------------------------
    # Coding Score
    # ----------------------------

    @staticmethod
    def calculate_coding_score(
        execution_summary: Dict,
        ai_review: Dict
    ):

        execution_score = execution_summary.get("score", 0)

        correctness = ai_review.get("correctness", 0)
        readability = ai_review.get("readability", 0)
        best_practices = ai_review.get("best_practices", 0)
        optimization = ai_review.get("optimization", 0)

        final_score = (
            execution_score * 0.70
            + correctness * 0.10
            + readability * 0.05
            + best_practices * 0.05
            + optimization * 0.10
        )

        return {
            "execution_score": execution_score,
            "correctness": correctness,
            "readability": readability,
            "best_practices": best_practices,
            "optimization": optimization,
            "coding_score": round(final_score, 2)
        }

    # ----------------------------
    # Final Assessment
    # ----------------------------

    @staticmethod
    def generate_final_result(
        resume_score: int,
        ats_score: int,
        job_match_score: int,
        mcq_score: int,
        coding_score: float,
        aptitude_score: int,
        hr_score: int
    ):

        weights = {
            "resume": 10,
            "ats": 10,
            "job_match": 15,
            "mcq": 15,
            "coding": 30,
            "aptitude": 10,
            "hr": 10
        }

        overall = (
            resume_score * weights["resume"] +
            ats_score * weights["ats"] +
            job_match_score * weights["job_match"] +
            mcq_score * weights["mcq"] +
            coding_score * weights["coding"] +
            aptitude_score * weights["aptitude"] +
            hr_score * weights["hr"]
        ) / 100

        strengths = []
        improvements = []

        if coding_score >= 85:
            strengths.append("Strong coding skills")
        else:
            improvements.append("Practice coding problems")

        if ats_score >= 80:
            strengths.append("Resume is ATS friendly")
        else:
            improvements.append("Improve ATS compatibility")

        if job_match_score < 70:
            improvements.append("Improve skills matching job requirements")

        if aptitude_score < 70:
            improvements.append("Practice aptitude questions")

        if hr_score < 70:
            improvements.append("Improve HR interview preparation")

        return {
            "overall_score": round(overall, 2),

            "scores": {
                "resume": resume_score,
                "ats": ats_score,
                "job_match": job_match_score,
                "mcq": mcq_score,
                "coding": coding_score,
                "aptitude": aptitude_score,
                "hr": hr_score
            },

            "strengths": strengths,

            "improvements": improvements
        }


assessment_result_service = AssessmentResultService()