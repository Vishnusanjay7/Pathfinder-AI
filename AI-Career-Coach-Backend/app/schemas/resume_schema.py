from typing import Dict, List, Optional, Any
from pydantic import BaseModel

# ===========================
# ATS Score Breakdown
# ===========================

class ATSBreakdown(BaseModel):
    overall: int = 50
    contact_information: int = 50
    skills_coverage: int = 50
    section_completeness: int = 50
    experience: int = 50
    education: int = 50
    projects: int = 50
    achievements: int = 50
    readability: int = 50

# ===========================
# ATS Simulator Option
# ===========================

class ATSSimulationItem(BaseModel):
    action: str
    current_score: int
    estimated_score: int
    estimated_increase: str

# ===========================
# Education Item
# ===========================

class EducationItem(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = ""
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    grade: Optional[str] = ""

# ===========================
# Experience Item
# ===========================

class ExperienceItem(BaseModel):
    company: str
    position: str
    description: Optional[str] = ""
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""

# ===========================
# Project Item
# ===========================

class ProjectItem(BaseModel):
    title: str
    description: Optional[str] = ""
    technologies: Optional[str] = ""
    github_url: Optional[str] = ""

# ===========================
# Certification Item
# ===========================

class CertificationItem(BaseModel):
    name: str
    provider: Optional[str] = ""
    issue_date: Optional[str] = ""
    credential_url: Optional[str] = ""

# ===========================
# Language Item
# ===========================

class LanguageItem(BaseModel):
    language: str
    proficiency: Optional[str] = "Intermediate"

# ===========================
# Structured Contact Links
# ===========================

class ContactInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

# ===========================
# Resume Analysis Response
# ===========================

class ResumeAnalysis(BaseModel):
    professional_summary: str = ""
    technical_skills: List[str] = []
    soft_skills: List[str] = []
    categorized_skills: Optional[Dict[str, List[str]]] = {}
    education: List[EducationItem] = []
    experience: List[ExperienceItem] = []
    projects: List[ProjectItem] = []
    certifications: List[CertificationItem] = []
    achievements: List[str] = []
    languages: List[LanguageItem] = []
    missing_skills: List[str] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
    suggested_improvements: List[str] = []
    action_verb_suggestions: List[str] = []
    recommended_jobs: List[str] = []
    interview_questions: List[str] = []

# ===========================
# ATS Result
# ===========================

class ATSResult(BaseModel):
    ats_score: int
    score_breakdown: Dict[str, Any]
    weak_phrases_found: Optional[List[str]] = []
    action_verb_suggestions: Optional[List[str]] = []
    ats_simulator: Optional[List[ATSSimulationItem]] = []

# ===========================
# Response Model
# ===========================

class ResumeResponse(BaseModel):
    success: bool
    message: str
    extraction_method: Optional[str] = "pdfplumber"
    extraction_quality: Optional[str] = "high"
    extraction_quality_detail: Optional[str] = ""
    contact_info: Optional[ContactInfo] = None
    ats: ATSResult
    analysis: ResumeAnalysis