from sqlalchemy.orm import Session

from app.repositories.language_repository import (
    language_repository
)


class LanguageService:
    """
    Handles language-related business logic.
    """

    def save_languages(
        self,
        db: Session,
        user_id: int,
        language_list: list
    ):

        language_repository.delete_by_user(
            db,
            user_id
        )

        saved_languages = []

        for item in language_list:

            if not isinstance(item, dict):
                continue

            language = language_repository.create(

                db=db,

                user_id=user_id,

                language=item.get(
                    "language",
                    ""
                ),

                proficiency=item.get(
                    "proficiency",
                    "Intermediate"
                )

            )

            saved_languages.append(language)

        return saved_languages

    def get_languages(
        self,
        db: Session,
        user_id: int
    ):

        return language_repository.get_by_user(
            db,
            user_id
        )

    def delete_languages(
        self,
        db: Session,
        user_id: int
    ):

        language_repository.delete_by_user(
            db,
            user_id
        )


language_service = LanguageService()