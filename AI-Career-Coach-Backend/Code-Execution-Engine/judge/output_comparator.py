"""
output_comparator.py

Responsible for comparing program output with expected output.

Features
--------
1. Exact comparison
2. Ignore leading/trailing spaces
3. Ignore blank lines
4. Ignore multiple spaces
5. Optional case-insensitive comparison
6. Detailed comparison result
"""

import re


class OutputComparator:

    def __init__(self):
        pass

    # =====================================================
    # Normalize Output
    # =====================================================

    def normalize(self, text: str):

        if text is None:
            return ""

        lines = []

        for line in text.splitlines():

            line = line.strip()

            if line == "":
                continue

            line = re.sub(r"\s+", " ", line)

            lines.append(line)

        return "\n".join(lines)

    # =====================================================
    # Exact Comparison
    # =====================================================

    def exact_match(

        self,

        expected,

        actual

    ):

        return expected == actual

    # =====================================================
    # Normalized Comparison
    # =====================================================

    def normalized_match(

        self,

        expected,

        actual

    ):

        expected = self.normalize(expected)

        actual = self.normalize(actual)

        return expected == actual

    # =====================================================
    # Case Insensitive Comparison
    # =====================================================

    def case_insensitive_match(

        self,

        expected,

        actual

    ):

        expected = self.normalize(expected).lower()

        actual = self.normalize(actual).lower()

        return expected == actual

    # =====================================================
    # Compare
    # =====================================================

    def compare(

        self,

        expected,

        actual,

        ignore_case=False

    ):

        expected_original = expected

        actual_original = actual

        expected = self.normalize(expected)

        actual = self.normalize(actual)

        if ignore_case:

            passed = expected.lower() == actual.lower()

        else:

            passed = expected == actual

        return {

            "passed": passed,

            "expected": expected_original,

            "actual": actual_original,

            "normalized_expected": expected,

            "normalized_actual": actual

        }

    # =====================================================
    # Presentation Error
    # =====================================================

    def presentation_error(

        self,

        expected,

        actual

    ):

        expected = expected.split()

        actual = actual.split()

        return expected == actual


comparator = OutputComparator()