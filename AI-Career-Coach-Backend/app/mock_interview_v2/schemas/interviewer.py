from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class InterviewerVoiceSchema(BaseModel):
    id: str
    name: str
    gender: str
    accent: str
    provider: str = "deepgram"


class InterviewerProfileSchema(BaseModel):
    id: str
    name: str
    role: str
    gender: str
    experience: str
    specialization: str
    personality: str
    interview_style: str
    default_voice_id: str
    voice_preference: str = "en-US"
    office_setting: str
    description: str
    avatar_video_src: str
    avatar_thumbnail_src: str
    background_backdrop_src: str
    voices: List[InterviewerVoiceSchema] = []
    is_photorealistic: bool = True


class InterviewerCatalogResponse(BaseModel):
    success: bool = True
    interviewers: List[InterviewerProfileSchema]
    total: int
