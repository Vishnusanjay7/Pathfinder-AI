from sqlalchemy.orm import Session

from app.models.skill import Skill
from app.repositories.base_repository import BaseRepository


class SkillRepository(BaseRepository[Skill]):

    def __init__(self):
        super().__init__(Skill)

    def get_by_user(
        self,
        db: Session,
        user_id: int
    ):
        return (
            db.query(Skill)
            .filter(Skill.user_id == user_id)
            .all()
        )

    def delete_by_user(
        self,
        db: Session,
        user_id: int
    ):
        db.query(Skill).filter(
            Skill.user_id == user_id
        ).delete()

        db.commit()


skill_repository = SkillRepository()