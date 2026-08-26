from sqlalchemy.orm import Session

from app.repositories.certification_repository import (
    certification_repository
)


class CertificationService:
    """
    Handles certification-related business logic.
    """

    def save_certifications(
        self,
        db: Session,
        user_id: int,
        certification_list: list
    ):

        certification_repository.delete_by_user(
            db,
            user_id
        )

        saved_certifications = []

        for item in certification_list:

            if not isinstance(item, dict):
                continue

            certification = certification_repository.create(

                db=db,

                user_id=user_id,

                name=item.get(
                    "name",
                    ""
                ),

                provider=item.get(
                    "provider",
                    ""
                ),

                issue_date=item.get(
                    "issue_date",
                    ""
                ),

                credential_url=item.get(
                    "credential_url",
                    ""
                )

            )

            saved_certifications.append(certification)

        return saved_certifications

    def get_certifications(
        self,
        db: Session,
        user_id: int
    ):

        return certification_repository.get_by_user(
            db,
            user_id
        )

    def delete_certifications(
        self,
        db: Session,
        user_id: int
    ):

        certification_repository.delete_by_user(
            db,
            user_id
        )


certification_service = CertificationService()