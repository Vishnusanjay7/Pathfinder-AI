"""
execution_report.py

Creates a complete execution report after judging.
"""

from datetime import datetime


class ExecutionReport:

    def __init__(self):
        pass

    # =====================================================
    # Build Report
    # =====================================================

    def build(

        self,

        language,

        verdict,

        summary,

        results,

        execution_time=0,

        memory_used=0

    ):

        return {

            "submission": {

                "language": language,

                "submitted_at": datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )

            },

            "verdict": verdict,

            "performance": {

                "execution_time_ms": execution_time,

                "memory_used_mb": memory_used

            },

            "summary": summary,

            "results": results

        }

    # =====================================================
    # Accepted
    # =====================================================

    def accepted(self):

        return {

            "status": "Accepted",

            "status_code": "AC"

        }

    # =====================================================
    # Wrong Answer
    # =====================================================

    def wrong_answer(self):

        return {

            "status": "Wrong Answer",

            "status_code": "WA"

        }

    # =====================================================
    # Compilation Error
    # =====================================================

    def compilation_error(self, stderr):

        return {

            "status": "Compilation Error",

            "status_code": "CE",

            "stderr": stderr

        }

    # =====================================================
    # Runtime Error
    # =====================================================

    def runtime_error(self, stderr):

        return {

            "status": "Runtime Error",

            "status_code": "RE",

            "stderr": stderr

        }

    # =====================================================
    # Time Limit Exceeded
    # =====================================================

    def time_limit(self):

        return {

            "status": "Time Limit Exceeded",

            "status_code": "TLE"

        }

    # =====================================================
    # Memory Limit Exceeded
    # =====================================================

    def memory_limit(self):

        return {

            "status": "Memory Limit Exceeded",

            "status_code": "MLE"

        }


execution_report = ExecutionReport()