"""
AI Code Review Engine

Responsibilities
----------------
1. Analyze submitted source code
2. Generate strengths
3. Detect weaknesses
4. Suggest improvements
5. Estimate difficulty
6. Calculate code quality score

Currently uses rule-based analysis.
Can later be upgraded to Groq/OpenAI/Gemini without
changing the API.
"""

import re


class CodeReviewEngine:

    def __init__(self):
        pass

    # =====================================================
    # Code Metrics
    # =====================================================

    def metrics(self, source_code):

        lines = len(source_code.splitlines())

        characters = len(source_code)

        blank_lines = sum(
            1
            for line in source_code.splitlines()
            if line.strip() == ""
        )

        comments = sum(
            1
            for line in source_code.splitlines()
            if line.strip().startswith(("//", "#", "/*", "*"))
        )

        return {

            "lines": lines,

            "characters": characters,

            "blank_lines": blank_lines,

            "comments": comments

        }

    # =====================================================
    # Detect Strengths
    # =====================================================

    def strengths(self, source_code):

        strengths = []

        if "for" in source_code:
            strengths.append(
                "Uses iteration."
            )

        if "while" in source_code:
            strengths.append(
                "Uses looping constructs."
            )

        if "def " in source_code or "function" in source_code:
            strengths.append(
                "Uses modular functions."
            )

        if "class " in source_code:
            strengths.append(
                "Uses object-oriented programming."
            )

        if "try" in source_code or "catch" in source_code:
            strengths.append(
                "Includes exception handling."
            )

        return strengths

    # =====================================================
    # Weaknesses
    # =====================================================

    def weaknesses(self, source_code):

        issues = []

        if "goto" in source_code:
            issues.append(
                "Avoid using goto."
            )

        if "System.out.println" in source_code:
            issues.append(
                "Avoid unnecessary debugging statements."
            )

        if "print(" in source_code:
            issues.append(
                "Remove debug print statements before submission."
            )

        if len(source_code.splitlines()) > 300:
            issues.append(
                "Large source file. Consider refactoring."
            )

        return issues

    # =====================================================
    # Suggestions
    # =====================================================

    def suggestions(self):

        return [

            "Use meaningful variable names.",

            "Keep functions short.",

            "Handle edge cases.",

            "Avoid duplicated code.",

            "Improve readability with comments.",

            "Reduce algorithm complexity where possible."

        ]

    # =====================================================
    # Quality Score
    # =====================================================

    def quality_score(self, source_code):

        score = 100

        score -= len(self.weaknesses(source_code)) * 5

        if score < 0:
            score = 0

        return score

    # =====================================================
    # Review
    # =====================================================

    def review(self, source_code):

        return {

            "metrics": self.metrics(source_code),

            "strengths": self.strengths(source_code),

            "weaknesses": self.weaknesses(source_code),

            "suggestions": self.suggestions(),

            "quality_score": self.quality_score(source_code)

        }


code_review_engine = CodeReviewEngine()