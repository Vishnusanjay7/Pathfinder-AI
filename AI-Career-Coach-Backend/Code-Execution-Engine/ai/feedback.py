"""
feedback.py

Generates AI-like feedback from review results.
"""


class FeedbackEngine:

    def __init__(self):
        pass

    def generate(self, review, complexity):

        feedback = []

        if review["quality_score"] >= 90:

            feedback.append(
                "Excellent code quality."
            )

        elif review["quality_score"] >= 75:

            feedback.append(
                "Good implementation with room for improvement."
            )

        else:

            feedback.append(
                "Code requires significant improvements."
            )

        feedback.append(

            f"Estimated Time Complexity: {complexity['time_complexity']}"

        )

        feedback.append(

            f"Estimated Space Complexity: {complexity['space_complexity']}"

        )

        if complexity["uses_recursion"]:

            feedback.append(
                "Recursive approach detected."
            )

        return feedback


feedback_engine = FeedbackEngine()