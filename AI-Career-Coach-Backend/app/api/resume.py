from pathlib import Path
import shutil
import logging
from uuid import uuid4
from typing import Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends
)
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.resume_schema import ResumeResponse, ContactInfo, ATSResult, ResumeAnalysis

from app.services.pdf_service import extract_text_from_pdf, validate_pdf_file
from app.services.resume_parser import parse_resume_structure
from app.services.ats_service import calculate_ats_score, calculate_job_specific_ats
from app.services.groq_service import analyze_resume_qualitative
from app.services.resume_service import resume_service
from app.services.resume_storage_service import resume_storage_service

router = APIRouter(
    prefix="/api/resume",
    tags=["Resume"]
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.get(
    "/current",
    summary="Get Current Active Resume",
    description="Fetch the active resume and its extracted structured information."
)
def get_current_resume(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    resume = resume_service.get_active_resume(db, user_id)
    if not resume:
        return {
            "success": True,
            "has_resume": False,
            "resume": None
        }

    raw_text = resume.raw_text or ""
    parsed_profile = parse_resume_structure(raw_text) if raw_text else {}

    # Calculate ATS score & breakdown dynamically if missing
    ats_result = calculate_ats_score(parsed_profile, raw_text)

    return {
        "success": True,
        "has_resume": True,
        "resume": {
            "id": resume.id,
            "user_id": resume.user_id,
            "filename": resume.original_filename,
            "stored_filename": resume.stored_filename,
            "uploaded_at": resume.upload_date.isoformat() if resume.upload_date else None,
            "is_active": resume.is_active,
            "ats_score": resume.ats_score or ats_result["ats_score"],
            "ats_breakdown": resume.ats_breakdown or ats_result["score_breakdown"],
            "ats_simulator": ats_result["ats_simulator"],
            "extraction_method": getattr(resume, "extraction_method", "pdfplumber"),
            "extraction_quality": getattr(resume, "extraction_quality", "high"),
            "extraction_quality_detail": getattr(resume, "extraction_quality_detail", "High quality selectable text extracted."),
            "contact_info": {
                "name": parsed_profile.get("name"),
                "email": parsed_profile.get("email"),
                "phone": parsed_profile.get("phone"),
                "linkedin": parsed_profile.get("linkedin"),
                "github": parsed_profile.get("github"),
                "portfolio": parsed_profile.get("portfolio"),
            },
            "analysis": resume.analysis_data or {},
            "skills": resume.extracted_skills or parsed_profile.get("skills", []),
            "categorized_skills": parsed_profile.get("categorized_skills", {}),
            "education": resume.education_data or parsed_profile.get("education", []),
            "experience": resume.experience_data or parsed_profile.get("experience", []),
            "projects": resume.projects_data or parsed_profile.get("projects", []),
            "certifications": resume.certifications_data or parsed_profile.get("certifications", []),
            "achievements": parsed_profile.get("achievements", []),
            "raw_text": raw_text
        }
    }


from app.services.job_readiness_service import invalidate_user_readiness_on_resume_change

@router.post(
    "/select-active/{resume_id}",
    summary="Set Active Resume"
)
def set_active_resume(
    resume_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    resume = resume_service.set_active_resume(db, resume_id, user_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    invalidate_user_readiness_on_resume_change(db, user_id)
    return {"success": True, "message": "Active resume updated successfully."}



@router.post(
    "/upload",
    response_model=ResumeResponse,
    summary="Upload Resume",
    description="Upload a PDF resume and receive AI & ATS Intelligence analysis."
)
async def upload_resume(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Safe temporary path
    safe_filename = f"{uuid4().hex}_{Path(file.filename).name}"
    file_path = UPLOAD_DIR / safe_filename

    try:
        # 1. Validation & File Saving
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Please upload a PDF resume (.pdf extension required)."
            )

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Validate file bytes, encryption, size
        try:
            validate_pdf_file(str(file_path))
        except ValueError as val_err:
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=400, detail=str(val_err))

        # 2. Text Extraction & Quality Assessment (pdfplumber + OCR fallback)
        extraction_res = extract_text_from_pdf(str(file_path))
        raw_text = extraction_res["raw_text"]
        text = extraction_res["text"]
        method = extraction_res["extraction_method"]
        quality = extraction_res["extraction_quality"]
        quality_detail = extraction_res["extraction_quality_detail"]

        if not text.strip():
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF. Please upload a clearer resume."
            )

        # 3. Deterministic Section & Structure Parsing
        parsed_profile = parse_resume_structure(text)

        # 4. ATS Scoring & Optional Job Description Match
        if job_description and job_description.strip():
            ats_res = calculate_job_specific_ats(parsed_profile, text, job_description.strip())
        else:
            ats_res = calculate_ats_score(parsed_profile, text)

        # 5. Groq AI Qualitative Analysis (with guaranteed fallback if Groq fails)
        qualitative_analysis = analyze_resume_qualitative(text, parsed_profile)

        # Merge structured data into final analysis object
        full_analysis = {
            "professional_summary": qualitative_analysis.get("professional_summary") or parsed_profile.get("summary"),
            "technical_skills": parsed_profile.get("skills", []),
            "soft_skills": parsed_profile.get("soft_skills", []),
            "categorized_skills": parsed_profile.get("categorized_skills", {}),
            "education": parsed_profile.get("education", []),
            "experience": parsed_profile.get("experience", []),
            "projects": parsed_profile.get("projects", []),
            "certifications": parsed_profile.get("certifications", []),
            "achievements": parsed_profile.get("achievements", []),
            "languages": parsed_profile.get("languages", []),
            "missing_skills": ats_res.get("missing_skills", []),
            "strengths": qualitative_analysis.get("strengths", []),
            "weaknesses": qualitative_analysis.get("weaknesses", []),
            "suggested_improvements": qualitative_analysis.get("suggested_improvements", []),
            "action_verb_suggestions": ats_res.get("action_verb_suggestions", []),
            "recommended_jobs": qualitative_analysis.get("recommended_jobs", []),
            "interview_questions": qualitative_analysis.get("interview_questions", [])
        }

        # 6. Database Storage (backward compatible)
        resume_storage_service.save_resume(
            db=db,
            user_id=int(current_user["sub"]),
            original_filename=Path(file.filename).name,
            stored_filename=file_path.name,
            ats_score=ats_res["ats_score"],
            parsed_resume=full_analysis,
            raw_text=raw_text,
            ats_breakdown=ats_res.get("score_breakdown", {})
        )

        contact_info_obj = ContactInfo(
            name=parsed_profile.get("name"),
            email=parsed_profile.get("email"),
            phone=parsed_profile.get("phone"),
            linkedin=parsed_profile.get("linkedin"),
            github=parsed_profile.get("github"),
            portfolio=parsed_profile.get("portfolio")
        )

        return ResumeResponse(
            success=True,
            message="Resume analyzed successfully.",
            extraction_method=method,
            extraction_quality=quality,
            extraction_quality_detail=quality_detail,
            contact_info=contact_info_obj,
            ats=ATSResult(
                ats_score=ats_res["ats_score"],
                score_breakdown=ats_res["score_breakdown"],
                weak_phrases_found=ats_res.get("weak_phrases_found", []),
                action_verb_suggestions=ats_res.get("action_verb_suggestions", []),
                ats_simulator=ats_res.get("ats_simulator", [])
            ),
            analysis=ResumeAnalysis(**full_analysis)
        )

    except HTTPException:
        raise
    except Exception as err:
        logging.exception("Unexpected error during resume upload: %s", err)
        raise HTTPException(
            status_code=500,
            detail="Resume processing failed. Please ensure your PDF is valid and readable."
        )
