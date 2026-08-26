"""
runner.py

Main Orchestrator for the Code Execution Engine

Flow

User Submission
        │
        ▼
Validate Source Code
        │
        ▼
Create Sandbox
        │
        ▼
Create Source File
        │
        ▼
Compile (if required)
        │
        ▼
Run Every Test Case
        │
        ▼
Compare Outputs
        │
        ▼
Generate Score
        │
        ▼
Cleanup Sandbox
"""

from compiler import compiler
from sandbox import Sandbox
from docker_manager import docker_manager
from security.validator import validator


class ExecutionRunner:

    def __init__(self):
        pass

    def execute(
        self,
        language: str,
        source_code: str,
        test_cases
    ):

        sandbox = Sandbox()

        try:

            # ------------------------------------
            # Validate submitted source code
            # ------------------------------------

            validator.validate(
                language,
                source_code
            )

            # ------------------------------------
            # Get execution plan
            # ------------------------------------

            plan = compiler.get_execution_plan(language)

            # ------------------------------------
            # Create source file
            # ------------------------------------

            sandbox.create_source_file(
                plan["source_file"],
                source_code
            )

            # ------------------------------------
            # Compile (Java/C/C++)
            # ------------------------------------

            if plan["needs_compilation"]:

                compile_result = docker_manager.execute(

                    image=plan["docker_image"],

                    workspace=sandbox.path(),

                    command=plan["compile_command"]

                )

                if not compile_result["success"]:

                    return {

                        "success": False,

                        "stage": "Compilation",

                        "stdout": compile_result["stdout"],

                        "stderr": compile_result["stderr"],

                        "exit_code": compile_result["exit_code"]

                    }

            # ------------------------------------
            # Execute Test Cases
            # ------------------------------------

            results = []

            passed = 0

            total_runtime = 0

            for index, tc in enumerate(test_cases, start=1):

                sandbox.create_input_file(
                    tc.input
                )

                execution = docker_manager.execute(

                    image=plan["docker_image"],

                    workspace=sandbox.path(),

                    command=plan["run_command"]

                )

                actual = execution["stdout"].strip()

                expected = tc.expected_output.strip()

                is_passed = actual == expected

                if is_passed:
                    passed += 1

                total_runtime += execution.get(
                    "execution_time",
                    0
                )

                results.append({

                    "test_case": index,

                    "input": tc.input,

                    "expected_output": expected,

                    "actual_output": actual,

                    "passed": is_passed,

                    "stdout": execution["stdout"],

                    "stderr": execution["stderr"],

                    "exit_code": execution["exit_code"]

                })

            # ------------------------------------
            # Final Summary
            # ------------------------------------

            total = len(results)

            failed = total - passed

            score = 0

            if total > 0:
                score = round(
                    (passed / total) * 100,
                    2
                )

            return {

                "success": True,

                "language": language,

                "summary": {

                    "passed": passed,

                    "failed": failed,

                    "total": total,

                    "score": score,

                    "execution_time_ms": total_runtime

                },

                "results": results

            }

        except Exception as e:

            return {

                "success": False,

                "stage": "Execution",

                "error": str(e)

            }

        finally:

            sandbox.cleanup()


runner = ExecutionRunner()