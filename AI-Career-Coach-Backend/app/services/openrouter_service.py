import os
import json
import re
import time
import logging
import requests
from typing import Dict, Any, List, Optional
from pydantic import ValidationError

from app.schemas.ai_schema import (
    QuestionListSchema,
    QuestionItemSchema,
    AnswerEvaluationSchema,
    InterviewReportSchema
)
from app.services.ai_provider import BaseAIProvider

logger = logging.getLogger(__name__)


def _sanitize_text(text: str) -> str:
    """Sanitize unicode characters to clean ASCII-friendly equivalents."""
    if not text:
        return ""
    replacements = {
        "\u2011": "-",  # non-breaking hyphen
        "\u2010": "-",  # hyphen
        "\u2012": "-",  # figure dash
        "\u2013": "-",  # en dash
        "\u2014": "-",  # em dash
        "\u2018": "'",  # left single quotation mark
        "\u2019": "'",  # right single quotation mark
        "\u201c": '"',  # left double quotation mark
        "\u201d": '"',  # right double quotation mark
        "\u2026": "...", # ellipsis
        "\u00a0": " ",  # non-breaking space
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text


def _clean_json_text(text: str) -> str:
    """Extract raw JSON string from markdown code block fences, <think> tags, or text wraps."""
    if not text:
        return ""
    
    text = _sanitize_text(text).strip()
    
    # 1. Remove <think>...</think> reasoning blocks
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.DOTALL).strip()
    
    # 2. Match fenced markdown blocks ```json ... ``` or ``` ... ```
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, flags=re.IGNORECASE)
    if fence_match:
        text = fence_match.group(1).strip()
    
    # 3. If still wrapped in outer backticks
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()
            
    # 4. Locate first '{' or '[' and last '}' or ']'
    first_brace = text.find("{")
    first_bracket = text.find("[")
    
    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        last_brace = text.rfind("}")
        if last_brace != -1:
            return text[first_brace:last_brace + 1].strip()
    elif first_bracket != -1:
        last_bracket = text.rfind("]")
        if last_bracket != -1:
            return text[first_bracket:last_bracket + 1].strip()
            
    return text.strip()


def _normalize_questions_json(parsed: Any, default_difficulty: str, default_role: str, count: int) -> Dict[str, Any]:
    """Normalize varied AI response shapes into standard {'questions': [QuestionItemSchema]}."""
    items = []
    if isinstance(parsed, list):
        items = parsed
    elif isinstance(parsed, dict):
        if "questions" in parsed and isinstance(parsed["questions"], list):
            items = parsed["questions"]
        elif "interview_questions" in parsed and isinstance(parsed["interview_questions"], list):
            items = parsed["interview_questions"]
        elif "data" in parsed and isinstance(parsed["data"], list):
            items = parsed["data"]
        elif "items" in parsed and isinstance(parsed["items"], list):
            items = parsed["items"]
        else:
            for v in parsed.values():
                if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                    items = v
                    break
    
    cleaned_questions = []
    for idx, item in enumerate(items, 1):
        if isinstance(item, str):
            cleaned_questions.append({
                "question_number": idx,
                "question": _sanitize_text(item).strip(),
                "question_type": "Technical" if idx > 2 else "HR",
                "topic": default_role,
                "difficulty": default_difficulty
            })
        elif isinstance(item, dict):
            q_text = item.get("question") or item.get("question_text") or item.get("text") or item.get("prompt") or ""
            q_type = item.get("question_type") or item.get("type") or item.get("category") or ("HR" if idx == 1 else "Technical")
            q_topic = item.get("topic") or item.get("domain") or item.get("category") or default_role
            q_diff = item.get("difficulty") or default_difficulty
            q_num = item.get("question_number") or item.get("num") or idx
            try:
                q_num = int(q_num)
            except (ValueError, TypeError):
                q_num = idx
                
            if q_text:
                cleaned_questions.append({
                    "question_number": q_num,
                    "question": _sanitize_text(str(q_text)).strip(),
                    "question_type": str(q_type).strip(),
                    "topic": str(q_topic).strip(),
                    "difficulty": str(q_diff).strip()
                })
                
    return {"questions": cleaned_questions}


