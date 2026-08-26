import json
import re

from groq import Groq

from app.core.config import settings


client = Groq(
    api_key=settings.GROQ_API_KEY
)


def generate_test_cases(
    question: dict,
    public_cases: int = 3,
    hidden_cases: int = 7
):
    """
    Generate public and hidden test cases
    for a coding question.
    """

    prompt = f"""
You are a Senior Competitive Programming Expert.

Generate test cases for the following coding question.

Question

Title:
{question["title"]}

Description:
{question["description"]}

Constraints:
{question["constraints"]}

Sample Input:
{question["sample_input"]}

Sample Output:
{question["sample_output"]}

Generate:

{public_cases} Public Test Cases

{hidden_cases} Hidden Test Cases

Hidden test cases MUST include edge cases such as

• Empty Input
• Minimum Input
• Maximum Input
• Duplicate Values
• Negative Values (if applicable)
• Large Dataset
• Boundary Conditions

Return ONLY VALID JSON.

Format

{{
    "public_test_cases":[
        {{
            "input":"",
            "output":""
        }}
    ],

    "hidden_test_cases":[
        {{
            "input":"",
            "output":""
        }}
    ]
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
            "Invalid JSON returned by Groq.\n\n"
            + content
        )

    return result