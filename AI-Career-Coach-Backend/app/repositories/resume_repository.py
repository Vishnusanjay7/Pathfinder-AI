from sqlalchemy.orm import Session

from app.models.resume import Resume
from app.repositories.base_repository import BaseRepository


class ResumeRepository(BaseRepository[Resume]):

    def __init__(self):

        super().__init__(Resume)

    def get_by_user(
        self,
        db: Session,
        user_id: int
    ):

        return db.query(Resume).filter(
            Resume.user_id == user_id
        ).order_by(Resume.upload_date.desc()).all()

    def get_active_by_user(
        self,
        db: Session,
        user_id: int
    ):
        active = db.query(Resume).filter(
            Resume.user_id == user_id,
            Resume.is_active.is_(True)
        ).order_by(Resume.upload_date.desc()).first()

        if not active:
            active = db.query(Resume).filter(
                Resume.user_id == user_id
            ).order_by(Resume.upload_date.desc()).first()

        return active

    def deactivate_user_resumes(
        self,
        db: Session,
        user_id: int
    ):
        db.query(Resume).filter(
            Resume.user_id == user_id
        ).update({Resume.is_active: False}, synchronize_session=False)
        db.commit()


    def delete_by_id_and_user(
        self,
        db: Session,
        resume_id: int,
        user_id: int
    ):

        resume = db.query(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == user_id
        ).first()

        if resume:
            db.delete(resume)
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise

        return resume


resume_repository = ResumeRepository()