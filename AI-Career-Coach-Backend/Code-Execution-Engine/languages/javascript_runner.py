import os
import shutil
import subprocess
import tempfile

from utils.result_builder import build_result, build_error


def run_javascript(source_code, test_cases):

    temp_dir = tempfile.mkdtemp()

    try:

        js_file = os.path.join(temp_dir, "solution.js")

        with open(js_file, "w", encoding="utf-8") as file:
            file.write(source_code)

        results = []

        for tc in test_cases:

            try:

                process = subprocess.run(
                    ["node", js_file],
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