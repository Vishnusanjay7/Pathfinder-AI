from sqlalchemy.orm import Session

from app.models.experience import Experience
from app.repositories.base_repository import BaseRepository


class ExperienceRepository(BaseRepository[Experience]):

    def __init__(self):
        super().__init__(Experience)

    def get_by_user(
        self,
        db: Session,
        user_id: int
    ):

        return (
            db.query(Experience)
            .filter(
                Experience.user_id == user_id
            )
            .all()
        )

    def delete_by_user(
        self,
        db: Session,
        user_id: int
    ):

        db.query(Experience).filter(
            Experience.user_id == user_id
        ).delete()

        db.commit()


experience_repository = ExperienceRepository()