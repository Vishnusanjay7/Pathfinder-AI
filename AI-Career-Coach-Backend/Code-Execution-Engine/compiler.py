"""
compiler.py

Responsible for:
1. Validating the programming language
2. Selecting the correct Docker image
3. Returning source file names
4. Returning compile commands
5. Returning run commands

This module DOES NOT execute code.
Execution is handled by docker_manager.py
"""

from config import (
    SOURCE_FILES,
    DOCKER_IMAGES,
    SUPPORTED_LANGUAGES
)

from exceptions import UnsupportedLanguage


class Compiler:

    def __init__(self):
        pass

    # =====================================================
    # Validate Language
    # =====================================================

    def validate_language(self, language: str):

        language = language.lower().strip()

        if language not in SUPPORTED_LANGUAGES:
            raise UnsupportedLanguage(
                f"Language '{language}' is not supported."
            )

        return language

    # =====================================================
    # Source File Name
    # =====================================================

    def get_source_file(self, language: str):

        language = self.validate_language(language)

        return SOURCE_FILES[language]

    # =====================================================
    # Docker Image
    # =====================================================

    def get_image(self, language: str):

        language = self.validate_language(language)

        image_map = {

            "java": DOCKER_IMAGES["java"],

            "python": DOCKER_IMAGES["python"],
            "py": DOCKER_IMAGES["python"],

            "c": DOCKER_IMAGES["c"],

            "cpp": DOCKER_IMAGES["cpp"],
            "c++": DOCKER_IMAGES["cpp"],

            "javascript": DOCKER_IMAGES["javascript"],
            "js": DOCKER_IMAGES["javascript"]

        }

        return image_map[language]

    # =====================================================
    # Does Language Need Compilation?
    # =====================================================

    def requires_compilation(self, language: str):

        language = self.validate_language(language)

        return language in [
            "java",
            "c",
            "cpp",
            "c++"
        ]

    # =====================================================
    # Compile Command
    # =====================================================

    def compile_command(self, language: str):

        language = self.validate_language(language)

        commands = {

            "java": [
                "javac",
                "Main.java"
            ],

            "c": [
                "gcc",
                "main.c",
                "-o",
                "program"
            ],

            "cpp": [
                "g++",
                "main.cpp",
                "-o",
                "program"
            ],

            "c++": [
                "g++",
                "main.cpp",
                "-o",
                "program"
            ]

        }

        return commands.get(language)

    # =====================================================
    # Run Command
    # Uses input.txt for stdin
    # =====================================================

    def run_command(self, language: str):

        language = self.validate_language(language)

        commands = {

            "java": [
                "sh",
                "-c",
                "java Main < input.txt"
            ],

            "python": [
                "sh",
                "-c",
                "python solution.py < input.txt"
            ],

            "py": [
                "sh",
                "-c",
                "python solution.py < input.txt"
            ],

            "c": [
                "sh",
                "-c",
                "./program < input.txt"
            ],

            "cpp": [
                "sh",
                "-c",
                "./program < input.txt"
            ],

            "c++": [
                "sh",
                "-c",
                "./program < input.txt"
            ],

            "javascript": [
                "sh",
                "-c",
                "node solution.js < input.txt"
            ],

            "js": [
                "sh",
                "-c",
                "node solution.js < input.txt"
            ]

        }

        return commands[language]

    # =====================================================
    # Execution Plan
    # =====================================================

    def get_execution_plan(self, language: str):

        language = self.validate_language(language)

        return {

            "language": language,

            "docker_image": self.get_image(language),

            "source_file": self.get_source_file(language),

            "needs_compilation": self.requires_compilation(language),

            "compile_command": self.compile_command(language),

            "run_command": self.run_command(language)

        }


compiler = Compiler()