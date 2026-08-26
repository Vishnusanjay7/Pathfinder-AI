"""
validator.py

Validates submitted source code before execution.
"""

import re

from exceptions import RuntimeExecutionError


class CodeValidator:

    def __init__(self):

        self.patterns = {

            "python": [

                r"os\.system",

                r"subprocess",

                r"shutil\.rmtree",

                r"eval\s*\(",

                r"exec\s*\(",

                r"__import__",

                r"open\s*\(",

                r"socket",

                r"requests",

                r"urllib",

                r"pickle",

                r"ctypes"

            ],

            "java": [

                r"Runtime\.getRuntime",

                r"ProcessBuilder",

                r"System\.exit",

                r"java\.io\.File",

                r"java\.net",

                r"java\.nio\.file",

                r"Class\.forName"

            ],

            "c": [

                r"system\s*\(",

                r"fork\s*\(",

                r"exec",

                r"remove\s*\(",

                r"fopen",

                r"freopen"

            ],

            "cpp": [

                r"system\s*\(",

                r"fork\s*\(",

                r"exec",

                r"remove\s*\(",

                r"fstream",

                r"ifstream",

                r"ofstream"

            ],

            "javascript": [

                r"require\s*\(",

                r"child_process",

                r"process\.exit",

                r"fs\.",

                r"net",

                r"http",

                r"https",

                r"eval\s*\("

            ]

        }

    # ==================================================

    def validate(self, language, source_code):

        language = language.lower().strip()

        aliases = {

            "py": "python",

            "c++": "cpp",

            "js": "javascript"

        }

        language = aliases.get(language, language)

        rules = self.patterns.get(language, [])

        violations = []

        for pattern in rules:

            if re.search(pattern, source_code, re.IGNORECASE):

                violations.append(pattern)

        if violations:

            raise RuntimeExecutionError(

                "Dangerous code detected.\n\n"

                + "\n".join(violations)

            )

        return True


validator = CodeValidator()