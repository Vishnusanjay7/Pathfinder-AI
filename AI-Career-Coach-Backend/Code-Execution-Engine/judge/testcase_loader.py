"""
testcase_loader.py

Loads public and hidden test cases from JSON files.
"""

import json
from pathlib import Path

from judge.testcase import TestCase


class TestCaseLoader:

    def __init__(self):

        self.base_path = Path(__file__).parent / "testcases"

    # ==========================================================
    # Load JSON File
    # ==========================================================

    def _load_json(self, filename):

        path = self.base_path / filename

        if not path.exists():
            return []

        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)

    # ==========================================================
    # Convert JSON to TestCase Objects
    # ==========================================================

    def _build(self, data):

        testcases = []

        for item in data:

            testcase = TestCase(

                id=item.get("id", 0),

                input=item.get("input", ""),

                expected_output=item.get("expected_output", ""),

                is_hidden=item.get("is_hidden", False),

                weight=item.get("weight", 1),

                explanation=item.get("explanation"),

                timeout=item.get("timeout", 3),

                memory_limit=item.get("memory_limit", 256)

            )

            testcases.append(testcase)

        return testcases

    # ==========================================================
    # Public Test Cases
    # ==========================================================

    def load_public(self):

        data = self._load_json("public.json")

        return self._build(data)

    # ==========================================================
    # Hidden Test Cases
    # ==========================================================

    def load_hidden(self):

        data = self._load_json("hidden.json")

        return self._build(data)

    # ==========================================================
    # All Test Cases
    # ==========================================================

    def load_all(self):

        return self.load_public() + self.load_hidden()


loader = TestCaseLoader()