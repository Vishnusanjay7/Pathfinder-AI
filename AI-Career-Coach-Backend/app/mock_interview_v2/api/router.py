from fastapi import APIRouter
from app.mock_interview_v2.api.interviewers import router as interviewers_router
from app.mock_interview_v2.api.interview import router as interview_router
from app.mock_interview_v2.api.tts import router as tts_router
from app.mock_interview_v2.api.lipsync import router as lipsync_router

mock_interview_v2_router = APIRouter(prefix="/api/mock-interview-v2")

mock_interview_v2_router.include_router(interviewers_router)
mock_interview_v2_router.include_router(interview_router)
mock_interview_v2_router.include_router(tts_router)
mock_interview_v2_router.include_router(lipsync_router)
