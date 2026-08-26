import json
import re

from groq import Groq

from app.core.config import settings


client = Groq(
    api_key=settings.GROQ_API_KEY
)


def generate_assessment(
    resume_text: str,
    job_description: str,
     difficulty: str
):
    """
    Generate a complete AI assessment consisting of:
    - Technical MCQs
    - Coding Questions
    - Aptitude Questions
    - HR Questions
    """

    prompt = f"""
You are a Senior Technical Interviewer working at Google, Microsoft, Amazon and Netflix.

Analyze the candidate resume and the job description.

Generate a COMPLETE interview assessment.

Resume:

{resume_text}

Job Description:

{job_description}

Return ONLY VALID JSON.

Rules:

Generate:

1. 10 Technical MCQs
2. 3 Coding Questions
3. 5 Aptitude Questions
4. 5 HR Questions

Coding questions MUST include:

- title
- description
- difficulty
- language (Java)
- constraints
- sample_input
- sample_output

Technical MCQs MUST contain:

question
options
answer
difficulty

Aptitude Questions MUST contain:

question
options
answer
explanation

HR Questions:

question

Return ONLY this JSON format.

{{
  "technical_mcq":[
      {{
          "question":"",
          "options":["","","",""],
          "answer":"",
          "difficulty":""
      }}
  ],

  "coding_questions":[
      {{
          "title":"",
          "description":"",
          "difficulty":"",
          "language":"Java",
          "constraints":[
              ""
          ],
          "sample_input":"",
          "sample_output":""
      }}
  ],

  "aptitude_questions":[
      {{
          "question":"",
          "options":["","","",""],
          "answer":"",
          "explanation":""
      }}
  ],

  "hr_questions":[
      {{
          "question":""
      }}
  ]
}}

Return ONLY JSON.
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

    # Remove markdown if present

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