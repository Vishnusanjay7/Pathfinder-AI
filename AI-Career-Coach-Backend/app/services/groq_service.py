import json
import os
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from groq import Groq
from app.services.ai_provider import BaseAIProvider

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def _fallback_resume_qualitative_analysis(resume_text: str) -> Dict[str, Any]:
    """Fallback qualitative recommendations when Groq AI is unavailable or fails."""
    return {
        "professional_summary": "Extracted professional summary based on profile credentials.",
        "strengths": [
            "Demonstrates technical skill keywords across project & experience sections.",
            "Structured layout with identifiable sections.",
            "Clear contact details provided."
        ],
        "weaknesses": [
            "Could increase quantifiable achievements (metrics/percentages).",
            "Action verbs can be strengthened across bullet points."
        ],
        "suggested_improvements": [
            "Add measurable outcomes to project bullet points (e.g. 'Improved speed by 30%').",
            "Include direct links to GitHub repositories or live portfolios.",
            "Tailor skills list towards targeted backend/full-stack job descriptions."
        ],
        "bullet_improvements": [
            "Change 'Worked on backend APIs' to 'Engineered scalable RESTful APIs using FastAPI and PostgreSQL.'"
        ],
        "recommended_jobs": ["Software Engineer", "Backend Developer", "Full Stack Developer"],
        "interview_questions": [
            "Can you describe a challenging technical project you built?",
            "How do you handle database query optimization?",
            "Explain your experience with REST API design and error handling."
        ]
    }


def analyze_resume_qualitative(resume_text: str, parsed_profile: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    LLM reasoning for qualitative insights ONLY.
    """
    if not client:
        logging.warning("Groq API client is not initialized. Using deterministic fallback.")
        return _fallback_resume_qualitative_analysis(resume_text)

    truncated_text = resume_text[:4000]
    prompt = f"""
You are an expert ATS Specialist and AI Recruitment Coach.
Analyze the resume content below and provide qualitative feedback.

Return ONLY valid JSON.
DO NOT wrap inside markdown ```.
DO NOT include explanations outside JSON.

Return EXACTLY this JSON structure:
{{
    "professional_summary": "A concise 2-sentence executive summary of the candidate.",
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "suggested_improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
    "bullet_improvements": ["Specific rewritten bullet point suggestion 1"],
    "recommended_jobs": ["Role 1", "Role 2", "Role 3"],
    "interview_questions": ["Question 1", "Question 2", "Question 3"]
}}

Resume Text:
{truncated_text}
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1000
        )
        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            lines = content.splitlines()
            if len(lines) >= 3:
                content = "\n".join(lines[1:-1])

        parsed_json = json.loads(content)
        return parsed_json

    except Exception as err:
        logging.warning("Groq AI qualitative analysis failed/errored: %s. Using fallback.", err)
        return _fallback_resume_qualitative_analysis(resume_text)


analyze_resume = analyze_resume_qualitative


class GroqProvider(BaseAIProvider):
    """
    Groq Implementation of BaseAIProvider.
    Enables AI_PROVIDER=groq without changing interview service code.
    """

    def generate_text(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1000) -> str:
        if not client:
            raise ValueError("GROQ_API_KEY is not configured in backend .env.")

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content.strip()

    def generate_question(
        self,
        role: str,
        interview_type: str,
        difficulty: str,
        count: int,
        skills: List[str],
        projects: List[Dict[str, Any]],
        experience: List[Dict[str, Any]],
        weak_topics: List[str],
        company: Optional[str] = None,
        job_title: Optional[str] = None,
        job_description: Optional[str] = None,
        required_skills: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        from app.services.openrouter_service import openrouter_service
        # Delegate structured question building logic to openrouter_service template or fallback
        prompt = f"""
You are a Principal Engineering Recruiter conducting a multi-round interview for {role}.
Generate exactly {count} interview questions in JSON format.
First question MUST be: "Please introduce yourself and explain why you are interested in this position."
Candidate skills: {', '.join(skills or [])}
Company: {company or 'N/A'}, Job Title: {job_title or role}

Return ONLY JSON:
{{
  "questions": [
    {{
      "question_number": 1,
      "question": "Please introduce yourself and explain why you are interested in this position.",
      "question_type": "HR",
      "topic": "Self Introduction",
      "difficulty": "{difficulty}"
    }}
  ]
}}
"""
        try:
            res_text = self.generate_text(prompt, temperature=0.7, max_tokens=1500)
            if res_text.startswith("```"):
                lines = res_text.splitlines()
                if len(lines) >= 3:
                    res_text = "\n".join(lines[1:-1])
            data = json.loads(res_text)
            qs = data.get("questions", [])
            if len(qs) > 0:
                return qs[:count]
        except Exception as e:
            logging.warning("Groq question generation fallback triggered: %s", e)

        return openrouter_service._fallback_questions(role, difficulty, count, skills, company, job_title)

    def evaluate_answer(
        self,
        question: str,
        question_type: str,
        topic: str,
        transcript: str,
        body_language_obs: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        prompt = f"""
Evaluate candidate response to question: "{question}".
Transcript: "{transcript}"
Return ONLY JSON with fields: score, technical_score, communication_score, english_score, relevance_score, clarity_score, fluency_score, strengths, weaknesses, feedback, follow_up_question.
"""
        try:
            res_text = self.generate_text(prompt, temperature=0.2, max_tokens=800)
            if res_text.startswith("```"):
                lines = res_text.splitlines()
                if len(lines) >= 3:
                    res_text = "\n".join(lines[1:-1])
            return json.loads(res_text)
        except Exception as e:
            logging.warning("Groq answer evaluation fallback: %s", e)
            return {
                "score": 75,
                "technical_score": 75,
                "communication_score": 80,
                "english_score": 80,
                "relevance_score": 80,
                "clarity_score": 80,
                "fluency_score": 80,
                "strengths": ["Clear communication delivered."],
                "weaknesses": ["Consider adding specific real-world metrics."],
                "feedback": "Response delivered clearly.",
                "follow_up_question": "Can you provide a specific technical example to support your answer?"
            }

    def generate_followup(self, question: str, transcript: str, eval_data: Dict[str, Any]) -> str:
        prompt = f"Question: '{question}', Answer: '{transcript}'. Generate ONE follow-up question."
        try:
            return self.generate_text(prompt, temperature=0.5, max_tokens=100)
        except Exception:
            return "Could you elaborate further on your technical decisions?"

    def generate_report(self, answers: List[Dict[str, Any]], target_role: str) -> Dict[str, Any]:
        from app.services.openrouter_service import openrouter_service
        # Use OpenRouter's enhanced report generation which handles full Q&A data
        return openrouter_service.generate_report(answers, target_role)

    def test_connection(self) -> Dict[str, Any]:
        if not client:
            return {"provider": "groq", "status": "not_configured"}
        try:
            self.generate_text("ping", max_tokens=5)
            return {"provider": "groq", "status": "connected"}
        except Exception as e:
            return {"provider": "groq", "status": "connection_error", "detail": str(e)[:100]}

    def get_status(self) -> Dict[str, Any]:
        return self.test_connection()


groq_provider = GroqProvider()
