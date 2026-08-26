"""
testcase.py

Represents one coding test case.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class TestCase:

    id: int

    input: str

    expected_output: str

    is_hidden: bool = False

    weight: int = 1

    explanation: Optional[str] = None

    timeout: int = 3

    memory_limit: int = 256

    def to_dict(self):

        return {

            "id": self.id,

            "input": self.input,

            "expected_output": self.expected_output,

            "is_hidden": self.is_hidden,

            "weight": self.weight,

            "timeout": self.timeout,

            "memory_limit": self.memory_limit,

            "explanation": self.explanation

        }