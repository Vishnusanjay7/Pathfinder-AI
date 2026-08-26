"""
judge_engine.py

Main Online Judge Engine

Responsibilities
----------------
1. Load public and hidden test cases
2. Execute user code
3. Compare outputs
4. Calculate score
5. Generate verdict
"""

from runner import runner

from judge.output_comparator import comparator
from judge.testcase_loader import loader


class JudgeEngine:

    def __init__(self):
        pass

    # =====================================================
    # Judge Submission
    # =====================================================

    def judge(

        self,

        language,

        source_code,

        include_hidden=True

    ):

        public_cases = loader.load_public()

        hidden_cases = []

        if include_hidden:

            hidden_cases = loader.load_hidden()

        test_cases = public_cases + hidden_cases

        execution = runner.execute(

            language=language,

            source_code=source_code,

            test_cases=test_cases

        )

        if not execution["success"]:

            return execution

        results = []

        passed = 0

        total_score = 0

        earned_score = 0

        verdict = "Accepted"

        for result, testcase in zip(

            execution["results"],

            test_cases

        ):

            comparison = comparator.compare(

                testcase.expected_output,

                result["actual_output"]

            )

            is_passed = comparison["passed"]

            if is_passed:

                passed += 1

                earned_score += testcase.weight

            total_score += testcase.weight

            if not is_passed:

                verdict = "Wrong Answer"

            results.append({

                "id": testcase.id,

                "hidden": testcase.is_hidden,

                "input": testcase.input if not testcase.is_hidden else None,

                "expected_output": (

                    testcase.expected_output

                    if not testcase.is_hidden

                    else None

                ),

                "actual_output": (

                    result["actual_output"]

                    if not testcase.is_hidden

                    else None

                ),

                "passed": is_passed,

                "weight": testcase.weight

            })

        percentage = 0

        if total_score > 0:

            percentage = round(

                earned_score / total_score * 100,

                2

            )

        return {

            "success": True,

            "verdict": verdict,

            "language": language,

            "summary": {

                "passed": passed,

                "failed": len(test_cases) - passed,

                "total": len(test_cases),

                "score": earned_score,

                "maximum_score": total_score,

                "percentage": percentage

            },

            "results": results

        }


judge_engine = JudgeEngine()