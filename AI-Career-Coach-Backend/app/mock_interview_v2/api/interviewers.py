from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.mock_interview_v2.avatars.avatar_profiles import (
    get_all_interviewer_profiles_v2,
    get_interviewer_profile_by_id_v2
)

router = APIRouter(prefix="/interviewers", tags=["Mock Interview v2 - Interviewers"])


@router.get("", summary="List all 4 Human Interviewer Profiles (v2)")
def list_interviewers_v2() -> Dict[str, Any]:
    interviewers = get_all_interviewer_profiles_v2()
    return {
        "success": True,
        "interviewers": interviewers,
        "total": len(interviewers)
    }


@router.get("/{interviewer_id}", summary="Get Interviewer Profile Details (v2)")
def get_interviewer_v2(interviewer_id: str) -> Dict[str, Any]:
    interviewer = get_interviewer_profile_by_id_v2(interviewer_id)
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found.")
    return {
        "success": True,
        "interviewer": interviewer
    }
