from typing import List, Optional
from pydantic import BaseModel


class JobMatchResult(BaseModel):
    ats_score: int
    job_match: int
    matched_skills: List[str]
    missing_skills: List[str]
    recommendations: List[str]


class JobMatchResponse(BaseModel):
    success: bool
    message: str
    result: JobMatchResult


class JobRecommendation(BaseModel):
    job_title: str
    company: str = ""
    companies: List[str] = []
    location: str = ""
    salary_range: str = ""
    employment_type: str = ""
    experience: str = ""
    description: str = ""
    skills: List[str] = []
    apply_url: Optional[str] = None    # Direct employer application URL (may be None)
    job_url: Optional[str] = None      # Job listing / redirect URL (may be None)
    company_logo: Optional[str] = None
    match_percentage: float = 0.0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    source: str = ""
    provider_job_id: str = ""
    posted_date: Optional[str] = None
    category: str = ""


class JobRecommendationResponse(BaseModel):
    success: bool
    message: str
    recommendations: List[JobRecommendation]


class JobApplicationCreate(BaseModel):
    job_key: str
    job_title: str
    company: str
    location: Optional[str] = None
    status: Optional[str] = "Saved"
    apply_url: Optional[str] = None
    salary_range: Optional[str] = None
    deadline: Optional[str] = None


class JobApplicationStatusUpdate(BaseModel):
    job_key: str
    status: str

