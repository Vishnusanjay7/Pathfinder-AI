from sqlalchemy.orm import Session

from app.repositories.experience_repository import (
    experience_repository
)


class ExperienceService:

    def save_experience(
        self,
        db: Session,
        user_id: int,
        experience_list: list
    ):

        experience_repository.delete_by_user(
            db,
            user_id
        )

        saved = []

        for item in experience_list:

            if not isinstance(item, dict):
                continue

            experience = experience_repository.create(

                db=db,

                user_id=user_id,

                company=item.get(
                    "company",
                    ""
                ),

                position=item.get(
                    "position",
                    ""
                ),

                description=item.get(
                    "description",
                    ""
                ),

                start_date=item.get(
                    "start_date",
                    ""
                ),

                end_date=item.get(
                    "end_date",
                    ""
                )

            )

            saved.append(experience)

        return saved


experience_service = ExperienceService()
