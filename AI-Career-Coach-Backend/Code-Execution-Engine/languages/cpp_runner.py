import os
import shutil
import subprocess
import tempfile

from utils.result_builder import build_result, build_error


def run_cpp(source_code, test_cases):

    temp_dir = tempfile.mkdtemp()

    try:

        cpp_file = os.path.join(temp_dir, "main.cpp")

        executable = os.path.join(
            temp_dir,
            "program.exe" if os.name == "nt" else "program"
        )

        with open(cpp_file, "w", encoding="utf-8") as file:
            file.write(source_code)

        compile_process = subprocess.run(
            ["g++", cpp_file, "-o", executable],
            capture_output=True,
            text=True
        )

        if compile_process.returncode != 0:
            return build_error(compile_process.stderr)

        results = []

        for tc in test_cases:

            try:

                process = subprocess.run(
                    [executable],
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