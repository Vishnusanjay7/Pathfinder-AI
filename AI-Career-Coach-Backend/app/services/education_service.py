from sqlalchemy.orm import Session

from app.repositories.education_repository import (
    education_repository
)


class EducationService:

    def save_education(
        self,
        db: Session,
        user_id: int,
        education_list: list
    ):

        education_repository.delete_by_user(
            db,
            user_id
        )

        saved = []

        for item in education_list:

            if not isinstance(item, dict):
                continue

            education = education_repository.create(

                db=db,

                user_id=user_id,

                institution=item.get(
                    "institution",
                    ""
                ),

                degree=item.get(
                    "degree",
                    ""
                ),

                field_of_study=item.get(
                    "field_of_study",
                    ""
                ),

                start_year=item.get(
                    "start_year"
                ),

                end_year=item.get(
                    "end_year"
                ),

                grade=item.get(
                    "grade",
                    ""
                )

            )

            saved.append(education)

        return saved


education_service = EducationService()