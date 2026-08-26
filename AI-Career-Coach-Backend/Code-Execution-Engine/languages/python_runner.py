import os
import shutil
import subprocess
import tempfile

from utils.result_builder import build_result, build_error


def run_python(source_code, test_cases):
    """
    Executes Python code against multiple test cases.
    """

    temp_dir = tempfile.mkdtemp()

    try:
        # Create Python source file
        python_file = os.path.join(temp_dir, "solution.py")

        with open(python_file, "w", encoding="utf-8") as file:
            file.write(source_code)

        results = []

        # Run all test cases
        for tc in test_cases:

            try:
                process = subprocess.run(
                    ["python", python_file],
                    input=tc.input,
                    capture_output=True,
                    text=True,
                    timeout=3
                )

                actual_output = process.stdout.strip()
                expected_output = tc.expected_output.strip()

                results.append({
                    "input": tc.input,
                    "expected_output": expected_output,
                    "actual_output": actual_output,
                    "passed": actual_output == expected_output,
                    "stderr": process.stderr.strip()
                })

            except subprocess.TimeoutExpired:

                results.append({
                    "input": tc.input,
                    "expected_output": tc.expected_output,
                    "actual_output": "",
                    "passed": False,
                    "stderr": "Time Limit Exceeded"
                })

        return build_result(results)

    except Exception as e:
        return build_error(str(e))

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)