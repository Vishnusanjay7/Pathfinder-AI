import json
import re

from groq import Groq

from app.core.config import settings


client = Groq(
    api_key=settings.GROQ_API_KEY
)


def generate_coding_questions(
    resume_text: str,
    job_description: str,
    difficulty: str = "Medium",
    number_of_questions: int = 3,
    language: str = "Java"
):
    """
    Generate AI coding questions based on
    resume and job description.
    """

    prompt = f"""
You are a Senior Software Engineering Interviewer.

Analyze the following resume and job description.

Resume

{resume_text}

Job Description

{job_description}

Generate exactly {number_of_questions} coding questions.

Difficulty:
{difficulty}

Programming Language:
{language}

Rules:

1. Questions must match the candidate's skills.

2. Questions should evaluate real interview ability.

3. Avoid repeating similar problems.

4. Mix topics such as:

- Arrays
- Strings
- HashMap
- Stack
- Queue
- Linked List
- Trees
- Graph
- Dynamic Programming

5. Every question MUST include

id

title

description

difficulty

language

constraints

sample_input

sample_output

expected_time_complexity

expected_space_complexity

public_test_cases

Return ONLY VALID JSON.

Format

{{
    "questions":[
        {{
            "id":1,

            "title":"",

            "description":"",

            "difficulty":"",

            "language":"Java",

            "constraints":[
                ""
            ],

            "sample_input":"",

            "sample_output":"",

            "expected_time_complexity":"",

            "expected_space_complexity":"",

            "public_test_cases":[
                {{
                    "input":"",
                    "output":""
                }}
            ]
        }}
    ]
}}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        temperature=0.4,
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