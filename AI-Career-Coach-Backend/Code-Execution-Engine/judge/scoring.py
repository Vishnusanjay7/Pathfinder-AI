"""
scoring.py

Production Grade Scoring Engine

Responsibilities
----------------
1. Calculate weighted score
2. Calculate percentage
3. Calculate pass rate
4. Generate statistics
"""


class ScoringEngine:

    def __init__(self):
        pass

    # =====================================================
    # Calculate Score
    # =====================================================

    def calculate(self, results):

        earned = 0
        maximum = 0
        passed = 0

        for result in results:

            weight = result.get("weight", 1)

            maximum += weight

            if result["passed"]:
                earned += weight
                passed += 1

        total = len(results)

        failed = total - passed

        percentage = 0

        if maximum > 0:
            percentage = round(
                earned * 100 / maximum,
                2
            )

        return {

            "earned_score": earned,

            "maximum_score": maximum,

            "percentage": percentage,

            "passed": passed,

            "failed": failed,

            "total": total

        }

    # =====================================================
    # Grade
    # =====================================================

    def grade(self, percentage):

        if percentage >= 90:
            return "A+"

        if percentage >= 80:
            return "A"

        if percentage >= 70:
            return "B"

        if percentage >= 60:
            return "C"

        if percentage >= 50:
            return "D"

        return "F"

    # =====================================================
    # Pass / Fail
    # =====================================================

    def passed(self, percentage):

        return percentage >= 50

    # =====================================================
    # Complete Report
    # =====================================================

    def report(self, results):

        score = self.calculate(results)

        score["grade"] = self.grade(

            score["percentage"]

        )

        score["status"] = (

            "PASS"

            if self.passed(score["percentage"])

            else "FAIL"

        )

        return score


scoring_engine = ScoringEngine()