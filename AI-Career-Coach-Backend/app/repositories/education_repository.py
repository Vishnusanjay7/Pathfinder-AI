from sqlalchemy.orm import Session

from app.models.education import Education
from app.repositories.base_repository import BaseRepository


class EducationRepository(BaseRepository[Education]):

    def __init__(self):
        super().__init__(Education)

    def get_by_user(
        self,
        db: Session,
        user_id: int
    ):
        return (
            db.query(Education)
            .filter(Education.user_id == user_id)
            .all()
        )

    def delete_by_user(
        self,
        db: Session,
        user_id: int
    ):
        db.query(Education).filter(
            Education.user_id == user_id
        ).delete()

        db.commit()


education_repository = EducationRepository()