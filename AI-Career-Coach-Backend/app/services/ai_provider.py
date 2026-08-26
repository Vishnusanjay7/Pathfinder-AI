import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class BaseAIProvider(ABC):
    """
    Abstract Base Class for LLM AI Brain Providers.
    Decouples the AI Mock Interview system from any specific LLM (OpenRouter, Groq, OpenAI, etc.).
    """

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """Generate raw text response from the LLM provider."""
        pass

    @abstractmethod
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
        Generate structured, personalized interview questions following strict sequence:
        1. HR ("Please introduce yourself.") -> 2. Personal/Background -> 3. Resume -> 4. Projects -> 5. Company/Job -> 6. Behavioral -> 7. Technical.
        """
        pass

    @abstractmethod
    def evaluate_answer(
        self,
        question: str,
        question_type: str,
        topic: str,
        transcript: str,
        body_language_obs: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate candidate's spoken response. Returns structured data validated via Pydantic:
        score, technical_score, communication_score, english_score, relevance_score, clarity_score, fluency_score, strengths, weaknesses, feedback, follow_up_question.
        """
        pass

    @abstractmethod
    def generate_followup(
        self,
        question: str,
        transcript: str,
        eval_data: Dict[str, Any]
    ) -> str:
        """Generate a relevant follow-up question based on candidate response."""
        pass

    @abstractmethod
    def generate_report(
        self,
        answers: List[Dict[str, Any]],
        target_role: str
    ) -> Dict[str, Any]:
        """Generate final comprehensive interview report summary."""
        pass

    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """Perform a real small API request to test connectivity and credentials."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return provider status metadata (never returning API keys)."""
        pass

    def evaluate_all_answers(
        self,
        qa_list: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all interview answers. Default implementation falls back to
        individual evaluate_answer calls. Subclasses should override with a
        single LLM call for better performance.
        """
        results = []
        for qa in qa_list:
            results.append(self.evaluate_answer(
                question=qa["question"],
                question_type=qa["question_type"],
                topic=qa.get("topic", ""),
                transcript=qa["transcript"],
            ))
        return results


def get_ai_provider() -> BaseAIProvider:
    """
    Factory function instantiating the active AI Provider singleton based on settings.AI_PROVIDER.
    Supports: 'openrouter' | 'groq'
    """
    from app.core.config import settings
    provider_name = (settings.AI_PROVIDER or "openrouter").lower().strip()

    if provider_name == "openrouter":
        from app.services.openrouter_service import openrouter_service
        return openrouter_service
    elif provider_name == "groq":
        from app.services.groq_service import groq_provider
        return groq_provider
    else:
        logger.warning("Unrecognized AI_PROVIDER '%s'. Defaulting to OpenRouter.", provider_name)
        from app.services.openrouter_service import openrouter_service
        return openrouter_service
