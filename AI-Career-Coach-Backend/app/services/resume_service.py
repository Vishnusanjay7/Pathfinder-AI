from sqlalchemy.orm import Session

from app.models.resume import Resume
from app.repositories.resume_repository import resume_repository


class ResumeService:
    """
    Handles resume-related business logic.
    """

    def save_resume(
        self,
        db: Session,
        user_id: int,
        original_filename: str,
        stored_filename: str,
        ats_score: int
    ):

        resume = resume_repository.create(
            db=db,
            user_id=user_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            ats_score=ats_score
        )

        return resume

    def get_user_resumes(
        self,
        db: Session,
        user_id: int
    ):

        return resume_repository.get_by_user(
            db,
            user_id
        )

    def get_active_resume(
        self,
        db: Session,
        user_id: int
    ):
        return resume_repository.get_active_by_user(db, user_id)

    def set_active_resume(
        self,
        db: Session,
        resume_id: int,
        user_id: int
    ):
        resume_repository.deactivate_user_resumes(db, user_id)
        resume = db.query(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == user_id
        ).first()
        if resume:
            resume.is_active = True
            db.commit()
            db.refresh(resume)
        return resume

    def delete_resume(
        self,
        db: Session,
        resume_id: int,
        user_id: int
    ):

        return resume_repository.delete_by_id_and_user(
            db,
            resume_id,
            user_id
        )


resume_service = ResumeService()