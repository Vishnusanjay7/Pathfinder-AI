from sqlalchemy.orm import Session

from app.repositories.resume_repository import (
    resume_repository
)

from app.services.skill_service import (
    skill_service
)


class ResumeStorageService:
    """
    Handles storing uploaded resume information
    and parsed resume data.
    """

    def save_resume(
        self,
        db: Session,
        user_id: int,
        original_filename: str,
        stored_filename: str,
        ats_score: int,
        parsed_resume: dict,
        raw_text: str = "",
        ats_breakdown: dict = None
    ):

        # Deactivate older resumes for this user
        resume_repository.deactivate_user_resumes(db=db, user_id=user_id)

        # Extract skills
        technical_skills = parsed_resume.get("technical_skills", [])
        soft_skills = parsed_resume.get("soft_skills", [])
        skills = []
        for skill in technical_skills:
            if skill and skill.strip() and skill.strip() not in skills:
                skills.append(skill.strip())
        for skill in soft_skills:
            if skill and skill.strip() and skill.strip() not in skills:
                skills.append(skill.strip())

        # Create Resume Record with all structured fields
        resume = resume_repository.create(
            db=db,
            user_id=user_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            ats_score=ats_score,
            is_active=True,
            raw_text=raw_text,
            analysis_data=parsed_resume,
            ats_breakdown=ats_breakdown or {},
            extracted_skills=skills,
            education_data=parsed_resume.get("education", []),
            experience_data=parsed_resume.get("experience", []),
            projects_data=parsed_resume.get("projects", []),
            certifications_data=parsed_resume.get("certifications", [])
        )

        if skills:
            skill_service.save_skills(
                db=db,
                user_id=user_id,
                skills=skills
            )

        return {
            "success": True,
            "resume_id": resume.id,
            "skills_saved": len(skills),
            "message": "Resume stored successfully."
        }


resume_storage_service = ResumeStorageService()