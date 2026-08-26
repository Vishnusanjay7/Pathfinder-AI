from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):

    def __init__(self):

        super().__init__(User)

    def get_by_email(
        self,
        db: Session,
        email: str
    ):
        if not email:
            return None
        clean_email = email.strip().lower()
        return db.query(User).filter(
            func.lower(User.email) == clean_email
        ).first()


user_repository = UserRepository()