class OpenRouterService(BaseAIProvider):
    """
    OpenRouter Implementation of BaseAIProvider.
    Uses OpenAI-compatible Chat Completions API with OpenRouter free-model support,
    Pydantic schema validation, exponential backoff retries, and clean error sanitization.
    """

    def __init__(self) -> None:
        self._cached_key: Optional[str] = None
        self._cached_model: Optional[str] = None
        self._cached_base_url: Optional[str] = None
        self._cached_headers: Optional[Dict[str, str]] = None

    def _get_config(self) -> tuple:
        """Return cached (api_key, model, base_url, headers) to avoid repeated env reads."""
        from app.core.config import settings
        key = (settings.OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY") or "").strip()
        model = (settings.OPENROUTER_MODEL or os.getenv("OPENROUTER_MODEL") or "openrouter/free").strip()
        base_url = (settings.OPENROUTER_BASE_URL or os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1").strip().rstrip("/")
        if key != self._cached_key or base_url != self._cached_base_url:
            self._cached_key = key
            self._cached_model = model
            self._cached_base_url = base_url
            self._cached_headers = {
                "Authorization": f"Bearer {key}",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Career Coach",
                "Content-Type": "application/json"
            }
        return self._cached_key, self._cached_model or model, self._cached_base_url, self._cached_headers

    def get_api_key(self) -> str:
        key, _, _, _ = self._get_config()
        return key

    def get_model(self) -> str:
        _, model, _, _ = self._get_config()
        return model

    def get_base_url(self) -> str:
        _, _, base_url, _ = self._get_config()
        return base_url

    def get_headers(self) -> Dict[str, str]:
        _, _, _, headers = self._get_config()
        return headers

    def test_connection(self) -> Dict[str, Any]:
        """
        Perform a REAL small OpenRouter API request to verify connectivity and key validity.
        Never returns credentials.
        """
        key = self.get_api_key()
        model = self.get_model()
        if not key:
            return {
                "provider": "openrouter",
                "model": model,
                "status": "not_configured"
            }

        url = f"{self.get_base_url()}/chat/completions"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 5,
            "temperature": 0.1
        }

        try:
            res = requests.post(url, headers=self.get_headers(), json=payload, timeout=8)
            if res.status_code == 200:
                return {
                    "provider": "openrouter",
                    "model": model,
                    "status": "connected"
                }
            elif res.status_code in [401, 403]:
                return {
                    "provider": "openrouter",
                    "model": model,
                    "status": "authentication_failed"
                }
            elif res.status_code == 429:
                return {
                    "provider": "openrouter",
                    "model": model,
                    "status": "rate_limited"
                }
            else:
                return {
                    "provider": "openrouter",
                    "model": model,
                    "status": "connection_error",
                    "http_code": res.status_code
                }
        except requests.exceptions.Timeout:
            return {
                "provider": "openrouter",
                "model": model,
                "status": "connection_error",
                "detail": "Timeout"
            }
        except Exception as e:
            return {
                "provider": "openrouter",
                "model": model,
                "status": "connection_error",
                "detail": str(e)[:100]
            }

    def get_status(self) -> Dict[str, Any]:
        return self.test_connection()

    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """Call OpenRouter Chat Completions API with exponential backoff retries."""
        key = self.get_api_key()
        if not key:
            raise ValueError("OPENROUTER_API_KEY is not configured in backend .env.")

        url = f"{self.get_base_url()}/chat/completions"
        payload = {
            "model": self.get_model(),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        max_retries = 2
        backoff_sec = 1.0

        for attempt in range(max_retries + 1):
            try:
                res = requests.post(url, headers=self.get_headers(), json=payload, timeout=20)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        return choices[0]["message"].get("content", "").strip()
                    raise ValueError("Empty response choices from OpenRouter.")
                elif res.status_code == 429:
                    logger.warning("OpenRouter rate limit 429 encountered (attempt %d).", attempt + 1)
                    if attempt < max_retries:
                        time.sleep(backoff_sec)
                        backoff_sec *= 2.0
                        continue
                    raise ValueError("AI interview usage limit reached. Please try again later.")
                elif res.status_code in [401, 403]:
                    raise ValueError("OpenRouter API authentication failed. Please check your OPENROUTER_API_KEY.")
                else:
                    logger.warning("OpenRouter returned HTTP %d: %s", res.status_code, res.text[:150])
                    if attempt < max_retries:
                        time.sleep(backoff_sec)
                        backoff_sec *= 2.0
                        continue
                    raise ValueError(f"OpenRouter API error (HTTP {res.status_code}).")
            except requests.exceptions.Timeout:
                logger.warning("OpenRouter connection timed out (attempt %d).", attempt + 1)
                if attempt < max_retries:
                    time.sleep(backoff_sec)
                    backoff_sec *= 2.0
                    continue
                raise ValueError("OpenRouter connection request timed out.")
            except Exception as e:
                if attempt < max_retries and "usage limit" not in str(e).lower():
                    time.sleep(backoff_sec)
                    backoff_sec *= 2.0
                    continue
                raise e

        raise ValueError("Failed to get response from OpenRouter.")

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
        """
        Generate structured, personalized interview questions following strict phase sequence:
        1. HR ("Please introduce yourself...") -> 2. Personal/Background -> 3. Resume -> 4. Projects -> 5. Company/Job -> 6. Behavioral -> 7. Technical.
        Validated via Pydantic QuestionListSchema with safe retry & fallback.
        """
        count = max(1, min(20, count or 5))
        job_context = ""
        if company or job_title or job_description:
            job_context = f"""
Target Company: {company or 'Target Organization'}
Target Job Title: {job_title or role}
Job Description: {job_description[:500] if job_description else 'N/A'}
Required Job Skills: {', '.join(required_skills or [])}
"""

        # Build dynamic sequence instructions based on count
        seq_instructions = [
            '1. Question 1 MUST be HR / Introduction: "Please introduce yourself and explain why you are interested in this position."'
        ]
        if count >= 2:
            seq_instructions.append('2. Question 2 MUST be Personal / Background & Core Career Motivations.')
        if count >= 3:
            skills_hint = ', '.join(skills[:4]) if skills else 'software tools & competencies'
            seq_instructions.append(f'3. Question 3 MUST be Resume Deep-Dive probing candidate skills ({skills_hint}).')
        if count >= 4:
            proj_hint = json.dumps(projects[:1]) if projects else 'key projects from candidate background'
            seq_instructions.append(f'4. Question 4 MUST probe candidate projects ({proj_hint}).')
        if count >= 5:
            comp_hint = company or job_title or role
            seq_instructions.append(f'5. Question 5 MUST address alignment with target organization/role ({comp_hint}).')
        if count >= 6:
            seq_instructions.append('6. Question 6 MUST be Behavioral / Conflict, teamwork & pressure handling under tight deadlines.')
        if count >= 7:
            weak_hint = f" ({', '.join(weak_topics)})" if weak_topics else ""
            seq_instructions.append(f'7. Remaining questions (Questions 7-{count}) MUST be Technical questions covering {role} architecture, system design, and candidate focus areas{weak_hint}.')

        prompt = f"""You are an Executive Recruiter and Senior Technical Interviewer conducting a multi-round interview.
Generate exactly {count} interview questions for the candidate.

STRICT QUESTION ORDER REQUIREMENT:
{chr(10).join(seq_instructions)}

Target Role: {role}
Interview Type: {interview_type}
Difficulty Level: {difficulty}

Candidate Resume Context:
- Skills: {', '.join(skills or ['Software Development'])}
- Projects: {json.dumps(projects[:2]) if projects else 'None'}
- Prior Experience: {json.dumps(experience[:2]) if experience else 'None'}
- Weak Areas to Probe: {', '.join(weak_topics or [])}
{job_context}

Return ONLY valid JSON matching this schema:
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
No markdown formatting outside JSON.
"""
        for attempt in range(2):
            try:
                raw_text = self.generate_text(prompt, temperature=0.7, max_tokens=1500)
                clean_text = _clean_json_text(raw_text)
                parsed = json.loads(clean_text)
                
                # Normalize varied JSON formats into standard schema
                normalized = _normalize_questions_json(parsed, default_difficulty=difficulty, default_role=role, count=count)
                
                # Validate with Pydantic
                validated = QuestionListSchema(**normalized)
                questions_dict = [q.dict() for q in validated.questions]
                if len(questions_dict) >= count:
                    return questions_dict[:count]
                elif len(questions_dict) > 0:
                    # Supplement if fewer than count
                    missing = count - len(questions_dict)
                    fallback_supp = self._fallback_questions(role, difficulty, count, skills, company, job_title)
                    for fq in fallback_supp[len(questions_dict):count]:
                        fq["question_number"] = len(questions_dict) + 1
                        questions_dict.append(fq)
                    return questions_dict[:count]
            except Exception as ve:
                logger.warning("OpenRouter question generation warning (attempt %d): %s", attempt + 1, ve)
                if attempt == 0 and "not configured" not in str(ve).lower():
                    prompt += "\n\nCRITICAL FIX: Ensure valid JSON strictly adhering to the schema."
                    continue

        # Safe structured fallback if OpenRouter fails or returns malformed JSON
        logger.warning("Using safe structured question fallback.")
        return self._fallback_questions(role, difficulty, count, skills, company, job_title)

    def evaluate_answer(
        self,
        question: str,
        question_type: str,
        topic: str,
        transcript: str,
        body_language_obs: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate candidate's spoken response and validate via Pydantic AnswerEvaluationSchema.
        """
        prompt = f"""
You are an expert Interview Evaluator evaluating a spoken response.

Question: "{question}"
Question Type: {question_type}
Topic: {topic}
Candidate Answer Transcript: "{transcript or '[No oral response provided]'}"

Analyze the response across technical correctness, relevance, communication, grammar, fluency, clarity, and structure.

Return ONLY valid JSON matching this schema:
{{
  "score": 80,
  "technical_score": 80,
  "communication_score": 85,
  "english_score": 85,
  "relevance_score": 85,
  "clarity_score": 80,
  "fluency_score": 80,
  "strengths": ["Clear introductory summary provided."],
  "weaknesses": ["Consider mentioning specific metrics or trade-offs."],
  "feedback": "Solid response delivered with clarity.",
  "follow_up_question": "Can you elaborate on how you handled edge cases in that project?"
}}
No markdown wrappers.
"""
        for attempt in range(2):
            try:
                raw_text = self.generate_text(prompt, temperature=0.2, max_tokens=1000)
                clean_text = _clean_json_text(raw_text)
                parsed = json.loads(clean_text)

                validated = AnswerEvaluationSchema(**parsed)
                return validated.dict()
            except Exception as ve:
                logger.warning("OpenRouter answer evaluation warning (attempt %d): %s", attempt + 1, ve)
                if attempt == 0 and "not configured" not in str(ve).lower():
                    prompt += "\n\nCRITICAL FIX: Return strictly valid JSON."
                    continue

        # Safe fallback
        word_count = len((transcript or "").split())
        return {
            "score": min(80, word_count * 2 + 30),
            "technical_score": min(75, word_count * 2 + 25),
            "communication_score": 75,
            "english_score": 80,
            "relevance_score": 80 if word_count > 15 else 40,
            "clarity_score": 80,
            "fluency_score": 75,
            "strengths": ["Clear response provided."],
            "weaknesses": ["Add specific technical trade-offs and metrics."],
            "feedback": "Response delivered clearly.",
            "follow_up_question": "Could you provide a specific technical example to support your answer?"
        }

    def evaluate_all_answers(
        self,
        qa_list: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all interview answers in a single LLM call.
        Each item in qa_list must have: question, question_type, topic, transcript.
        Returns a list of evaluation dicts aligned to the input order.
        """
        if not qa_list:
            return []

        qa_block = ""
        for i, qa in enumerate(qa_list, 1):
            qa_block += f"\nQ{i} ({qa.get('question_type', 'Unknown')}): {qa.get('question', 'N/A')}\n"
            qa_block += f"A{i}: {qa.get('transcript', 'No response')}\n"

        prompt = f"""You are an expert Interview Evaluator. Evaluate ALL {len(qa_list)} answers below in a single analysis.

{qa_block}

For EACH question, provide scores. Return ONLY valid JSON matching this schema:
{{
  "evaluations": [
    {{
      "question_number": 1,
      "score": 80,
      "technical_score": 80,
      "communication_score": 85,
      "english_score": 85,
      "relevance_score": 85,
      "clarity_score": 80,
      "fluency_score": 80,
      "strengths": ["Clear intro."],
      "weaknesses": ["Add metrics."],
      "feedback": "Solid response.",
      "follow_up_question": "Can you elaborate?"
    }}
  ]
}}
Return exactly {len(qa_list)} evaluations in order. No markdown.
"""
        try:
            raw_text = self.generate_text(prompt, temperature=0.2, max_tokens=2000)
            clean_text = _clean_json_text(raw_text)
            parsed = json.loads(clean_text)
            evaluations = parsed.get("evaluations", [])
            # Pad with fallbacks if fewer returned
            while len(evaluations) < len(qa_list):
                word_count = len((qa_list[len(evaluations)].get("transcript") or "").split())
                evaluations.append({
                    "score": min(80, word_count * 2 + 30),
                    "technical_score": min(75, word_count * 2 + 25),
                    "communication_score": 75,
                    "english_score": 80,
                    "relevance_score": 80 if word_count > 15 else 40,
                    "clarity_score": 80,
                    "fluency_score": 75,
                    "strengths": ["Clear response provided."],
                    "weaknesses": ["Add specific metrics."],
                    "feedback": "Response delivered clearly.",
                    "follow_up_question": "Could you provide a specific technical example?"
                })
            return evaluations[:len(qa_list)]
        except Exception as e:
            logger.warning("Batch evaluate_all_answers fallback: %s", e)
            # Return individual fallbacks
            results = []
            for qa in qa_list:
                word_count = len((qa.get("transcript") or "").split())
                results.append({
                    "score": min(80, word_count * 2 + 30),
                    "technical_score": min(75, word_count * 2 + 25),
                    "communication_score": 75,
                    "english_score": 80,
                    "relevance_score": 80 if word_count > 15 else 40,
                    "clarity_score": 80,
                    "fluency_score": 75,
                    "strengths": ["Clear response provided."],
                    "weaknesses": ["Add specific metrics."],
                    "feedback": "Response delivered clearly.",
                    "follow_up_question": "Could you provide a specific technical example?"
                })
            return results

    def generate_followup(
        self,
        question: str,
        transcript: str,
        eval_data: Dict[str, Any]
    ) -> str:
        """Generate targeted follow-up question based on candidate transcript."""
        if eval_data and eval_data.get("follow_up_question"):
            return eval_data["follow_up_question"]

        prompt = f"""
Question Asked: "{question}"
Candidate Answer: "{transcript}"

Generate ONE concise, professional follow-up question probing deeper technical or situational details.
Return ONLY the follow-up question string without quotes or preamble.
"""
        try:
            res = self.generate_text(prompt, temperature=0.5, max_tokens=150)
            return res.replace('"', '').strip()
        except Exception:
            return "Could you elaborate further on the architectural decisions you made?"

    def generate_report(
        self,
        answers: List[Dict[str, Any]],
        target_role: str
    ) -> Dict[str, Any]:
        """
        Generate final interview report summary.
        When answers contain 'question' and 'transcript' keys, performs a richer
        per-question + overall analysis.  Otherwise falls back to score-only averaging.
        """
        if not answers:
            return {
                "technical_score": 70,
                "communication_score": 75,
                "english_score": 75,
                "body_language_score": 85,
                "overall_score": 75,
                "readiness_score": 72,
                "strengths": ["Clear communication delivered."],
                "weaknesses": ["Include deeper technical metrics."],
                "recommendations": ["Practice explaining architecture trade-offs."],
                "question_feedback": [],
                "skill_gaps": [],
            }

        # Check if answers have full Q&A data (from batch eval path)
        has_full_data = any(a.get("question") and a.get("transcript") for a in answers)

        if has_full_data:
            # Build a detailed prompt with all Q&A pairs
            qa_block = ""
            for i, a in enumerate(answers, 1):
                qa_block += f"\nQ{i} ({a.get('question_type', 'Unknown')}): {a.get('question', 'N/A')}\n"
                qa_block += f"A{i}: {a.get('transcript', 'No response')}\n"

            prompt = f"""
You are a Senior Interview Evaluator generating a comprehensive final report for a {target_role} mock interview.

INTERVIEW Q&A DATA:
{qa_block}

Analyze the complete interview and return ONLY valid JSON with this structure:
{{
  "overall_score": 82,
  "technical_score": 79,
  "communication_score": 86,
  "english_score": 84,
  "body_language_score": 85,
  "question_feedback": [
    {{
      "question_number": 1,
      "question": "...",
      "question_type": "HR",
      "transcript": "...",
      "score": 85,
      "technical_score": 0,
      "communication_score": 88,
      "feedback": "Clear, structured introduction with relevant experience.",
      "strengths": ["Well-organized response"],
      "weaknesses": ["Could add more specific metrics"]
    }}
  ],
  "strengths": ["Clear communication", "Strong technical fundamentals"],
  "weaknesses": ["Give more measurable project results"],
  "recommendations": ["Practice explaining system trade-offs", "Use STAR format"],
  "skill_gaps": ["System design depth", "Quantifiable achievements"]
}}
No markdown formatting.
"""
            try:
                raw_text = self.generate_text(prompt, temperature=0.3, max_tokens=3000)
                clean_text = _clean_json_text(raw_text)
                parsed = json.loads(clean_text)
                # Ensure required fields exist
                parsed.setdefault("overall_score", 75)
                parsed.setdefault("technical_score", 75)
                parsed.setdefault("communication_score", 80)
                parsed.setdefault("english_score", 80)
                parsed.setdefault("body_language_score", 85)
                parsed.setdefault("question_feedback", [])
                parsed.setdefault("strengths", ["Clear communication."])
                parsed.setdefault("weaknesses", ["Add more specific metrics."])
                parsed.setdefault("recommendations", ["Practice structured answers."])
                parsed.setdefault("skill_gaps", [])
                return parsed
            except Exception as e:
                logger.warning("Enhanced report generation fallback: %s", e)

        # Fallback: score-only averaging
        tech_avg = round(sum(a.get("technical_score", 70) for a in answers) / len(answers))
        comm_avg = round(sum(a.get("communication_score", 75) for a in answers) / len(answers))
        eng_avg = round(sum(a.get("english_score", 75) for a in answers) / len(answers))
        overall_avg = round(sum(a.get("score", 75) for a in answers) / len(answers))

        return {
            "technical_score": tech_avg,
            "communication_score": comm_avg,
            "english_score": eng_avg,
            "body_language_score": 85,
            "overall_score": overall_avg,
            "readiness_score": round((tech_avg * 0.4) + (comm_avg * 0.3) + (overall_avg * 0.3)),
            "strengths": ["Structured answers with professional tone.", f"Good alignment with {target_role} expectations."],
            "weaknesses": ["Incorporate deeper architectural trade-offs.", "Use concise STAR-format summaries."],
            "recommendations": [
                "Practice explaining system bottlenecks in 2-minute segments.",
                "Maintain steady pacing during complex technical explanations."
            ],
            "question_feedback": [],
            "skill_gaps": [],
        }

    def _fallback_questions(
        self,
        role: str,
        difficulty: str,
        count: int,
        skills: List[str],
        company: Optional[str],
        job_title: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Fallback question list when OpenRouter is unreachable."""
        comp_str = company or "our engineering team"
        primary_skill = skills[0] if skills else "Software Engineering"

        questions = [
            {
                "question_number": 1,
                "question": f"Please introduce yourself and explain why you are interested in joining {comp_str} as a {job_title or role}.",
                "question_type": "HR",
                "topic": "Self Introduction",
                "difficulty": difficulty
            },
            {
                "question_number": 2,
                "question": "What is your single greatest technical strength, and what is one skill area you are actively working to improve?",
                "question_type": "Personal",
                "topic": "Career Background",
                "difficulty": difficulty
            },
            {
                "question_number": 3,
                "question": f"In your experience with {primary_skill}, what core architecture decisions do you prioritize for maintainability?",
                "question_type": "Resume",
                "topic": primary_skill,
                "difficulty": difficulty
            },
            {
                "question_number": 4,
                "question": "Could you walk me through a major project you built, detailing your key technical contributions and performance challenges?",
                "question_type": "Projects",
                "topic": "Project Architecture",
                "difficulty": difficulty
            },
            {
                "question_number": 5,
                "question": f"Why do you want to work at {comp_str}, and how do your technical skills align with our goals?",
                "question_type": "Company",
                "topic": "Company Alignment",
                "difficulty": difficulty
            },
            {
                "question_number": 6,
                "question": "Describe a situation where you faced a tight deadline or technical bottleneck. How did you prioritize to deliver on time?",
                "question_type": "Behavioral",
                "topic": "Pressure Handling",
                "difficulty": difficulty
            },
            {
                "question_number": 7,
                "question": f"How do you approach API design, data validation, and asynchronous processing when building scalable {role} systems?",
                "question_type": "Technical",
                "topic": "System Design",
                "difficulty": difficulty
            }
        ]
        return questions[:count]


openrouter_service = OpenRouterService()
