import logging
from fastapi import APIRouter
from app.services.ai_provider import get_ai_provider

router = APIRouter(prefix="/api/ai", tags=["AI Provider"])


@router.get("/test", summary="Test AI Brain Provider Connectivity")
def test_ai_provider():
    """
    Performs a REAL small request to the active AI Provider (OpenRouter/Groq).
    Never exposes API credentials.
    """
    try:
        provider = get_ai_provider()
        res = provider.test_connection()
        return res
    except Exception as e:
        logging.exception("Exception during AI provider test endpoint execution.")
        return {
            "provider": "unknown",
            "status": "connection_error",
            "detail": "Failed to verify AI provider connection."
        }
