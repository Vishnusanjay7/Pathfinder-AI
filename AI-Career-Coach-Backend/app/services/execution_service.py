"""
execution_service.py

Runs user code against multiple test cases using Judge0
and generates AI code review.
"""

from app.services.judge0_service import judge0_service
from app.services.code_review_service import review_code


class ExecutionService:

    def execute_code(
        self,
        language: str,
        source_code: str,
        test_cases: list,
        question: dict | None = None,
        include_public: bool = True,
        include_hidden: bool = True
    ):
        """Execute user code against test cases.

        - When include_public is True and include_hidden is False, only visible
          test cases are run (Run Code).
        - When both are True, all test cases (visible + hidden) run (Submit).
        - The response NEVER leaks expected_output / actual_output for hidden
          test cases. Only pass/fail + timing info is returned for those.
        """

        results = []

        passed = 0
        failed = 0

        total_time = 0.0
        max_memory = 0

        # ==========================================
        # Execute Against Selected Test Cases
        # ==========================================

        for test_case in test_cases:

            # Skip hidden test cases when running in "Run Code" (visible-only) mode.
            if test_case.get("is_public", True) is False and not include_hidden:
                continue

            response = judge0_service.execute_with_input(
                language=language,
                source_code=source_code,
                stdin=test_case["input"]
            )

            actual_output = (
                response.get("stdout") or ""
            ).strip()

            expected_output = (
                test_case["expected_output"]
            ).strip()

            success = (
                actual_output == expected_output
                and response["status"]["id"] == 3
            )

            if success:
                passed += 1
            else:
                failed += 1

            execution_time = float(
                response.get("time") or 0
            )

            memory = response.get("memory") or 0

            total_time += execution_time

            max_memory = max(
                max_memory,
                memory
            )

            is_public = test_case.get("is_public", True)

            # Build a safe per-case result. For public cases we can include
            # the actual/expected output (they are visible to the candidate).
            # For hidden cases we NEVER expose expected/actual output.
            case_result = {
                "is_public": is_public,
                "passed": success,
                "status": response["status"]["description"],
                "execution_time": execution_time,
                "memory": memory,
            }

            if is_public:
                case_result["input"] = test_case["input"]
                case_result["expected_output"] = expected_output
                case_result["actual_output"] = actual_output

            results.append(case_result)

        # ==========================================
        # Final Score
        # ==========================================

        total = len(results)
        score = round(
            (passed / total) * 100,
            2
        ) if total else 0.0

        execution_result = {
            "score": score,
            "passed": passed,
            "failed": failed,
            "total_test_cases": total,
            "results": results
        }

        # ==========================================
        # Use DB Question (if provided) for AI Review
        # ==========================================

        if question is None:
            question = {
                "title": "Coding Assessment",
                "description": "Solve the programming problem correctly.",
                "constraints": [
                    "Use an efficient algorithm."
                ],
                "expected_time_complexity": "O(n)",
                "expected_space_complexity": "O(1)"
            }

        # ==========================================
        # AI Review
        # ==========================================

        try:

            ai_review = review_code(
                question=question,
                source_code=source_code,
                execution_result=execution_result,
                language=language
            )

        except Exception as e:

            ai_review = {
                "success": False,
                "message": str(e)
            }

        # ==========================================
        # Return Response
        # ==========================================

        return {
            "success": True,
            "language": language,
            "score": score,
            "passed": passed,
            "failed": failed,
            "total_test_cases": total,
            "average_execution_time": round(
                total_time / total,
                4
            ) if total else 0.0,
            "maximum_memory": max_memory,
            "results": results,
            "ai_review": ai_review
        }

    # ==========================================
    # Health Check
    # ==========================================

    def health(self):

        return {
            "success": True,
            "message": "Judge0 Execution Service Running"
        }

    # ==========================================
    # Supported Languages
    # ==========================================

    def supported_languages(self):

        return {
            "success": True,
            "languages": [
                {
                    "name": "Java",
                    "value": "java"
                },
                {
                    "name": "Python",
                    "value": "python"
                },
                {
                    "name": "C++",
                    "value": "cpp"
                },
                {
                    "name": "JavaScript",
                    "value": "javascript"
                }
            ]
        }


execution_service = ExecutionService()
