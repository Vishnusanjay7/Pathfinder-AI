"""
complexity.py

Basic Time & Space Complexity Analyzer
"""

import re


class ComplexityAnalyzer:

    def __init__(self):
        pass

    def time_complexity(self, source_code):

        nested_loops = len(re.findall(r"for|while", source_code))

        if nested_loops == 0:
            return "O(1)"

        elif nested_loops == 1:
            return "O(n)"

        elif nested_loops == 2:
            return "O(n²)"

        elif nested_loops == 3:
            return "O(n³)"

        return "O(n^k)"

    def recursion(self, source_code):

        if "def " in source_code:

            functions = re.findall(r"def\s+(\w+)", source_code)

            for fn in functions:

                if fn + "(" in source_code.split("def")[1]:
                    return True

        if "public static" in source_code:

            methods = re.findall(r"void\s+(\w+)", source_code)

            for method in methods:

                if method + "(" in source_code:
                    return True

        return False

    def space_complexity(self, source_code):

        arrays = len(re.findall(r"\[\]", source_code))

        lists = len(re.findall(r"ArrayList|List|vector|dict|map|set", source_code))

        if arrays + lists == 0:
            return "O(1)"

        return "O(n)"

    def analyze(self, source_code):

        return {

            "time_complexity": self.time_complexity(source_code),

            "space_complexity": self.space_complexity(source_code),

            "uses_recursion": self.recursion(source_code)

        }


complexity_analyzer = ComplexityAnalyzer()