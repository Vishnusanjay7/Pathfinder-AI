"""
interview_score.py

Calculates interview readiness score.
"""


class InterviewScore:

    def __init__(self):
        pass

    def calculate(

        self,

        judge_percentage,

        quality_score

    ):

        coding = judge_percentage * 0.70

        quality = quality_score * 0.30

        score = round(

            coding + quality,

            2

        )

        if score >= 90:

            level = "Excellent"

        elif score >= 75:

            level = "Very Good"

        elif score >= 60:

            level = "Good"

        elif score >= 40:

            level = "Average"

        else:

            level = "Needs Improvement"

        return {

            "interview_score": score,

            "level": level

        }


interview_score = InterviewScore()