from sqlalchemy.orm import Session

from app.repositories.skill_repository import skill_repository


class SkillService:

    def save_skills(
        self,
        db: Session,
        user_id: int,
        skills: list[str]
    ):
        skill_repository.delete_by_user(
            db,
            user_id
        )

        saved = []

        for skill in skills:

            obj = skill_repository.create(
                db=db,
                user_id=user_id,
                name=skill.strip(),
                proficiency="Intermediate"
            )

            saved.append(obj)

        return saved

    def get_skills(
        self,
        db: Session,
        user_id: int
    ):
        return skill_repository.get_by_user(
            db,
            user_id
        )


skill_service = SkillService()