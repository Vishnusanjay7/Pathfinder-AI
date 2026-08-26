"""
prompt_builder.py

Creates prompts for Groq/OpenAI/Gemini.
"""


class PromptBuilder:

    def __init__(self):
        pass

    def build(

        self,

        language,

        question,

        source_code,

        review,

        complexity

    ):

        prompt = f"""

You are a Senior Software Engineer.

Review the following solution.

Language:
{language}

Problem:
{question}

Source Code:

{source_code}

Current Analysis

Quality Score:
{review['quality_score']}

Estimated Time Complexity:
{complexity['time_complexity']}

Estimated Space Complexity:
{complexity['space_complexity']}

Provide:

1. Strengths
2. Weaknesses
3. Bugs
4. Optimizations
5. Interview Feedback
6. Final Rating out of 10

"""

        return prompt.strip()


prompt_builder = PromptBuilder()