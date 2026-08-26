import json
import re

from groq import Groq

from app.core.config import settings


client = Groq(
    api_key=settings.GROQ_API_KEY
)


def review_code(
    question: dict,
    source_code: str,
    execution_result: dict,
    language: str
):
    """
    AI Code Review using Groq.
    Evaluates correctness, readability,
    complexity and best practices.
    """

    prompt = f"""
You are a Senior Software Engineer conducting a coding interview.

Review the submitted solution.

Programming Language:
{language}

=========================
Question
=========================

Title:
{question.get("title")}

Description:
{question.get("description")}

Constraints:
{question.get("constraints")}

Expected Time Complexity:
{question.get("expected_time_complexity")}

Expected Space Complexity:
{question.get("expected_space_complexity")}

=========================
Candidate Code
=========================

{source_code}

=========================
Execution Result
=========================

{json.dumps(execution_result, indent=4)}

Evaluate the submission.

Return ONLY VALID JSON.

Format:

{{
    "correctness":90,

    "readability":88,

    "best_practices":91,

    "optimization":85,

    "time_complexity":"O(n)",

    "space_complexity":"O(1)",

    "strengths":[
        ""
    ],

    "weaknesses":[
        ""
    ],

    "optimization_suggestions":[
        ""
    ],

    "feedback":[
        ""
    ],

    "overall_score":89
}}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        temperature=0.2,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    content = response.choices[0].message.content.strip()

    content = re.sub(r"^```json", "", content)
    content = re.sub(r"^```", "", content)
    content = re.sub(r"```$", "", content)

    content = content.strip()

    try:
        result = json.loads(content)

    except Exception:

        raise Exception(
            "Groq returned invalid JSON.\n\n"
            + content
        )

    return result