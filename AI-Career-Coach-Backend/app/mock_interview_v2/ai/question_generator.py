import logging
import requests
import json
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.mock_interview_v2.ai.prompt_builder import PromptBuilderV2

logger = logging.getLogger("career_coach.v2.ai.question")


class QuestionGeneratorV2:
    """
    Context-aware question synthesis engine for Mock Interview v2.
    Uses OpenRouter LLM with deterministic fallbacks tailored to phase and role.
    """

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = settings.OPENROUTER_MODEL or "openai/gpt-4o-mini"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def generate_question(
        self,
        phase: str,
        question_number: int,
        interviewer: Dict[str, Any],
        target_role: str,
        difficulty: str,
        job_description: Optional[str] = None,
        resume_context: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        previous_answer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates the next contextual interview question.
        """
        system_prompt = PromptBuilderV2.build_system_prompt(interviewer, target_role, difficulty)
        user_prompt = PromptBuilderV2.build_question_prompt(
            phase=phase,
            question_number=question_number,
            target_role=target_role,
            job_description=job_description,
            resume_context=resume_context,
            conversation_history=conversation_history or [],
            previous_answer=previous_answer
        )

        if self.is_configured():
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://ai-career-coach.local",
                    "X-Title": "AI Career Coach Mock Interview v2"
                }
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 150
                }

                resp = requests.post(self.api_url, headers=headers, json=payload, timeout=12)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    
                    # Remove thinking process blocks if returned by model
                    if "</think>" in content:
                        content = content.split("</think>")[-1].strip()
                    if "Here's a thinking process" in content:
                        parts = content.split("\n\n")
                        content = parts[-1].strip()
                    if content.startswith('"') and content.endswith('"'):
                        content = content[1:-1].strip()

                    # Fallback to persona clean question if content is still polluted
                    if len(content) < 5 or "thinking process" in content.lower():
                        content = self._get_phase_fallback(phase, interviewer, target_role, question_number, previous_answer)

                    return {
                        "success": True,
                        "question": content,
                        "phase": phase,
                        "question_number": question_number,
                        "category": interviewer.get("specialization", "Technical Competency"),
                        "generated_by": "openrouter"
                    }
                logger.warning(f"[AI-Question-v2] OpenRouter returned status {resp.status_code}")
            except Exception as e:
                logger.error(f"[AI-Question-v2] OpenRouter call failed: {e}", exc_info=True)

        # High quality persona & phase-tailored fallback questions
        fallback_q = self._get_phase_fallback(phase, interviewer, target_role, question_number, previous_answer)
        return {
            "success": True,
            "question": fallback_q,
            "phase": phase,
            "question_number": question_number,
            "category": interviewer.get("specialization", "Technical Competency"),
            "generated_by": "context_engine"
        }

    def _get_phase_fallback(
        self,
        phase: str,
        interviewer: Dict[str, Any],
        target_role: str,
        q_num: int,
        prev_ans: Optional[str]
    ) -> str:
        name = interviewer.get("name", "the interviewer")
        iid = interviewer.get("id", "female_hr")
        ans_lower = (prev_ans or "").lower().strip()

        # Handle Candidate Questions
        if any(w in ans_lower for w in ["repeat", "say that again", "didn't catch", "what was the question", "pardon", "could you repeat"]):
            return f"Of course! Let me repeat the question: Could you walk me through your technical approach and key architectural decisions for this {target_role} role?"

        if any(w in ans_lower for w in ["what would i be doing", "what will i do", "what is the role", "responsibilities of this", "daily work"]):
            return f"In this {target_role} position, you will be designing scalable services, collaborating on system architecture, and mentoring engineers. To assess your fit, could you describe a recent project where you led system design or performance optimization?"

        if any(w in ans_lower for w in ["why are you asking", "why do you ask", "purpose of that"]):
            return f"I'm asking to understand your real-world problem-solving process and how you navigate architectural trade-offs under constraints. With that in mind, how do you typically approach scalability bottlenecks in distributed systems?"

        if phase == "WELCOME" or q_num == 1:
            return f"Hello, welcome! I am {name}. Could you please introduce yourself and tell me what excites you about this {target_role} position?"

        if phase == "RESUME_DISCUSSION":
            return f"Looking over your background, what project on your resume best demonstrates your technical capabilities for this {target_role} role?"

        if phase == "TECHNICAL":
            if "tech" in iid:
                return f"Could you walk me through the architecture of a high-throughput system you designed, focusing on how you handled concurrency and failure recovery?"
            return f"What core engineering practices or frameworks do you rely on most when building robust, scalable applications?"

        if phase == "PROJECT_DISCUSSION":
            if prev_ans and len(prev_ans) > 20:
                return f"You mentioned key technical decisions in your previous work. What was the most significant trade-off you had to balance during implementation?"
            return f"Can you describe a challenging technical bottleneck you resolved recently, and how you measured the performance impact?"

        if phase == "BEHAVIORAL":
            return f"Tell me about a time when you strongly disagreed with a team decision or technical direction. How did you navigate the discussion to a successful outcome?"

        if phase == "FOLLOW_UP":
            return f"Digging deeper into that scenario, if you had to rebuild that architecture with 10x higher traffic today, what would you change first?"

        if phase == "CANDIDATE_QUESTIONS":
            return f"We've covered quite a lot of ground today. Do you have any questions for me regarding our engineering culture or technical roadmap?"

        if phase == "FINAL":
            return f"Thank you very much for taking the time to speak with me today. It was a pleasure discussing your engineering background. Have a wonderful day!"

        return f"Could you elaborate on how you apply modern engineering principles to ensure code quality and system resilience in your projects?"


question_generator_v2 = QuestionGeneratorV2()
