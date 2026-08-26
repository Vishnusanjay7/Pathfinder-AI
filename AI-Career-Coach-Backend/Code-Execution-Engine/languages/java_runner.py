import subprocess

from compiler import JavaCompiler
from utils.result_builder import build_result, build_error


def run_java(source_code, test_cases):

    compiler = JavaCompiler()

    compilation = compiler.compile(source_code)

    if not compilation["success"]:
        compiler.cleanup()
        return compilation

    results = []

    try:

        for tc in test_cases:

            process = subprocess.run(
                ["java", "-cp", compilation["temp_dir"], "Main"],
                input=tc.input,
                capture_output=True,
                text=True,
                timeout=3
            )

            actual = process.stdout.strip()
            expected = tc.expected_output.strip()

            results.append({
                "input": tc.input,
                "expected_output": expected,
                "actual_output": actual,
                "passed": actual == expected,
                "stderr": process.stderr.strip()
            })

        return build_result(results)

    except subprocess.TimeoutExpired:
        return build_error("Time Limit Exceeded")

    finally:
        compiler.cleanup()