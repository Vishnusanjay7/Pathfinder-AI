from sqlalchemy.orm import Session

from app.models.language import Language
from app.repositories.base_repository import BaseRepository


class LanguageRepository(BaseRepository[Language]):

    def __init__(self):
        super().__init__(Language)

    def get_by_user(
        self,
        db: Session,
        user_id: int
    ):
        return (
            db.query(Language)
            .filter(Language.user_id == user_id)
            .all()
        )

    def delete_by_user(
        self,
        db: Session,
        user_id: int
    ):
        db.query(Language).filter(
            Language.user_id == user_id
        ).delete()

        db.commit()


language_repository = LanguageRepository()