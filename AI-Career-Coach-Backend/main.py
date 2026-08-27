import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

# ==========================================
# Database
# ==========================================

from app.database.database import engine
from app.database.base import Base
from app.core.config import settings

# ==========================================
# Import ALL Models
# ==========================================

import app.models

# If you have more models, import them here.
# Example:
# from app.models.user import User
# from app.models.resume import Resume
# from app.models.assessment import Assessment

# ==========================================
# API Routers
# ==========================================

from app.api.resume import router as resume_router
from app.api.jobs import router as jobs_router
from app.api.assessment import router as assessment_router
from app.api.coding import router as coding_router
from app.api.auth import router as auth_router
from app.api.profile import router as profile_router
from app.api.resume_history import router as resume_history_router
from app.api import skills
from app.api.adaptive_assessment import router as adaptive_assessment_router
from app.api.notifications import router as notifications_router
from app.api.learning_center import router as learning_center_router
from app.api.mock_interview import router as mock_interview_router
from app.api.interview import router as interview_router
from app.api.company_preparation import router as company_preparation_router

# ==========================================
# FastAPI
# ==========================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

import os
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="AI Career Coach API",
    description="AI Powered Resume Analyzer, ATS, Job Matching, Coding Assessment and Career Recommendation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(static_dir, "videos"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


# ==========================================
# CORS
# ==========================================

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if settings.FRONTEND_URL:
    for url in settings.FRONTEND_URL.split(","):
        clean_url = url.strip()
        if clean_url and clean_url not in origins:
            origins.append(clean_url)

allow_all_origins = "*" in origins or "*" in (settings.FRONTEND_URL or "")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else origins,
    allow_origin_regex=r"https://.*\.onrender\.com|https://.*\.vercel\.app" if not allow_all_origins else None,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Root
# ==========================================

@app.get("/", tags=["Root"])
def root():
    return {
        "success": True,
        "message": "Welcome to AI Career Coach API",
        "version": "1.0.0"
    }

# ==========================================
# Health
# ==========================================

@app.get("/health", tags=["Health"])
def health():
    return {
        "success": True,
        "status": "Healthy"
    }

# ==========================================
# Register Routers
# ==========================================

from app.api.ai import router as ai_router

app.include_router(ai_router)
app.include_router(resume_router)
app.include_router(jobs_router)
app.include_router(assessment_router)
app.include_router(coding_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(resume_history_router)
app.include_router(skills.router)
app.include_router(adaptive_assessment_router)
app.include_router(notifications_router)
app.include_router(learning_center_router)
app.include_router(mock_interview_router)
app.include_router(interview_router)
app.include_router(company_preparation_router)

# Mount Mock Interview v2 Subsystem (Completely Isolated)
from app.mock_interview_v2.api.router import mock_interview_v2_router
from app.mock_interview_v2.websocket.ws_router import ws_router_v2

app.include_router(mock_interview_v2_router)
app.include_router(ws_router_v2)

# Mount static directory for generated interviewer lip-synced videos
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "videos"), exist_ok=True)
os.makedirs(os.path.join(static_dir, "videos_v2"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


def run_db_migrations():
    # Create database tables
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)

    if "coding_questions" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("coding_questions")}
        coding_additions = {
            "topic": "VARCHAR(100)",
            "tags": "JSON",
            "input_format": "TEXT",
            "output_format": "TEXT",
            "explanation": "TEXT",
            "time_limit": "FLOAT DEFAULT 2.0",
            "memory_limit": "INTEGER DEFAULT 256",
            "hints": "JSON",
            "reference_solution": "TEXT",
        }
        with engine.begin() as connection:
            for column, definition in coding_additions.items():
                if column not in existing:
                    connection.execute(text(f"ALTER TABLE coding_questions ADD COLUMN {column} {definition}"))

    if "otp_codes" in inspector.get_table_names():
        existing_cols = {column["name"] for column in inspector.get_columns("otp_codes")}
        with engine.begin() as connection:
            if "attempts" not in existing_cols:
                connection.execute(text("ALTER TABLE otp_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0"))
            if "purpose" not in existing_cols:
                connection.execute(text("ALTER TABLE otp_codes ADD COLUMN purpose VARCHAR(50) NOT NULL DEFAULT 'registration'"))

    if "resumes" in inspector.get_table_names():
        existing_cols = {column["name"] for column in inspector.get_columns("resumes")}
        resume_additions = {
            "is_active": "BOOLEAN DEFAULT TRUE",
            "raw_text": "TEXT",
            "analysis_data": "JSON",
            "ats_breakdown": "JSON",
            "extracted_skills": "JSON",
            "education_data": "JSON",
            "experience_data": "JSON",
            "projects_data": "JSON",
            "certifications_data": "JSON",
        }
        with engine.begin() as connection:
            for column, definition in resume_additions.items():
                if column not in existing_cols:
                    connection.execute(text(f"ALTER TABLE resumes ADD COLUMN {column} {definition}"))

    if "jobs" in inspector.get_table_names():
        existing_cols = {column["name"] for column in inspector.get_columns("jobs")}
        with engine.begin() as connection:
            if "user_id" not in existing_cols:
                connection.execute(text("ALTER TABLE jobs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))

    if "job_applications" in inspector.get_table_names():
        existing_cols = {column["name"] for column in inspector.get_columns("job_applications")}
        app_additions = {
            "readiness_score": "FLOAT",
            "match_score": "FLOAT",
            "eligibility_status": "VARCHAR(50)",
            "resume_version": "VARCHAR(100)",
            "assessment_attempt": "INTEGER",
        }
        with engine.begin() as connection:
            for column, definition in app_additions.items():
                if column not in existing_cols:
                    connection.execute(text(f"ALTER TABLE job_applications ADD COLUMN {column} {definition}"))



run_db_migrations()


# ==========================================
# Startup
# ==========================================

@app.on_event("startup")
async def startup():
    run_db_migrations()
    logging.info("AI Career Coach API started successfully.")




    logging.info("AI Career Coach API started successfully.")
    logging.info("Database connected and tables created.")
    logging.info("Swagger available at http://127.0.0.1:8000/docs")
    logging.info("ReDoc available at http://127.0.0.1:8000/redoc")

# ==========================================
# Shutdown
# ==========================================

@app.on_event("shutdown")
async def shutdown():

    logging.info("AI Career Coach API stopped.")
