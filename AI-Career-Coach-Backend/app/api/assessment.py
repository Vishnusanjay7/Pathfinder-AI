from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.services.assessment_service import generate_assessment
from app.auth.dependencies import get_current_user


router = APIRouter(prefix="/api/assessment", tags=["Assessment"])


# ============================================
# Request Schema
# ============================================

class AssessmentRequest(BaseModel):
    resume_text: str
    job_description: str
    difficulty: str = "Medium"


# ============================================
# Health Check
# ============================================

@router.get("/")
def assessment_home():
    return {
        "success": True,
        "message": "Assessment Module Working"
    }


# ============================================
# Generate Assessment
# ============================================

@router.post("/generate")
def generate_ai_assessment(request: AssessmentRequest, current_user=Depends(get_current_user)):
    """
    Generate AI Assessment

    Includes:
    - MCQ
    - Coding
    - Aptitude
    - HR
    """

    try:

        result = generate_assessment(
            resume_text=request.resume_text,
            job_description=request.job_description,
            difficulty=request.difficulty
        )

        return {
            "success": True,
            "message": "Assessment Generated Successfully",
            "data": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
