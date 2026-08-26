from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class CompanyPrepAnalyzeRequest(BaseModel):
    job_key: str
    company: str
    job_title: str
    job_description: Optional[str] = ""
    location: Optional[str] = None
    salary_range: Optional[str] = None
    apply_url: Optional[str] = None
    duration_days: Optional[int] = 7


class ProgressUpdateRequest(BaseModel):
    completed_tasks: List[str]
